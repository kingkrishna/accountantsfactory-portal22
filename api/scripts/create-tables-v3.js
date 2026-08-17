/**
 * Create Phase 2 tables via Catalyst REST API (correct body format).
 * 
 * After inspection, the Catalyst table creation API expects:
 * POST /baas/v1/project/{id}/table
 * Body: { table_name: "...", column_details: [{ column_name: ..., data_type: ..., column_sequence: N }] }
 * 
 * Data types: 1=TEXT, 2=VARCHAR, 3=DATE, 4=DATETIME, 5=INT, 6=DOUBLE, 7=BOOLEAN, 8=BIGINT, 9=ENCRYPTED_TEXT
 * 
 * Usage: cd api && node scripts/create-tables-v3.js
 */
'use strict';

require('dotenv').config();

const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');
const fs = require('fs');
const path = require('path');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

// Data type enumerations for Catalyst
const DT = {
  TEXT: 1,
  VARCHAR: 2,
  DATE: 3,
  DATETIME: 4,
  INT: 5,
  DOUBLE: 6,
  BOOLEAN: 7,
  BIGINT: 8,
  ENCRYPTED_TEXT: 9,
};

async function catalystCall(method, apiPath, body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(method, CATALYST_URL + apiPath, body || '', {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    });
    if (result && result.status === 401 && attempt === 1) {
      console.log('  Got 401, retrying...');
      const { invalidate } = require('../src/infra/dataStore/catalyst.token');
      invalidate();
      continue;
    }
    return result;
  }
}

const TABLES = [
  {
    table_name: 'CompanyProfile',
    placeholder: 'PLACEHOLDER_COMPANY_PROFILE',
    columns: [
      { column_name: 'user_id',          data_type: DT.BIGINT },
      { column_name: 'company_name',     data_type: DT.TEXT },
      { column_name: 'pan_number',       data_type: DT.VARCHAR, max_length: 20 },
      { column_name: 'company_category', data_type: DT.VARCHAR, max_length: 50 },
      { column_name: 'group_code',       data_type: DT.VARCHAR, max_length: 50 },
      { column_name: 'franchise_code',   data_type: DT.VARCHAR, max_length: 50 },
      { column_name: 'drive_link',       data_type: DT.TEXT },
    ]
  },
  {
    table_name: 'ComplianceConfig',
    placeholder: 'PLACEHOLDER_COMPLIANCE_CONFIG',
    columns: [
      { column_name: 'user_id',             data_type: DT.BIGINT },
      { column_name: 'service_type',        data_type: DT.VARCHAR, max_length: 30 },
      { column_name: 'is_applicable',       data_type: DT.BOOLEAN },
      { column_name: 'is_registered',       data_type: DT.BOOLEAN },
      { column_name: 'registration_number', data_type: DT.VARCHAR, max_length: 100 },
      { column_name: 'registration_date',   data_type: DT.BIGINT },
    ]
  },
  {
    table_name: 'ComplianceFiling',
    placeholder: 'PLACEHOLDER_COMPLIANCE_FILING',
    columns: [
      { column_name: 'user_id',        data_type: DT.BIGINT },
      { column_name: 'service_type',   data_type: DT.VARCHAR, max_length: 30 },
      { column_name: 'financial_year', data_type: DT.VARCHAR, max_length: 20 },
      { column_name: 'period',         data_type: DT.VARCHAR, max_length: 50 },
      { column_name: 'due_date',       data_type: DT.BIGINT },
      { column_name: 'filing_status',  data_type: DT.VARCHAR, max_length: 20 },
      { column_name: 'filing_date',    data_type: DT.BIGINT },
      { column_name: 'payment_status', data_type: DT.VARCHAR, max_length: 20 },
      { column_name: 'payment_date',   data_type: DT.BIGINT },
      { column_name: 'notes',          data_type: DT.TEXT },
    ]
  },
  {
    table_name: 'DocumentTemplate',
    placeholder: 'PLACEHOLDER_DOC_TEMPLATE',
    columns: [
      { column_name: 'template_name', data_type: DT.TEXT },
      { column_name: 'template_type', data_type: DT.VARCHAR, max_length: 30 },
      { column_name: 'template_html', data_type: DT.TEXT },
      { column_name: 'created_by',    data_type: DT.BIGINT },
      { column_name: 'is_active',     data_type: DT.BOOLEAN },
    ]
  },
  {
    table_name: 'GeneratedDocument',
    placeholder: 'PLACEHOLDER_GEN_DOCUMENT',
    columns: [
      { column_name: 'template_id',    data_type: DT.BIGINT },
      { column_name: 'user_id',        data_type: DT.BIGINT },
      { column_name: 'generated_html', data_type: DT.TEXT },
      { column_name: 'generated_at',   data_type: DT.BIGINT },
      { column_name: 'generated_by',   data_type: DT.BIGINT },
    ]
  }
];

