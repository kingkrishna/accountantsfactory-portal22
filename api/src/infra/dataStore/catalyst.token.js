/**
 * Zoho Catalyst OAuth token management.
 *
 * This module owns ALL token state for talking to Catalyst Data Store. The
 * only way to get a usable access token is via `getAccessToken()`. The only
 * way to invalidate the cache (after a 401) is via `invalidate()`. Internal
 * state is not exported — callers cannot directly mutate `_accessToken` etc.,
 * which prevents the kind of cross-module coupling that this extraction
 * exists to remove.
 *
 * ─── DESIGN CHOICES ──────────────────────────────────────────────────────────
 *
 * 1. Two OAuth client identities (1004.* CLI / 1000.* Self Client) are
 *    selected automatically based on the refresh-token prefix. Either set of
 *    env vars works; the matching client_secret is paired.
 *
 * 2. Three lookup tiers for the refresh token:
 *      a. Runtime override (set via /api/__recover-token endpoint)
 *      b. process.env.AF_REFRESH_TOKEN or process.env.ZOHO_REFRESH_TOKEN
 *      c. Hardcoded FALLBACK_REFRESH_TOKEN (last-ditch; rotated 2026-05-01)
 *    Tier (c) exists ONLY because Catalyst AppSail env-var injection is
 *    unreliable on this account — without it, redeploys lose DB access and
 *    lock out every client. See docs/SECRETS-AUDIT.md for the rotation plan.
 *
 * 3. Single-flight refresh: when N concurrent requests all see an expired
 *    token, only ONE actually hits Zoho; the others await the same promise.
 *    Prevents thundering-herd against the OAuth endpoint and avoids spurious
 *    rate-limiting.
 *
 * 4. Two override knobs for outage recovery:
 *      - setRuntimeRefreshToken(tok)   — change the refresh token at runtime
 *      - setRuntimeAccessToken(tok,ttl) — inject an externally-minted access
 *                                          token directly, bypassing the OAuth
 *                                          refresh dance entirely. Used when
 *                                          the refresh-token flow is broken.
 *    Both are reachable only through admin-authenticated recovery endpoints
 *    in app.js — never exposed to user code paths.
 *
 * 5. Keep-alive timers (30s + every 3h) ensure the refresh_token never idles
 *    out (Zoho revokes tokens unused for ~3 months) and surface OAuth errors
 *    early instead of waiting for the first user request to discover them.
 */
'use strict';

const { httpPost } = require('./catalyst.client');

// ─── Endpoints + non-secret config ───────────────────────────────────────────
const ACCOUNTS_URL = 'https://accounts.zoho.in';

// Two OAuth client identities. Env vars (from app-config.json) win; hardcoded
// fallbacks exist ONLY because Catalyst AppSail env-var injection is unreliable
// on this account. See docs/SECRETS-AUDIT.md for the rotation plan.
const CLI_CLIENT_ID     = process.env.AF_CLIENT_ID     || '1004.NMUISG5YKILERY9G29LJHZWIY9II7Y';
const CLI_CLIENT_SECRET = process.env.AF_CLIENT_SECRET || 'ee359029dc211b37c797d3584c59953f2bd6aa1adc';
const SC_CLIENT_ID      = process.env.CATALYST_CLIENT_ID   || '1000.FM9VMBUCYRM7HR4XJUE1V2M7O3XIUH';
const SC_CLIENT_SECRET  = process.env.CATALYST_CLIENT_SECRET || 'f4f28b1044ada116072ad6a144d711bc5f3d4436d9';

// Fresh refresh token (regenerated 2026-05-01 with full ZohoCatalyst.tables.rows.*
// scopes). Rotate via Zoho API console + update env var.
const FALLBACK_REFRESH_TOKEN = '1000.bc0b9882b2557431e57b8027cb4244d1.93b0948f176cfa919b8f73cb2ff249d0';

// ─── Internal mutable state (NOT exported) ───────────────────────────────────
let _runtimeRefreshToken     = null;
let _accessToken             = null;
let _tokenExpires            = 0;
let _lastTokenError          = null;
let _lastTokenSuccess        = null;
let _runtimeAccessToken      = null;
let _runtimeAccessTokenExpires = 0;
let _refreshInFlight         = null;

// ─── Public read API ─────────────────────────────────────────────────────────

function getRefreshToken() {
  return _runtimeRefreshToken
    || process.env.AF_REFRESH_TOKEN
    || FALLBACK_REFRESH_TOKEN;
}

