// Smoke-test bcrypt: does a given password match a given hash?
//
// Usage:
//   BCRYPT_HASH='$2a$10$...' BCRYPT_PASSWORD='your-password' \
//     node api/scripts/test-bcrypt.js
//
// SECURITY: No credentials or hashes hardcoded. The earlier version embedded
// a production sub_admin's bcrypt hash + the literal 'Password@123' (security
// review v77 finding #2). Use env vars only.

const bcrypt = require('bcryptjs');

async function test() {
  const hash = process.env.BCRYPT_HASH;
  const password = process.env.BCRYPT_PASSWORD;
  if (!hash || !password) {
    console.error('FAIL: Set BCRYPT_HASH and BCRYPT_PASSWORD env vars.');
    process.exit(2);
  }
  const match = await bcrypt.compare(password, hash);
  console.log('Match?', match);
}

test().catch(e => { console.error(e); process.exit(1); });
