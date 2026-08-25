const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../src/models/prismaClient');
require('dotenv').config();

function generateReferralCode() {
  return 'REF-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node createAdmin.js <email> <password>');
    console.error('Example: node createAdmin.js admin@accountantsfactory.com MySecure@Pass123');
    process.exit(1);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 255) {
    console.error('Error: Invalid email format');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long');
    process.exit(1);
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    console.error('Error: Password must contain uppercase, lowercase, number, and special character');
    process.exit(1);
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      console.error('Error: Admin with this email already exists');
      process.exit(1);
    }

    let referralCode;
    let attempts = 0;
    while (attempts < 10) {
      referralCode = generateReferralCode();
      const existingCode = await prisma.user.findUnique({ where: { referral_code: referralCode } });
      if (!existingCode) break;
      attempts++;
    }

    if (attempts >= 10) {
      console.error('Error: Failed to generate unique referral code');
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password_hash: hashedPassword,
        role: 'admin',
        referral_code: referralCode,
        status: 'active',
        must_change_password: false
      }
    });

    console.log('✅ Admin user created successfully via Prisma!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Role: admin`);
    console.log(`   Referral Code: ${referralCode}`);
    console.log(`   Status: active`);
    console.log('\n⚠️  Please save these credentials securely!');

  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
