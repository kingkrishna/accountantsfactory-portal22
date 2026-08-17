# Secrets Audit & Rotation Plan

> Read-only inventory. No secrets have been rotated by this document — that's an operational action that requires Zoho console access.
>
> Generated as part of [ARCHITECTURE-AUDIT.md](./ARCHITECTURE-AUDIT.md) Phase 1.

## Summary

| Secret | Where it lives | Tracked in git? | Severity |
|--------|---------------|-----------------|----------|
| `JWT_SECRET` | `api/startup.js` line 120 (fallback), `app-config.json` line 7 | **YES (both)** | **CRITICAL** |
| `AF_CLIENT_ID` (Catalyst CLI) | `api/src/models/db.js` line 24 (fallback), `app-config.json` | **YES (both)** | HIGH |
| `AF_CLIENT_SECRET` (Catalyst CLI) | `api/src/models/db.js` line 25 (fallback), `app-config.json` | **YES (both)** | **CRITICAL** |
| `AF_REFRESH_TOKEN` (Catalyst CLI) | `app-config.json` | **YES** | **CRITICAL** |
| `ZOHO_CLIENT_ID` (Self Client) | `api/src/models/db.js` line 26 (fallback), `app-config.json` | **YES (both)** | HIGH |
| `ZOHO_CLIENT_SECRET` (Self Client) | `api/src/models/db.js` line 27 (fallback), `app-config.json` | **YES (both)** | **CRITICAL** |
| `ZOHO_REFRESH_TOKEN` (Self Client) | `api/src/models/db.js` line 39 (`FALLBACK_REFRESH_TOKEN`), `app-config.json` | **YES (both)** | **CRITICAL** |
| `RECOVERY_SECRET` | `app-config.json` line 15 | **YES** | HIGH |
| `EMERGENCY_ADMIN_PASSWORD` | `app-config.json` line 16 | **YES** | HIGH |

**Net effect:** anyone with read access to the GitHub repo can:
- Forge admin JWTs (`JWT_SECRET` known).
- Authenticate to your Catalyst Data Store as you (`ZOHO_REFRESH_TOKEN` known).
- Use the runtime token-recovery endpoints (`RECOVERY_SECRET` known).
- Log in as `nitin@accountantsfactory.com` via the emergency-admin path (`EMERGENCY_ADMIN_PASSWORD` known).

These are not theoretical leaks. Anyone who cloned the repo or scrapes the GitHub mirror has them.

## Rotation plan

This is an **operational checklist**, not code. Do it in order. Each step must complete before the next begins or you lock yourself out.

### Step 1 — Mint new secrets BEFORE rotating

Don't touch anything in production yet. Just generate the replacements and save them somewhere only you control (1Password / your phone notes).

1. **JWT_SECRET.** Generate 64 hex chars:
   ```bash
   openssl rand -hex 32
   ```
