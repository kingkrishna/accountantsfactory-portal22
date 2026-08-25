// Smoke test: login as sub_admin + list clients.
//
// Usage:
//   TEST_EMAIL=user@example.com TEST_PASSWORD='...' [TEST_API=http://localhost:3000] \
//     node api/scripts/test-subadmin-login.js
//
// SECURITY: No credentials hardcoded. Earlier version embedded the live
// sub_admin credential 'Password@123' (security review v77 finding #2).

const axios = require('axios');

async function testLoginAndFetch() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  const apiBase = process.env.TEST_API || 'http://localhost:3000';

  if (!email || !password) {
    console.error('FAIL: Set TEST_EMAIL and TEST_PASSWORD env vars.');
    process.exit(2);
  }

  try {
    const loginRes = await axios.post(`${apiBase}/api/auth/login`, { email, password });
    const token = loginRes.data.token;
    if (!token) {
      console.error('FAIL: response had no token:', loginRes.data);
      process.exit(1);
    }
    const clientsRes = await axios.get(`${apiBase}/api/admin/clients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Total clients visible to ${email}: ${clientsRes.data.clients?.length ?? '?'}`);
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

testLoginAndFetch();
