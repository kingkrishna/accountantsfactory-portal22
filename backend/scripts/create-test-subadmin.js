// Provision or reset a sub_admin account on the LOCAL/test data store.
//
// Usage:
//   SUBADMIN_EMAIL=user@example.com \
//   SUBADMIN_PASSWORD='<strong-password-min-12-chars>' \
//   SUBADMIN_FRANCHISE_CODE=VIJAYAWADA \
//     node api/scripts/create-test-subadmin.js
//
// SECURITY: No credentials hardcoded. Earlier versions embedded a literal
// 'Password@123' which leaked the live sub_admin credential to anyone with
// repo read access (security review v77 finding #2). Use env vars only.

const bcrypt = require('bcryptjs');
const prisma = require('../src/models/prismaClient');

async function createSubAdmin() {
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
    console.log(`Updated sub_admin: ${email} (must_change_password=true)`);
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
    console.log(`Created sub_admin: ${email} (must_change_password=true)`);
  }
}

createSubAdmin()
  .then(() => console.log('Done.'))
  .catch(e => { console.error('Error:', e.message || e); process.exit(1); });
