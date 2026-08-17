/**
 * Unit tests for the ServiceOrders period-encoding kludge.
 *
 * These tests are the safety net for the most fragile contract in the entire
 * codebase. If any of them go red, the ServiceOrders read/write paths will
 * silently corrupt data — see api/src/infra/dataStore/period-encoding.js for
 * the full explanation.
 */
'use strict';

const {
  SID_PREFIX,
  encodeServiceOrder,
  decodeServiceOrderRow,
} = require('../src/infra/dataStore/period-encoding');

describe('encodeServiceOrder', () => {
  test('embeds service_id into period and removes service_id', () => {
    const out = encodeServiceOrder({ service_id: 'SVC123', period: 'Q1 2026', status: 'pending' });
    expect(out.service_id).toBeUndefined();
    expect(out.period).toBe('SID:SVC123|Q1 2026');
    expect(out.status).toBe('pending');
  });

  test('handles missing period (encodes with empty period after the bar)', () => {
    const out = encodeServiceOrder({ service_id: 'SVC123' });
    expect(out.period).toBe('SID:SVC123|');
  });

  test('handles numeric service_id (Catalyst sometimes returns numbers)', () => {
    const out = encodeServiceOrder({ service_id: 42, period: 'X' });
    expect(out.period).toBe('SID:42|X');
  });

  test('no-ops when service_id is absent (employee-only updates pass through)', () => {
    const out = encodeServiceOrder({ employee_id: 'EMP9', status: 'in_progress' });
    expect(out).toEqual({ employee_id: 'EMP9', status: 'in_progress' });
  });

  test('does not mutate the input object', () => {
    const input = { service_id: 'A', period: 'B' };
    encodeServiceOrder(input);
    expect(input).toEqual({ service_id: 'A', period: 'B' });
  });

  test('null service_id is treated as absent (no prefix added)', () => {
    const out = encodeServiceOrder({ service_id: null, period: 'X' });
    expect(out.period).toBe('X');
    expect(out).not.toHaveProperty('service_id');
  });
});

describe('decodeServiceOrderRow', () => {
  test('extracts service_id and period from prefixed row', () => {
    const row = decodeServiceOrderRow({ period: 'SID:SVC123|Q1 2026', status: 'pending' });
    expect(row.service_id).toBe('SVC123');
    expect(row.period).toBe('Q1 2026');
    expect(row.status).toBe('pending');
  });

  test('legacy rows without the prefix pass through unchanged', () => {
    const row = decodeServiceOrderRow({ period: 'Legacy period', status: 'done' });
    expect(row).toEqual({ period: 'Legacy period', status: 'done' });
  });

  test('handles SID prefix with empty period after bar', () => {
    const row = decodeServiceOrderRow({ period: 'SID:XYZ|' });
    expect(row.service_id).toBe('XYZ');
    expect(row.period).toBe('');
  });

  test('handles SID prefix without separator (degraded encoding)', () => {
    const row = decodeServiceOrderRow({ period: 'SID:JUST_ID' });
    expect(row.service_id).toBe('JUST_ID');
    expect(row.period).toBe('');
  });

  test('returns null unchanged (defensive)', () => {
    expect(decodeServiceOrderRow(null)).toBeNull();
  });

  test('returns rows without a period field unchanged', () => {
    const row = decodeServiceOrderRow({ status: 'pending' });
    expect(row.service_id).toBeUndefined();
    expect(row).toEqual({ status: 'pending' });
  });

  test('does not mutate the input object', () => {
    const input = { period: 'SID:A|B' };
    decodeServiceOrderRow(input);
    expect(input).toEqual({ period: 'SID:A|B' });
  });
});

describe('encode → decode round-trip', () => {
  test('preserves service_id and period for typical payload', () => {
    const original = { service_id: 'S1', period: 'FY 2025-26', employee_id: 'E9', status: 'in_progress' };
    const encoded = encodeServiceOrder(original);
    const decoded = decodeServiceOrderRow(encoded);
    expect(decoded.service_id).toBe('S1');
    expect(decoded.period).toBe('FY 2025-26');
    expect(decoded.employee_id).toBe('E9');
    expect(decoded.status).toBe('in_progress');
  });

  test('preserves periods containing the separator character', () => {
    // The encoding splits on the FIRST | only, so a period with | inside survives intact.
    const original = { service_id: 'S1', period: 'rate=10|notes=hello' };
    const encoded = encodeServiceOrder(original);
    const decoded = decodeServiceOrderRow(encoded);
    expect(decoded.service_id).toBe('S1');
    expect(decoded.period).toBe('rate=10|notes=hello');
  });

  test('preserves empty period through round-trip', () => {
    const decoded = decodeServiceOrderRow(encodeServiceOrder({ service_id: 'S1', period: '' }));
    expect(decoded.service_id).toBe('S1');
    expect(decoded.period).toBe('');
  });
});

describe('module surface', () => {
  test('SID_PREFIX is exported and is the literal "SID:"', () => {
    expect(SID_PREFIX).toBe('SID:');
  });
});
