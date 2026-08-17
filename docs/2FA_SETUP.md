# 2FA (two-factor authentication) setup

2FA is already built into the app. Users can enable it to require a one-time code (from an authenticator app) after entering their password.

---

## For clients

1. **Log in** to the portal as a client.
2. Open **Client Dashboard**.
3. In the **Profile** section you’ll see **2FA status** and an **Enable 2FA** button.
4. Click **Enable 2FA**:
   - A modal opens with a **QR code**.
   - Scan it with an authenticator app (e.g. **Google Authenticator**, **Microsoft Authenticator**, **Authy**) on your phone.
   - Enter the **6-digit code** from the app and click **Verify & Enable**.
5. On the next login you’ll enter email/password first, then the **6-digit code** from the app.

**To disable 2FA:** In the same Profile section, click **Disable 2FA**, enter your password and the current authenticator code, then confirm.

---

## For admins

1. **Log in** to the portal as admin.
2. In **Admin Dashboard**, go to **Overview**.
3. In the **Security (2FA)** section, click **Enable 2FA**.
4. Scan the **QR code** with your authenticator app and enter the **6-digit code** to verify.
5. Next time you log in, after password you’ll be asked for the **6-digit code**.

**To disable 2FA:** In Overview → Security (2FA), click **Disable 2FA**, enter password and current code.

---

## Technical details

- **Algorithm:** TOTP (e.g. RFC 6238), 6-digit codes, 30-second window.
- **API (for custom UIs):**
  - `POST /api/auth/2fa/setup` (with JWT) – returns QR data/URL for the authenticator.
  - `POST /api/auth/2fa/verify-setup` (with JWT, body: `{ "code": "123456" }`) – enables 2FA after verifying the code.
  - `POST /api/auth/2fa/disable` (with JWT, body: `{ "password": "...", "code": "123456" }`) – disables 2FA.
- **Login flow:** If the user has 2FA enabled, `POST /api/auth/login` returns `requires2FA: true` and a `tempToken`. The frontend then asks for the code and calls `POST /api/auth/2fa/login` with `tempToken` and `code` to complete login.

---

## Optional per user

2FA is **optional**. Users can leave it disabled. Enabling it is recommended for admin and sensitive client accounts.
