'use strict';
/**
 * Migrate data from Railway MySQL → Zoho Catalyst Data Store
 * Run: node api/scripts/migrateToCatalyst.js
 *
 * Uses Catalyst REST API directly (no SDK needed locally)
 */
const mysql = require('mysql2/promise');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────────────────
const MYSQL_URL = 'mysql://root:ruHCQrofefcKdcgqxUMCqHZgznXGtlWQ@crossover.proxy.rlwy.net:16887/railway';
const PROJECT_ID = '18944000000044043';
const TOKEN_FILE = path.join(__dirname, '../../.catalyst-token');

function getToken() {
  return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
}

const TABLES = {
  Users:              '18944000000047054',
  Services:           '18944000000038069',
  ServiceOrders:      '18944000000046113',
  ServiceRequests:    '18944000000047779',
  ServiceComments:    '18944000000038816',
  WorkUpdates:        '18944000000054538',
  Documents:          '18944000000042092',
  Referrals:          '18944000000039198',
  PasswordResetTokens:'18944000000039930',
  AuditLogs:          '18944000000044192',
  ContactMessages:    '18944000000053516',
};

// ─── Catalyst REST helpers ───────────────────────────────────────────────────
async function insertRow(tableName, data) {
  const tableId = TABLES[tableName];
  const token = getToken();
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.catalyst.zoho.in',
      path: `/baas/v1/project/${PROJECT_ID}/table/${tableId}/row`,
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const d = JSON.parse(data);
          if (d.status === 'success') resolve(d.data);
          else reject(new Error(`Insert ${tableName} failed: ${JSON.stringify(d.data)}`));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Insert a batch (array of row objects)
async function insertBatch(tableName, rows, batchSize = 10) {
  const results = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      const r = await insertRow(tableName, row);
      results.push(r);
    }
    process.stdout.write(`  ${tableName}: ${Math.min(i + batchSize, rows.length)}/${rows.length}\r`);
    if (rows.length > 20) await new Promise(r => setTimeout(r, 200)); // rate limit
  }
  console.log(`  ${tableName}: ${rows.length} rows done         `);
  return results;
}

