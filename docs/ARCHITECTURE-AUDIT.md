# Senior Engineer Audit — AccountantsFactory Portal

> Read-only architectural audit. **No functionality changes are proposed.** All recommendations preserve current behaviour and ship in phases.
>
> Original delivery: in-chat session, 2026. Captured here so it can be referenced and worked through phase by phase.

---

## 1. Reverse-engineered architecture

**Stack.** Single Express monolith ([api/](../api)) deployed to Zoho Catalyst AppSail. Static site + portal HTML served by the same Express process ([web/](../web) and an in-repo mirror at [api/web/](../api/web)). Data layer is **not** Prisma — it's a **Prisma-compatible shim** ([api/src/models/db.js](../api/src/models/db.js)) over Catalyst Data Store REST. Email via Zoho SMTP. JWT for auth.

**Data flow for a typical "admin lists orders" request:**

```
Browser
  → fetch /api/admin/orders  (JWT in Authorization header)
    → app.js: rateLimit → CORS preflight handler → express.json
    → /api/admin/* → authenticateToken → requireAdmin → audit-log middleware (fire-and-forget)
    → adminController.getAllOrders
      → prisma.serviceOrder.findMany({ where, include, orderBy })
        → db.js createModel(serviceOrder).findMany
          → getTableRows(tableId)                  // paginates Catalyst /baas/.../row, caches 30s
          → rows.map(parseRow)                     // ROWID→id, CREATEDTIME→createdAt, etc.
          → .filter(matchesWhere)                  // JS-side WHERE
          → sortRows(orderBy)                      // JS-side ORDER BY
          → resolveIncludes(...)                   // N+1 fetches for relations
      ← list of decoded order objects
    ← JSON response
  ← UI renders into <table>
```

**Auth flow.**

```
POST /api/auth/login → bcrypt verify → JWT sign
  → frontend stores in localStorage as 'auth_token' + 'user_data'
  → every subsequent fetch adds Authorization: Bearer <jwt>
  → middleware/auth.authenticateToken: jwt.verify → load user → req.user
  → middleware/auth.requireAdmin / requireClient / requireEmployee: role check
```

**Token recovery flow** (Catalyst data store OAuth).

```
db.js boot:
  - reads refresh_token from runtime override (set via /api/__recover-token)
                       ↓
                  process.env.AF_REFRESH_TOKEN
                       ↓
                  process.env.ZOHO_REFRESH_TOKEN
                       ↓
                  FALLBACK_REFRESH_TOKEN  (hardcoded — last-ditch)
  - getAccessToken() single-flight POSTs to accounts.zoho.in/oauth/v2/token
  - catalystCall() retries once on 401 (auto-heals expired access token)
  - admin-only /api/__recover-token endpoint can inject a fresh refresh_token at runtime
```

**Critical quirk: Catalyst Data Store mirrors `service_id ↔ employee_id`.** db.js works around it by encoding `service_id` into the `period` column as `SID:<id>|<actual period>` on write, and decoding on every read.

---

## 2. Critical problem areas (prioritized)

### P0 — Architecture / Correctness

#### P0-A. Full-table-scan database layer
Every Prisma method (`findMany`, `findFirst`, `findUnique`, `count`) calls `getTableRows(tableId)`, which fetches **the entire table** from Catalyst, then filters/sorts/paginates **in JavaScript**. There is a 30s in-memory cache, but the worst case is:
- Each pod cold-starts with empty cache.
- First request for any model pulls **every user row** (~500+) from Catalyst over REST. The wrapper paginates Catalyst's 200-row API limit up to **5000 pages = 1,000,000 rows max**.
- `count()` does the same full fetch and then `.length`s the result.

At 5k clients × 6 active models = ~30k row fetches per cold start. AppSail recycles pods regularly. **This will not scale past ~10k users without a redesign.**

#### P0-B. N+1 in `resolveIncludes`
Every `include` does another full-table fetch per related model. `findMany` for orders with `{ include: { user, service, employee, workUpdates, comments } }` causes **5 additional full-table reads**. Even with the 30s cache, the cold-start cost is brutal.

