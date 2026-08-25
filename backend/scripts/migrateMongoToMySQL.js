/**
 * Migration Script: MongoDB Atlas → MySQL (Prisma)
 * Migrates: Users, Services, ServiceOrders
 * Run: node scripts/migrateMongoToMySQL.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');

const MONGODB_URI = 'mongodb+srv://rk3848180_db_user:ItiexUYKamUDNISM@cluster0.sijzjfe.mongodb.net/accountantsfactory_portal?retryWrites=true&w=majority&authSource=admin';

const prisma = new PrismaClient();

async function migrate() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  console.log('Connected to MongoDB.\n');

  // ── 1. MIGRATE SERVICES ──────────────────────────────────────────────
  console.log('--- Migrating Services ---');
  const mongoServices = await db.collection('Service').find({}).toArray();
  let serviceCount = 0;
  const serviceIdMap = {}; // mongo _id → mysql cuid

  for (const s of mongoServices) {
    try {
      const created = await prisma.service.upsert({
        where: { id: s._id.toString() },
        update: {},
        create: {
          id: s._id.toString(),
          name: s.name || 'Unknown Service',
          description: s.description || null,
          is_active: s.is_active !== undefined ? s.is_active : true,
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        },
      });
      serviceIdMap[s._id.toString()] = created.id;
      serviceCount++;
    } catch (e) {
      console.warn(`  ⚠ Skipped service ${s.name}: ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`✅ Services migrated: ${serviceCount}/${mongoServices.length}\n`);

  // ── 2. MIGRATE USERS ─────────────────────────────────────────────────
  console.log('--- Migrating Users ---');
  const mongoUsers = await db.collection('User').find({}).toArray();
  let userCount = 0;
  let userSkipped = 0;
  const userIdMap = {}; // mongo _id → mysql id

  for (const u of mongoUsers) {
    try {
      const created = await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u._id.toString(),
          email: u.email,
          password_hash: u.password_hash || u.password || '',
          role: u.role || 'client',
          referral_code: u.referral_code || null,
          status: u.status || 'active',
          totp_secret: u.totp_secret || null,
          totp_enabled: u.totp_enabled || false,
          must_change_password: u.must_change_password || false,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
      });
      userIdMap[u._id.toString()] = created.id;
      userCount++;
    } catch (e) {
      userSkipped++;
      console.warn(`  ⚠ Skipped user ${u.email}: ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`✅ Users migrated: ${userCount}/${mongoUsers.length} (skipped: ${userSkipped})\n`);

  // ── 3. MIGRATE SERVICE ORDERS ─────────────────────────────────────────
  console.log('--- Migrating Service Orders ---');
  const mongoOrders = await db.collection('ServiceOrder').find({}).toArray();
  let orderCount = 0;
  let orderSkipped = 0;

  for (const o of mongoOrders) {
    const userId = o.user_id?.toString() || o.userId?.toString();
    const serviceId = o.service_id?.toString() || o.serviceId?.toString();

    if (!userId || !serviceId) {
      orderSkipped++;
      console.warn(`  ⚠ Skipped order (missing user_id or service_id)`);
      continue;
    }

    // Check linked user and service exist in MySQL
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    const serviceExists = await prisma.service.findUnique({ where: { id: serviceId } });

    if (!userExists || !serviceExists) {
      orderSkipped++;
      console.warn(`  ⚠ Skipped order: user or service not found in MySQL`);
      continue;
    }

    try {
      await prisma.serviceOrder.upsert({
        where: { id: o._id.toString() },
        update: {},
        create: {
          id: o._id.toString(),
          user_id: userId,
          employee_id: o.employee_id?.toString() || null,
          service_id: serviceId,
          period: o.period || null,
          status: o.status || 'pending',
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
          updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
        },
      });
      orderCount++;
    } catch (e) {
      orderSkipped++;
      console.warn(`  ⚠ Skipped order ${o._id}: ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`✅ Service Orders migrated: ${orderCount}/${mongoOrders.length} (skipped: ${orderSkipped})\n`);

  // ── SUMMARY ───────────────────────────────────────────────────────────
  const totalUsers = await prisma.user.count();
  const totalServices = await prisma.service.count();
  const totalOrders = await prisma.serviceOrder.count();

  console.log('================================');
  console.log('Migration Complete!');
  console.log('================================');
  console.log('MySQL now has:');
  console.log('  Users:', totalUsers);
  console.log('  Services:', totalServices);
  console.log('  Service Orders:', totalOrders);

  await mongoose.disconnect();
  await prisma.$disconnect();
}

migrate().catch(async (e) => {
  console.error('Migration failed:', e.message);
  await mongoose.disconnect().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