async function getTableId(tableName) {
  const res = await catalystCall('GET', `/baas/v1/project/${PROJECT_ID}/table`);
  if (res && res.data && Array.isArray(res.data)) {
    const table = res.data.find(t => t.table_name === tableName);
    return table ? String(table.table_id) : null;
  }
  return null;
}

async function main() {
  console.log('=== Phase 2: Create Tables (v3 — proper API format) ===\n');
  
  const tableIds = {};

  for (const tbl of TABLES) {
    console.log(`\n--- ${tbl.table_name} ---`);
    
    // Check if exists
    let id = await getTableId(tbl.table_name);
    if (id) {
      console.log(`  Already exists! ID: ${id}`);
      tableIds[tbl.placeholder] = id;
      continue;
    }
    
    // Build column_details with column_sequence
    const column_details = tbl.columns.map((col, idx) => {
      const c = {
        column_name: col.column_name,
        data_type: col.data_type,
        column_sequence: idx + 1,
        is_mandatory: false,
        is_unique: false,
      };
      if (col.max_length) c.max_length = col.max_length;
      return c;
    });

    // Try format 1: column_details array
    console.log('  Trying format 1 (column_details)...');
    let res = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table`, {
      table_name: tbl.table_name,
      column_details
    });
    console.log(`  Response: ${JSON.stringify(res).slice(0, 400)}`);
    
    await new Promise(r => setTimeout(r, 500));
    id = await getTableId(tbl.table_name);
    if (id) {
      console.log(`  ✅ Created! ID: ${id}`);
      tableIds[tbl.placeholder] = id;
      continue;
    }

    // Try format 2: columns array with different shape
    console.log('  Trying format 2 (columns)...');
    res = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table`, {
      table_name: tbl.table_name,
      columns: tbl.columns.map((col, idx) => ({
        column_name: col.column_name,
        data_type: col.data_type,
        column_sequence: idx + 1,
      }))
    });
    console.log(`  Response: ${JSON.stringify(res).slice(0, 400)}`);
    
    await new Promise(r => setTimeout(r, 500));
    id = await getTableId(tbl.table_name);
    if (id) {
      console.log(`  ✅ Created! ID: ${id}`);
      tableIds[tbl.placeholder] = id;
      continue;
    }

    // Try format 3: just table_name, no columns (create empty table, add columns after)
    console.log('  Trying format 3 (table only, no columns)...');
    res = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table`, {
      table_name: tbl.table_name
    });
    console.log(`  Response: ${JSON.stringify(res).slice(0, 400)}`);
    
    await new Promise(r => setTimeout(r, 500));
    id = await getTableId(tbl.table_name);
    if (id) {
      console.log(`  ✅ Table created (empty)! ID: ${id}`);
      // Now add columns
      for (const col of tbl.columns) {
        const colRes = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table/${id}/column`, {
          column_name: col.column_name,
          data_type: col.data_type,
          is_mandatory: false,
        });
        console.log(`    Column ${col.column_name}: ${colRes?.status || 'unknown'}`);
      }
      tableIds[tbl.placeholder] = id;
      continue;
    }

    console.log(`  ❌ All formats failed for ${tbl.table_name}`);
  }

  console.log('\n=== Results ===');
  console.log(JSON.stringify(tableIds, null, 2));

  // Update db.js
  const dbPath = path.join(__dirname, '..', 'src', 'models', 'db.js');
  let content = fs.readFileSync(dbPath, 'utf8');
  let updated = 0;
  for (const [placeholder, realId] of Object.entries(tableIds)) {
    if (content.includes(placeholder)) {
      content = content.replace(placeholder, realId);
      updated++;
      console.log(`Replaced ${placeholder} → ${realId}`);
    }
  }
  if (updated > 0) {
    fs.writeFileSync(dbPath, content, 'utf8');
    console.log(`\n✅ Updated db.js with ${updated} table ID(s)`);
  } else {
    console.log('\n⚠️  No replacements made');
  }
}

main()
  .then(() => { console.log('\nDone!'); process.exit(0); })
  .catch(err => { console.error('Fatal:', err); process.exit(1); });