#### P0-C. Hardcoded production secrets in source
`api/src/models/db.js` ships with hardcoded `1004.*` / `1000.*` client IDs/secrets AND a hardcoded `FALLBACK_REFRESH_TOKEN`. Repo is on GitHub. The comment honestly states *"only useful for THIS specific Catalyst project — rotate after suspected leak"* — but **that mitigation has not been done**. Anyone with repo read access can talk to your Catalyst data store as you.

#### P0-D. Catalyst-mirroring kludge is fragile
The `SID:<id>|<period>` encoding lives across 3 places: encode on write, decode in `getTableRows`, special-case in `update` to preserve service_id when `employee_id` changes. Any new code path that writes to `period` without going through the wrapper silently corrupts orders. This is a load-bearing footgun.

#### P0-E. Two HTML mirrors (`web/` and `api/web/`) can drift
Every change must be made to BOTH `web/portal/...` and `api/web/portal/...`. Most session-history bugs ("login still broken", "logo missing") trace to the mirror being out of sync. There's no script enforcing the mirror — only convention.

### P1 — Performance / Reliability

- **P1-A.** `api/src/controllers/adminController.js` is **1246 lines** — every admin operation, no domain split (clients / services / orders / employees / referrals / documents all in one file).
- **P1-B.** `web/portal/js/admin-dashboard.js` is **1866 lines** of vanilla JS with global mutable state (`var lastClients = []; var _clientsPage = 1; var _addOrderAllClients = []; ...`). Section switching, modal logic, table rendering, pagination, search, comments, 2FA, all in one file.
- **P1-C.** **Audit-log middleware fires synchronously inside the request lifecycle**. Although wrapped in `setImmediate`, it still calls `prisma.auditLog.create` which is **another full-table fetch**. Every admin write doubles its DB work.
- **P1-D.** No request-level idempotency keys on payment/referral approval. Double-clicks can double-approve.
- **P1-E.** Cache TTL is **a single number (30s)** for all tables. Users vs. comments vs. orders have very different write rates; one TTL is a compromise that's wrong for all of them.
- **P1-F.** `sanitizeText` HTML-escapes input **before** length check — a 500-char input with `<` chars throws as "too long" even though the user typed exactly 500.

### P2 — Maintainability / Code quality

- **P2-A.** Three concurrent "cache busters" on the frontend: `version-check.js`, `cache-buster.js`, and HTML `?v=N` query strings. The combination occasionally produces redirect loops.
- **P2-B.** Asset query strings (`?v=22`, `?v=31`, `?v=63`) are **hand-maintained per-file**, frequently get out of sync (login.html had `?v=22` and `?v=31` mixed in the same page). The cache-buster's whole job is compensating for this manual versioning.
- **P2-C.** No automated tests on critical paths. The `__tests__` folder and `jest.setup.js` exist but coverage is effectively zero.
- **P2-D.** Mixed module styles. `db.js` uses CommonJS. Frontend has IIFEs with closures and globals (`window.AfComments`, `window.clientAuth`). No bundler.
- **P2-E.** Three different "auth gates": the inline `<script>` gate at top of each portal HTML, `auth.js requireAdmin/requireClient/requireEmployee`, and the server-side `authenticateToken` middleware. They diverged (e.g. DocGen inline gate read `authToken` while `auth.js` writes `auth_token`).

### P3 — Security

- **P3-A.** Hardcoded `JWT_SECRET` fallback `"accountantsfactory_super_secret_jwt_2024"` in `api/startup.js` and `app-config.json`. Anyone who reads either file can forge admin JWTs.
- **P3-B.** CSP allows `'unsafe-inline'` for both `script-src` and `style-src` — that defangs CSP entirely.
- **P3-C.** Recovery endpoints (`/api/__recover-token`, `/api/__set-access-token`, `/api/__token-keepalive`) are now gated by `requireRecoverySecret`, but the secret has a **hardcoded fallback** too.
- **P3-D.** Audit log writes `req.body` shallowly. No redaction; passwords in `/change-password` body land in the audit log table.
- **P3-E.** `helmet`'s CSP is overridden with `imgSrc: ['self', 'data:', 'https:']` — `https:` allows any HTTPS image source, defeating CSP image hardening.

---

## 3. Clean architecture breakdown (target shape)

