'use strict';
/**
 * Zoho Catalyst Data Store — Prisma-compatible wrapper
 * Uses direct REST API (India DC) — no SDK, no ZCQL (broken table mapping).
 * All reads use REST row-fetch + in-memory JS filtering/sorting/pagination.
 */
const { encodeServiceOrder, decodeServiceOrderRow } = require('../infra/dataStore/period-encoding');
const { httpRequest } = require('../infra/dataStore/catalyst.client');
const {
  getAccessToken,
  getTokenHealth,
  setRuntimeRefreshToken,
  setRuntimeAccessToken,
  invalidate: invalidateAccessToken,
} = require('../infra/dataStore/catalyst.token');

// ─── India DC config ─────────────────────────────────────────────────────────
const CATALYST_URL  = 'https://api.catalyst.zoho.in';
const PROJECT_ID    = process.env.CATALYST_PROJECT_ID    || '18944000000044043';

// Token state + OAuth refresh live in api/src/infra/dataStore/catalyst.token.js.
// HTTP primitives live in api/src/infra/dataStore/catalyst.client.js.

// Self-healing wrapper: if Catalyst returns 401 (expired access token mid-request),
// invalidate the cached access token, force a refresh, and retry once. If the
// SECOND attempt also returns auth failure, THROW so callers don't silently
// receive an empty-looking success object.
async function catalystCall(method, path, body) {
  let lastResult = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getAccessToken();
    const result = await httpRequest(method, CATALYST_URL + path, body || '', {
      'Authorization': `Zoho-oauthtoken ${token}`,
      'Content-Type':  'application/json',
    });
    lastResult = result;
    const isAuthFailure = result && (
      result.status === 401 ||
      (result.data && result.data.error_code === 'INVALID_OAUTHTOKEN') ||
      (result.error && /oauth|unauthorized|invalid token/i.test(JSON.stringify(result.error)))
    );
    if (!isAuthFailure) return result;
    if (attempt === 1) {
      console.warn('[db] Got auth failure — invalidating token cache and retrying');
      invalidateAccessToken();
      continue;
    }
    throw new Error('Catalyst auth failed after retry: ' + JSON.stringify(result).slice(0, 200));
  }
  return lastResult;
}

async function catalystGet(path)        { return catalystCall('GET',    path); }
async function catalystPost(path, body) { return catalystCall('POST',   path, body); }
async function catalystPut(path, body)  { return catalystCall('PUT',    path, body); }
async function catalystDelete(path)     { return catalystCall('DELETE', path); }

// ─── Table IDs ────────────────────────────────────────────────────────────────
const TABLE = {
  user:               { id: '18944000000047054' },
  service:            { id: '18944000000038069' },
  serviceOrder:       { id: '18944000000046113' },
  serviceRequest:     { id: '18944000000047779' },
  serviceComment:     { id: '18944000000038816' },
  workUpdate:         { id: '18944000000054538' },
  document:           { id: '18944000000042092' },
  referral:           { id: '18944000000039198' },
  passwordResetToken: { id: '18944000000039930' },
  auditLog:           { id: '18944000000044192' },
  contactMessage:     { id: '18944000000053516' },
  companyProfile:     { id: '18944000000348001' },
  complianceConfig:   { id: '18944000000348374' },
  complianceFiling:   { id: '18944000000348745' },
  documentTemplate:   { id: '18944000000349124' },
  generatedDocument:  { id: '18944000000349493' },
};

// Columns that hold Catalyst ROWIDs (numeric IDs) — compared as numbers
const ROWID_COLS = new Set([
  'user_id', 'employee_id', 'service_id', 'service_order_id',
  'referrer_user_id', 'uploaded_by', 'template_id', 'generated_by', 'created_by',
]);

// Columns stored as BIGINT Unix-ms timestamps in Catalyst
const TIMESTAMP_COLS = new Set(['expires_at', 'update_date', 'due_date', 'filing_date', 'payment_date', 'generated_at', 'registration_date']);

