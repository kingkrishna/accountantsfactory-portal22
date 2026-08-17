/**
 * Migrate data from Railway MySQL → Neon PostgreSQL
 * Usage:
 *   MYSQL_URL="mysql://..." NEON_URL="postgresql://..." node scripts/migrateToNeon.js
 */
const mysql = require('mysql2/promise');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const { PrismaClient } = require('../../prisma-client');
const { PrismaNeon } = require('@prisma/adapter-neon');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

const MYSQL_URL = process.env.MYSQL_URL || 'mysql://root:ruHCQrofefcKdcgqxUMCqHZgznXGtlWQ@crossover.proxy.rlwy.net:16887/railway';
const NEON_URL = process.env.NEON_URL || process.env.DATABASE_URL;

async function migrate() {
  if (!NEON_URL || !NEON_URL.startsWith('postgresql')) {
    console.error('Set NEON_URL=postgresql://... before running');
    process.exit(1);
  }

  console.log('Connecting to Railway MySQL...');
  const mysql_conn = await mysql.createConnection(MYSQL_URL);

  console.log('Connecting to Neon PostgreSQL...');
  const pool = new Pool({ connectionString: NEON_URL });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  // --- Services ---
  const [services] = await mysql_conn.execute('SELECT * FROM Service');
  console.log(`Migrating ${services.length} services...`);
  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        name: s.name,
        description: s.description,
        is_active: Boolean(s.is_active),
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }
  console.log('✔ Services done');

  // --- Users ---
  const [users] = await mysql_conn.execute('SELECT * FROM User');
  console.log(`Migrating ${users.length} users...`);
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        email: u.email,
        password_hash: u.password_hash,
        role: u.role,
        referral_code: u.referral_code,
        status: u.status,
        totp_secret: u.totp_secret,
        totp_enabled: Boolean(u.totp_enabled),
        must_change_password: Boolean(u.must_change_password),
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }
  console.log('✔ Users done');

  // --- ServiceOrders ---
  const [orders] = await mysql_conn.execute('SELECT * FROM ServiceOrder');
  console.log(`Migrating ${orders.length} service orders...`);
  for (const o of orders) {
    await prisma.serviceOrder.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        user_id: o.user_id,
        employee_id: o.employee_id,
        service_id: o.service_id,
        period: o.period,
        status: o.status,
        createdAt: new Date(o.createdAt),
        updatedAt: new Date(o.updatedAt),
      },
    });
  }
  console.log('✔ ServiceOrders done');

  // --- ServiceRequests ---
  const [reqs] = await mysql_conn.execute('SELECT * FROM ServiceRequest');
  console.log(`Migrating ${reqs.length} service requests...`);
  for (const r of reqs) {
    await prisma.serviceRequest.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        user_id: r.user_id,
        service_id: r.service_id,
        period: r.period,
        notes: r.notes,
        status: r.status,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
    });
  }
  console.log('✔ ServiceRequests done');

  // --- ServiceComments ---
  const [comments] = await mysql_conn.execute('SELECT * FROM ServiceComment');
  console.log(`Migrating ${comments.length} comments...`);
  for (const c of comments) {
    await prisma.serviceComment.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        service_order_id: c.service_order_id,
        user_id: c.user_id,
        comment: c.comment,
        created_at: new Date(c.created_at),
      },
    });
  }
  console.log('✔ Comments done');

  // --- Documents ---
  const [docs] = await mysql_conn.execute('SELECT * FROM Document');
  console.log(`Migrating ${docs.length} documents...`);
  for (const d of docs) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        user_id: d.user_id,
        service_order_id: d.service_order_id,
        file_name: d.file_name,
        download_url: d.download_url,
        embed_code: d.embed_code,
        uploaded_by: d.uploaded_by,
        uploaded_at: new Date(d.uploaded_at),
      },
    });
  }
  console.log('✔ Documents done');

  // --- Referrals ---
  const [refs] = await mysql_conn.execute('SELECT * FROM Referral');
  console.log(`Migrating ${refs.length} referrals...`);
  for (const r of refs) {
    await prisma.referral.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        referrer_user_id: r.referrer_user_id,
        referred_name: r.referred_name,
        referred_email: r.referred_email,
        service_id: r.service_id,
        service_order_id: r.service_order_id,
        bonus_amount: r.bonus_amount,
        status: r.status,
        reason: r.reason,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      },
    });
  }
  console.log('✔ Referrals done');

  // --- WorkUpdates ---
  const [workUpdates] = await mysql_conn.execute('SELECT * FROM WorkUpdate');
  console.log(`Migrating ${workUpdates.length} work updates...`);
  for (const w of workUpdates) {
    await prisma.workUpdate.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        service_order_id: w.service_order_id,
        employee_id: w.employee_id,
        status: w.status,
        comments: w.comments,
        date: new Date(w.date),
      },
    });
  }
  console.log('✔ WorkUpdates done');

  // --- PasswordResetTokens ---
  const [tokens] = await mysql_conn.execute('SELECT * FROM PasswordResetToken');
  console.log(`Migrating ${tokens.length} password reset tokens...`);
  for (const t of tokens) {
    await prisma.passwordResetToken.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        user_id: t.user_id,
        token: t.token,
        expires_at: new Date(t.expires_at),
        used: Boolean(t.used),
        created_at: new Date(t.created_at),
      },
    });
  }
  console.log('✔ PasswordResetTokens done');

  // --- AuditLogs ---
  const [logs] = await mysql_conn.execute('SELECT * FROM AuditLog');
  console.log(`Migrating ${logs.length} audit logs...`);
  for (const l of logs) {
    await prisma.auditLog.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        user_id: l.user_id,
        action: l.action,
        resource_type: l.resource_type,
        resource_id: l.resource_id,
        ip_address: l.ip_address,
        user_agent: l.user_agent,
        created_at: new Date(l.created_at),
      },
    });
  }
  console.log('✔ AuditLogs done');

  // --- ContactMessages ---
  const [msgs] = await mysql_conn.execute('SELECT * FROM ContactMessage');
  console.log(`Migrating ${msgs.length} contact messages...`);
  for (const m of msgs) {
    await prisma.contactMessage.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        name: m.name,
        email: m.email,
        mobile: m.mobile,
        service: m.service,
        message: m.message,
        status: m.status,
        source: m.source,
        ticket_id: m.ticket_id,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      },
    });
  }
  console.log('✔ ContactMessages done');

  await mysql_conn.end();
  await prisma.$disconnect();
  console.log('\n✅ Migration complete!');
}

migrate().catch(e => { console.error(e); process.exit(1); });