```
api/
  src/
    app.js                          // wiring only — no controllers inline
    server.js                       // listen() — separates app from boot for tests
    config/
      env.js                        // zod-validated env loader, throws on missing
      catalyst.js                   // PROJECT_ID, TABLE map, scopes
    domain/                         // ← pure business logic per aggregate
      clients/
        client.repo.js              // CRUD via dataStore
        client.service.js           // business rules (lockout, referral codes)
        client.controller.js        // HTTP only — thin
        client.routes.js
      orders/
      employees/
      services/                     // service catalog
      referrals/
      documents/
      comments/
      auth/
      notifications/
    infra/
      dataStore/
        catalyst.client.js          // HTTP + retry + 401 self-heal
        catalyst.token.js           // OAuth refresh, single-flight, recovery hook
        catalyst.repo.js            // generic find/insert/update/delete
        cache.js                    // per-table TTL with explicit invalidation
        period-encoding.js          // SID:<id>|... encode/decode (one file)
      email/
        nodemailer.client.js
        templates/
      logger/
        logger.js                   // winston/pino — replaces console.*
        auditLog.repo.js            // write-only, never read in request path
    middleware/
      auth.js
      rbac.js
      rateLimit.js
      requestId.js
      errorHandler.js               // single express error handler
    utils/
      validation.js
      pagination.js                 // shared page-size, total, pages
  web/                              // ← REMOVED — replaced by single static dir
  app-config.json                   // ← contains ONLY non-secret config
  .env.example                      // documents required secrets (real .env gitignored)

web/                                // ← single source of truth
  public/                           // marketing site
  portal/                           // SPA
    src/
      shared/
        api.js                      // single API client
        auth.js                     // single token store
        cache-buster.js             // single mechanism — version-check.js retired
        components/                 // header, footer, modal, table, paginator
      pages/
        admin/                      // modules per section (clients, orders, ...)
        client/
        employee/
    dist/                           // built output served by Express
```

**Key target shifts:**

1. **One source of truth for static assets.** Express points its `static` middleware at `web/dist`. Drop `api/web/` entirely. CI builds `web/dist` once. No more "mirror drift" bugs.
2. **Repo + Service pattern per aggregate.** Controllers become 10-15 line HTTP adapters. Business logic is unit-testable.
3. **Cache layer is explicit.** Per-table TTL configured by domain (users: 5min, comments: 5s, orders: 30s). All writes invalidate via a typed `cacheKey` constant — no magic.
4. **One auth gate.** Server-side middleware is THE gate. Frontend just redirects unauthenticated requests after they fail. Removes inline-script gates entirely.
5. **One cache-buster.** Single `cache-buster.js` reads `meta[name=app-version]` once, polls `/api/version` on focus, hard-reloads on mismatch. Delete `version-check.js`. HTML asset URLs use `?v=__BUILD__` placeholder replaced at build time — no hand-maintained query strings.

---

## 4. Refactoring strategy (safe, incremental, no functional change)

**Principle: every step is mergeable on its own and ships value before the next step starts. No big-bang rewrite.**

### Phase 1 — Stop the bleeding (1 week)
1. **Rotate every secret in repo.** New JWT_SECRET, new Catalyst Self Client, new refresh tokens, new recovery secret. Delete hardcoded fallbacks from source — make missing env vars fail fast at boot. Add `.env.example`. *No new code, just secret rotation + small startup check.*
2. **Single source of truth for static.** Delete `api/web/`. Express serves `web/` directly. Add a CI lint step that fails if `api/web/` reappears.
3. **Single asset version.** Replace every hand-maintained `?v=NN` with `?v=${FRONTEND_VERSION}` injected by Express via a one-line response interceptor on `.html`. Delete `version-check.js`.

### Phase 2 — Repository extraction (2 weeks, no behavior change)
4. **Carve out `infra/dataStore/`** from `db.js`. Split into: `catalyst.client.js` (HTTP+token), `catalyst.repo.js` (generic find/insert), `period-encoding.js` (the SID kludge — isolated and unit-tested), `cache.js` (per-table TTL).
5. **Extract `auditLog.repo.js`** that never reads. Audit middleware uses a single `auditLog.create()` that bypasses the row cache entirely.
6. **Move from `prisma.*` to typed repositories** *one model at a time*. Add a thin `repos/clients.js` that calls the generic repo. Keep `prisma.user.findMany` working until every call site migrated.