2. **RECOVERY_SECRET.** Same as above.
3. **EMERGENCY_ADMIN_PASSWORD.** Generate a strong password (24+ chars).
4. **Catalyst OAuth credentials.**
   - Log into [Zoho API Console](https://api-console.zoho.in).
   - The existing `AccountantsFactory Portal` Self Client (the `1000.FM9V…` one): **regenerate the client_secret**.
   - In Catalyst → Project Settings → CLI / Self-Client: **regenerate the `1004.*` CLI client secret**.
   - Both regenerations invalidate every refresh token issued from those clients. That's the point.
5. **Refresh tokens.** Use the new client_secrets to mint fresh refresh tokens via the OAuth code-grant flow (we have a documented procedure from the 2026-05-01 incident).

### Step 2 — Push new secrets to Catalyst environment

Use the Catalyst console → AppSail → Environment Variables. Set:
- `JWT_SECRET`
- `RECOVERY_SECRET`
- `EMERGENCY_ADMIN_PASSWORD`
- `AF_CLIENT_ID`, `AF_CLIENT_SECRET`, `AF_REFRESH_TOKEN`
- `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`

Don't deploy yet — env vars apply on next AppSail restart, but the running app continues with old vars.

### Step 3 — Verify the live app still works with NEW env

- Use `/api/__token-keepalive` with the **new** `RECOVERY_SECRET` to confirm the Catalyst credentials work end-to-end.
- If the new credentials are wrong, abort here — the old ones still work in code as fallbacks.

### Step 4 — Now remove the fallbacks from code

Open `api/src/models/db.js`:
```js
// BEFORE
const CLI_CLIENT_ID     = process.env.AF_CLIENT_ID     || '1004.NMUISG5YKILERY9G29LJHZWIY9II7Y';

// AFTER
const CLI_CLIENT_ID = process.env.AF_CLIENT_ID;
if (!CLI_CLIENT_ID) throw new Error('AF_CLIENT_ID is required');
```

Apply the same to `AF_CLIENT_SECRET`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, and delete `FALLBACK_REFRESH_TOKEN` entirely.

Open `api/startup.js` line 119–121, delete the JWT_SECRET fallback.

### Step 5 — Move `app-config.json` out of git

The Catalyst CLI reads `app-config.json` at deploy time. There are two clean options:

**Option A (Recommended): commit a sanitized template, gitignore the real file.**
```bash
git rm --cached app-config.json
cp app-config.json app-config.example.json   # then strip all secret values
git add app-config.example.json .gitignore
```
Add `app-config.json` to `.gitignore`. Devs copy the example and fill in their own.

**Option B: rely entirely on Catalyst env vars set via the console.** Trim `app-config.json` to only non-secret fields (command, build_path, stack, memory).

### Step 6 — Force-push history rewrite (optional but recommended)

The secrets are still in git history. To purge:
```bash
# Use git-filter-repo (preferred) or BFG
git filter-repo --invert-paths --path app-config.json
git filter-repo --replace-text replacements.txt   # list every leaked secret
```
Then notify any collaborators they need to re-clone. **This is high-risk** — only do it if the repo is public or shared with untrusted parties. If the repo is private and only Nitin has access, skip this step.

### Step 7 — Add boot-time env validation

Implement [`api/src/config/env.js`](../api/src/config/env.js) (planned in Phase 1 fix #3) so future deploys fail fast on missing env vars instead of falling back to hardcoded values.

## What this does NOT change

- Functionality: zero change. Old credentials become invalid; new credentials work identically.
- Endpoints: same.
- User experience: nothing visible.

## What this does change

- Anyone holding the old `JWT_SECRET` can no longer forge tokens.
- Anyone holding the old `ZOHO_REFRESH_TOKEN` can no longer read your data store.
- Recovery endpoints stop accepting the leaked `af-recover-2026-nitin` secret.
- Boot fails loudly if env vars are missing instead of silently falling back to compromised values.

## Audit log: what secrets to consider compromised AS OF TODAY

Treat these as **leaked**:

```
JWT_SECRET                 accountantsfactory_super_secret_jwt_2024
AF_CLIENT_ID               1004.NMUISG5YKILERY9G29LJHZWIY9II7Y
AF_CLIENT_SECRET           ee359029dc211b37c797d3584c59953f2bd6aa1adc
AF_REFRESH_TOKEN           1004.a629ef92d515bdfb6bde31ea00e91d0c.a4b0763ebc1045d905de6255398bb906
ZOHO_CLIENT_ID             1000.FM9VMBUCYRM7HR4XJUE1V2M7O3XIUH
ZOHO_CLIENT_SECRET         f4f28b1044ada116072ad6a144d711bc5f3d4436d9
ZOHO_REFRESH_TOKEN         1000.bc0b9882b2557431e57b8027cb4244d1.93b0948f176cfa919b8f73cb2ff249d0
RECOVERY_SECRET            af-recover-2026-nitin
EMERGENCY_ADMIN_PASSWORD   AF-Emergency-2026-Nitin!
```

Rotate them all. The longer they stay valid, the larger the blast radius if the repo is ever leaked.
