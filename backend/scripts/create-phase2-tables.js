/**
 * Create Phase 2 tables in Zoho Catalyst Data Store
 * 
 * This script creates the 5 required tables and updates db.js with real IDs.
 * 
 * Usage: cd api && node scripts/create-phase2-tables.js
 */
'use strict';

require('dotenv').config();

const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');
const fs = require('fs');
const path = require('path');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

async function catalystCall(method, apiPath, body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(method, CATALYST_URL + apiPath, body || '', {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type':  'application/json',
    });
    if (result && result.status === 401 && attempt === 1) {
      console.log('  Got 401, retrying with fresh token...');
      continue;
    }
    return result;
  }
}

// Column type mappings for Catalyst Data Store
// Types: text (string), bigint (number), boolean
const TABLES_TO_CREATE = [
  {
    table_name: 'CompanyProfile',
    dbKey: 'companyProfile',
    placeholder: 'PLACEHOLDER_COMPANY_PROFILE',
    columns: [
      { column_name: 'user_id',          column_type: { type: 'bigint' } },
      { column_name: 'company_name',     column_type: { type: 'text' },   max_length: 200 },
      { column_name: 'pan_number',       column_type: { type: 'text' },   max_length: 20 },
      { column_name: 'company_category', column_type: { type: 'text' },   max_length: 50 },
      { column_name: 'group_code',       column_type: { type: 'text' },   max_length: 50 },
      { column_name: 'franchise_code',   column_type: { type: 'text' },   max_length: 50 },
      { column_name: 'drive_link',       column_type: { type: 'text' },   max_length: 500 },
    ]
  },
  {
    table_name: 'ComplianceConfig',
    dbKey: 'complianceConfig',
    placeholder: 'PLACEHOLDER_COMPLIANCE_CONFIG',
    columns: [
      { column_name: 'user_id',             column_type: { type: 'bigint' } },
      { column_name: 'service_type',        column_type: { type: 'text' },    max_length: 30 },
      { column_name: 'is_applicable',       column_type: { type: 'boolean' } },
      { column_name: 'is_registered',       column_type: { type: 'boolean' } },
      { column_name: 'registration_number', column_type: { type: 'text' },    max_length: 100 },
      { column_name: 'registration_date',   column_type: { type: 'bigint' } },
    ]
  },
  {
    table_name: 'ComplianceFiling',
    dbKey: 'complianceFiling',
    placeholder: 'PLACEHOLDER_COMPLIANCE_FILING',
    columns: [
      { column_name: 'user_id',        column_type: { type: 'bigint' } },
      { column_name: 'service_type',   column_type: { type: 'text' },    max_length: 30 },
      { column_name: 'financial_year', column_type: { type: 'text' },    max_length: 20 },
      { column_name: 'period',         column_type: { type: 'text' },    max_length: 30 },
      { column_name: 'due_date',       column_type: { type: 'bigint' } },
      { column_name: 'filing_status',  column_type: { type: 'text' },    max_length: 20 },
      { column_name: 'filing_date',    column_type: { type: 'bigint' } },
      { column_name: 'payment_status', column_type: { type: 'text' },    max_length: 20 },
      { column_name: 'payment_date',   column_type: { type: 'bigint' } },
      { column_name: 'notes',          column_type: { type: 'text' },    max_length: 500 },
    ]
  },
  {
    table_name: 'DocumentTemplate',
    dbKey: 'documentTemplate',
    placeholder: 'PLACEHOLDER_DOC_TEMPLATE',
    columns: [
      { column_name: 'template_name', column_type: { type: 'text' },    max_length: 200 },
      { column_name: 'template_type', column_type: { type: 'text' },    max_length: 30 },
      { column_name: 'template_html', column_type: { type: 'text' },    max_length: 50000 },
      { column_name: 'created_by',    column_type: { type: 'bigint' } },
      { column_name: 'is_active',     column_type: { type: 'boolean' } },
    ]
  },
  {
    table_name: 'GeneratedDocument',
    dbKey: 'generatedDocument',
    placeholder: 'PLACEHOLDER_GEN_DOCUMENT',
    columns: [
      { column_name: 'template_id',    column_type: { type: 'bigint' } },
      { column_name: 'user_id',        column_type: { type: 'bigint' } },
      { column_name: 'generated_html', column_type: { type: 'text' },    max_length: 50000 },
      { column_name: 'generated_at',   column_type: { type: 'bigint' } },
      { column_name: 'generated_by',   column_type: { type: 'bigint' } },
    ]
  }
];