### Phase 3 — Domain modules (3 weeks)
7. **Split `adminController.js`** (1246 LOC) into `domain/clients`, `domain/orders`, `domain/employees`, `domain/services`, `domain/referrals`, `domain/documents`. Each ≤200 LOC. Same routes, same behavior — pure file moves + import updates.
8. **Per-domain caches.** Inject `cache` into each repo with a domain-appropriate TTL.
9. **N+1 fix.** Replace `resolveIncludes`' lazy-per-row include with a single prefetched bucket per relation. Pseudocode:
   ```js
   // BEFORE: O(rows × relations) full-table fetches
   for (const row of rows) {
     for (const inc of includes) row[inc] = await repo[inc].findOne(...)
   }
   // AFTER: O(relations) prefetches
   const relatedIds = collectIds(rows, includes)
   const related = await Promise.all(includes.map(i => repo[i].findManyByIds(relatedIds[i])))
   stitch(rows, related)
   ```

### Phase 4 — Frontend split (3 weeks)
10. **Split `admin-dashboard.js` by section** into `pages/admin/clients.js`, `pages/admin/orders.js`, etc. Shared utils already live in `admin-dashboard-utils.js`. Mount each section from a tiny `admin-dashboard.js` router.
11. **Single auth gate.** Remove inline `<script>` gates. Have `auth.js` expose `requireRole('admin')` that runs before app code on every protected page.

### Phase 5 — Tests + observability (ongoing)
12. **Add unit tests for the domain layer** as it's extracted (Phase 2/3 makes this trivial — pure functions vs. injected repos).
13. **Replace `console.log/error`** with `pino` (zero-deps, fast). Structured logs are searchable.
14. **Add a request-ID middleware**. Audit logs and email alerts carry it. Now "client X says login failed at 10:42" is traceable in one grep.

---

## 5. Improved production-grade code samples

### 5.1 — Typed env loader (kills hardcoded fallback secrets)

```js
// api/src/config/env.js
const { z } = require('zod')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  CATALYST_PROJECT_ID: z.string().regex(/^\d+$/),
  AF_CLIENT_ID:     z.string().startsWith('1004.'),
  AF_CLIENT_SECRET: z.string().min(20),
  AF_REFRESH_TOKEN: z.string().startsWith('1004.'),
  ZOHO_CLIENT_ID:     z.string().startsWith('1000.'),
  ZOHO_CLIENT_SECRET: z.string().min(20),
  ZOHO_REFRESH_TOKEN: z.string().startsWith('1000.'),
  RECOVERY_SECRET: z.string().min(32),
  SMTP_HOST: z.string(),
  SMTP_USER: z.string().email(),
  SMTP_PASSWORD: z.string(),
  EMAIL_FROM: z.string().email(),
  FRONTEND_URL: z.string().optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('FATAL: invalid environment')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

module.exports = Object.freeze(parsed.data)
```

### 5.2 — Per-table cache with explicit TTL

```js
// api/src/infra/dataStore/cache.js
const TTL_BY_TABLE = {
  user:           5 * 60_000,  // 5 min
  service:       10 * 60_000,  // 10 min
  serviceOrder:  30_000,
  serviceComment: 5_000,
  workUpdate:    10_000,
  document:      60_000,
  referral:      60_000,
  auditLog:      Infinity,     // never read in request path → never cache
}

class TableCache {
  constructor() { this._store = new Map() }
  get(tableId) {
    const e = this._store.get(tableId)
    if (!e || Date.now() >= e.expires) return null
    return e.rows.slice()
  }
  set(tableId, rows, ttlMs) {
    if (ttlMs === Infinity) return
    this._store.set(tableId, { rows: rows.slice(), expires: Date.now() + ttlMs })
  }
  invalidate(tableId) { this._store.delete(tableId) }
}

module.exports = { TableCache, TTL_BY_TABLE }
```

### 5.3 — Generic Catalyst repo with isolated period encoding