// ─── Main migration ──────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(MYSQL_URL);
  console.log('Connected to Railway MySQL');

  // ID mapping: old cuid → new Catalyst ROWID (string)
  const userMap = {};
  const serviceMap = {};
  const orderMap = {};
  const requestMap = {};

  // ─ Users ─────────────────────────────────────────────────────────────────
  console.log('\nMigrating Users...');
  const [users] = await conn.execute('SELECT * FROM User ORDER BY createdAt ASC');
  for (const u of users) {
    const row = {
      email: u.email,
      password_hash: u.password_hash,
      role: u.role || 'client',
      referral_code: u.referral_code || null,
      status: u.status || 'active',
      totp_secret: u.totp_secret || null,
      totp_enabled: u.totp_enabled ? true : false,
      must_change_password: u.must_change_password ? true : false,
    };
    try {
      const inserted = await insertRow('Users', row);
      userMap[u.id] = String(inserted.ROWID);
    } catch (e) {
      console.error(`  User ${u.email} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Users migrated: ${Object.keys(userMap).length}/${users.length}`);

  // ─ Services ──────────────────────────────────────────────────────────────
  console.log('\nMigrating Services...');
  const [services] = await conn.execute('SELECT * FROM Service ORDER BY createdAt ASC');
  for (const s of services) {
    const row = {
      name: s.name,
      description: s.description || null,
      is_active: s.is_active ? true : false,
    };
    try {
      const inserted = await insertRow('Services', row);
      serviceMap[s.id] = String(inserted.ROWID);
    } catch (e) {
      console.error(`  Service ${s.name} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Services migrated: ${Object.keys(serviceMap).length}/${services.length}`);

  // ─ ServiceOrders ─────────────────────────────────────────────────────────
  console.log('\nMigrating ServiceOrders...');
  const [orders] = await conn.execute('SELECT * FROM ServiceOrder ORDER BY createdAt ASC');
  for (const o of orders) {
    const uid = userMap[o.user_id];
    const sid = serviceMap[o.service_id];
    if (!uid || !sid) {
      console.error(`  Order ${o.id}: missing user or service mapping`);
      continue;
    }
    const row = {
      user_id: parseInt(uid, 10),
      employee_id: o.employee_id && userMap[o.employee_id] ? parseInt(userMap[o.employee_id], 10) : null,
      service_id: parseInt(sid, 10),
      period: o.period || null,
      status: o.status || 'pending',
    };
    try {
      const inserted = await insertRow('ServiceOrders', row);
      orderMap[o.id] = String(inserted.ROWID);
    } catch (e) {
      console.error(`  Order ${o.id} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Orders migrated: ${Object.keys(orderMap).length}/${orders.length}`);

  // ─ ServiceRequests ───────────────────────────────────────────────────────
  console.log('\nMigrating ServiceRequests...');
  const [sreqs] = await conn.execute('SELECT * FROM ServiceRequest ORDER BY createdAt ASC');
  for (const r of sreqs) {
    const uid = userMap[r.user_id];
    const sid = serviceMap[r.service_id];
    if (!uid || !sid) continue;
    const row = {
      user_id: parseInt(uid, 10),
      service_id: parseInt(sid, 10),
      period: r.period || null,
      notes: r.notes || null,
      status: r.status || 'pending',
    };
    try {
      const inserted = await insertRow('ServiceRequests', row);
      requestMap[r.id] = String(inserted.ROWID);
    } catch (e) {
      console.error(`  Request ${r.id} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Requests migrated: ${Object.keys(requestMap).length}/${sreqs.length}`);

  // ─ Documents ─────────────────────────────────────────────────────────────
  console.log('\nMigrating Documents...');
  const [docs] = await conn.execute('SELECT * FROM Document ORDER BY uploaded_at ASC');
  let docCount = 0;
  for (const d of docs) {
    const uid = userMap[d.user_id];
    const oid = orderMap[d.service_order_id];
    const uploader = userMap[d.uploaded_by];
    if (!uid || !oid || !uploader) continue;
    const row = {
      user_id: parseInt(uid, 10),
      service_order_id: parseInt(oid, 10),
      file_name: d.file_name,
      download_url: d.download_url,
      embed_code: d.embed_code || null,
      uploaded_by: parseInt(uploader, 10),
    };
    try {
      await insertRow('Documents', row);
      docCount++;
    } catch (e) {
      console.error(`  Doc ${d.id} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Documents migrated: ${docCount}/${docs.length}`);

  // ─ Referrals ─────────────────────────────────────────────────────────────
  console.log('\nMigrating Referrals...');
  const [refs] = await conn.execute('SELECT * FROM Referral ORDER BY createdAt ASC');
  let refCount = 0;
  for (const r of refs) {
    const ruid = userMap[r.referrer_user_id];
    if (!ruid) continue;
    const row = {
      referrer_user_id: parseInt(ruid, 10),
      referred_name: r.referred_name || null,
      referred_email: r.referred_email || null,
      service_id: r.service_id && serviceMap[r.service_id] ? parseInt(serviceMap[r.service_id], 10) : null,
      service_order_id: r.service_order_id && orderMap[r.service_order_id] ? parseInt(orderMap[r.service_order_id], 10) : null,
      bonus_amount: parseFloat(r.bonus_amount || 0),
      status: r.status || 'pending',
      reason: r.reason || null,
    };
    try {
      await insertRow('Referrals', row);
      refCount++;
    } catch (e) {
      console.error(`  Ref ${r.id} failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  Referrals migrated: ${refCount}/${refs.length}`);

  // ─ ContactMessages ───────────────────────────────────────────────────────
  console.log('\nMigrating ContactMessages...');
  let [contacts] = [[]];
  try {
    [contacts] = await conn.execute('SELECT * FROM ContactMessage ORDER BY createdAt ASC');
  } catch (e) { console.log('  No ContactMessage table found, skipping'); }
  let cCount = 0;
  for (const c of contacts) {
    const row = {
      name: c.name,
      email: c.email,
      mobile: c.mobile || null,
      service: c.service || null,
      message: c.message || null,
      status: c.status || 'new',
      source: c.source || 'website',
      ticket_id: c.ticket_id || null,
    };
    try {
      await insertRow('ContactMessages', row);
      cCount++;
    } catch (e) {
      console.error(`  Contact failed:`, e.message);
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`  ContactMessages migrated: ${cCount}/${contacts.length}`);

  await conn.end();
  console.log('\n✓ Migration complete!');
  console.log(`  Users: ${Object.keys(userMap).length}, Services: ${Object.keys(serviceMap).length}, Orders: ${Object.keys(orderMap).length}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