function getClientCreds() {
  const tok = getRefreshToken();
  if (tok && tok.startsWith('1000.')) {
    return { id: SC_CLIENT_ID, secret: SC_CLIENT_SECRET };
  }
  return { id: CLI_CLIENT_ID, secret: CLI_CLIENT_SECRET };
}

function getTokenHealth() {
  return {
    hasToken:        !!_accessToken,
    tokenExpiresIn:  _accessToken ? Math.max(0, Math.floor((_tokenExpires - Date.now()) / 1000)) : 0,
    lastSuccess:     _lastTokenSuccess,
    lastError:       _lastTokenError,
    refreshTokenSet: !!getRefreshToken(),
  };
}

// ─── Public mutation API (only reachable via admin recovery endpoints) ───────

function setRuntimeRefreshToken(tok) {
  if (typeof tok !== 'string' || !(tok.startsWith('1000.') || tok.startsWith('1004.'))) {
    throw new Error('Invalid refresh token format');
  }
  _runtimeRefreshToken = tok;
  _accessToken         = null;
  _tokenExpires        = 0;
  _lastTokenError      = null;
}

function setRuntimeAccessToken(tok, expiresInSec) {
  if (typeof tok !== 'string' || tok.length < 10) {
    throw new Error('Invalid access token');
  }
  const ttlSec = (typeof expiresInSec === 'number' && expiresInSec > 0) ? expiresInSec : 3500;
  _runtimeAccessToken         = tok;
  _runtimeAccessTokenExpires  = Date.now() + ttlSec * 1000;
}

/**
 * Drop the cached access token so the next getAccessToken() call refreshes.
 *
 * Used by catalystCall after a 401 to force a token refresh + retry. Does NOT
 * touch the refresh token (the underlying credentials remain valid).
 */
function invalidate() {
  _accessToken  = null;
  _tokenExpires = 0;
}

// ─── Single-flight token refresh ─────────────────────────────────────────────

async function getAccessToken() {
  if (_runtimeAccessToken && Date.now() < _runtimeAccessTokenExpires - 60000) {
    return _runtimeAccessToken;
  }
  if (_accessToken && Date.now() < _tokenExpires - 60000) return _accessToken;
  if (_refreshInFlight) return _refreshInFlight;

  _refreshInFlight = (async () => {
    try {
      const creds = getClientCreds();
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No Zoho refresh token configured (set AF_REFRESH_TOKEN or ZOHO_REFRESH_TOKEN)');
      }
      const body = `client_id=${creds.id}&client_secret=${creds.secret}&refresh_token=${refreshToken}&grant_type=refresh_token`;
      const data = await httpPost(ACCOUNTS_URL + '/oauth/v2/token', body, {
        'Content-Type': 'application/x-www-form-urlencoded',
      }, 25000);

      if (!data.access_token) {
        const errMsg = data.error === 'invalid_code'
          ? 'Zoho refresh token has been revoked or expired. Admin must regenerate via device flow.'
          : 'Failed to get access token: ' + JSON.stringify(data);
        _lastTokenError = { message: errMsg, at: new Date().toISOString(), data };
        console.error('[db] TOKEN REFRESH FAILED:', errMsg);
        if (_accessToken) return _accessToken; // degrade gracefully if we have a stale one
        throw new Error(errMsg);
      }

      _accessToken      = data.access_token;
      _tokenExpires     = Date.now() + (data.expires_in || 3600) * 1000;
      _lastTokenSuccess = new Date().toISOString();
      _lastTokenError   = null;
      return _accessToken;
    } catch (e) {
      _lastTokenError = { message: e.message, at: new Date().toISOString() };
      if (_accessToken) return _accessToken;
      throw e;
    } finally {
      _refreshInFlight = null;
    }
  })();

  return _refreshInFlight;
}

// ─── Keep-alive timers ───────────────────────────────────────────────────────
// Ping Zoho every 3 hours so the refresh_token never idles out (~3 month
// inactivity limit). The initial fire at 30s past startup verifies that token
// refresh works before the first user request hits the system.
setTimeout(() => { getAccessToken().catch(() => {}); }, 30000).unref();
setInterval(() => {
  getAccessToken().catch(() => { /* errors already logged */ });
}, 3 * 60 * 60 * 1000).unref();

module.exports = {
  // Read
  getAccessToken,
  getRefreshToken,
  getClientCreds,
  getTokenHealth,
  // Mutate (recovery endpoints only)
  setRuntimeRefreshToken,
  setRuntimeAccessToken,
  invalidate,
};
