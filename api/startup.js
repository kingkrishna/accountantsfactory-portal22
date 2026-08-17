// Warmup server: responds immediately to pass AppSail's health check,
// then runs npm install --ignore-scripts in background (fast, no lifecycle scripts),
// then loads the real Express app (Prisma client is pre-built in prisma-client/).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = parseInt(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || '9000', 10);
const WEB_DIR = path.join(__dirname, 'web');

let appReady = false;
let realApp = null;
let startupStatus = 'npm_install';
let startupError = null;

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf'
};

// Try to serve a static file from the web/ folder — returns true if served.
// This lets users see the actual login/marketing pages during warmup so they
// don't get scary JSON errors. When login.js's API call fails, the page will
// show a friendly error and the user can refresh in ~30s.
function tryServeStatic(req, res) {
  try {
    let urlPath = (req.url || '/').split('?')[0];
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    // Security: prevent path traversal
    if (urlPath.indexOf('..') !== -1) return false;
    const filePath = path.join(WEB_DIR, urlPath);
    if (!filePath.startsWith(WEB_DIR)) return false;
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch (e) {
    return false;
  }
}

const warmup = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }
  if (appReady && realApp) {
    realApp(req, res);
    return;
  }
  // Health endpoint
  if (req.url === '/api/health') {
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ status: 'starting', step: startupStatus, error: startupError }));
    return;
  }
  // API calls during warmup: return a JSON response the frontend can handle
  if (req.url && req.url.indexOf('/api/') === 0) {
    res.writeHead(503, Object.assign({}, CORS_HEADERS, { 'Retry-After': '10' }));
    res.end(JSON.stringify({ success: false, message: 'Server is starting, please wait a moment and try again.' }));
    return;
  }
  // Static files (HTML/CSS/JS/images): serve them directly during warmup so
  // users see their actual login page instead of raw JSON.
  if (tryServeStatic(req, res)) return;
  // Fallback: friendly loading page for unknown paths
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(`<!DOCTYPE html><html><head><title>Loading...</title><meta http-equiv="refresh" content="5"><style>body{font-family:-apple-system,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f7f9fa}.c{text-align:center}.s{width:44px;height:44px;border:4px solid #e0e0e0;border-top-color:#0c9782;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 18px}@keyframes spin{to{transform:rotate(360deg)}}</style></head><body><div class="c"><div class="s"></div><h3 style="color:#0c9782">Accountants Factory</h3><p>Loading secure portal... this page refreshes automatically in 5s.</p></div></body></html>`);
});

warmup.listen(PORT, '0.0.0.0', () => {
  console.log('[startup] Warmup on port ' + PORT + ' at ' + new Date().toISOString());
  runNpmInstall();
});

function runNpmInstall() {
  console.log('[startup] npm install --production --ignore-scripts');
  exec('npm install --production --ignore-scripts --no-audit --no-fund', {
    cwd: __dirname,
    timeout: 600000,
    maxBuffer: 10 * 1024 * 1024
  }, (err) => {
    if (err) {
      console.error('[startup] npm install error:', err.message);
      startupError = err.message;
    } else {
      console.log('[startup] npm install done at ' + new Date().toISOString());
      startupError = null;
    }
    loadApp();
  });
}

function loadApp() {
  startupStatus = 'loading_app';
  console.log('[startup] Loading app at ' + new Date().toISOString());
  try {
    require('dotenv').config();
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'accountantsfactory_super_secret_jwt_2024';
    }
    realApp = require('./src/app');
    appReady = true;
    console.log('[startup] App ready at ' + new Date().toISOString());
    console.log('[startup] Using Zoho Catalyst Data Store');
    // Health check DB connection + seed in background (non-blocking)
    verifyDbHealth().catch(() => { /* logged inside */ });
    seedDefaultServices().catch(e => console.warn('[startup] Service seed warning:', e.message));
    seedAdminUser().catch(e => console.warn('[startup] Admin seed warning:', e.message));
  } catch (e) {
    console.error('[startup] App load failed:', e.message);
    startupError = 'App load failed: ' + e.message;
  }
}

