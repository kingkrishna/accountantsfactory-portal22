# What to do next — written in your style, not the audit's

> The earlier `ARCHITECTURE-AUDIT.md` describes a target shape borrowed from
> textbook DDD/clean-architecture conventions. That's fine as a sketch but
> it's NOT what your code looks like today, and forcing it on a working
> codebase is more disruption than value. This document re-reads what you
> already shipped and proposes the next moves in YOUR style.

## What your style actually is (evidence from your repo)

Reading what's already in `web/portal/js/` and `api/src/`:

1. **CommonJS, plain functions, no classes.** Look at `db.js`, `commentController.js`,
   `notificationController.js` — every controller is `exports.<name> = async (req,res)=>{...}`.
   No factory classes, no DI container, no repositories-as-classes.

2. **One file per controller, named `<thing>Controller.js`.** That's the
   pre-existing convention — `commentController.js`, `documentController.js`,
   `notificationController.js`. The Phase-3 split I did used a different
   convention (`domain/<thing>/<thing>.controller.js`); that wasn't your
   style.

3. **Plain `async function`s on the frontend, no modules.** `admin-dashboard.js`
   is one big script of `function loadX() {}` calls. Shared utilities go in
   `admin-dashboard-utils.js` and `api.js`. No ES modules, no bundler.

4. **Practical comments, not docstrings.** Your style is `// short reason` /
   `// the WHY, not the WHAT`. Multi-paragraph JSDoc blocks (which I added
   in Phase 3) don't match what's already in the file — yours are terse.

5. **Defensive over strict.** `requireAdmin()` returns true and lets JS run;
   `verifyToken()` runs in the background non-blocking. Cold-start retries in
   `api.js` silently absorb 503s. Empty bonus fields are quietly treated as
   zero (the May-2026 referral fix). Your code is forgiving of edge cases.

6. **Fire-and-forget for non-critical work.** Audit emails, task-assigned
   emails, recovery-token writes — all wrapped in IIFE+catch so they never
   block the HTTP response.

7. **Cache + invalidate, no TTL ceremony.** `db.js` has one 30s cache for
   every table. The audit said "per-table TTL", but your existing pattern is
   "write invalidates cache, reads see fresh data within seconds." Simpler.

## Where this leaves the Phase-3 refactor I did

Phase 3 split `adminController.js` from 1246 → 44 LOC across 6 files. That
**reduction is real value** — but the *names* and *comment style* I used
don't match your conventions:

| What I did | What matches your style |
|---|---|
| `api/src/domain/clients/clients.controller.js` | `api/src/controllers/clientAdminController.js` (your pattern: `<x>Controller.js` next to the others) |
| `exports.list / .create / .remove` | `exports.getAllClients / .createClient / .deleteClient` (your existing names — frontend `api.js` already calls `getAllClients`, `assignOrderToEmployee`, etc.) |
| Multi-paragraph JSDoc per handler | `// one-line reason` above the function (your existing pattern) |
| `'use strict';` at top of every file | Not used elsewhere in your codebase — drop it |

**Your wire-level routes already changed paths-to-handlers; what's wrong is
just the file LOCATION and the export names.** A small follow-up pass can
move the six files to `api/src/controllers/` and rename the exports back to
the names the frontend expects, with zero new behavior change.

## Proposed next moves — actually shaped to your repo

### Move 1 — Restyle the Phase-3 modules to match your conventions  (~30 minutes)

Rename:
```
api/src/domain/clients/clients.controller.js     →  api/src/controllers/clientAdminController.js
api/src/domain/orders/orders.controller.js       →  api/src/controllers/orderAdminController.js
api/src/domain/employees/employees.controller.js →  api/src/controllers/employeeAdminController.js
api/src/domain/services/services.controller.js   →  api/src/controllers/serviceAdminController.js
api/src/domain/documents/documents.controller.js →  api/src/controllers/documentAdminController.js
api/src/domain/referrals/referrals.controller.js →  api/src/controllers/referralAdminController.js
```

Rename exports back to match the **names the frontend's `api.js` already
calls** (`getAllClients`, `assignOrderToEmployee`, `createEmployee`,
`approveReferral`, etc.). Today the frontend works because the **routes**
match — but the export names diverged. Putting them back means a future
contributor can grep `getAllClients` and find both the API client AND the
controller.

Strip the verbose JSDoc blocks I added down to one-line reason comments
matching your existing style. Drop the `'use strict';` lines.

Delete `api/src/domain/` once empty.

