/**
 * Full database setup: schema + services + admin + all clients
 * Run: node scripts/fullSetup.js
 */
const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../src/models/prismaClient');
require('dotenv').config();

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

function parseCredentials() {
    const possiblePaths = [
        path.join(__dirname, '../../_archive/client_credentials.md'),
        path.join(__dirname, '../client_credentials.md'),
        path.join(process.cwd(), '_archive/client_credentials.md'),
        path.join(process.cwd(), 'client_credentials.md'),
    ];
    let content;
    for (const p of possiblePaths) {
        try { content = fs.readFileSync(p, 'utf8'); console.log('📂 Reading from:', p); break; }
        catch (e) { /* try next */ }
    }
    if (!content) return [];
    const lines = content.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Initial Password'));
    const clients = [];
    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 4) {
            const id = parts[0], name = parts[1];
            const email = parts[2].toLowerCase().trim();
            const password = parts[3].replace(/`/g, '');
            if (email && password && id.startsWith('AF')) clients.push({ clientId: id, name, email, password });
        }
    }
    return clients;
}

async function main() {
    console.log('\n========================================');
    console.log('  AccountantsFactory Full DB Setup');
    console.log('========================================\n');

    // Step 1: Push schema
    console.log('📦 Step 1: Applying database schema...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Schema applied\n');

    // Step 2: Seed services
    console.log('📋 Step 2: Seeding services...');
    const existingServices = await prisma.service.count();
    if (existingServices > 0) {
        console.log(`⏭️  Services already exist (${existingServices}), skipping\n`);
    } else {
        const services = [
            'GST Registration', 'GST Returns (Monthly / Quarterly)', 'Income Tax Filing',
            'Company / LLP Registration', 'PF & ESI Compliance', 'ROC Filings',
            'Bookkeeping', 'Tax Consultation', 'Audit Support', 'Compliance Services',
            'Virtual CFO Services', 'TDS Return Filing', 'MSME Registration',
            'Professional Tax', 'Startup India Registration'
        ];
        await prisma.service.createMany({ data: services.map(name => ({ name, is_active: true })) });
        console.log(`✅ Created ${services.length} services\n`);
    }

    // Step 3: Create admin
    console.log('👤 Step 3: Creating admin user...');
    const adminEmail = 'nitin@accountantsfactory.com';
    const adminPassword = 'Accounts@22';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingAdmin) {
        console.log(`⏭️  Admin already exists: ${adminEmail}\n`);
    } else {
        const hash = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
            data: { email: adminEmail, password_hash: hash, role: 'admin', status: 'active', must_change_password: false }
        });
        console.log(`✅ Admin created: ${adminEmail}\n`);
    }

    // Step 4: Import all clients
    console.log('👥 Step 4: Importing clients...');
    const clients = parseCredentials();
    if (clients.length === 0) {
        console.log('⚠️  No client_credentials.md found — skipping client import\n');
    } else {
        console.log(`📋 Found ${clients.length} clients\n`);
        let created = 0, skipped = 0, errors = 0;
        for (const client of clients) {
            try {
                const existing = await prisma.user.findUnique({ where: { email: client.email } });
                if (existing) { skipped++; continue; }
                let referralCode;
                for (let i = 0; i < 10; i++) {
                    referralCode = generateReferralCode();
                    const exists = await prisma.user.findUnique({ where: { referral_code: referralCode } });
                    if (!exists) break;
                }
                const hash = await bcrypt.hash(client.password, 10);
                await prisma.user.create({
                    data: { email: client.email, password_hash: hash, role: 'client', referral_code: referralCode, status: 'active', must_change_password: false }
                });
                created++;
                if (created % 20 === 0) console.log(`   ✅ Imported ${created} clients...`);
            } catch (err) {
                errors++;
                console.error(`   ❌ ${client.email}: ${err.message}`);
            }
        }
        console.log(`\n✅ Clients imported: ${created}`);
        console.log(`⏭️  Skipped (existed): ${skipped}`);
        console.log(`❌ Errors: ${errors}\n`);
    }

    console.log('========================================');
    console.log('  ✅ Setup Complete!');
    console.log('========================================');
    console.log(`\nAdmin login:`);
    console.log(`  Email:    nitin@accountantsfactory.com`);
    console.log(`  Password: Accounts@22\n`);
    await prisma.$disconnect();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
