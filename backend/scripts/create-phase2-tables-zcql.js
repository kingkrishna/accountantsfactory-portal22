/**
 * Create Phase 2 tables using Zoho Catalyst ZCQL (DDL).
 * 
 * Catalyst ZCQL supports CREATE TABLE syntax.
 * See: https://docs.catalyst.zoho.com/en/api/zcql/
 * 
 * Usage: cd api && node scripts/create-phase2-tables-zcql.js
 */
'use strict';

require('dotenv').config();

const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');
const fs = require('fs');
const path = require('path');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

async function catalystCall(method, apiPath, body, headers = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(method, CATALYST_URL + apiPath, body || '', {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type':  'application/json',
      ...headers,
    });
    if (result && result.status === 401 && attempt === 1) {
      console.log('  Got 401, retrying...');
      continue;
    }
    return result;
  }
}

// ZCQL DDL statements
const CREATE_STATEMENTS = [
  {
    name: 'CompanyProfile',
    dbKey: 'companyProfile',
    placeholder: 'PLACEHOLDER_COMPANY_PROFILE',
    sql: `CREATE TABLE CompanyProfile (
      user_id bigint,
      company_name text,
      pan_number text,
      company_category text,
      group_code text,
      franchise_code text,
      drive_link text
    )`
  },
  {
    name: 'ComplianceConfig',
    dbKey: 'complianceConfig',
    placeholder: 'PLACEHOLDER_COMPLIANCE_CONFIG',
    sql: `CREATE TABLE ComplianceConfig (
      user_id bigint,
      service_type text,
      is_applicable boolean,
      is_registered boolean,
      registration_number text,
      registration_date bigint
    )`
  },
  {
    name: 'ComplianceFiling',
    dbKey: 'complianceFiling',
    placeholder: 'PLACEHOLDER_COMPLIANCE_FILING',
    sql: `CREATE TABLE ComplianceFiling (
      user_id bigint,
      service_type text,
      financial_year text,
      period text,
      due_date bigint,
      filing_status text,
      filing_date bigint,
      payment_status text,
      payment_date bigint,
      notes text
    )`
  },
  {
    name: 'DocumentTemplate',
    dbKey: 'documentTemplate',
    placeholder: 'PLACEHOLDER_DOC_TEMPLATE',
    sql: `CREATE TABLE DocumentTemplate (
      template_name text,
      template_type text,
      template_html text,
      created_by bigint,
      is_active boolean
    )`
  },
  {
    name: 'GeneratedDocument',
    dbKey: 'generatedDocument',
    placeholder: 'PLACEHOLDER_GEN_DOCUMENT',
    sql: `CREATE TABLE GeneratedDocument (
      template_id bigint,
      user_id bigint,
      generated_html text,
      generated_at bigint,
      generated_by bigint
    )`
  }
];

async function executeZCQL(query) {
  const apiPath = `/baas/v1/project/${PROJECT_ID}/query`;
  const body = { query };
  return await catalystCall('POST', apiPath, body);
}

async function getTableId(tableName) {
  const res = await catalystCall('GET', `/baas/v1/project/${PROJECT_ID}/table`);
  if (res && res.data && Array.isArray(res.data)) {
    const table = res.data.find(t => t.table_name === tableName);
    return table ? String(table.table_id) : null;
  }
  return null;
}

async function main() {
  console.log('=== Phase 2: Creating Tables via ZCQL ===\n');
  
  const tableIds = {};
  
  for (const stmt of CREATE_STATEMENTS) {
    console.log(`Creating ${stmt.name}...`);
    
    // Check if already exists
    const existingId = await getTableId(stmt.name);
    if (existingId) {
      console.log(`  ✅ Already exists! ID: ${existingId}`);
      tableIds[stmt.placeholder] = existingId;
      continue;
    }
    
    // Try ZCQL CREATE TABLE
    const res = await executeZCQL(stmt.sql);
    console.log(`  Response: ${JSON.stringify(res).slice(0, 300)}`);
    
    // Wait a moment for table to be ready
    await new Promise(r => setTimeout(r, 1000));
    
    // Fetch the new table ID
    const newId = await getTableId(stmt.name);
    if (newId) {
      console.log(`  ✅ Created! ID: ${newId}`);
      tableIds[stmt.placeholder] = newId;
    } else {
      console.log(`  ❌ Could not find table after creation`);
    }
  }
  
  console.log('\n=== Results ===');
  console.log(JSON.stringify(tableIds, null, 2));
  
  // Update db.js
  if (Object.keys(tableIds).length > 0) {
    const dbPath = path.join(__dirname, '..', 'src', 'models', 'db.js');
    let content = fs.readFileSync(dbPath, 'utf8');
    let updated = 0;
    for (const [placeholder, realId] of Object.entries(tableIds)) {
      if (content.includes(placeholder)) {
        content = content.replace(placeholder, realId);
        updated++;
        console.log(`  Replaced ${placeholder} → ${realId}`);
      }
    }
    if (updated > 0) {
      fs.writeFileSync(dbPath, content, 'utf8');
      console.log(`\n✅ Updated db.js with ${updated} table ID(s)`);
    }
  }
}

main()
  .then(() => { console.log('\nDone!'); process.exit(0); })
  .catch(err => { console.error('Fatal:', err); process.exit(1); });
