# Email setup (forgot password & notifications)

Configure email so users receive **forgot password** links and other notifications instead of links only in the backend console.

---

## Quick start – choose one option

### Option 1: Gmail (easiest for dev/small use)

1. **Use a Gmail account** (or Google Workspace).
2. **Turn on 2-Step Verification** (if not already):
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Under "How you sign in to Google", enable **2-Step Verification**.
3. **Create an App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select app: "Mail", device: "Other" → name it "AccountantsFactory Portal"
   - Copy the 16-character password (e.g. `abcd efgh ijkl mnop`).
4. **Add to `backend/.env`** (uncomment and fill):

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=AccountantsFactory
```

- Use the **App Password** (no spaces) for `EMAIL_PASSWORD`, not your normal Gmail password.
- Restart the backend after saving `.env`.

5. **Test:** Log in as admin → **Admin Dashboard → Overview → "Test email config"**. You should see success.

---

### Option 2: SendGrid (good for production)

1. Sign up at [SendGrid](https://sendgrid.com/).
2. **Create an API Key:** [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys) → Create API Key → name it, copy the key.
3. **Add to `backend/.env`**:

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=AccountantsFactory
```

4. **Verify sender:** In SendGrid, verify the "From" email or domain (required to send).
5. Restart backend and use **Test email config** in Admin Dashboard.

---

### Option 3: Custom SMTP (any provider)

Use this if your host uses its own SMTP (e.g. Office 365, Zoho Mail, your host’s SMTP).

**Add to `backend/.env`** (do **not** set `EMAIL_SERVICE`; `SMTP_*` takes over):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_REJECT_UNAUTHORIZED=true
EMAIL_FROM=your-email@example.com
EMAIL_FROM_NAME=AccountantsFactory
```

- Port `587` = STARTTLS; port `465` = SSL (set `SMTP_SECURE=true`).
- Restart backend and test with **Test email config**.

---

## Forgot password flow after email is configured

1. User goes to **Forgot password** on the login page and enters email.
2. Backend creates a reset token and **sends an email** with link:  
   `{FRONTEND_URL}/portal/reset-password.html?token=...`
3. User clicks the link, sets a new password, and can log in again.

**Important:** `FRONTEND_URL` in `.env` must match where your portal is actually hosted (e.g. `http://localhost:3000` in dev, `https://portal.yourdomain.com` in production), or reset links will point to the wrong place.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| "Email service not configured" | Set one of the options above in `.env` and restart backend. |
| Gmail: "Username and Password not accepted" | Use an **App Password**, not your normal password; ensure 2-Step Verification is on. |
| SendGrid: emails not sent | Verify sender email/domain in SendGrid dashboard. |
| Reset link wrong URL | Set `FRONTEND_URL` in `.env` to the real portal URL (no trailing slash). |
| Test email config fails | Check Admin Dashboard → Test email config; check backend console for the exact error. |

---

## Reference – all email-related env vars

| Variable | Used for |
|----------|----------|
| `EMAIL_SERVICE` | `gmail` or `sendgrid` (optional if using `SMTP_*`) |
| `EMAIL_USER` | Gmail address (Gmail only) |
| `EMAIL_PASSWORD` | Gmail App Password (Gmail only) |
| `SENDGRID_API_KEY` | SendGrid API key (SendGrid only) |
| `SMTP_HOST` | Custom SMTP host |
| `SMTP_PORT` | Usually 587 or 465 |
| `SMTP_USER` / `SMTP_PASSWORD` | Custom SMTP auth |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |
| `FRONTEND_URL` | Base URL for reset links (must be correct) |