```js
// api/src/infra/dataStore/catalyst.repo.js
const catalyst = require('./catalyst.client')
const { encodePeriod, decodePeriod } = require('./period-encoding')

class CatalystRepo {
  constructor({ tableId, encodeWrite = (d) => d, decodeRow = (r) => r, cache, ttlMs }) {
    this.tableId = tableId
    this.encode  = encodeWrite
    this.decode  = decodeRow
    this.cache   = cache
    this.ttlMs   = ttlMs
  }

  async findAllRaw() {
    const cached = this.cache.get(this.tableId)
    if (cached) return cached
    const rows = await catalyst.fetchAllRows(this.tableId)
    const decoded = rows.map(this.decode)
    this.cache.set(this.tableId, decoded, this.ttlMs)
    return decoded
  }

  async insert(data)        { const r = await catalyst.insertRow(this.tableId, this.encode(data)); this.cache.invalidate(this.tableId); return this.decode(r) }
  async update(rowid, data) { const r = await catalyst.updateRow(this.tableId, rowid, this.encode(data)); this.cache.invalidate(this.tableId); return this.decode(r) }
  async remove(rowid)       { await catalyst.deleteRow(this.tableId, rowid); this.cache.invalidate(this.tableId) }
}

class ServiceOrderRepo extends CatalystRepo {
  constructor({ cache }) {
    super({
      tableId: TABLES.serviceOrder,
      encodeWrite: encodePeriod,
      decodeRow:   decodePeriod,
      cache,
      ttlMs: TTL_BY_TABLE.serviceOrder,
    })
  }

  async update(rowid, data) {
    // Catalyst mirrors service_id↔employee_id. Re-fetch existing row to preserve SID
    // when employee_id is changing alone. The kludge is documented here, not scattered.
    if ('employee_id' in data && !('service_id' in data) && !('period' in data)) {
      const existing = await this.findById(rowid)
      if (existing) data = { ...data, service_id: existing.service_id, period: existing.period }
    }
    return super.update(rowid, data)
  }
}
```

### 5.4 — Domain service using repos (N+1 fix)

```js
// api/src/domain/orders/order.service.js
class OrderService {
  constructor({ orderRepo, userRepo, serviceRepo, workUpdateRepo, email }) {
    this.orderRepo      = orderRepo
    this.userRepo       = userRepo
    this.serviceRepo    = serviceRepo
    this.workUpdateRepo = workUpdateRepo
    this.email          = email
  }

  async listEnriched(filters) {
    const orders = await this.orderRepo.find(filters)
    if (!orders.length) return []

    const userIds    = new Set(orders.flatMap(o => [o.user_id, o.employee_id]).filter(Boolean))
    const serviceIds = new Set(orders.map(o => o.service_id).filter(Boolean))
    const orderIds   = new Set(orders.map(o => o.id))

    const [users, services, updatesByOrder] = await Promise.all([
      this.userRepo.findByIds([...userIds]),
      this.serviceRepo.findByIds([...serviceIds]),
      this.workUpdateRepo.findLatestByOrderIds([...orderIds]),
    ])

    const userMap    = new Map(users.map(u => [u.id, u]))
    const serviceMap = new Map(services.map(s => [s.id, s]))

    return orders.map(o => ({
      ...o,
      user:          userMap.get(o.user_id) ?? null,
      employee:      userMap.get(o.employee_id) ?? null,
      service:       serviceMap.get(o.service_id) ?? null,
      latest_update: updatesByOrder.get(o.id) ?? null,
    }))
  }

  async assignEmployee(orderId, employeeId, { actor }) {
    const employee = employeeId ? await this.userRepo.findActiveEmployee(employeeId) : null
    if (employeeId && !employee) throw new NotFoundError('Active employee not found')

    await this.orderRepo.update(orderId, { employee_id: employeeId ?? null })

    if (employee?.email) {
      this.email.enqueue('task-assigned', { to: employee.email, orderId, actor })
    }
  }
}
```

### 5.5 — Single error handler

```js
// api/src/middleware/errorHandler.js
const logger = require('../infra/logger/logger')

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code }
}
class NotFoundError    extends HttpError { constructor(m = 'Not found')     { super(404, m, 'NOT_FOUND') } }
class ForbiddenError   extends HttpError { constructor(m = 'Forbidden')     { super(403, m, 'FORBIDDEN') } }
class ValidationError  extends HttpError { constructor(m, details)          { super(400, m, 'VALIDATION'); this.details = details } }

function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500
  const isServerError = status >= 500
  if (isServerError) logger.error({ err, requestId: req.id, path: req.path, userId: req.user?.id }, 'Unhandled error')
  else                logger.warn({ err, requestId: req.id, path: req.path }, 'Client error')
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && isServerError ? 'Internal server error' : err.message,
    code:    err.code,
    details: err.details,
  })
}

module.exports = { errorHandler, HttpError, NotFoundError, ForbiddenError, ValidationError }
```

