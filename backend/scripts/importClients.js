/**
 * Bulk import all clients from client_credentials.md into the database.
 * Run from /backend: node scripts/importClients.js
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../src/models/prismaClient');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Parse the client_credentials.md file
function parseCredentials() {
    const possiblePaths = [
        path.join(__dirname, '../../_archive/client_credentials.md'),
        path.join(__dirname, '../client_credentials.md'),
        path.join(process.cwd(), '_archive/client_credentials.md'),
        path.join(process.cwd(), 'client_credentials.md'),
    ];
    let content;
    for (const p of possiblePaths) {
        try {
            content = fs.readFileSync(p, 'utf8');
            console.log('📂 Reading from:', p);
            break;
        } catch (e) { /* try next */ }
    }
    if (!content) return null;

    const lines = content.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Initial Password'));
    const clients = [];
    for (const line of lines) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 4) {
            const id = parts[0];
            const name = parts[1];
            const email = parts[2].toLowerCase().trim();
            const password = parts[3].replace(/`/g, '');
            if (email && password && id.startsWith('AF')) {
                clients.push({ clientId: id, name, email, password });
            }
        }
    }
    return clients;
}

function generateReferralCode() {
    return 'REF-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

async function importClients() {
    console.log('🔌 Connecting to database...');
    const clients = parseCredentials();

    if (!clients || clients.length === 0) {
        console.error('❌ Could not parse client credentials file.');
        process.exit(1);
    }

    console.log(`📋 Found ${clients.length} clients to import.\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const client of clients) {
        try {
            // Check if already exists
            const existing = await prisma.user.findUnique({ where: { email: client.email } });
            if (existing) {
                skipped++;
                continue;
            }

            // Hash the plain text password
            const hashedPassword = await bcrypt.hash(client.password, 10);

            // Generate unique referral code
            let referralCode;
            let attempts = 0;
            while (attempts < 10) {
                referralCode = generateReferralCode();
                const existingCode = await prisma.user.findUnique({ where: { referral_code: referralCode } });
                if (!existingCode) break;
                attempts++;
            }

            await prisma.user.create({
                data: {
                    email: client.email,
                    password_hash: hashedPassword,
                    role: 'client',
                    referral_code: referralCode,
                    status: 'active',
                    must_change_password: false
                }
            });

            created++;
            if (created % 50 === 0) {
                console.log(`   ✅ Imported ${created} clients so far...`);
            }
        } catch (err) {
            errors++;
            console.error(`   ❌ Error importing ${client.email}: ${err.message}`);
        }
    }

    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`✅ Created:  ${created}`);
    console.log(`⏭️  Skipped:  ${skipped} (already existed)`);
    console.log(`❌ Errors:   ${errors}`);
    console.log(`📊 Total processed: ${clients.length}`);

    await prisma.$disconnect();
}

importClients().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