**Net effect:** same code, but it looks like it belongs in your repo
instead of in a textbook. Future you doesn't get confused by two
conventions side-by-side.

### Move 2 — Frontend split, but YOUR way  (~half day)

`admin-dashboard.js` at 1866 LOC is real pain. The audit said "split into
section modules with a router." That's not your style. Your style is
"plain functions in a file, shared utilities in `_utils.js`."

What actually fits:

```
web/portal/js/
  admin-dashboard.js          — boots, sidebar wiring, init calls only (~200 LOC)
  admin-clients.js            — loadClients, createClient, toggleClientStatus, search/pagination
  admin-orders.js             — loadOrders, openAddOrderModal, openUpdateStatusModal, assignEmployee
  admin-employees.js          — loadEmployees, createEmployee, toggleStatus, delete
  admin-services.js           — loadServiceCatalog, createServiceCatalog, toggleServiceCatalog
  admin-referrals.js          — loadReferrals, openApproveReferralModal, processReferral
  admin-documents.js          — loadDocumentsSection, openViewDocumentsModal, openUploadDocumentModal
  admin-dashboard-utils.js    — already exists, stays
```

Each file loaded with its own `<script src=...>` tag. No bundler. No ES
modules. Global functions, exactly like today. The "router" is
`showSection()` calling `loadX()` — already what your code does.

This is a mechanical extraction, similar to Phase 3 but on the frontend.
Each file is ~150-300 LOC. **No behavior change.** Same global state
(`lastClients`, `lastOrders`, `_clientsPage`), same DOM IDs, same modals.

### Move 3 — The cleanups the audit was right about

These are uncontroversial and don't change shape:

1. **Delete `_deadDuplicateGetAllEmployeeUpdates_DO_NOT_USE`** that I left
   in adminController.js during Phase 3.3 — Phase 3.6 already removed it,
   verified.
2. **Wire `api/src/config/env.js`** into boot AFTER you rotate secrets.
   Right now it's a sitting scaffold. Once secrets are rotated it should
   replace the hardcoded fallbacks in `db.js` / `catalyst.token.js`.
3. **One round of "console.error" → consistent log prefix.** Half your
   controllers say `console.error('Get clients error:', error)`, the other
   half use different wording. A 30-line `function logError(handler, err)`
   in `utils/` and one `sed` would normalise them. Small but real.

### Move 4 — N+1 in `resolveIncludes`, but as you'd write it

The audit said "introduce a `findManyByIds` primitive on a `CatalystRepo`
class." That's not your style. Your `db.js` is plain functions.

The actual minimal change in YOUR style:

```js
// db.js — replace the per-relation `await getTableRows(relTableId)` block
// in resolveIncludes with a small inlined batch helper. ~20 LOC of net
// change. Functions, no classes.
async function getRowsByIds(tableId, ids) {
  if (!ids.length) return [];
  const all = await getTableRows(tableId);    // hits 30s cache first
  const idSet = new Set(ids.map(String));
  return all.filter(r => idSet.has(String(r.id)));
}
```

Then `resolveIncludes` calls `getRowsByIds(relTableId, collectedFkIds)`
instead of grouping the full table. Cuts memory + GC pressure for hot
include paths, no API change, no new file.

## What I am NOT proposing (and why)

- **Rebuild as classes / DI / TypeScript.** Your repo is plain JS. Forcing
  classes for the sake of "clean architecture" is the audit's bias, not
  yours. Skip.
- **Bundler / ESM.** You ship JS files served straight from Express. The
  cost of introducing webpack/vite > the benefit. Skip.
- **Zod or any new dep.** Your `validation.js` already exists. Use it.
  Skip.
- **Hexagonal layers / repository pattern.** That's the audit talking. Your
  controllers call `prisma.x.findMany` directly and that works fine. The
  cost-benefit on a 6-person team isn't worth it.

## Order of operations I'd recommend

1. **Move 1 (restyle Phase 3)** — small, makes Phase 3 actually fit your repo.
2. **Move 3 (cleanups)** — half a day, pays back immediately.
3. **Move 4 (resolveIncludes batching)** — performance win, ~20 LOC.
4. **Move 2 (frontend split)** — biggest, do when you have a clear half-day.

Each move is a single commit. Each is reversible. None changes behavior.

## What I'll do next when you say "go"

Pick the move number(s) you want and I'll execute them with the same rigor
as the previous phases — `node -c`, jest run, before/after smoke, commit
per logical unit, push. No assumptions about your time budget; one move at
a time unless you say otherwise.
