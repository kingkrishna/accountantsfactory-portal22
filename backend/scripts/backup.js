#!/usr/bin/env node
/**
 * Database backup script — dumps all Catalyst Data Store tables to JSON.
 *
 * Usage:
 *   node scripts/backup.js
 *   node scripts/backup.js --out=./backups
 *
 * Output: one JSON file per table, plus a manifest with counts and timestamp.
 * Recommended: schedule daily via cron (Catalyst) or GitHub Actions.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs   = require('fs');
const path = require('path');
const db   = require('../src/models/db');

const TABLES = [
  'user', 'service', 'serviceOrder', 'serviceRequest', 'serviceComment',
  'workUpdate', 'document', 'referral', 'passwordResetToken',
  'auditLog', 'contactMessage'
];

function arg(name, def) {
  const match = process.argv.find(a => a.startsWith('--' + name + '='));
  return match ? match.slice(name.length + 3) : def;
}

async function main() {
  const outDir = path.resolve(arg('out', path.join(__dirname, '..', '..', 'backups')));
  const stamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir    = path.join(outDir, stamp);
  fs.mkdirSync(dir, { recursive: true });

  console.log('[backup] Writing to ' + dir);
  const manifest = { timestamp: stamp, tables: {} };

  for (const t of TABLES) {
    try {
      process.stdout.write('[backup] ' + t + ' ... ');
      const rows = await db[t].findMany();
      // Strip password_hash from user backup — store hashes separately if needed
      const sanitized = t === 'user'
        ? rows.map(r => ({ ...r, password_hash: '[REDACTED]' }))
        : rows;
      fs.writeFileSync(path.join(dir, t + '.json'), JSON.stringify(sanitized, null, 2));
      manifest.tables[t] = rows.length;
      console.log(rows.length + ' rows');
    } catch (e) {
      console.log('FAILED: ' + e.message);
      manifest.tables[t] = 'ERROR: ' + e.message;
    }
  }

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('[backup] Done. Manifest: ' + path.join(dir, 'manifest.json'));

  // Prune backups older than 30 days
  try {
    const all = fs.readdirSync(outDir).filter(f => /^\d{4}-\d{2}-\d{2}T/.test(f));
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const f of all) {
      const p = path.join(outDir, f);
      if (fs.statSync(p).mtimeMs < cutoff) {
        fs.rmSync(p, { recursive: true, force: true });
        console.log('[backup] Pruned old backup: ' + f);
      }
    }
  } catch (_) { /* ignore prune errors */ }
}

main().then(() => process.exit(0)).catch(e => {
  console.error('[backup] FATAL:', e);
  process.exit(1);
});