async function createTable(tableDef) {
  console.log(`\nCreating table: ${tableDef.table_name}...`);
  
  const apiPath = `/baas/v1/project/${PROJECT_ID}/table`;
  const body = {
    table_name: tableDef.table_name,
    columns: tableDef.columns.map(col => {
      const c = { column_name: col.column_name, data_type: col.column_type.type };
      if (col.max_length) c.max_length = col.max_length;
      return c;
    })
  };

  try {
    const res = await catalystCall('POST', apiPath, body);
    
    if (res && res.data && res.data.table_id) {
      console.log(`  ✅ Created! Table ID: ${res.data.table_id}`);
      return res.data.table_id;
    }
    
    // Try alternative response formats
    if (res && res.data && Array.isArray(res.data) && res.data[0]) {
      const id = res.data[0].table_id || res.data[0].TABLEID;
      if (id) {
        console.log(`  ✅ Created! Table ID: ${id}`);
        return String(id);
      }
    }

    // Check if table already exists
    if (res && res.data && res.data.message && /already exists/i.test(res.data.message)) {
      console.log(`  ⚠️  Table already exists. Looking up ID...`);
      return await findTableId(tableDef.table_name);
    }
    
    // Check for error response
    if (res && res.status === 'failure') {
      const msg = res.data?.message || JSON.stringify(res.data);
      if (/already exists/i.test(msg)) {
        console.log(`  ⚠️  Table already exists. Looking up ID...`);
        return await findTableId(tableDef.table_name);
      }
      console.error(`  ❌ Failed: ${msg}`);
      return null;
    }
    
    console.log(`  Response:`, JSON.stringify(res).slice(0, 500));
    // Try to extract ID from any response shape
    const resStr = JSON.stringify(res);
    const idMatch = resStr.match(/"table_id"\s*:\s*"?(\d+)"?/);
    if (idMatch) {
      console.log(`  ✅ Extracted Table ID: ${idMatch[1]}`);
      return idMatch[1];
    }
    
    return null;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return null;
  }
}

async function findTableId(tableName) {
  try {
    const res = await catalystCall('GET', `/baas/v1/project/${PROJECT_ID}/table`);
    if (res && res.data && Array.isArray(res.data)) {
      const table = res.data.find(t => t.table_name === tableName);
      if (table) {
        console.log(`  Found existing table ID: ${table.table_id}`);
        return String(table.table_id);
      }
    }
    console.log('  Could not find table in listing');
    return null;
  } catch (err) {
    console.error(`  Error listing tables: ${err.message}`);
    return null;
  }
}

function updateDbJs(tableIds) {
  const dbPath = path.join(__dirname, '..', 'src', 'models', 'db.js');
  let content = fs.readFileSync(dbPath, 'utf8');
  
  let updated = 0;
  for (const [placeholder, realId] of Object.entries(tableIds)) {
    if (realId && content.includes(placeholder)) {
      content = content.replace(placeholder, realId);
      updated++;
      console.log(`  Replaced ${placeholder} → ${realId}`);
    }
  }
  
  if (updated > 0) {
    fs.writeFileSync(dbPath, content, 'utf8');
    console.log(`\n✅ Updated db.js with ${updated} table ID(s)`);
  } else {
    console.log('\n⚠️  No placeholders were replaced in db.js');
  }
}

async function main() {
  console.log('=== Phase 2: Creating Catalyst Data Store Tables ===');
  console.log(`Project ID: ${PROJECT_ID}`);
  
  // First, list existing tables to check what's already there
  console.log('\nListing existing tables...');
  try {
    const listRes = await catalystCall('GET', `/baas/v1/project/${PROJECT_ID}/table`);
    if (listRes && listRes.data && Array.isArray(listRes.data)) {
      console.log(`Found ${listRes.data.length} existing tables:`);
      listRes.data.forEach(t => console.log(`  - ${t.table_name} (ID: ${t.table_id})`));
    }
  } catch (e) {
    console.log('Could not list tables:', e.message);
  }
  
  const tableIds = {};
  
  for (const tableDef of TABLES_TO_CREATE) {
    const tableId = await createTable(tableDef);
    if (tableId) {
      tableIds[tableDef.placeholder] = String(tableId);
    }
  }
  
  console.log('\n=== Results ===');
  console.log(JSON.stringify(tableIds, null, 2));
  
  // Update db.js
  if (Object.keys(tableIds).length > 0) {
    console.log('\nUpdating db.js with real table IDs...');
    updateDbJs(tableIds);
  } else {
    console.log('\n❌ No table IDs retrieved. Check errors above.');
  }
}

main()
  .then(() => { console.log('\nDone!'); process.exit(0); })
  .catch(err => { console.error('Fatal:', err); process.exit(1); });
