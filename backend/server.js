const dotenv = require('dotenv');
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set, using fallback');
  process.env.JWT_SECRET = 'accountantsfactory_super_secret_jwt_2024';
}

const app = require('./src/app');
const PORT = process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 9000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Using Zoho Catalyst Data Store');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  }
  throw err;
});

module.exports = app;
