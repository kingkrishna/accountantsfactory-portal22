/**
 * Boot-time environment validator.
 *
 * Status: NOT YET WIRED INTO `app.js`. Lives here so the secret-rotation plan
 * (see docs/SECRETS-AUDIT.md) can flip it on after secrets are rotated in
 * Catalyst. Importing this module fail-fasts the process if required env vars
 * are missing or malformed — never silently falls back to a leaked hardcoded
 * value.
 *
 * Usage (after secrets are rotated):
 *   const env = require('./config/env');
 *   console.log(env.JWT_SECRET);    // throws at boot if undefined
 *
 * No external dependencies. Hand-rolled validator to avoid adding zod just for
 * this. If the codebase ever wants zod's full feature set, swap the
 * `validate()` function out — public shape (`env.X`) stays the same.
 */
'use strict';

/**
 * @typedef {Object} EnvRule
 * @property {boolean} [required=true]
 * @property {RegExp}  [pattern]          must match
 * @property {string}  [startsWith]       must start with
 * @property {number}  [minLength]
 * @property {string[]}[oneOf]            value must be one of these
 * @property {string}  [defaultValue]     only applied if `required: false`
 */

/** @type {Record<string, EnvRule>} */
const SCHEMA = {
  NODE_ENV:               { required: false, oneOf: ['development', 'production', 'test'], defaultValue: 'production' },

  // Auth
  JWT_SECRET:             { minLength: 32 },

  // Catalyst project
  CATALYST_PROJECT_ID:    { pattern: /^\d{10,}$/ },

  // Catalyst CLI client (1004.*)
  AF_CLIENT_ID:           { startsWith: '1004.' },
  AF_CLIENT_SECRET:       { minLength: 20 },
  AF_REFRESH_TOKEN:       { startsWith: '1004.' },

  // Self Client (1000.*)
  ZOHO_CLIENT_ID:         { startsWith: '1000.' },
  ZOHO_CLIENT_SECRET:     { minLength: 20 },
  ZOHO_REFRESH_TOKEN:     { startsWith: '1000.' },

  // Recovery
  RECOVERY_SECRET:        { minLength: 32 },

  // Emergency admin
  EMERGENCY_ADMIN_EMAIL:    { pattern: /.+@.+\..+/ },
  EMERGENCY_ADMIN_PASSWORD: { minLength: 16 },

  // SMTP
  SMTP_HOST:              {},
  SMTP_USER:              { pattern: /.+@.+\..+/ },
  SMTP_PASSWORD:          { minLength: 1 },
  EMAIL_FROM:             { pattern: /.+@.+\..+/ },

  // Optional
  FRONTEND_URL:           { required: false },
  ADMIN_ALERT_EMAIL:      { required: false },
};

function validate(rawEnv) {
  const errors = [];
  const result = {};

  for (const [key, rule] of Object.entries(SCHEMA)) {
    const required = rule.required !== false;
    const value = rawEnv[key];

    if (value == null || value === '') {
      if (required) errors.push(`${key} is required but missing`);
      else if (rule.defaultValue != null) result[key] = rule.defaultValue;
      continue;
    }
    if (rule.pattern && !rule.pattern.test(value))     errors.push(`${key} does not match ${rule.pattern}`);
    if (rule.startsWith && !value.startsWith(rule.startsWith)) errors.push(`${key} must start with "${rule.startsWith}"`);
    if (rule.minLength && value.length < rule.minLength) errors.push(`${key} must be at least ${rule.minLength} chars`);
    if (rule.oneOf && !rule.oneOf.includes(value))      errors.push(`${key} must be one of ${rule.oneOf.join(', ')}`);

    result[key] = value;
  }

  return { errors, result };
}

const { errors, result } = validate(process.env);

if (errors.length) {
  // Don't log secret VALUES — only the key names that failed
  console.error('FATAL: environment validation failed');
  for (const err of errors) console.error('  -', err);
  console.error('\nSee docs/SECRETS-AUDIT.md for required env vars.');
  process.exit(1);
}

module.exports = Object.freeze(result);
