# Accountants Factory Portal

Production platform for [AccountantsFactory LLP](https://accountantsfactory.com) — Virtual CFO, GST, ITR, and business compliance services based in Tirupati, India.

**Status:** Live · **Clients:** 500+ · **Services:** 17 · **Stack:** Node.js + Zoho Catalyst

---

## Quick Start

```bash
# 1. Install dependencies
cd api && npm install

# 2. Configure environment (copy template and fill in values)
cp .env.zoho.template .env

# 3. Run locally (serves both API and static web)
npm start
# Backend: http://localhost:3000
# Visit:   http://localhost:3000/portal/login.html
```

**Default admin login (after first boot):** `admin@accountantsfactory.com` / `Admin@123`
Change this immediately via **Portal -> Login -> Change Password**.

---

## Architecture

```
  Static HTML/JS/CSS  -->  Express API (Node)  -->  Zoho Catalyst Data Store
  web/                     api/src/                  (REST, India DC)
  Bootstrap 4, vanilla     JWT + bcrypt + 2FA
                                 |
                                 v
                           Zoho SMTP (transactional email)
```

### Key paths

| Path | Purpose |
|------|---------|
| `web/`                    | Public marketing site + client/admin/employee portal |
| `web/portal/`             | Auth'd portal UIs (Bootstrap dashboards) |
| `web/portal/js/`          | Portal JS: api.js, auth.js, *-dashboard.js |
| `web/js/components.js`    | Shared header/footer injected into every public page |
| `api/src/app.js`          | Express app entry (CORS, rate limits, routes) |
| `api/src/routes/*.js`     | REST route definitions per role |
| `api/src/controllers/*.js`| Business logic |
| `api/src/models/db.js`    | Zoho Catalyst Data Store wrapper (Prisma-compatible interface) |
| `api/src/services/emailService.js` | Nodemailer + Zoho SMTP |
| `api/startup.js`          | Warmup server + dependency install + admin seed |
| `api/app-config.json`     | Catalyst AppSail deployment config (env vars, memory) — **gitignored** |
| `api/scripts/backup.js`   | Daily JSON backup of all tables |

---

## Features

- **Auth**: JWT-based sessions (1 year), bcrypt password hashing, TOTP 2FA, email verification for reset
- **Roles**: admin, client, employee — each with separate dashboard
- **Admin**: CRUD clients + employees, assign services, view orders, approve referrals, reset any user's password, bulk import 530 clients from markdown
- **Client**: request services, view orders, download documents (Zoho WorkDrive), refer friends for bonus
- **Employee**: view assigned tasks, post EOD updates
- **Security**: helmet, CORS whitelist, IP-based rate limits, account lockout after 10 fails (30 min), anti-email-enumeration, CSRF-safe (JWT in Authorization header)
- **Resilience**: self-healing OAuth token, keep-alive every 3h, graceful degradation on Zoho outage, auto-email alerts to admin on startup failure
- **SEO**: canonical URLs, og:image, JSON-LD schema, sitemap.xml, robots.txt
- **Email**: password reset + admin alerts via Zoho SMTP (`smtp.zoho.in:465`)

---

## Environment Variables

Set via `.env` (local) or `api/app-config.json` -> `env_variables` (Catalyst AppSail).

| Var | Required | Example | Purpose |
|-----|----------|---------|---------|
| `NODE_ENV`              | yes | `production`            | Controls error verbosity, demo toggles |
| `JWT_SECRET`            | yes | 64-char hex             | Signs auth tokens |
| `JWT_EXPIRES_IN`        | no  | `365d`                  | Session lifetime |
| `FRONTEND_URL`          | yes | `https://accountantsfactory.com` | Used in password-reset email links |
| `AF_CLIENT_ID`          | no  | `1004.NMUI...`          | Zoho OAuth client |
| `AF_CLIENT_SECRET`      | no  | `ee35...`               | Zoho OAuth secret |
| `AF_REFRESH_TOKEN`      | no  | `1004.a629...`          | Zoho OAuth refresh token |
| `CATALYST_PROJECT_ID`   | no  | `18944000000044043`     | Catalyst Data Store project |
| `SMTP_HOST`             | yes | `smtp.zoho.in`          | Email relay |
| `SMTP_PORT`             | yes | `465`                   | SSL port |
| `SMTP_SECURE`           | yes | `true`                  | Use SSL |
| `SMTP_USER`             | yes | `nitin@accountantsfactory.com` | SMTP login |
| `SMTP_PASSWORD`         | yes | Zoho app password       | SMTP auth (NOT your account password) |
| `EMAIL_FROM`            | yes | `nitin@accountantsfactory.com` | Envelope sender |
| `EMAIL_FROM_NAME`       | no  | `AccountantsFactory`    | Display name |
| `ADMIN_ALERT_EMAIL`     | no  | `nitin@accountantsfactory.com` | Gets startup-failure alerts |
| `ENABLE_DEMO_LOGIN`     | no  | `true`                  | Enable demo accounts (default: off) |

---

## Deployment (Zoho Catalyst AppSail)

```bash
# Verify CLI is logged in
catalyst whoami

# Deploy backend only
catalyst deploy --only appsail:accountantsfactory-api

# Check health
curl https://accountantsfactory-api-50040008732.development.catalystappsail.in/api/status
```

Full status response:
```json
{
  "api": "OK",
  "db": "OK",
  "email": "configured",
  "token": { "hasToken": true, "tokenExpiresIn": 3547, "lastSuccess": "..." }
}
```

### If the Zoho refresh token expires

This shouldn't happen (we ping every 3h to keep it alive), but if it does:

```bash
# 1. Generate device code
curl -s -X POST "https://accounts.zoho.in/oauth/v3/device/code" \
  -d "client_id=1004.NMUISG5YKILERY9G29LJHZWIY9II7Y" \
  -d "scope=ZohoCatalyst.tables.rows.ALL,ZohoCatalyst.tables.ALL" \
  -d "grant_type=device_request&access_type=offline&prompt=consent"

# 2. Open the verification_uri_complete URL, click Accept

# 3. Poll for token (replace DEVICE_CODE):
curl -s -X POST "https://accounts.zoho.in/oauth/v3/device/token" \
  -d "client_id=1004.NMUISG5YKILERY9G29LJHZWIY9II7Y" \
  -d "client_secret=ee359029dc211b37c797d3584c59953f2bd6aa1adc" \
  -d "code=DEVICE_CODE&grant_type=device_token"

# 4. Update AF_REFRESH_TOKEN in api/app-config.json, redeploy
```

---

## Backups

```bash
# Run manually
cd api && node scripts/backup.js

# Output: ./backups/2026-04-21T10-30-15/{user,service,serviceOrder,...}.json
# Auto-prunes backups older than 30 days
```

Recommended: schedule via Catalyst Cron or GitHub Actions to run daily.

---

## Health Monitoring

- `GET /api/health` — shallow check (returns `{status: "OK"}`)
- `GET /api/status` — deep check (verifies DB, token state, email config)

Suggested: point [UptimeRobot](https://uptimerobot.com) (free) at `/api/status` with a 5-min interval. If db shows `FAIL`, you get an email + SMS.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "Cannot connect to server" on login | CORS rejection or backend cold start | Check `/api/health`, wait 30s |
| "Internal server error" on login | Catalyst DB down or token revoked | Check `/api/status` -> `token.lastError` |
| "Our system is temporarily unavailable" | Token refresh failed | Regenerate via device flow above |
| "Account temporarily locked" | 10+ failed logins in 15 min | Wait 30 min or use Forgot Password |
| Password reset email not arriving | SMTP misconfigured | Check `SMTP_PASSWORD` is a Zoho **app password**, not account password |

---

## License

Proprietary. Copyright (c) Accountants Factory LLP 2024-present.
Design: SH Technologies. Icons: Font Awesome 5. Fonts: Plus Jakarta Sans.