const DEFAULT_SERVICES = [
  { name: 'Private Limited Company', description: 'Company registration for private entities. Starting from Rs.14,999/-' },
  { name: 'Limited Liability Partnership', description: 'LLP registration for partnerships. Starting from Rs.9,999/-' },
  { name: 'One Person Company', description: 'Company registration for sole entrepreneurs' },
  { name: 'Partnership Firm', description: 'Registration for partnership firms' },
  { name: 'Startup India Registration', description: 'Startup India recognition and registration' },
  { name: 'GST Registration', description: 'Goods and Services Tax registration' },
  { name: 'Sole Proprietorship', description: 'Registration for sole proprietorships' },
  { name: 'Virtual CFO Services', description: 'Virtual Chief Financial Officer services' },
  { name: 'Business Advisory Services', description: 'Expert business advisory and consultation' },
  { name: 'Management Consulting Services', description: 'Business management consulting' },
  { name: 'Bookkeeping Services', description: 'Professional bookkeeping and accounting' },
  { name: 'Tax Filing Services', description: 'Income tax filing and compliance' },
  { name: 'GST Filing Services', description: 'GST return and compliance filing' },
  { name: 'Payroll and Employee Benefit Services', description: 'Payroll processing and employee benefits management' },
  { name: 'Business Compliance and Regulatory Services', description: 'Business compliance and regulatory requirements' },
  { name: 'Wealth Management Services', description: 'Personal and corporate wealth management' },
  { name: 'MCA Annual Return Filing Services', description: 'MCA e-filing and annual compliance' }
];

async function verifyDbHealth() {
  try {
    const prisma = require('./src/models/prismaClient');
    const count = await prisma.user.count();
    console.log('[startup] DB health OK — ' + count + ' users accessible');
  } catch (e) {
    console.error('\n\n');
    console.error('█████████████████████████████████████████████████████████████████████');
    console.error('██  CRITICAL: DATABASE CONNECTION FAILED ON STARTUP                ██');
    console.error('██  Error: ' + (e.message || '').padEnd(55).slice(0,55) + ' ██');
    console.error('██                                                                 ██');
    console.error('██  Most likely cause: Zoho Catalyst refresh token revoked/expired ██');
    console.error('██  Fix: Generate new token via OAuth device flow, update          ██');
    console.error('██       AF_REFRESH_TOKEN env var, redeploy.                        ██');
    console.error('█████████████████████████████████████████████████████████████████████');
    console.error('\n\n');
    // Email the admin about it (best-effort, rate-limited to once per 6 hours)
    const lastAlertFile = '/tmp/_db_alert_last.txt';
    let shouldAlert = true;
    try {
      const fs = require('fs');
      if (fs.existsSync(lastAlertFile)) {
        const last = parseInt(fs.readFileSync(lastAlertFile, 'utf8') || '0', 10);
        if (Date.now() - last < 6 * 3600 * 1000) shouldAlert = false;
      }
    } catch (_) {}
    if (shouldAlert) {
      try {
        const emailService = require('./src/services/emailService');
        if (emailService.isConfigured()) {
          const alertTo = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM || 'nitin@accountantsfactory.com';
          await emailService.sendEmail(
            alertTo,
            '[URGENT] AccountantsFactory backend DB is down',
            'The backend could not connect to Zoho Catalyst on startup.\n\n' +
            'Error: ' + e.message + '\n\n' +
            'Most likely the Zoho refresh token is revoked/expired.\n' +
            'Action needed: regenerate refresh token and redeploy.\n\n' +
            'Time: ' + new Date().toISOString()
          );
          try { require('fs').writeFileSync(lastAlertFile, String(Date.now())); } catch (_) {}
        }
      } catch (_) { /* silent */ }
    }
    // DON'T throw — let the app keep running with no DB so the recovery endpoint stays reachable
  }
}

async function seedAdminUser() {
  try {
    const prisma = require('./src/models/prismaClient');
    const bcrypt = require('bcryptjs');
    const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!existing) {
      const password_hash = await bcrypt.hash('Admin@123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@accountantsfactory.com',
          password_hash,
          role: 'admin',
          status: 'active',
          referral_code: 'ADMIN001',
          must_change_password: false
        }
      });
      console.log('[startup] Admin user created: admin@accountantsfactory.com / Admin@123');
    } else {
      console.log('[startup] Admin user already exists: ' + existing.email);
    }
  } catch (e) {
    console.warn('[startup] Could not seed admin user:', e.message);
  }
}

async function seedDefaultServices() {
  try {
    const prisma = require('./src/models/prismaClient');
    const existing = await prisma.service.findMany({});
    const existingNames = new Set(existing.map(s => s.name));
    let created = 0;
    for (const svc of DEFAULT_SERVICES) {
      if (!existingNames.has(svc.name)) {
        await prisma.service.create({ data: { name: svc.name, description: svc.description, is_active: true } });
        created++;
      }
    }
    if (created > 0) console.log('[startup] Seeded ' + created + ' default services');
    else console.log('[startup] All 17 services already present');
  } catch (e) {
    console.warn('[startup] Could not seed services:', e.message);
  }
}
