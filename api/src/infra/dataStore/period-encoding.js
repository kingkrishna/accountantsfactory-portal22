/**
 * ServiceOrder.period field encoding.
 *
 * ─── WHY THIS EXISTS ────────────────────────────────────────────────────────
 *
 * Catalyst Data Store has an undocumented but reproducible behaviour: writes
 * to the ServiceOrders table MIRROR the `service_id` and `employee_id`
 * columns onto each other. Setting one overwrites the other. This is a
 * cascade behaviour at the table-definition level that cannot be disabled
 * via the public API.
 *
 * Workaround: we don't trust the `service_id` column. We embed the true
 * service_id INSIDE the `period` text column at write time, using the
 * prefix "SID:<id>|<actual period>", and we strip it back out at read time.
 *
 * ─── INVARIANTS ─────────────────────────────────────────────────────────────
 *
 * 1. Every write to ServiceOrders MUST go through `encodeServiceOrder()`. A
 *    bare write that includes `service_id` will lose it (Catalyst overwrites
 *    it with employee_id) without the prefix-in-period trick.
 *
 * 2. Every read of ServiceOrders MUST go through `decodeServiceOrderRow()`.
 *    Without decoding, callers see a row whose `period` literally starts with
 *    "SID:123|" and whose `service_id` is whatever employee_id happens to be.
 *
 * 3. When updating `employee_id` alone (no service_id, no period), the caller
 *    must FIRST fetch the existing row and re-include its current
 *    service_id + period in the write payload, otherwise the employee_id
 *    write triggers the Catalyst mirror and corrupts service_id.
 *
 *    `wrapServiceOrderModel.update` in db.js implements rule 3.
 *
 * ─── CONTRACT ───────────────────────────────────────────────────────────────
 *
 *   encodeServiceOrder({ service_id: 'X', period: 'Q1', employee_id: 'Y' })
 *     → { period: 'SID:X|Q1', employee_id: 'Y' }   // service_id removed
 *
 *   decodeServiceOrderRow({ period: 'SID:X|Q1', employee_id: 'Y' })
 *     → { service_id: 'X', period: 'Q1', employee_id: 'Y' }
 *
 *   decodeServiceOrderRow({ period: 'Q1' })  // legacy row, no prefix
 *     → { period: 'Q1' }                     // returned unchanged
 *
 * No external dependencies. Pure functions. Safe to unit-test.
 */
'use strict';

const SID_PREFIX = 'SID:';

/**
 * Encode an outgoing ServiceOrders row.
 *
 * @param {Object} data - row payload as the caller wrote it
 * @returns {Object} payload with `service_id` removed and embedded into `period`
 */
function encodeServiceOrder(data) {
  const out = Object.assign({}, data);
  if (out.service_id != null) {
    const period = out.period != null ? String(out.period) : '';
    out.period = `${SID_PREFIX}${out.service_id}|${period}`;
  }
  delete out.service_id;
  return out;
}

/**
 * Decode an incoming ServiceOrders row.
 *
 * @param {Object} row - raw row from Catalyst
 * @returns {Object} row with `service_id` extracted and `period` cleaned up.
 *                   Rows without the SID: prefix are returned unchanged so
 *                   legacy rows (created before this scheme) still work.
 */
function decodeServiceOrderRow(row) {
  if (!row || typeof row.period !== 'string') return row;
  if (!row.period.startsWith(SID_PREFIX)) return row;
  const rest = row.period.slice(SID_PREFIX.length);
  const idx = rest.indexOf('|');
  const sid = idx >= 0 ? rest.slice(0, idx) : rest;
  const actualPeriod = idx >= 0 ? rest.slice(idx + 1) : '';
  return Object.assign({}, row, { service_id: sid, period: actualPeriod });
}

module.exports = {
  SID_PREFIX,
  encodeServiceOrder,
  decodeServiceOrderRow,
};
