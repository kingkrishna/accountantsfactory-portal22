const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Login rate limiter: 30 failed attempts per IP per 15 minutes.
// Legitimate users typing wrong passwords won't hit this. Brute-force attempts
// targeting many accounts from one IP will. Per-account lockout (in authController
// at recordLoginFail) gives finer-grained protection — 10 fails per email = 30 min lock.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many password reset requests. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
const allowedFromEnv = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [];
const allowedOrigins = [
  'http://localhost:5500',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://accountantsfactory.com',
  'https://www.accountantsfactory.com',
  'https://accountantsfactory-portal.onrender.com',
  ...allowedFromEnv
];
// Allow Zoho Catalyst app domains dynamically (checked in origin function below)
const corsOptions = {
  origin: function (origin, callback) {
    // No origin (e.g. same-origin, or some tools)
    if (!origin) return callback(null, true);
    // Explicit list
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    // Allow localhost with any port (dev)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow Vercel deployments (so live site can use your local API when testing)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) || /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);
    // Allow Zoho Catalyst app domains (.com and .in for India DC)
    if (/^https:\/\/[a-z0-9._-]+\.catalystappsail\.(com|in)$/.test(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9._-]+\.catalystserverless\.(com|in)$/.test(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9._-]+\.zohosite\.(com|in)$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Production-grade security headers (global-scale hardening)
app.use(helmet({
  // HSTS: force HTTPS for 2 years (browsers remember and refuse HTTP)
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Prevent MIME-sniffing attacks
  noSniff: true,
  // Limit referrer info leak
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // DNS prefetch control
  dnsPrefetchControl: { allow: false },
  // Hide tech stack
  hidePoweredBy: true,
  // Permissions Policy: deny camera/mic/geolocation by default
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  // CSP — allow our own assets, jQuery/Bootstrap CDN, Font Awesome, Google Fonts
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdnjs.cloudflare.com", "https://stackpath.bootstrapcdn.com", "https://maxcdn.bootstrapcdn.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://maxcdn.bootstrapcdn.com", "https://use.fontawesome.com", "https://fonts.googleapis.com", "https://stackpath.bootstrapcdn.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://use.fontawesome.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://accountantsfactory-api-50040008732.development.catalystappsail.in", "https://www.accountantsfactory.com", "https://accountantsfactory.com", "https://formsubmit.co", "https://accounts.zoho.in"],
      frameSrc: ["'self'", "https://www.google.com", "https://www.youtube.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// Additional headers — Permissions-Policy + Cross-Origin
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Catalyst AppSail's proxy automatically adds CORS headers. To avoid duplicate
// Access-Control-Allow-Origin headers (which browsers reject as invalid), we
// DON'T use the cors middleware here. We only handle preflight OPTIONS manually
// to ensure the preflight matches what the actual response will have.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Check if origin is allowed (same logic as corsOptions.origin above)
  let allowed = false;
  if (!origin) allowed = true;
  else if (allowedOrigins.indexOf(origin) !== -1) allowed = true;
  else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) allowed = true;
  else if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) || /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/.test(origin)) allowed = true;
  else if (/^https:\/\/[a-z0-9._-]+\.catalystappsail\.(com|in)$/.test(origin)) allowed = true;
  else if (/^https:\/\/[a-z0-9._-]+\.catalystserverless\.(com|in)$/.test(origin)) allowed = true;
  else if (/^https:\/\/[a-z0-9._-]+\.zohosite\.(com|in)$/.test(origin)) allowed = true;

  // Only respond to OPTIONS preflight from our app — Catalyst handles actual-request CORS
  if (req.method === 'OPTIONS') {
    if (allowed && origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/2fa/login', loginLimiter);
app.use('/api/auth/change-password', loginLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/auth/reset-password', loginLimiter);
// Global API rate limit — but exclude the health/version probes. Those are
// hit by cache-buster.js on every open tab + by uptime monitors, so they
// must NEVER 429 (a 429 there breaks the cache-buster reload mechanism).
app.use('/api/', (req, res, next) => {
  if (req.path === '/version' || req.path === '/status' || req.path === '/health') return next();
  return apiLimiter(req, res, next);
});

app.set('trust proxy', 1);

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');
const publicRoutes = require('./routes/public');
const employeeRoutes = require('./routes/employee');
const complianceRoutes = require('./routes/compliance');
const docgenRoutes = require('./routes/docgen');
const clientComplianceRoutes = require('./routes/clientCompliance');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', complianceRoutes);
app.use('/api/admin', docgenRoutes);
app.use('/api/client', clientComplianceRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AccountantsFactory Portal API is running' });
});

// ─── Privileged token-recovery endpoints ────────────────────────────────────
// All three endpoints below require RECOVERY_SECRET env var. If unset they are
// completely disabled (return 404). Comparison uses crypto.timingSafeEqual.
// Rate-limited to 6/hour per IP and audited (TODO: hook into auditLog model).
const crypto = require('crypto');
const RECOVERY_SECRET = process.env.RECOVERY_SECRET || '';

function timingSafeSecretMatch(sent) {
  if (!RECOVERY_SECRET) return false;
  const a = Buffer.from(String(sent || ''));
  const b = Buffer.from(RECOVERY_SECRET);
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch (_) { return false; }
}

// Stricter rate limit just for privileged endpoints (6 requests / hour / IP)
const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  message: { success: false, message: 'Too many recovery attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function requireRecoverySecret(req, res, next) {
  if (!RECOVERY_SECRET) return res.status(404).end();
  const sent = req.method === 'GET'
    ? (req.headers['x-recovery-secret'] || '')
    : ((req.body && req.body.secret) || '');
  if (!timingSafeSecretMatch(sent)) {
    return res.status(401).json({ success: false, message: 'Invalid recovery secret' });
  }
  next();
}

// Token keepalive — called daily by GitHub Actions cron to keep the Zoho
// refresh token "warm". Requires x-recovery-secret header. Does NOT do a
// full table scan; just exercises the OAuth refresh flow.
app.get('/api/__token-keepalive', recoveryLimiter, requireRecoverySecret, async (req, res) => {
  try {
    const prisma = require('./models/prismaClient');
    // getTokenHealth is cheap and reflects the most recent refresh attempt.
    // We don't call user.count() — that would be a full table scan every cron tick.
    const health = prisma.getTokenHealth ? prisma.getTokenHealth() : null;
    return res.json({ status: 'ok', checked_at: new Date().toISOString(), token_health: health });
  } catch (e) {
    console.error('[token-keepalive] FAILED:', e.message);
    return res.status(503).json({ status: 'failed', error: e.message });
  }
});

// One-shot refresh-token override. Requires RECOVERY_SECRET in body.
app.post('/api/__recover-token', recoveryLimiter, express.json(), requireRecoverySecret, (req, res) => {
  try {
    const { refresh_token } = req.body || {};
    if (!refresh_token || typeof refresh_token !== 'string' || !(refresh_token.startsWith('1004.') || refresh_token.startsWith('1000.'))) {
      return res.status(400).json({ success: false, message: 'Invalid refresh_token format' });
    }
    const prisma = require('./models/prismaClient');
    if (typeof prisma.setRuntimeRefreshToken === 'function') {
      prisma.setRuntimeRefreshToken(refresh_token);
      console.warn('[recovery] Runtime refresh token replaced from', req.ip);
      return res.json({ success: true, message: 'Refresh token updated.' });
    }
    res.status(500).json({ success: false, message: 'Recovery hook not available' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Recovery failed' });
  }
});

// Direct access-token override. Requires RECOVERY_SECRET in body.
app.post('/api/__set-access-token', recoveryLimiter, express.json(), requireRecoverySecret, (req, res) => {
  try {
    const { access_token, expires_in } = req.body || {};
    if (!access_token || typeof access_token !== 'string' || access_token.length < 10) {
      return res.status(400).json({ success: false, message: 'Invalid access_token' });
    }
    const prisma = require('./models/prismaClient');
    if (typeof prisma.setRuntimeAccessToken === 'function') {
      const ttl = (typeof expires_in === 'number' && expires_in > 0) ? expires_in : 3500;
      prisma.setRuntimeAccessToken(access_token, ttl);
      console.warn('[recovery] Runtime access token replaced from', req.ip);
      return res.json({ success: true, message: 'Access token set.' });
    }
    res.status(500).json({ success: false, message: 'Recovery hook not available' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Recovery failed' });
  }
});

// /api/version returns the current frontend version. Pages embed their own
// build version and compare against this; if mismatch, they auto-reload to
// fetch fresh assets. This solves Zoho Slate's aggressive 1-year HTML cache.
const FRONTEND_VERSION = parseInt(process.env.FRONTEND_VERSION || '87', 10);
app.get('/api/version', (req, res) => {
  // No cache so the browser always asks fresh
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ version: FRONTEND_VERSION, ts: Date.now() });
});

// Deep status check — verifies DB connectivity + token health. Used by monitoring.
app.get('/api/status', async (req, res) => {
  const prisma = require('./models/prismaClient');
  const tokenHealth = prisma.getTokenHealth ? prisma.getTokenHealth() : null;
  const out = {
    api:       'OK',
    db:        'unknown',
    email:     process.env.SMTP_HOST ? 'configured' : 'not_configured',
    token:     tokenHealth,
    timestamp: new Date().toISOString()
  };
  try {
    await prisma.user.count({ where: { role: 'admin' } });
    out.db = 'OK';
    res.json(out);
  } catch (e) {
    out.db = 'FAIL';
    out.dbError = e.message;
    res.status(503).json(out);
  }
});


if (process.env.NODE_ENV === 'development') {
  try {
    const { setupSwagger } = require('./swagger');
    setupSwagger(app);
  } catch (e) { /* swagger optional */ }
}

// Serve frontend in both development AND production
const publicHtml = path.join(__dirname, '../web');

// Cache-control: HTML never cached (so users always see latest version).
// JS/CSS cached for 5 minutes (long enough to be efficient, short enough that
// our version-check + cache-buster catches updates within minutes).
// Images/fonts cached aggressively (immutable assets).
function setCacheHeaders(res, filePath) {
  if (/\.html?$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (/\.(js|css)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate, max-age=0');
  } else if (/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for images/fonts
  }
}

// Root serves the marketing homepage (not a login redirect)
app.get('/', (req, res) => {
  setCacheHeaders(res, 'index.html');
  res.sendFile(path.join(publicHtml, 'index.html'));
});

// ─── DocGen: client-side gate, not server-side ─────────────────────────────
// The portal stores JWTs in localStorage (not cookies), so a server-side static
// gate cannot read the token on plain <a> navigation — it would lock everyone
// out. Authorization is enforced TWO ways instead:
//   1) Each DocGen HTML page has an inline <script> that reads the localStorage
//      JWT, checks the admin role, and redirects to /portal/login.html if
//      missing. This is the UX-facing gate.
//   2) Any backend API that DocGen ever calls MUST authenticate the request
//      via the existing /api auth middleware. DocGen today is fully client-side
//      (IndexedDB) so no backend gate is needed yet.
// Note: this means DocGen's static HTML is technically reachable by an
// unauthenticated user, but it contains no data — the localStorage gate
// redirects them away before any real UI loads. Real PII never leaves the
// admin's own browser (IndexedDB).

app.use(express.static(publicHtml, {
  etag: true,
  lastModified: true,
  setHeaders: function (res, filePath) {
    setCacheHeaders(res, filePath);
  }
}));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status >= 500
    ? 'Internal server error'
    : (err.message || 'Internal server error');
  res.status(status).json({
    success: false,
    message
  });
});

app.use((req, res) => {
  // API routes return JSON 404; all others serve the custom 404 page
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '../web/404.html'));
});

module.exports = app;
