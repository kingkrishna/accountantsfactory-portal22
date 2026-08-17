const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for password reset requests
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: { success: false, message: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const twoFaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many 2FA attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authController.login);
router.post('/2fa/login', twoFaLimiter, authController.twoFaLogin);
router.get('/verify', authenticateToken, authController.verifyToken);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/set-initial-password', authenticateToken, authController.setInitialPassword);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);

router.post('/2fa/setup', authenticateToken, authController.twoFaSetup);
router.post('/2fa/verify-setup', twoFaLimiter, authenticateToken, authController.twoFaVerifySetup);
router.post('/2fa/disable', twoFaLimiter, authenticateToken, authController.twoFaDisable);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