const fs = require('fs');
const path = require('path');
const MOCK_DB_DIR = path.join(__dirname, '..', '..', '.data');

// Helper for local JSON mock DB (used when table IDs are PLACEHOLDER_*)
function getMockFilePath(tableId) {
  if (!fs.existsSync(MOCK_DB_DIR)) fs.mkdirSync(MOCK_DB_DIR, { recursive: true });
  return path.join(MOCK_DB_DIR, `${tableId}.json`);
}

function readMockTable(tableId) {
  const file = getMockFilePath(tableId);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return []; }
}

function writeMockTable(tableId, rows) {
  fs.writeFileSync(getMockFilePath(tableId), JSON.stringify(rows, null, 2), 'utf8');
}

// ─── Row insert/update/delete via REST ────────────────────────────────────────
async function insertRow(tableId, rowData) {
  // --- MOCK STORAGE FOR AUTOMATION ---
  if (process.env.USE_LOCAL_MOCK === 'true') {
    const rows = readMockTable(tableId);
    const newRow = { ROWID: String(Date.now() + Math.floor(Math.random() * 1000)), CREATEDTIME: new Date().toISOString(), MODIFIEDTIME: new Date().toISOString(), ...rowData };
    rows.push(newRow);
    writeMockTable(tableId, rows);
    return newRow;
  }
  // -----------------------------------

  // Catalyst Data Store insert expects a raw array (NOT {"data":[...]})
  const res = await catalystPost(
    `/baas/v1/project/${PROJECT_ID}/table/${tableId}/row`,
    [rowData]
  );
  if (res.status === 'failure') throw new Error(res.data?.message || 'Insert failed');
  const rows = res.data || [];
  invalidateCache(tableId); // new row must be visible to next read
  return rows[0] || {};
}

async function updateRow(tableId, rowid, rowData) {
  // --- MOCK STORAGE FOR AUTOMATION ---
  if (process.env.USE_LOCAL_MOCK === 'true') {
    const rows = readMockTable(tableId);
    const idx = rows.findIndex(r => r.ROWID === String(rowid) || r.ROWID == rowid);
    if (idx === -1) throw new Error('Mock row not found');
    rows[idx] = { ...rows[idx], ...rowData, MODIFIEDTIME: new Date().toISOString() };
    writeMockTable(tableId, rows);
    return rows[idx];
  }
  // -----------------------------------

  // Send ROWID as string to avoid JS precision loss on large Zoho IDs (>MAX_SAFE_INTEGER)
  const res = await catalystPut(
    `/baas/v1/project/${PROJECT_ID}/table/${tableId}/row`,
    [{ ROWID: String(rowid), ...rowData }]
  );
  if (res.status === 'failure') throw new Error(res.data?.message || 'Update failed');
  const rows = res.data || [];
  invalidateCache(tableId);
  return rows[0] || {};
}

async function deleteRow(tableId, rowid) {
  // --- MOCK STORAGE FOR AUTOMATION ---
  if (process.env.USE_LOCAL_MOCK === 'true') {
    const rows = readMockTable(tableId);
    const filtered = rows.filter(r => r.ROWID !== String(rowid) && r.ROWID != rowid);
    writeMockTable(tableId, filtered);
    return { success: true };
  }
  // -----------------------------------

  const res = await catalystDelete(
    `/baas/v1/project/${PROJECT_ID}/table/${tableId}/row/${String(rowid)}`
  );
  if (res.status === 'failure') throw new Error(res.data?.message || 'Delete failed');
  invalidateCache(tableId);
  return res.data || {};
}

