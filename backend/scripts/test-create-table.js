'use strict';
require('dotenv').config();
const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

async function testCreateTable() {
  const token = await getAccessToken();
  const body = {
    table_name: 'FranchiseUsers',
    columns: [
      { column_name: 'user_id', data_type: 'bigint' },
      { column_name: 'franchise_code', data_type: 'text', max_length: 50 }
    ]
  };
  
  const res = await httpRequest('POST', CATALYST_URL + `/baas/v1/project/${PROJECT_ID}/table`, body, {
    'Authorization': `Zoho-oauthtoken ${token}`,
    'Content-Type':  'application/json',
  });
  console.log(JSON.stringify(res, null, 2));
}

testCreateTable().catch(console.error);
