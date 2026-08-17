# Deep Dive — `api/src/models/db.js` (the Catalyst data layer)

> Companion to [ARCHITECTURE-AUDIT.md](./ARCHITECTURE-AUDIT.md). Focuses on the single highest-leverage file. Read-only analysis — no functionality changes.

`db.js` is 777 lines and acts as the **entire database layer** for the application. It's a Prisma-compatible shim sitting on top of Catalyst Data Store's REST API. Every controller imports it via `require('../models/prismaClient')` (which is just `module.exports = require('./db')`).

## TL;DR

- **Read path is correct but expensive at cold-start.** Every model method ultimately calls `getTableRows(tableId)`, which pulls the entire table from Catalyst REST. The 30-second cache makes warm-path cheap; cold-start is brutal.
- **Includes are NOT classical N+1.** Each relation triggers exactly one extra full-table fetch (not one per row). The audit slightly overstated this — credit where due.
- **WHERE engine is hand-rolled** and handles Prisma's `equals/gt/lt/in/contains/not` subset. Missing: `mode: 'insensitive'`, `startsWith`, `endsWith`, `AND`/`OR`/`NOT` composition. Any controller that tries those silently fails.
- **The `period` SID-encoding kludge is a load-bearing footgun.** Three call sites must stay in sync (encode in `wrapServiceOrderModel.create/update`, decode in `getTableRows`).
- **`$transaction` is a fake.** Sequential execution with no rollback. Any controller that depends on atomicity is wrong.
- **Hardcoded secrets at the top of the file.** Fallbacks for refresh token + client secret + client ID. Repo is public-ish. Highest priority security item.

---

## Section-by-section analysis

### 1. Configuration block (lines 10–60)

```js
const PROJECT_ID    = process.env.CATALYST_PROJECT_ID    || '18944000000044043';
const CLI_CLIENT_ID     = process.env.AF_CLIENT_ID     || '1004.NMUISG5YKIL...';
const CLI_CLIENT_SECRET = process.env.AF_CLIENT_SECRET || 'ee359029dc211b37...';
const SC_CLIENT_ID      = process.env.ZOHO_CLIENT_ID   || '1000.FM9VMBUCYRM...';
const SC_CLIENT_SECRET  = process.env.ZOHO_CLIENT_SECRET || 'f4f28b1044ada116...';
const FALLBACK_REFRESH_TOKEN = '1000.bc0b9882b2557431e57b8027cb4244d1...';
```

**Issue 1 (CRITICAL):** every secret has an inline hardcoded fallback. These end up in git history forever even if the file is later cleaned. The block comment explains *why* (Catalyst env-var injection is unreliable) — but the fix is to make boot fail loudly when env vars are missing, not to ship hardcoded production secrets.

**Issue 2 (MEDIUM):** mixing two OAuth client identities (1004.* CLI vs. 1000.* Self Client) in the same module with implicit selection (`getClientCreds()` picks based on token prefix). This is clever and works, but a new contributor will not understand it without reading the comments — and there are only fragments of comments. **Recommendation:** isolate token strategy into `infra/dataStore/catalyst.token.js`.

### 2. Token cache + refresh (lines 63–149)

This is the **best-engineered section of the file.** Single-flight refresh, runtime override, disk-persistence avoidance, keep-alive on a 3-hour timer. Don't touch it.

One nit:
- `_lastTokenError` / `_lastTokenSuccess` are exposed via `getTokenHealth()` but `setRuntimeRefreshToken` resets `_lastTokenError` to `null` while leaving `_lastTokenSuccess` stale. After a recovery, `/api/status` reports "last success: 4 hours ago, last error: none" — misleading.

### 3. HTTP helper (lines 151–187)