// ─── REST row-fetch (replaces ZCQL for all reads) ────────────────────────────
// Catalyst has a cross-table cascade: inserting into Services creates a phantom row in
// ServiceOrders (with user_id="1") and vice versa (with description=status value).
// We filter out these phantoms on reads since we cannot delete them (Catalyst cascades
// the delete to the real row in the other table as well).
const STATUS_VALUES = new Set(['pending', 'in_progress', 'completed']);
// In-memory cache for row fetches. Each read goes to Catalyst once per TTL window.
// Writes invalidate the affected table's cache immediately so fresh data is seen.
const _rowCache = new Map(); // tableId -> { rows, expires }
const CACHE_TTL_MS = 30 * 1000; // 30s — short enough for freshness, long enough to avoid re-fetching 500K rows per request
function invalidateCache(tableId) { _rowCache.delete(tableId); }

async function getTableRows(tableId) {
  // --- MOCK STORAGE FOR AUTOMATION ---
  if (process.env.USE_LOCAL_MOCK === 'true') {
    return readMockTable(tableId);
  }
  // -----------------------------------

  // Serve from cache when fresh
  const cached = _rowCache.get(tableId);
  if (cached && Date.now() < cached.expires) return cached.rows.slice();

  // Catalyst REST returns max 200 rows per call. Paginate via next_token.
  // Cap raised to 5000 pages = 1,000,000 rows per table, supporting lakhs of
  // clients/orders. Beyond this, the codebase should switch to ZCQL queries
  // (server-side filtering) rather than loading everything into memory.
  let rows = [];
  let nextToken = null;
  let completed = true;
  const seen = new Set();
  const MAX_PAGES = 5000; // 1,000,000 rows max
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = nextToken ? `?next_token=${encodeURIComponent(nextToken)}` : '';
    const res = await catalystGet(`/baas/v1/project/${PROJECT_ID}/table/${tableId}/row${qs}`);
    if (res.status === 'failure') {
      if (page === 0) throw new Error(res.data?.message || 'Row fetch failed');
      // Partial fetch on later page — return what we have for this caller,
      // but mark incomplete so we don't poison the cache with a truncated view.
      completed = false;
      break;
    }
    const pageRows = res.data || [];
    if (pageRows.length === 0) break;
    let addedAny = false;
    for (const r of pageRows) {
      const id = String(r.ROWID || '');
      if (id && !seen.has(id)) { seen.add(id); rows.push(r); addedAny = true; }
    }
    if (!res.more_records || !res.next_token || !addedAny) break;
    nextToken = String(res.next_token);
  }
  // Filter phantom rows created by Catalyst's cross-table cascade behavior
  if (tableId === TABLE.serviceOrder.id) {
    // Phantom ServiceOrders rows (from Services inserts) always have user_id="1"
    rows = rows.filter(r => r.user_id !== '1' && r.user_id !== 1 && r.user_id != null);
    // Decode the SID-prefix encoding (see api/src/infra/dataStore/period-encoding.js
    // for the full explanation of why we have to do this).
    rows = rows.map(decodeServiceOrderRow);
  } else if (tableId === TABLE.service.id) {
    // Phantom Services rows (from ServiceOrders inserts) always have description=status value
    rows = rows.filter(r => !STATUS_VALUES.has(String(r.description || '').trim().toLowerCase()));
  }
  // Write-through cache ONLY for complete fetches; partial fetches must not
  // pollute the cache or subsequent reads would silently see a truncated table.
  if (completed) {
    _rowCache.set(tableId, { rows: rows.slice(), expires: Date.now() + CACHE_TTL_MS });
  }
  return rows;
}

// ─── Parse raw REST/insert row into plain object ──────────────────────────────
function parseRow(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (k === 'ROWID')        { out.id = String(v); }
    else if (k === 'CREATEDTIME')  { out.createdAt = new Date(v); out.created_at = new Date(v); }
    else if (k === 'MODIFIEDTIME') { out.updatedAt = new Date(v);  out.updated_at = new Date(v); }
    else if (k === 'CREATORID')    { /* skip */ }
    else if (TIMESTAMP_COLS.has(k) && v != null) {
      out[k] = new Date(typeof v === 'number' ? v : parseInt(String(v), 10));
    }
    else if (typeof v === 'boolean') { out[k] = v; }
    else if (v === 'true')  { out[k] = true; }
    else if (v === 'false') { out[k] = false; }
    else { out[k] = v; }
  }
  return out;
}

