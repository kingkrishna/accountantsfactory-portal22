// Provision or reset a sub_admin account on the LIVE Catalyst Data Store.
//
// Usage:
//   SUBADMIN_EMAIL=vijayawada@accountantsfactory.com \
//   SUBADMIN_PASSWORD='<strong-password-min-12-chars>' \
//   SUBADMIN_FRANCHISE_CODE=VIJAYAWADA \
//     node api/scripts/create-live-subadmin.js
//
// Forces must_change_password=true so the operator who runs this hands the
// admin a one-time password; the sub_admin is required to change it on
// first login.
//
// SECURITY: No password is hardcoded in this script. The previous version
// embedded 'Password@123' which leaked the live sub_admin credential to
// anyone with repo read access (security review v77 finding #2).

process.env.USE_LOCAL_MOCK = 'false';
require('dotenv').config();

const bcrypt = require('bcryptjs');
const prisma = require('../src/models/prismaClient');

async function createLiveSubAdmin() {
  const email = process.env.SUBADMIN_EMAIL;
  const password = process.env.SUBADMIN_PASSWORD;
  const franchiseCode = process.env.SUBADMIN_FRANCHISE_CODE;

  if (!email || !password || !franchiseCode) {
    console.error('FAIL: Set SUBADMIN_EMAIL, SUBADMIN_PASSWORD, SUBADMIN_FRANCHISE_CODE env vars before running.');
    process.exit(2);
  }
  if (password.length < 12) {
    console.error('FAIL: SUBADMIN_PASSWORD must be at least 12 chars.');
    process.exit(2);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('Checking if user exists in LIVE Catalyst...');
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.user.update({
      where: { email },
      data: {
        password_hash: hashedPassword,
        role: 'sub_admin',
        referral_code: franchiseCode.trim().toUpperCase(),
        must_change_password: true
      }
    });
    console.log(`Updated LIVE sub_admin: ${email} (must_change_password=true)`);
  } else {
    await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        role: 'sub_admin',
        status: 'active',
        referral_code: franchiseCode.trim().toUpperCase(),
        must_change_password: true
      }
    });
    console.log(`Created LIVE sub_admin: ${email} (must_change_password=true)`);
  }
}

createLiveSubAdmin()
  .then(() => console.log('Done.'))
  .catch(e => { console.error('Error:', e.message || e); process.exit(1); });
