const mysql = require('mysql2/promise');
async function test() {
  try {
    console.log('Connecting to Railway MySQL...');
    const conn = await mysql.createConnection({
      host: 'trolley.proxy.rlwy.net',
      port: 22791,
      user: 'root',
      password: 'ruHCQrofefcKdcgqxUMCqHZgznXGtlWQ',
      database: 'railway',
      // ssl: { rejectUnauthorized: false },
      connectTimeout: 30000
    });
    console.log('Connected!');
    const [rows] = await conn.query('SHOW TABLES');
    console.log('Tables:', rows.length);
    await conn.end();
  } catch(e) {
    console.log('Error:', e.message, 'Code:', e.code);
  }
}
test();