// ─── Prepare data for insert/update ──────────────────────────────────────────
function prepareData(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined) continue;
    const key = k === 'date' ? 'update_date' : k;
    if (v instanceof Date) {
      // BIGINT timestamp columns: store as Unix ms
      out[key] = TIMESTAMP_COLS.has(key) ? v.getTime() : v.toISOString().replace('T', ' ').slice(0, 19);
    } else {
      out[key] = v;
    }
  }
  return out;
}

// ─── JS-based WHERE filtering ─────────────────────────────────────────────────
function coerce(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  const n = Number(v);
  return isNaN(n) ? String(v) : n;
}

// Catalyst ROWIDs are 17 digits, exceeding Number.MAX_SAFE_INTEGER. Numeric
// coercion can collapse distinct IDs to the same Number — so for id/ROWID
// columns we always compare as strings.
function isRowIdCol(col) { return col === 'id' || ROWID_COLS.has(col); }

function matchesWhere(row, where) {
  if (!where) return true;
  for (const [key, value] of Object.entries(where)) {
    const col = key === 'id' ? 'id' : key;
    const rv = row[col];
    const rowid = isRowIdCol(col);

    if (value === null) {
      if (rv !== null && rv !== undefined) return false;
    } else if (value === undefined) {
      // ignore
    } else if (typeof value === 'boolean') {
      const bv = typeof rv === 'boolean' ? rv : (rv === 'true');
      if (bv !== value) return false;
    } else if (value instanceof Date) {
      const a = rv instanceof Date ? rv.getTime() : (TIMESTAMP_COLS.has(col) ? parseInt(rv, 10) : new Date(rv).getTime());
      if (a !== value.getTime()) return false;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const a = rowid ? String(rv ?? '') : coerce(rv instanceof Date ? rv.getTime() : rv);
      for (const [op, opVal] of Object.entries(value)) {
        const b = rowid ? String(opVal ?? '') : coerce(opVal instanceof Date ? opVal.getTime() : opVal);
        if (op === 'equals' && a !== b) return false;
        if (op === 'gt'  && !(a > b))  return false;
        if (op === 'gte' && !(a >= b)) return false;
        if (op === 'lt'  && !(a < b))  return false;
        if (op === 'lte' && !(a <= b)) return false;
        if (op === 'not') {
          if (opVal === null) { if (rv == null) return false; }
          else if (a === b) return false;
        }
        if (op === 'in'  && (!opVal || !opVal.some(v => (rowid ? String(v) : coerce(v)) === a))) return false;
        if (op === 'contains' && !String(rv || '').includes(String(opVal))) return false;
      }
    } else {
      // Direct equality — string-compare for ROWID/id columns to avoid Number precision loss
      if (rowid) {
        if (String(rv ?? '') !== String(value ?? '')) return false;
      } else if (coerce(rv) !== coerce(value)) return false;
    }
  }
  return true;
}

// ─── JS-based ORDER BY sorting ────────────────────────────────────────────────
function sortRows(rows, orderBy) {
  if (!orderBy) return rows;
  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const ob of entries) {
      for (const [key, dir] of Object.entries(ob)) {
        // Map Prisma field names to parsed row field names
        const col = key === 'id' ? 'id'
          : (key === 'createdAt' || key === 'created_at' || key === 'uploaded_at') ? 'createdAt'
          : (key === 'updatedAt' || key === 'updated_at') ? 'updatedAt'
          : (key === 'date') ? 'date'
          : key;
        const va = a[col]; const vb = b[col];
        const ca = coerce(va instanceof Date ? va.getTime() : va);
        const cb = coerce(vb instanceof Date ? vb.getTime() : vb);
        const cmp = ca < cb ? -1 : ca > cb ? 1 : 0;
        if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
      }
    }
    return 0;
  });
}

