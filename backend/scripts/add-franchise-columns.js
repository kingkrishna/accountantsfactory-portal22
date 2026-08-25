'use strict';
require('dotenv').config();
const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

async function catalystCall(method, apiPath, body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(method, CATALYST_URL + apiPath, body || '', {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type':  'application/json',
    });
    if (result && result.status === 401 && attempt === 1) continue;
    return result;
  }
}

async function getTables() {
  const res = await catalystCall('GET', `/baas/v1/project/${PROJECT_ID}/table`);
  if (res && res.data && Array.isArray(res.data)) return res.data;
  return [];
}

async function createFranchiseTable() {
  const tableDef = {
    table_name: 'Franchises',
    columns: [
      { column_name: 'name', data_type: 'text', max_length: 200 },
      { column_name: 'owner_user_id', data_type: 'bigint' }
    ]
  };
  
  const res = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table`, tableDef);
  if (res && res.data && res.data.table_id) {
    console.log(`✅ Created Franchises Table: ${res.data.table_id}`);
  } else if (res && res.status === 'failure' && res.data && res.data.message && res.data.message.includes('already exists')) {
    console.log(`✅ Franchises Table already exists.`);
  } else {
    console.log(`❌ Failed to create Franchises Table:`, JSON.stringify(res));
  }
}

async function addColumnToTable(tableId, tableName) {
  const colDef = [{
    column_name: 'franchise_id',
    data_type: 'bigint'
  }];
  const res = await catalystCall('POST', `/baas/v1/project/${PROJECT_ID}/table/${tableId}/column`, colDef);
  if (res && res.data && res.data.column_id) {
    console.log(`✅ Added franchise_id to ${tableName}`);
  } else if (res && res.status === 'failure' && res.data && res.data.message && res.data.message.includes('already exists')) {
    console.log(`✅ franchise_id already exists in ${tableName}`);
  } else {
    console.log(`❌ Failed to add column to ${tableName}:`, JSON.stringify(res));
  }
}

async function run() {
  console.log("Fetching existing tables...");
  const tables = await getTables();
  const tableMap = {};
  tables.forEach(t => tableMap[t.table_name] = String(t.table_id));
  
  await createFranchiseTable();
  
  const targetTables = ['Users', 'ServiceOrders', 'Referrals', 'Documents'];
  for (const t of targetTables) {
    const tId = tableMap[t];
    if (tId) {
      console.log(`Adding column to ${t} (${tId})...`);
      await addColumnToTable(tId, t);
    } else {
      console.log(`❌ Could not find table ${t}`);
    }
  }
}

run().catch(console.error);