`httpRequest` does the right things: timeout (default 8s), JSON parse with large-int string protection (so 17-digit Catalyst ROWIDs don't lose precision), error handler. The `:\s*(-?\d{16,})([,\]\}])` regex (line 173) is a fragile but pragmatic fix for the V8 number-precision limit.

**Issue 3 (LOW):** the regex doesn't handle scientific notation in the input. If Catalyst ever returns `1.23e16` it silently breaks. Catalyst doesn't do this today, but a defensive comment + unit test would help.

### 4. The `catalystCall` self-heal (lines 189–222)

```js
async function catalystCall(method, path, body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(...);
    const isAuthFailure = result && (
      result.status === 401 ||
      (result.data && result.data.error_code === 'INVALID_OAUTHTOKEN') ||
      ...
    );
    if (isAuthFailure && attempt === 1) {
      _accessToken = null;
      continue;
    }
    return result;
  }
}
```

**Strength:** retry-once on 401 is correct. Prevents user-facing failure when the access token expires mid-request.

**Issue 4 (MEDIUM):** after 2 attempts, if the second also fails auth, we return the failure response object **silently** — the caller's `if (res.status === 'failure')` checks may or may not trigger. Stronger pattern: throw a typed `AuthError` on second-attempt failure so the global error handler can decide.

### 5. Table map (lines 224–246)

```js
const TABLE = {
  user:               { id: '18944000000047054' },
  service:            { id: '18944000000038069' },
  ...
};
const ROWID_COLS = new Set(['user_id', 'employee_id', 'service_id', ...]);
const TIMESTAMP_COLS = new Set(['expires_at', 'update_date']);
```

**Issue 5 (LOW):** numeric table IDs are magic constants. Extracting to `config/catalyst-tables.js` lets you switch environments (dev/staging/prod) by swapping one file, not editing `db.js`.

### 6. Row CRUD (lines 248–280)

`insertRow / updateRow / deleteRow` are correct, terse, well-isolated. Cache invalidation happens after every write (`invalidateCache(tableId)`). Defensive against Catalyst's `status: 'failure'` envelopes.

### 7. `getTableRows` — the cost center (lines 282–355)

```js
async function getTableRows(tableId) {
  const cached = _rowCache.get(tableId);
  if (cached && Date.now() < cached.expires) return cached.rows.slice();

  let rows = []; let nextToken = null; let completed = false;
  for (let page = 0; page < 5000; page++) {
    const qs = nextToken ? `?next_token=${encodeURIComponent(nextToken)}` : '';
    const res = await catalystGet(`/baas/v1/project/${PROJECT_ID}/table/${tableId}/row${qs}`);
    // ... accumulate rows
    if (!res.more_records || !res.next_token) { completed = true; break; }
    nextToken = String(res.next_token);
  }

  // ServiceOrder-specific filtering + period decoding
  if (tableId === TABLE.serviceOrder.id) {
    rows = rows.filter(r => r.user_id !== '1' && r.user_id !== 1 && r.user_id != null);
    rows = rows.map(r => /* decode SID: prefix */);
  } else if (tableId === TABLE.service.id) {
    rows = rows.filter(r => !STATUS_VALUES.has(...));
  }
  if (completed) _rowCache.set(tableId, { rows: rows.slice(), expires: Date.now() + CACHE_TTL_MS });
  return rows;
}
```

**Strength:** correct pagination cursor, partial-fetch protection (only caches if `completed`), table-specific post-processing collected here rather than scattered.

**Issue 6 (HIGH, structural):** **the entire read model.** Every WHERE/ORDER/LIMIT happens in JS after pulling the full table. This is fine at ~500 rows per table. It will not be fine at 50,000.

**Issue 7 (MEDIUM):** table-specific post-processing (`if (tableId === TABLE.serviceOrder.id) ...`) lives at this generic level. The intent — "always strip phantom rows" — is correct, but the location couples a generic data-fetch function to specific table schemas. Extract `decodeRow` per table.

**Issue 8 (LOW):** `5000 pages × 200 rows = 1,000,000 rows max`. If a table somehow grows beyond this, the loop exits silently with `completed = true` but only because `more_records` flipped. There's no warning log.

### 8. `parseRow` + `prepareData` (lines 357–390)

`parseRow` correctly maps Catalyst's system columns (`ROWID`, `CREATEDTIME`, `MODIFIEDTIME`) to Prisma idioms (`id`, `createdAt`, `updatedAt`) and coerces "true"/"false" strings to booleans. Clean.

`prepareData` aliases `date` → `update_date` (for `workUpdate`) and converts `Date` instances to either Unix-ms (for timestamp cols) or ISO datetime strings (everything else).

**Issue 9 (MEDIUM):** the `date` → `update_date` alias is the only column rename done at this level. It works but is undocumented and surprising. A `COLUMN_ALIASES` map would make this discoverable.

### 9. WHERE engine (lines 392–449)

`matchesWhere` implements Prisma's where-clause subset by hand. Supports `equals/gt/gte/lt/lte/not/in/contains`. Handles Date comparison, boolean coercion, ROWID string-comparison (to dodge 17-digit precision loss).

**Issue 10 (HIGH for future controllers):** `AND`/`OR`/`NOT` composition is **silently unsupported**. If a controller writes:
```js
prisma.user.findMany({ where: { OR: [{ email: 'a@b' }, { name: 'A' }] } })
```
…the engine will treat `OR` as an unknown column and the row never matches. No error thrown. **This is a tripwire.**

**Issue 11 (MEDIUM):** `mode: 'insensitive'` for string contains is not supported. All searches are case-sensitive unless the controller manually lowercases both sides.

**Issue 12 (LOW):** `startsWith` / `endsWith` operators are missing.

### 10. Relations + `resolveIncludes` (lines 474–579)

Better than my earlier audit gave it credit for. Each include triggers ONE `getTableRows` for the related table, then groups the related rows by FK in a single pass. So an order list with 5 includes = 5 extra full-table fetches, **not** 5 × N.

**Strength:** the `_count: { select: { documents: true } }` pattern is correctly implemented at line 519.

**Issue 13 (HIGH at scale):** the join still pulls every related row into memory, even ones not relevant to the result set. Listing 10 orders pulls all 50,000 work-updates to find the 10 latest. **Recommendation:** add a `findManyByIds(ids)` primitive that hits Catalyst's `/row?ROWID=...` filter API when available, falling back to the full-fetch path.

**Issue 14 (LOW):** `selectFields` only applies to relation rows, not to the parent rows being returned. So `prisma.user.findMany({ select: { email: true } })` actually returns the whole user object. Not wrong, just doesn't honor Prisma's select semantics.

### 11. `createModel` factory (lines 581–660)

A clean generic Prisma-shape adapter. `findUnique / findFirst / findMany / count / create / update / updateMany / delete / deleteMany`. The `update` method correctly throws `P2025` when no row matches (Prisma idiom).

**Issue 15 (LOW):** `findUnique` and `findFirst` resolve includes for the single returned row, but with the same per-relation full-table fetch cost. Fine — but combined with N concurrent `findUnique` calls in a hot loop, it explodes. Not currently abused by any controller, but worth flagging.

### 12. The `period` SID-encoding kludge (lines 662–735)

```js
function encodeServiceOrder(data) {
  const out = { ...data };
  if (out.service_id != null) {
    const period = out.period != null ? String(out.period) : '';
    out.period = `${SID_PREFIX}${out.service_id}|${period}`;
  }
  delete out.service_id;
  return out;
}

function wrapServiceOrderModel(m) {
  return {
    async update(args) {
      let data = args.data;
      if ('employee_id' in data && !('service_id' in data) && !('period' in data)) {
        const existing = await this.findUnique({ where: args.where });
        if (existing) {
          data = { ...data, service_id: existing.service_id, period: existing.period };
        }
      }
      if ('service_id' in data || 'period' in data) data = encodeServiceOrder(data);
      const result = await orig.update({ ...args, data });
      return decodeServiceOrderRow(result);
    },
    ...
  };
}
```

This is the **single most fragile** piece of code in the codebase. Three rules must hold:
1. **Every write** to `serviceOrder` must go through `wrapServiceOrderModel`. A bare `prisma.serviceOrder.update` would silently lose service_id.
2. **Every read** must decode SID prefix from `period`. This is centralized in `getTableRows`.
3. **`employee_id`-only updates** must re-fetch the existing row to preserve service_id (the Catalyst mirroring bug).

A new dev who reads "update an order's status" code will look at `prisma.serviceOrder.update({ where, data: { status } })`, assume it works, and ship a bug.

**Recommendations:**
- Move encode/decode into a single `period-encoding.js` file with a single point of documentation.
- Add a runtime assertion: when `update` is called with both `service_id` and `period` keys, log a warning — current callers shouldn't mix these.
- Add a comment block at the top of `wrapServiceOrderModel` explaining the Catalyst mirroring bug in 5 lines.

### 13. `$transaction` (lines 736–746)

```js
async function $transaction(fn) {
  const tx = {};
  for (const modelName of Object.keys(TABLE)) {
    tx[modelName] = modelName === 'serviceOrder'
      ? wrapServiceOrderModel(createModel(modelName))
      : createModel(modelName);
  }
  return fn(tx);
}
```

**Issue 16 (HIGH):** this is **not a transaction**. There is no rollback. If step 2 of `tx.user.update(); tx.referral.create();` fails, the user is left updated and the referral is missing. Every caller that uses `prisma.$transaction` is relying on atomicity that does not exist. Either:
- Rename to `$sequential` and audit every call site (small breaking change inside the codebase).
- OR implement compensating actions in a real transaction wrapper.

Right now, the audit's recommendation is: **document this aggressively, then audit every call site for ordering bugs.**

---

## What the data layer should look like

```
api/src/infra/dataStore/
  catalyst.client.js       // ~80 LOC — HTTP + timeout + JSON precision fix
  catalyst.token.js        // ~120 LOC — OAuth refresh, single-flight, recovery hook
  cache.js                 // ~40 LOC — per-table TTL, get/set/invalidate
  period-encoding.js       // ~30 LOC — encode/decode the SID prefix, ONE place
  catalyst.repo.js         // ~150 LOC — generic find/insert/update/delete + includes
  repos/
    user.repo.js           // ~30 LOC — thin wrapper
    serviceOrder.repo.js   // ~50 LOC — uses period-encoding
    ...
  index.js                 // exports the same shape as today's `db` for backward compat
```

**Total target: ~600 LOC across 10 small files, vs. 777 LOC in one file today.** No new dependencies. No functionality change. Unit tests become possible because each piece accepts its dependencies via constructor.

---

## Migration plan (concrete, week by week)

### Week 1 — extract pure pieces (zero risk)
1. Move `period-encoding.js` out (encode + decode). Delete inline code from `wrapServiceOrderModel`. Unit test: round-trip a few values.
2. Move HTTP client out (`httpRequest`, `catalystGet/Post/Put/Delete`). No code change, just a `require`.
3. Move token cache + refresh out (`getAccessToken`, `setRuntimeRefreshToken`). Unchanged behavior.

After week 1, `db.js` is ~500 LOC and the kludge has one home.

### Week 2 — repository layer (still no behavior change)
4. Introduce `CatalystRepo` class. `createModel` becomes `(modelName) => new CatalystRepo(...)`.
5. Per-table TTL configuration. `TTL_BY_TABLE` map injected at construction.
6. Add `WhereEngine` class (today's `matchesWhere`) — keep semantics identical, add `AND`/`OR`/`NOT` support gated by a feature flag.

### Week 3 — typed errors + observability
7. Replace `console.error(...)` with `logger.error(...)`. Add request-ID propagation via async-local-storage.
8. Throw typed `AuthError` / `NotFoundError` from the repo layer. Update `catalystCall` to throw on second-attempt auth failure (current `Issue 4`).

### Week 4 — N+1 mitigation
9. Add `findManyByIds(ids)` primitive. `resolveIncludes` uses it. Test with a large orders list and observe latency drop.

---

## What this delivers

After these four weeks, with **zero functional changes**:

- Cold-start latency drops because per-table TTLs match write rates (users cached 5min, comments 5s).
- Adding a new domain (e.g. invoices) requires writing one ~40 LOC repo file, not editing `db.js`.
- The Catalyst-mirroring quirk lives in exactly one file with one test.
- Boot fails loudly when secrets are missing instead of falling back to compromised values.
- The next time Zoho rotates an API endpoint, you change one file.
- Unit tests are trivial — every repo accepts its cache + client + token store via constructor.

---

## Appendix A — issues at a glance

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | CRITICAL | Config | Hardcoded refresh token + client secret as fallbacks |
| 2 | MEDIUM | Config | Two OAuth identities in same module with implicit selection |
| 3 | LOW | HTTP | Regex for large-int won't handle scientific notation |
| 4 | MEDIUM | `catalystCall` | Silently returns failure response after retry; should throw typed error |
| 5 | LOW | TABLE map | Magic IDs — extract to env config |
| 6 | HIGH | `getTableRows` | Full-table scan; will not scale past ~10k rows |
| 7 | MEDIUM | `getTableRows` | Table-specific filtering at generic layer |
| 8 | LOW | `getTableRows` | 1M-row safety limit has no warning log |
| 9 | MEDIUM | `prepareData` | Undocumented `date → update_date` alias |
| 10 | HIGH | `matchesWhere` | Silently ignores `AND`/`OR`/`NOT` — tripwire |
| 11 | MEDIUM | `matchesWhere` | No `mode: 'insensitive'` |
| 12 | LOW | `matchesWhere` | No `startsWith`/`endsWith` |
| 13 | HIGH | `resolveIncludes` | Pulls all related rows even when only 10 are needed |
| 14 | LOW | `createModel` | `select` not honored on parent rows |
| 15 | LOW | `createModel` | `findUnique` + includes is expensive in hot loops |
| 16 | HIGH | `$transaction` | Not a transaction — no rollback. Audit every call site |

16 issues. None are user-facing bugs today. All compound as the system grows.