// ─── Relations map ────────────────────────────────────────────────────────────
const RELATIONS = {
  serviceOrder: {
    user:     { type: 'one',  model: 'user',    fk: 'user_id' },
    service:  { type: 'one',  model: 'service', fk: 'service_id' },
    employee: { type: 'one',  model: 'user',    fk: 'employee_id' },
    documents:    { type: 'many', model: 'document',    fk: 'service_order_id' },
    workUpdates:  { type: 'many', model: 'workUpdate',  fk: 'service_order_id' },
    comments:     { type: 'many', model: 'serviceComment', fk: 'service_order_id' },
  },
  document: {
    service_order: { type: 'one', model: 'serviceOrder', fk: 'service_order_id' },
    user:          { type: 'one', model: 'user',         fk: 'user_id' },
  },
  serviceComment: {
    user:          { type: 'one', model: 'user',         fk: 'user_id' },
    service_order: { type: 'one', model: 'serviceOrder', fk: 'service_order_id' },
  },
  workUpdate: {
    employee: { type: 'one', model: 'user', fk: 'employee_id' },
  },
  referral: {
    referrer: { type: 'one', model: 'user',    fk: 'referrer_user_id' },
    service:  { type: 'one', model: 'service', fk: 'service_id' },
  },
  passwordResetToken: {
    user: { type: 'one', model: 'user', fk: 'user_id' },
  },
  serviceRequest: {
    user:    { type: 'one', model: 'user',    fk: 'user_id' },
    service: { type: 'one', model: 'service', fk: 'service_id' },
  },
  companyProfile: {
    user: { type: 'one', model: 'user', fk: 'user_id' },
  },
  complianceConfig: {
    user: { type: 'one', model: 'user', fk: 'user_id' },
  },
  complianceFiling: {
    user: { type: 'one', model: 'user', fk: 'user_id' },
  },
  generatedDocument: {
    template: { type: 'one', model: 'documentTemplate', fk: 'template_id' },
    user: { type: 'one', model: 'user', fk: 'user_id' },
  },
};

// Filter a parsed table to only rows whose ROWID is in `ids`. Builds a Set once
// so we don't call .includes() per-row (was O(rows × ids) on hot lists).
function getRowsByIds(parsedRows, ids) {
  if (!ids.length) return [];
  const idSet = new Set(ids.map(String));
  return parsedRows.filter(r => idSet.has(String(r.id)));
}

// ─── Resolve includes using REST row-fetch ────────────────────────────────────
async function resolveIncludes(modelName, rows, include) {
  if (!include || !rows.length) return rows;
  const relMap = RELATIONS[modelName] || {};

  for (const [relName, relOpts] of Object.entries(include)) {
    if (!relOpts) continue;

    // Handle _count: { select: { documents: true } }
    if (relName === '_count') {
      const countSelect = relOpts.select || {};
      for (const [countRel] of Object.entries(countSelect)) {
        const rel = relMap[countRel];
        if (!rel || rel.type !== 'many') continue;
        const parentIds = [...new Set(rows.map(r => r.id).filter(Boolean))];
        if (!parentIds.length) continue;
        const relTableId = TABLE[rel.model]?.id;
        if (!relTableId) continue;
        const rawRelRows = await getTableRows(relTableId);
        const parentIdSet = new Set(parentIds.map(String));
        const counts = {};
        for (const rr of rawRelRows) {
          const fkv = String(rr[rel.fk] || '');
          if (parentIdSet.has(fkv)) counts[fkv] = (counts[fkv] || 0) + 1;
        }
        for (const row of rows) {
          if (!row._count) row._count = {};
          row._count[countRel] = counts[row.id] || 0;
        }
      }
      continue;
    }

    const rel = relMap[relName];
    if (!rel) continue;
    const selectFields = relOpts === true ? null : (relOpts.select || null);
    const relTableId = TABLE[rel.model]?.id;
    if (!relTableId) continue;

    const rawRelRows = await getTableRows(relTableId);
    const relParsed = rawRelRows.map(rr => parseRow(rr));

    if (rel.type === 'one') {
      const ids = [...new Set(rows.map(r => r[rel.fk]).filter(v => v != null && v !== ''))];
      if (!ids.length) { rows.forEach(r => r[relName] = null); continue; }
      // Build per-id map in O(n) using Set membership instead of per-row .includes()
      const wanted = getRowsByIds(relParsed, ids);
      const relRowMap = {};
      for (const rr of wanted) {
        const out = selectFields
          ? Object.fromEntries(Object.entries(rr).filter(([k]) => selectFields[k] || k === 'id'))
          : rr;
        relRowMap[String(rr.id)] = out;
      }
      for (const row of rows) {
        const fkVal = row[rel.fk];
        row[relName] = fkVal != null ? (relRowMap[String(fkVal)] || null) : null;
      }
    } else {
      const parentIds = [...new Set(rows.map(r => r.id).filter(Boolean))];
      const grouped = {};
      parentIds.forEach(id => grouped[id] = []);
      for (const rr of relParsed) {
        const fkv = String(rr[rel.fk] || '');
        if (grouped[fkv]) grouped[fkv].push(rr);
      }
      for (const row of rows) {
        row[relName] = grouped[row.id] || [];
      }
    }
  }
  return rows;
}

