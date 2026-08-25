const {
  validateEmail,
  validatePassword,
  sanitizeText,
  validateDecimal,
  parseIntSafe,
  validateObjectId
} = require('../src/utils/validation');

describe('validateEmail', () => {
  it('accepts valid email', () => {
    const r = validateEmail('user@example.com');
    expect(r.valid).toBe(true);
    expect(r.email).toBe('user@example.com');
  });

  it('rejects empty', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail().valid).toBe(false);
  });

  it('rejects invalid format', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
  });

  it('normalizes to lowercase', () => {
    const r = validateEmail('User@Example.COM');
    expect(r.valid).toBe(true);
    expect(r.email).toBe('user@example.com');
  });
});

describe('validatePassword', () => {
  it('accepts valid password', () => {
    expect(validatePassword('SecurePass1!').valid).toBe(true);
  });

  it('rejects short password', () => {
    expect(validatePassword('Ab1!').valid).toBe(false);
  });

  it('rejects missing uppercase', () => {
    expect(validatePassword('securepass1!').valid).toBe(false);
  });

  it('rejects missing lowercase', () => {
    expect(validatePassword('SECUREPASS1!').valid).toBe(false);
  });

  it('rejects missing number', () => {
    expect(validatePassword('SecurePass!').valid).toBe(false);
  });

  it('rejects missing special char', () => {
    expect(validatePassword('SecurePass1').valid).toBe(false);
  });

  it('rejects password over 128 chars', () => {
    const long = 'A1!' + 'a'.repeat(130);
    expect(validatePassword(long).valid).toBe(false);
  });
});

describe('parseIntSafe', () => {
  it('parses valid integer', () => {
    expect(parseIntSafe('42', 0)).toBe(42);
    expect(parseIntSafe('1', 0, 1, 10)).toBe(1);
  });

  it('returns default for invalid', () => {
    expect(parseIntSafe('x', 99)).toBe(99);
    expect(parseIntSafe('', 0)).toBe(0);
  });

  it('enforces min/max', () => {
    expect(parseIntSafe('0', 5, 1, 10)).toBe(5);
    expect(parseIntSafe('99', 5, 1, 10)).toBe(5);
  });
});

describe('validateDecimal', () => {
  it('accepts valid decimal', () => {
    const r = validateDecimal('123.45', 0, 999, 2);
    expect(r.valid).toBe(true);
    expect(r.value).toBeCloseTo(123.45);
  });

  it('rejects out of range', () => {
    expect(validateDecimal('-1', 0, 100, 2).valid).toBe(false);
    expect(validateDecimal('101', 0, 100, 2).valid).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('trims and truncates', () => {
    const s = sanitizeText('  hello  ', 5);
    expect(s).toBe('hello');
  });

  it('returns null for null/undefined', () => {
    expect(sanitizeText(null, 10)).toBeNull();
    expect(sanitizeText(undefined, 10)).toBeNull();
  });

  it('throws for non-string', () => {
    expect(() => sanitizeText(123, 10)).toThrow();
  });
});

describe('validateObjectId', () => {
  const validId = '507f1f77bcf86cd799439011';

  it('accepts valid 24-char hex', () => {
    const r = validateObjectId(validId);
    expect(r.valid).toBe(true);
    expect(r.id).toBe(validId);
  });

  it('accepts uppercase hex', () => {
    const r = validateObjectId('507F1F77BCF86CD799439011');
    expect(r.valid).toBe(true);
    expect(r.id).toBe('507F1F77BCF86CD799439011');
  });

  it('rejects null/undefined', () => {
    expect(validateObjectId(null).valid).toBe(false);
    expect(validateObjectId(undefined).valid).toBe(false);
  });

  it('rejects non-string', () => {
    expect(validateObjectId(123).valid).toBe(false);
    expect(validateObjectId({}).valid).toBe(false);
  });

  it('rejects too short (< 8 chars) and too long (> 50 chars)', () => {
    // Length-based contract: any string in [8, 50] is accepted. Catalyst Data
    // Store IDs are 17-19 digits; CUIDs ~25; UUIDs 36 — all comfortably inside.
    expect(validateObjectId('abc').valid).toBe(false);
    expect(validateObjectId('1234567').valid).toBe(false);            // 7 chars
    expect(validateObjectId('1'.repeat(51)).valid).toBe(false);       // 51 chars
    expect(validateObjectId('35880000000023013').valid).toBe(true);   // real Catalyst ID
    expect(validateObjectId('507f1f77bcf86cd799439011').valid).toBe(true); // legit 24-char hex
  });
});
