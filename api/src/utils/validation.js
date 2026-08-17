/**
 * Input Validation Utilities
 * Centralized validation functions for consistent input handling
 */

const validator = require('validator');

/**
 * Safely parse integer with validation
 */
function parseIntSafe(value, defaultValue, min = null, max = null) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value);

  if (isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return defaultValue;
  }

  if (min !== null && parsed < min) {
    return defaultValue;
  }

  if (max !== null && parsed > max) {
    return defaultValue;
  }

  return parsed;
}

/**
 * Validate and sanitize email
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const normalized = email.toLowerCase().trim();

  if (!validator.isEmail(normalized)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (normalized.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true, email: normalized };
}

/**
 * Validate password strength
 */
const PASSWORD_MAX_LENGTH = 128;

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'
    };
  }
  return { valid: true };
}

/**
 * Sanitize filename - remove dangerous characters and path traversal
 */
function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name');
  }

  // Remove path components (get only filename)
  let sanitized = fileName.split(/[\/\\]/).pop();

  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Validate not empty and reasonable length
  if (!sanitized || sanitized.length === 0) {
    throw new Error('Invalid file name - empty after sanitization');
  }

  if (sanitized.length > 255) {
    throw new Error('File name too long (max 255 characters)');
  }

  // Check for only dots
  if (/^\.+$/.test(sanitized)) {
    throw new Error('Invalid file name - cannot be only dots');
  }

  return sanitized;
}

/**
 * Validate and sanitize text input
 */
function sanitizeText(text, maxLength = null) {
  if (text === null || text === undefined) {
    return null;
  }

  if (typeof text !== 'string') {
    throw new Error('Text must be a string');
  }

  const sanitized = validator.escape(text.trim());

  if (maxLength && sanitized.length > maxLength) {
    throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
  }

  return sanitized;
}

/**
 * Validate decimal/float number (for bonus amounts, etc.)
 */
function validateDecimal(value, min = 0, max = 999999.99, decimals = 2) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Value is required' };
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return { valid: false, error: 'Invalid number format' };
  }

  if (parsed < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }

  if (parsed > max) {
    return { valid: false, error: `Value must not exceed ${max}` };
  }

  // Round to specified decimal places
  const rounded = Math.round(parsed * Math.pow(10, decimals)) / Math.pow(10, decimals);

  return { valid: true, value: rounded };
}

/**
 * Validate ID parameter (positive integer) — use for page/limit only.
 */
function validateId(id, paramName = 'ID') {
  const parsed = parseIntSafe(id, null, 1, 999999999);

  if (parsed === null) {
    return { valid: false, error: `Invalid ${paramName} - must be a positive integer` };
  }

  return { valid: true, id: parsed };
}

/** MongoDB ObjectId format: 24 hex characters */
const OBJECT_ID_HEX = /^[a-f0-9]{24}$/i;

/**
 * Validate MongoDB ObjectId parameter (24-char hex).
 * Use for all entity IDs (users, orders, documents, referrals, services).
 */
function validateObjectId(id, paramName = 'ID') {
  if (id === null || id === undefined) {
    return { valid: false, error: `${paramName} is required` };
  }
  if (typeof id !== 'string') {
    return { valid: false, error: `Invalid ${paramName} - must be a string` };
  }
  const s = id.trim();
  if (!s) {
    return { valid: false, error: `Invalid ${paramName} - cannot be empty` };
  }
  // Catalyst Data Store IDs are 17-19 digits; CUIDs are ~25 chars; UUIDs 36.
  // Anything shorter than 8 chars is almost certainly user-typed garbage or
  // an attack payload — reject it cheaply here so downstream queries don't
  // 500.
  if (s.length < 8 || s.length > 50) {
    return { valid: false, error: `Invalid ${paramName} format` };
  }
  return { valid: true, id: s };
}

module.exports = {
  parseIntSafe,
  validateEmail,
  validatePassword,
  sanitizeFileName,
  sanitizeText,
  validateDecimal,
  validateId,
  validateObjectId
};