// ─── Generic model factory ────────────────────────────────────────────────────
function createModel(modelName) {
  const tbl = TABLE[modelName];
  if (!tbl) throw new Error(`Unknown model: ${modelName}`);
  const { id: tableId } = tbl;

  return {
    async findUnique({ where, select, include } = {}) {
      const rawRows = await getTableRows(tableId);
      const parsed = rawRows.map(r => parseRow(r));
      const row = parsed.find(r => matchesWhere(r, where)) || null;
      if (!row) return null;
      await resolveIncludes(modelName, [row], include);
      if (select) return Object.fromEntries(Object.entries(row).filter(([k]) => select[k]));
      return row;
    },

    async findFirst({ where, select, include, orderBy } = {}) {
      const rawRows = await getTableRows(tableId);
      let filtered = rawRows.map(r => parseRow(r)).filter(r => matchesWhere(r, where));
      filtered = sortRows(filtered, orderBy);
      const row = filtered[0] || null;
      if (!row) return null;
      await resolveIncludes(modelName, [row], include);
      if (select) return Object.fromEntries(Object.entries(row).filter(([k]) => select[k]));
      return row;
    },

    async findMany({ where, select, include, orderBy, skip, take } = {}) {
      const rawRows = await getTableRows(tableId);
      let filtered = rawRows.map(r => parseRow(r)).filter(r => matchesWhere(r, where));
      filtered = sortRows(filtered, orderBy);
      if (skip != null) filtered = filtered.slice(skip);
      if (take != null) filtered = filtered.slice(0, take);
      await resolveIncludes(modelName, filtered, include);
      if (select) return filtered.map(row => Object.fromEntries(Object.entries(row).filter(([k]) => select[k])));
      return filtered;
    },

    async count({ where } = {}) {
      const rawRows = await getTableRows(tableId);
      return rawRows.map(r => parseRow(r)).filter(r => matchesWhere(r, where)).length;
    },

    async create({ data }) {
      const result = await insertRow(tableId, prepareData(data));
      return parseRow(result);
    },

    async update({ where, data }) {
      const row = await this.findUnique({ where });
      if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      const result = await updateRow(tableId, row.id, prepareData(data));
      return parseRow(result);
    },

    async updateMany({ where, data }) {
      const rawRows = await getTableRows(tableId);
      const filtered = rawRows.map(r => parseRow(r)).filter(r => matchesWhere(r, where));
      if (!filtered.length) return { count: 0 };
      await Promise.all(filtered.map(r => updateRow(tableId, r.id, prepareData(data))));
      return { count: filtered.length };
    },

    async delete({ where }) {
      const row = await this.findUnique({ where });
      if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
      await deleteRow(tableId, row.id);
      return row;
    },

    async deleteMany({ where } = {}) {
      const rawRows = await getTableRows(tableId);
      const filtered = rawRows.map(r => parseRow(r)).filter(r => matchesWhere(r, where));
      if (!filtered.length) return { count: 0 };
      await Promise.all(filtered.map(r => deleteRow(tableId, r.id)));
      return { count: filtered.length };
    },
  };
}

