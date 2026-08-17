#!/usr/bin/env node
// Single source of truth: web/ is authoritative. api/web/ is a deploy-only
// mirror that Catalyst serves. After making edits in web/, run this script
// to copy everything over and align the cache-bust version everywhere.
//
// What this fixes (root cause of mirror drift):
//   - bump-cache.js previously only rewrote ?v= strings, not file contents.
//   - That meant editing web/X.js and re-running bump-cache.js left api/web/X.js
//     untouched. The deploy then served the OLD code under a NEW cache key
//     -> stale assets cached as if fresh.
//
// Usage:
//   node api/scripts/sync-mirror.js          # uses FRONTEND_VERSION from app.js
//   node api/scripts/sync-mirror.js 78       # forces version 78 everywhere
//
// After running, ALL of:
//   - api/src/app.js   FRONTEND_VERSION
//   - every web/**/*.html      <meta app-version=N>  and  ?v=N
//   - every api/web/**/*.html  <meta app-version=N>  and  ?v=N
//   - every file under web/    copied to api/web/    (byte-identical)
// will be on the same N.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const WEB_SRC = path.join(ROOT, 'web');
const WEB_DST = path.join(ROOT, 'api', 'web');
const APP_JS = path.join(ROOT, 'api', 'src', 'app.js');

function readFrontendVersion() {
  const s = fs.readFileSync(APP_JS, 'utf8');
  const m = s.match(/FRONTEND_VERSION\s*=\s*parseInt\(process\.env\.FRONTEND_VERSION\s*\|\|\s*'(\d+)'/);
  if (!m) throw new Error('FRONTEND_VERSION not found in api/src/app.js');
  return parseInt(m[1], 10);
}

function writeFrontendVersion(n) {
  const s = fs.readFileSync(APP_JS, 'utf8');
  const r = s.replace(
    /(FRONTEND_VERSION\s*=\s*parseInt\(process\.env\.FRONTEND_VERSION\s*\|\|\s*')\d+(')/,
    `$1${n}$2`
  );
  if (s === r) throw new Error('Failed to rewrite FRONTEND_VERSION');
  fs.writeFileSync(APP_JS, r);
}

function copyRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const sp = path.join(src, ent.name);
    const dp = path.join(dst, ent.name);
    if (ent.isDirectory()) {
      copyRecursive(sp, dp);
    } else {
      fs.copyFileSync(sp, dp);
    }
  }
}

function bumpVersionsInHtml(root, n) {
  let count = 0;
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) { walk(p); continue; }
      if (!/\.html$/i.test(ent.name)) continue;
      const s = fs.readFileSync(p, 'utf8');
      const r = s
        .replace(/(<meta name="app-version" content=")\d+(")/g, `$1${n}$2`)
        .replace(/\?v=\d+/g, `?v=${n}`);
      if (s !== r) { fs.writeFileSync(p, r); count++; }
    }
  }
  walk(root);
  return count;
}

(function main() {
  const argN = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  if (argN !== null && (!Number.isFinite(argN) || argN <= 0)) {
    console.error('Bad version arg. Pass a positive integer or omit.');
    process.exit(2);
  }

  const currentV = readFrontendVersion();
  const targetV  = argN !== null ? argN : currentV;

  console.log(`[sync-mirror] FRONTEND_VERSION:  was ${currentV}  ->  ${targetV}`);

  if (targetV !== currentV) writeFrontendVersion(targetV);

  // 1. Wipe api/web and copy everything fresh from web/
  if (fs.existsSync(WEB_DST)) {
    fs.rmSync(WEB_DST, { recursive: true, force: true });
  }
  copyRecursive(WEB_SRC, WEB_DST);
  console.log(`[sync-mirror] Copied  web/  ->  api/web/  (fresh full copy)`);

  // 2. Bump <meta app-version> + ?v= in BOTH mirrors to the target version.
  const bumpedWeb = bumpVersionsInHtml(WEB_SRC, targetV);
  const bumpedApi = bumpVersionsInHtml(WEB_DST, targetV);
  console.log(`[sync-mirror] Cache-bust v=${targetV} in ${bumpedWeb} web/ files, ${bumpedApi} api/web/ files`);

  console.log(`[sync-mirror] DONE. All three locations now on v=${targetV}.`);
})();
