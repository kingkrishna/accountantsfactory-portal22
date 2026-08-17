# Production deployment checklist

Use this checklist when going live with the AccountantsFactory Portal.

---

## 1. Environment variables (`backend/.env`)

| Variable | Production action |
|----------|-------------------|
| **NODE_ENV** | Set to `production`. |
| **JWT_SECRET** | Generate a strong random value. Example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` – use the output and keep it secret. |
| **JWT_EXPIRES_IN** | Optional; e.g. `7d` or `24h`. |
| **FRONTEND_URL** | Set to your live portal URL, e.g. `https://portal.yourdomain.com` (no trailing slash). Used for CORS and password-reset links. |
| **MONGODB_URI** | Use a production database (e.g. **MongoDB Atlas**). Do not use `localhost` in production. |
| **PORT** | Set if your host uses a different port (e.g. `8080`). |
| **Email** | Configure a real email service (Gmail App Password, SendGrid, or SMTP). See `backend/EMAIL_SETUP.md`. Required for forgot-password emails. |

---

## 2. Database

- Use **MongoDB Atlas** (or another hosted MongoDB) with a dedicated database user and a strong password.
- In Atlas: **Network Access** – allow your server IP(s) or use VPC peering; avoid `0.0.0.0/0` if possible.
- Run once on production DB: `npm run setup-database` (if needed) and create admin: `npm run create-admin admin@yourdomain.com YourSecurePassword`.

---

## 3. HTTPS

- Serve the **frontend** over HTTPS (e.g. Nginx, Vercel, Netlify, or your host’s SSL).
- Serve the **API** over HTTPS (e.g. Nginx reverse proxy to Node, or host with built-in SSL).
- In production, do **not** serve the frontend from the Node app; use a separate static host or Nginx so the Node process only handles `/api`.

---

## 4. CORS and security

- **FRONTEND_URL** in `.env` is used for CORS; ensure it matches your real portal URL (e.g. `https://portal.yourdomain.com`).
- The app allows origins from `FRONTEND_URL` and common localhost patterns; production frontend origin must match.
- Keep **JWT_SECRET** and **.env** out of version control (`.gitignore` already excludes `.env`).

---

## 5. Running the backend in production

- Use a process manager so the app restarts on crash and survives reboots. Examples:
  - **PM2:** `npm install -g pm2` then `pm2 start server.js --name accountantsfactory-api`
  - **systemd:** Create a unit file that runs `node server.js` (or `npm start`) from the `backend` directory.
- Run from the **backend** directory: `node server.js` or `npm start` (no `nodemon` in production).
- Set **NODE_ENV=production** in the environment (not only in `.env` if your host overrides it).

---

## 6. Frontend in production

- Build/serve the **public_html** folder from your CDN or web server (Nginx, Apache, Vercel, Netlify, etc.).
- Set **API base URL** for production: in your deployment, set `window.API_BASE_URL = 'https://api.yourdomain.com/api';` before loading `config.js` (or inject it via your build/deploy). See `public_html/portal/js/api-url.js` and the commented script in `login.html`.

---

## 7. Optional but recommended

- **Rate limiting:** Already enabled in the app (login and API limiters).
- **Logging:** Use a logging library or host logs; avoid logging secrets.
- **Backups:** Regular backups of MongoDB (Atlas offers automated backups).
- **Monitoring:** Health check endpoint: `GET /api/health`. Use it for uptime checks or load balancers.

---

## Quick reference

```bash
# Generate a secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Production run (from backend directory)
NODE_ENV=production node server.js

# Or with PM2
pm2 start server.js --name accountantsfactory-api
```

After deployment, test: login, forgot password (email received), and admin/client dashboards. Use **Admin Dashboard → Test email config** to verify email.