// ─── ServiceOrder model wrapper ──────────────────────────────────────────────
// The encode/decode helpers live in api/src/infra/dataStore/period-encoding.js
// (imported at the top of this file). The wrapper below handles the rule-3
// invariant: when updating employee_id alone, we must re-fetch the existing
// row to preserve its service_id, otherwise the Catalyst mirror overwrites it.

function wrapServiceOrderModel(m) {
  const orig = m;
  return {
    async findUnique(args) {
      const row = await orig.findUnique(args);
      return row ? decodeServiceOrderRow(row) : row;
    },
    async findFirst(args) {
      const row = await orig.findFirst(args);
      return row ? decodeServiceOrderRow(row) : row;
    },
    async findMany(args) {
      const rows = await orig.findMany(args);
      return rows.map(decodeServiceOrderRow);
    },
    async count(args) { return orig.count(args); },
    async create(args) {
      const encoded = Object.assign({}, args, { data: encodeServiceOrder(args.data) });
      const row = await orig.create(encoded);
      return decodeServiceOrderRow(row);
    },
    async update(args) {
      // When updating employee_id, also preserve the existing service_id in period
      let data = args.data;
      if ('employee_id' in data && !('service_id' in data) && !('period' in data)) {
        // Fetch the current row to preserve encoded service_id in period
        const existing = await this.findUnique({ where: args.where });
        if (existing) {
          // Re-encode with preserved service_id
          const sid = existing.service_id;
          const period = existing.period;
          data = Object.assign({}, data, { service_id: sid, period });
        }
      }
      if ('service_id' in data || 'period' in data) {
        data = encodeServiceOrder(data);
      }
      const result = await orig.update(Object.assign({}, args, { data }));
      return decodeServiceOrderRow(result);
    },
    async updateMany(args) { return orig.updateMany(args); },
    async delete(args) { return orig.delete(args); },
    async deleteMany(args) { return orig.deleteMany(args); },
  };
}

// ─── Transaction shim (sequential, no rollback) ───────────────────────────────
async function $transaction(fn) {
  const tx = {};
  for (const modelName of Object.keys(TABLE)) {
    tx[modelName] = modelName === 'serviceOrder'
      ? wrapServiceOrderModel(createModel(modelName))
      : createModel(modelName);
  }
  return fn(tx);
}

// ─── DB export ────────────────────────────────────────────────────────────────
const db = {
  $connect:     async () => { /* no-op */ },
  $disconnect:  async () => { /* no-op */ },
  $transaction,
};

for (const modelName of Object.keys(TABLE)) {
  db[modelName] = modelName === 'serviceOrder'
    ? wrapServiceOrderModel(createModel(modelName))
    : createModel(modelName);
}

// WorkUpdate: alias update_date → date on reads
const _wuFindMany = db.workUpdate.findMany.bind(db.workUpdate);
db.workUpdate.findMany = async (args) => {
  const rows = await _wuFindMany(args);
  return rows.map(r => { if ('update_date' in r && !('date' in r)) r.date = r.update_date; return r; });
};
const _wuFindFirst = db.workUpdate.findFirst.bind(db.workUpdate);
db.workUpdate.findFirst = async (args) => {
  const row = await _wuFindFirst(args);
  if (row && 'update_date' in row && !('date' in row)) row.date = row.update_date;
  return row;
};

db.getTokenHealth = getTokenHealth;
db.setRuntimeRefreshToken = setRuntimeRefreshToken;
db.setRuntimeAccessToken = setRuntimeAccessToken;

module.exports = db;
