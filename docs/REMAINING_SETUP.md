# Remaining process – what’s done and what’s next

## Quick checklist (nothing missed)

- [x] MongoDB installed and connected (127.0.0.1:27017)
- [x] `backend/.env` has MONGODB_URI, JWT_SECRET; set FRONTEND_URL=http://localhost:3000 when using one-server dev
- [x] Database seeded (`npm run setup-database`)
- [x] Admin user: admin@accountantsfactory.com / Admin@Secure123
- [x] Login fixed (JWT sign options, Content-Type, password reset script)
- [x] Backend serves frontend in dev; GET / redirects to portal login
- [x] Start scripts: `start-dev.bat`, `start-dev.ps1` (optional: opens browser)

---

## Done

| Step | Status |
|------|--------|
| MongoDB installed (local) | Done |
| Database connected (127.0.0.1:27017) | Done |
| Database seeded (services) | Done |
| Admin user created | Done – `admin@accountantsfactory.com` |
| Backend login fixed (JWT + Content-Type) | Done |
| Login working | Done |

---

## Daily use (nothing else required)

1. **Start backend** (if not running):
   - From project root: **`.\start-dev.bat`** (or **`.\start-dev.ps1`** in PowerShell)
   - Or: `cd backend` then `npm run dev`
2. **Open portal**  
   Go to **http://localhost:3000/** or **http://localhost:3000/portal/login.html**  
   (PowerShell start script opens the browser for you after a few seconds.)
3. **Log in**  
   Email: `admin@accountantsfactory.com`  
   Password: `Admin@Secure123`

**Note:** If your `backend/.env` was created before the template update, add `FRONTEND_URL=http://localhost:3000` so password-reset links point to the right URL in dev.

---

## Optional – when you need them

### 1. Forgot password / email

- **Now:** Without email config, reset links are only printed in the backend console (dev).
- **When you want real emails:**  
  Follow **`backend/EMAIL_SETUP.md`** – step-by-step for Gmail, SendGrid, or custom SMTP. Add the chosen vars to `backend/.env` and use **Admin Dashboard → Test email config** to verify.

### 2. Document storage (Zoho WorkDrive)

- **Now:** Documents can still be stored/retrieved without Zoho (local/other storage may be used by the app).
- **When you want Zoho:**  
  Follow **`backend/ZOHO_SETUP.md`** (Quick start at top). Add Zoho variables to `backend/.env` and restart the backend.

### 3. More admin or client users

- **New admin** (if you need another admin email):
  ```bash
  cd backend
  npm run create-admin another@accountantsfactory.com AnotherSecure@123
  ```
- **Reset existing admin password:**
  ```bash
  npm run reset-admin-password admin@accountantsfactory.com NewPassword@123
  ```
- **Client users:** Create via the admin dashboard (e.g. “Create client” / “Invite client”) once logged in as admin.

---

## Before production

See **`PRODUCTION_DEPLOYMENT.md`** for the full checklist. Summary:

| Item | Action |
|------|--------|
| **JWT_SECRET** | Generate a strong random value and set in `.env`. Example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| **Email** | Configure a real email service – see `backend/EMAIL_SETUP.md`. |
| **FRONTEND_URL** | Set in `.env` to your real frontend URL (e.g. `https://portal.yourdomain.com`) for CORS and email links. |
| **MONGODB_URI** | Use MongoDB Atlas or a production DB; avoid default/local URIs. |
| **HTTPS** | Serve frontend and API over HTTPS. |

---

## Quick reference

```bash
# Backend
cd backend
npm run dev              # Start API (port 3000)
npm run setup-database   # Re-seed services (safe to run again)
npm run create-admin     # Create new admin
npm run reset-admin-password <email> <password>   # Reset admin password
npm run setup-mongodb    # Check MongoDB connection
```

**Portal:** http://localhost:3000/portal/login.html (when backend is running)  
**API:** http://localhost:3000/api

You’re set for normal use; the rest is optional or for production.
