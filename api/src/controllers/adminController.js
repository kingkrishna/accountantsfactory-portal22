/**
 * Admin controller — minimal residual.
 *
 * After Phase 3.1–3.6 of the architecture refactor, this file holds only
 * what doesn't belong to any of the carved domain modules. Right now that
 * is exactly one endpoint: testEmail, which is an admin utility for
 * verifying SMTP connectivity and not tied to any aggregate.
 *
 * All other admin endpoints live under api/src/domain/<aggregate>/:
 *   - clients     (create, bulkImport, importFromFile, list, updateStatus, resetPassword)
 *   - orders      (assignService, updateStatus, list, remove, assignEmployee, workUpdates)
 *   - employees   (create, list, toggleStatus, remove, updates)
 *   - services    (list, create, bulkCreate, toggle)        — service catalogue
 *   - documents   (list, addLink, deleteLink)
 *   - referrals   (list, approve)
 *
 * If you are about to add a new admin endpoint, ask yourself first:
 * does it belong to an existing aggregate? If yes, add it there. Only
 * land it in this file if it truly has no aggregate (the bar is high).
 */
'use strict';

const emailService = require('../services/emailService');

/**
 * GET /api/admin/test-email
 *
 * Sends a no-op connection probe to the configured SMTP server and
 * returns the result. Used by the admin dashboard's "Test email" button
 * to verify deployment-time SMTP configuration without sending a real
 * email to a real recipient.
 */
exports.testEmail = async (req, res) => {
  try {
    const result = await emailService.testConnection();
    res.status(result.success ? 200 : 503).json({ success: result.success, message: result.message });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};
