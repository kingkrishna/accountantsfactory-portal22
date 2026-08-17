# Cleanup status (Move 3 follow-through)

Quick log of the small cleanups proposed in docs/NEXT-STEPS-YOUR-STYLE.md
and where each landed.

## ✅ console.error normalization — NOT NEEDED

Audit said "half your controllers say X, the other half use different
wording." Survey of all admin controllers + existing controllers shows:

- Every handler already uses `console.error('<Verb> <thing> error:', error)`.
- The new `*AdminController.js` files I shipped in Move 1 follow that
  same pattern.
- No `try/catch` wrapper helper added — your style does not abstract
  4-line boilerplate behind a helper, and adding one for the sake of
  it would create one more thing to read.

**Decision: leave as-is.** The audit was wrong about your code here.

## ⏳ Env validator wire-up — DEFERRED until secret rotation

`api/src/config/env.js` exists as a scaffold but is not required from
anywhere. Wiring it in is a 1-line change:

```js
// at the top of api/startup.js, BEFORE process.env reads in db.js etc:
require('./src/config/env');
```

…BUT doing that today would crash boot if any of the 15 env vars in the
schema is missing. `api/app-config.json` currently provides them via
Catalyst's deploy-time injection, so locally it would also fail unless
.env is set up.

**Decision: defer until secret rotation (docs/SECRETS-AUDIT.md).** When
secrets are rotated and the hardcoded fallbacks in db.js / catalyst.token.js
are deleted, wire in `env.js` in the same commit. That sequencing means
boot-time fail-fast aligns with the moment fallbacks are gone — no
surprise crashes from a half-migrated state.

## ⏳ infra/ → models/ — DEFERRED, separate commit

The Phase 2 split created `api/src/infra/dataStore/` (catalystClient.js,
catalystToken.js, periodEncoding.js). That directory doesn't fit the rest
of `api/src/` either — your existing convention is everything flat in
`models/`, `services/`, `controllers/`, etc.

Move would be:
```
api/src/infra/dataStore/period-encoding.js   -> api/src/models/periodEncoding.js
api/src/infra/dataStore/catalyst.client.js   -> api/src/models/catalystClient.js
api/src/infra/dataStore/catalyst.token.js    -> api/src/models/catalystToken.js
api/src/infra/ removed.
```

Mechanical change, same risk profile as Move 1. Worth its own commit;
not bundled here because it's independent of the controller work.

## ✅ `let` vs `const` — checked, NO change warranted

Surveyed all `let` declarations in the 6 new admin controllers. Every one
is reassigned (typically in `if/else` branches or retry loops). No
mechanical `let → const` opportunities.

## Net result of Move 3

The interesting cleanup work (env validator, infra rename) is gated on
prerequisites (secret rotation, decision to take another small commit).
The mechanical cleanups the audit suggested (`console.error` normalization,
`let → const`) turned out to be either already-done or not-applicable on
inspection of the actual code.

This is the right outcome — your code is already cleaner than the audit
implied. Moves 2 (frontend split) and 4 (resolveIncludes batching) are the
remaining items with real value.