### 5.6 — Single cache-buster (kills the dual-mechanism dance)

```js
// web/portal/src/shared/cache-buster.js
;(() => {
  const STORED = 'af_client_version'
  const RELOAD = 'af_reloaded_v'

  async function check() {
    try {
      const { version } = await fetch('/api/version', { cache: 'no-store' }).then(r => r.json())
      const stored = parseInt(localStorage.getItem(STORED) || '0', 10)
      if (version > stored) {
        await clearAllCaches()
        localStorage.setItem(STORED, String(version))
        if (!sessionStorage.getItem(RELOAD + version)) {
          sessionStorage.setItem(RELOAD + version, '1')
          const url = new URL(location.href)
          url.searchParams.set('_v', String(version))
          location.replace(url.toString())
        }
      } else if (!stored) {
        localStorage.setItem(STORED, String(version))
      }
    } catch { /* offline */ }
  }

  async function clearAllCaches() {
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => [])
      await Promise.all(regs.map(r => r.unregister().catch(() => {})))
    }
    if (window.caches) {
      const names = await caches.keys().catch(() => [])
      await Promise.all(names.map(n => caches.delete(n).catch(() => {})))
    }
  }

  check()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
})()
```

Delete `version-check.js` and remove all per-asset `?v=NN` from HTML — Express injects a single build hash.

---

## 6. What I would NOT change

- **JWT + role middleware** is correctly structured (`api/src/middleware/auth.js`). Don't touch.
- **Recovery endpoints** are the right idea — a runtime override for OAuth tokens is exactly what saved the last outage. Keep the mechanism; just clean up the hardcoded fallback.
- **Rate limiting per endpoint** (login / forgot-password / api) is correctly differentiated.
- **2FA via TOTP** (`authController.js`) is implemented standardly with `speakeasy`.
- **Single-flight token refresh** in `getAccessToken` is genuinely well-done.
- **`catalystCall` retry-once on 401** is the right resilience pattern.
- **Per-user lockout in `recordLoginFail`** is more correct than the IP-only rate limiter and should stay.

---

## 7. Refactor risk matrix

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1 (secrets) | Token rotation could cause an outage if a deploy uses an old refresh token | Rotate, verify recovery-endpoint inject still works, THEN delete fallbacks |
| 1 (mirror removal) | A page might load from the wrong path | Express static serves `web/` only — verified by curl on every URL after deploy |
| 2 (repo extraction) | Behavior change in encode/decode | New `period-encoding.js` is byte-for-byte identical, covered by unit tests before any call site migrates |
| 3 (controller split) | A route stops working | Routes are unchanged; only file paths move. Smoke tests every endpoint after each split |
| 4 (frontend split) | A modal stops binding | Each section module exports `init()`; called from the same lifecycle hook |
| 5 (logger) | Lost log lines | Add `pino` alongside `console.*`, migrate file-by-file, delete `console.*` last |

---

## 8. Bottom line

**Architectural debt is real but not catastrophic.** The pattern is clear: a successful "ship it" phase produced a working product with three structural problems — full-table-scan data layer, 1200-line god-controllers, and hardcoded secrets compensating for unreliable env propagation. Each is fixable without changing behavior, in order:

1. **Week 1:** rotate secrets, delete hardcoded fallbacks, drop the `api/web/` mirror, retire `version-check.js`. *Highest ROI, lowest risk.*
2. **Weeks 2–3:** extract `infra/dataStore/`, isolate the period-encoding kludge, add per-table caches. *Foundations for everything below.*
3. **Weeks 4–6:** split admin controller + admin-dashboard.js into domain modules. *Unlocks parallel development and testing.*
4. **Ongoing:** N+1 fix, structured logging, smoke tests on each domain.

After phase 2 the codebase becomes pleasant to work in. After phase 3 it scales past 10k users without thinking about it. No functionality changes at any step.
