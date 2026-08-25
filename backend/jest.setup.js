require('dotenv').config();
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
}
// Tests exercise the demo-login path (admin@demo.com / client@demo.com) which
// short-circuits before the DB call, so they run cleanly without a live
// Catalyst Data Store connection. Production never sets this.
process.env.ENABLE_DEMO_LOGIN = 'true';
