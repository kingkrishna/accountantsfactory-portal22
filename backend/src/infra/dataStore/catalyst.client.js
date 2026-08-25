/**
 * HTTP client primitives for talking to Catalyst REST + Zoho accounts OAuth.
 *
 * Pure-function HTTP layer. No token state, no caching, no retry logic — those
 * concerns live in `catalyst.token.js` (Phase 2.3) and `db.js` (catalystCall).
 *
 * Why this exists as a separate module:
 *
 * 1. Catalyst returns ROWIDs as 17-digit integers that exceed
 *    Number.MAX_SAFE_INTEGER (≈9.007e15). Naive JSON.parse loses precision.
 *    `httpRequest` defends by string-quoting any integer with 16+ digits
 *    BEFORE parsing.
 *
 * 2. Zoho's OAuth endpoint can take 8–20s under load. The HTTP client
 *    defaults to an 8-second timeout (safe for data-store calls) but accepts
 *    an override so the token-refresh flow can use 25s and stay under
 *    Catalyst's 30s function execution limit.
 *
 * 3. Keeping HTTP separate makes it unit-testable — mock the lib, assert on
 *    the request options and the precision-fix regex.
 */
'use strict';

const https = require('https');
const http  = require('http');

/**
 * Issue an HTTP(S) request and parse the JSON response.
 *
 * Defaults to 8s timeout. Returns the parsed JSON, or the raw body if
 * JSON.parse fails. Rejects on network/timeout errors.
 *
 * Big-integer safe: response integers with 16+ digits are wrapped in quotes
 * before parsing, so callers receive strings instead of corrupted numbers.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @param {string} url
 * @param {string|object|null} body  string passes through; object is JSON-stringified; null/empty sends no body
 * @param {Object<string,string>} headers
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<any>}  parsed JSON, or raw string if not JSON
 */
function httpRequest(method, url, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const opts = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      timeout:  timeoutMs || 8000,
      headers:  Object.assign({ 'Content-Length': Buffer.byteLength(bodyStr) }, headers),
    };
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          // Quote any large integer (16+ digits) before parse to avoid
          // Number.MAX_SAFE_INTEGER precision loss on Catalyst ROWIDs.
          const safe = raw.replace(/:\s*(-?\d{16,})([,\]\}])/g, ':"$1"$2');
          resolve(JSON.parse(safe));
        } catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('HTTP request timeout after ' + (timeoutMs || 8000) + 'ms: ' + url));
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

/** Convenience: same as httpRequest but method is hardcoded to POST. */
function httpPost(url, body, headers, timeoutMs) {
  return httpRequest('POST', url, body, headers, timeoutMs);
}

module.exports = {
  httpRequest,
  httpPost,
};
