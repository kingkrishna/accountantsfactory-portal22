'use strict';
require('dotenv').config();

const { httpRequest } = require('../src/infra/dataStore/catalyst.client');
const { getAccessToken } = require('../src/infra/dataStore/catalyst.token');

const CATALYST_URL = 'https://api.catalyst.zoho.in';
const PROJECT_ID   = process.env.CATALYST_PROJECT_ID || '18944000000044043';

async function executeZCQL(query) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest('POST', CATALYST_URL + `/baas/v1/project/${PROJECT_ID}/query`, { query }, {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type':  'application/json',
    });
    if (result && result.status === 401 && attempt === 1) continue;
    return result;
  }
}

async function run() {
  console.log("Creating Franchises table...");
  const createFranchises = await executeZCQL(`CREATE TABLE Franchises (name text, owner_user_id bigint)`);
  console.log("Franchises Table:", JSON.stringify(createFranchises, null, 2));

  console.log("\nAdding franchise_id column to Users...");
  const alterUsers = await executeZCQL(`ALTER TABLE Users ADD COLUMN franchise_id bigint`);
  console.log("Users Table:", JSON.stringify(alterUsers, null, 2));

  console.log("\nAdding franchise_id column to ServiceOrders...");
  const alterOrders = await executeZCQL(`ALTER TABLE ServiceOrders ADD COLUMN franchise_id bigint`);
  console.log("ServiceOrders Table:", JSON.stringify(alterOrders, null, 2));

  console.log("\nAdding franchise_id column to Referrals...");
  const alterReferrals = await executeZCQL(`ALTER TABLE Referrals ADD COLUMN franchise_id bigint`);
  console.log("Referrals Table:", JSON.stringify(alterReferrals, null, 2));
  
  console.log("\nAdding franchise_id column to Documents...");
  const alterDocs = await executeZCQL(`ALTER TABLE Documents ADD COLUMN franchise_id bigint`);
  console.log("Documents Table:", JSON.stringify(alterDocs, null, 2));
}

run().catch(console.error);
