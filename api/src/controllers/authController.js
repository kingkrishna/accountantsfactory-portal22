const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const prisma = require('../models/prismaClient');
const { validateEmail, validatePassword } = require('../utils/validation');
const emailService = require('../services/emailService');

const TWOFA_TEMP_EXPIRY = '5m';
const TWOFA_ISSUER = 'AccountantsFactory';

// Account lockout: tracks failed login attempts per email (not IP — avoids NAT issues).
// After MAX_FAILS failures within WINDOW_MS, account is locked for LOCKOUT_MS.
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 30 * 60 * 1000;
const _failedAttempts = new Map();

// Email an admin alert on suspicious activity (5+ failed attempts / fresh lockout)
function alertAdminOfFailedLogin(email, count, ip) {
  try {
    const adminTo = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM || 'nitin@accountantsfactory.com';
    if (!emailService || !emailService.isConfigured || !emailService.isConfigured()) return;
    const subject = '[Security Alert] Multiple failed login attempts';
    const body =
      'Multiple failed login attempts detected on AccountantsFactory portal:\n\n' +
      'Email attempted: ' + email + '\n' +
      'Failed attempts: ' + count + '\n' +
      'Source IP: ' + (ip || 'unknown') + '\n' +
      'Time: ' + new Date().toISOString() + '\n\n' +
      'If this looks like a brute-force attempt, the account is now locked for 30 minutes.\n' +
      'No action needed if the user is just typing the wrong password.';
    emailService.sendEmail(adminTo, subject, body).catch(() => {});
  } catch (_) {}
}

function recordLoginFail(email, ip) {
  const now = Date.now();
  const entry = _failedAttempts.get(email) || { count: 0, firstAt: now, lockedUntil: 0, alerted: false };
  if (now - entry.firstAt > WINDOW_MS) { entry.count = 0; entry.firstAt = now; entry.alerted = false; }
  entry.count++;
  if (entry.count >= MAX_FAILS) entry.lockedUntil = now + LOCKOUT_MS;
  // One alert per window — once at 5 attempts, once at lockout
  if (entry.count === 5 || (entry.count === MAX_FAILS && !entry.alerted)) {
    entry.alerted = entry.count === MAX_FAILS;
    alertAdminOfFailedLogin(email, entry.count, ip);
  }
  _failedAttempts.set(email, entry);
}
function isLocked(email) {
  const entry = _failedAttempts.get(email);
  if (!entry) return { locked: false };
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return { locked: true, retryAfterMin: Math.ceil((entry.lockedUntil - Date.now()) / 60000) };
  }
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) _failedAttempts.delete(email);
  return { locked: false };
}
function clearLoginFails(email) { _failedAttempts.delete(email); }

const JWT_SIGN_OPTIONS = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };

// Demo accounts only when explicitly enabled via env var (default: disabled in production)
const DEMO_CREDENTIALS = process.env.ENABLE_DEMO_LOGIN === 'true'
  ? {
      'admin@demo.com': { password: 'Demo@123', role: 'admin', id: '000000000000000000000001', referral_code: null },
      'client@demo.com': { password: 'Demo@123', role: 'client', id: '000000000000000000000002', referral_code: 'DEMO-REF' }
    }
  : {};

// Emergency admin login — works even when Catalyst Data Store is down.
// Disabled by default. To enable, set BOTH env vars in app-config.json or via Catalyst console:
//   EMERGENCY_ADMIN_EMAIL = the admin's email
//   EMERGENCY_ADMIN_PASSWORD = a strong password (min 16 chars recommended)
const EMERGENCY_ADMIN_EMAIL = process.env.EMERGENCY_ADMIN_EMAIL || '';
const EMERGENCY_ADMIN_PASSWORD = process.env.EMERGENCY_ADMIN_PASSWORD || '';
const EMERGENCY_LOGIN_ENABLED = !!(EMERGENCY_ADMIN_EMAIL && EMERGENCY_ADMIN_PASSWORD && EMERGENCY_ADMIN_PASSWORD.length >= 16);

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (!validator.isEmail(email) || email.length > 255) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const lockStatus = isLocked(normalizedEmail);
    if (lockStatus.locked) {
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockStatus.retryAfterMin} minute(s) or use Forgot Password.`
      });
    }

    // Emergency admin bypass — works without DB. Critical for outage recovery.
    if (EMERGENCY_LOGIN_ENABLED && normalizedEmail === EMERGENCY_ADMIN_EMAIL.toLowerCase() && password === EMERGENCY_ADMIN_PASSWORD) {
      const emergencyUserId = '00000000000000000000ADMN';
      const payload = { userId: emergencyUserId, email: normalizedEmail, role: 'admin', emergency: true };
      const token = jwt.sign(payload, process.env.JWT_SECRET, JWT_SIGN_OPTIONS);
      return res.json({
        success: true,
        message: 'Login successful (emergency admin)',
        token,
        user: {
          id: emergencyUserId,
          email: normalizedEmail,
          role: 'admin',
          referral_code: null,
          status: 'active',
          created_at: new Date(),
          must_change_password: false,
          emergency: true
        }
      });
    }

    const demo = DEMO_CREDENTIALS[normalizedEmail];
    if (demo) {
      // Email matches a demo account. Either password is right -> issue token,
      // or it isn't -> 401. DON'T fall through to the DB lookup because demo
      // emails never exist in the user table — that would just return the
      // same 401 after a wasted query (or 500 if the DB is unreachable).
      if (demo.password === password) {
        const payload = { userId: demo.id, email: normalizedEmail, role: demo.role, demo: true };
        const token = jwt.sign(payload, process.env.JWT_SECRET, JWT_SIGN_OPTIONS);
        return res.json({
          success: true,
          message: 'Login successful (demo)',
          token,
          user: { id: demo.id, email: normalizedEmail, role: demo.role, referral_code: demo.referral_code, status: 'active', created_at: new Date() }
        });
      }
      recordLoginFail(normalizedEmail, req.ip);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user) {
      if (user.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Account is not active. Please contact support.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (isValidPassword) {
        clearLoginFails(normalizedEmail);
        // Capture previous login time before updating (so we can show user "last login was X")
        const previousLogin = user.last_login_at || null;
        const loginIp = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
        // Fire-and-forget: update last_login_at and last_login_ip
        try {
          prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date(), last_login_ip: loginIp.slice(0, 60) }
          }).catch(() => {});
        } catch (_) {}
        if (user.totp_enabled) {
          const tempToken = jwt.sign(
            { purpose: '2fa_pending', userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: TWOFA_TEMP_EXPIRY }
          );
          return res.json({ success: true, requires2FA: true, message: 'Enter your authenticator code', tempToken });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, JWT_SIGN_OPTIONS);
        return res.json({
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            referral_code: user.referral_code,
            status: user.status,
            created_at: user.createdAt,
            must_change_password: user.must_change_password,
            previous_login_at: previousLogin,
            previous_login_ip: user.last_login_ip || null
          }
        });
      }
    }

    recordLoginFail(normalizedEmail, (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim());
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  } catch (error) {
    console.error('Login error:', error);
    // Distinguish DB/token errors from wrong-password errors
    const msg = String(error && error.message || '');
    if (msg.includes('access token') || msg.includes('invalid_code') || msg.includes('Row fetch')) {
      return res.status(503).json({
        success: false,
        message: 'Our system is temporarily unavailable. Please try again in a few minutes. If this persists, contact support.'
      });
    }
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        franchise_code: user.role === 'sub_admin' ? user.referral_code : null,
        referral_code: user.referral_code,
        status: user.status,
        created_at: user.created_at || user.createdAt,
        totp_enabled: !!user.totp_enabled,
        must_change_password: !!user.must_change_password
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current password and new password are required' });

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return res.status(400).json({ success: false, message: passwordValidation.error });
    if (currentPassword === newPassword) return res.status(400).json({ success: false, message: 'New password must be different from current password' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword, must_change_password: false }
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.setInitialPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword) return res.status(400).json({ success: false, message: 'New password is required' });

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return res.status(400).json({ success: false, message: passwordValidation.error });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.must_change_password) return res.status(400).json({ success: false, message: 'Initial password was already set. Use Change password instead.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: hashedPassword, must_change_password: false }
    });

    res.json({ success: true, message: 'Password set successfully. You can now use the portal.' });
  } catch (error) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return res.status(400).json({ success: false, message: emailValidation.error });

    const normalizedEmail = emailValidation.email;
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user && user.status === 'active') {
      await prisma.passwordResetToken.updateMany({
        where: { user_id: user.id, used: false },
        data: { used: true }
      });

      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.passwordResetToken.create({
        data: { user_id: user.id, token: resetToken, expires_at: expiresAt }
      });

      try {
        await emailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        if (process.env.NODE_ENV !== 'production') {
          const resetUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/portal/reset-password.html?token=${resetToken}` : `http://localhost:5500/portal/reset-password.html?token=${resetToken}`;
          console.log(`Password reset token for ${normalizedEmail}: ${resetToken}`);
          console.log(`Reset URL: ${resetUrl}`);
        }
      }
    }
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required' });

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) return res.status(400).json({ success: false, message: passwordValidation.error });

    const resetTokenDoc = await prisma.passwordResetToken.findFirst({
      where: { token, used: false, expires_at: { gt: new Date() } },
      include: { user: true }
    });

    if (!resetTokenDoc || !resetTokenDoc.user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = resetTokenDoc.user;
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account is not active. Please contact support.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { password_hash: hashedPassword } });
      await tx.passwordResetToken.update({ where: { id: resetTokenDoc.id }, data: { used: true } });
      await tx.passwordResetToken.updateMany({
        where: { user_id: user.id, used: false, id: { not: resetTokenDoc.id } },
        data: { used: true }
      });
    });

    res.json({ success: true, message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.twoFaLogin = async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code || typeof code !== 'string') return res.status(400).json({ success: false, message: 'tempToken and code are required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    if (decoded.purpose !== '2fa_pending' || !decoded.userId) return res.status(401).json({ success: false, message: 'Invalid token' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.status !== 'active' || !user.totp_enabled || !user.totp_secret) {
      return res.status(401).json({ success: false, message: 'Invalid session. Please log in again.' });
    }

    const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code.trim(), window: 1 });
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid authenticator code' });

    const token = jwt.sign({ 
      userId: user.id, 
      email: user.email, 
      role: user.role,
      franchise_code: user.role === 'sub_admin' ? user.referral_code : null
    }, process.env.JWT_SECRET, JWT_SIGN_OPTIONS);
    res.json({
      success: true, message: 'Login successful', token,
      user: { id: user.id, email: user.email, role: user.role, referral_code: user.referral_code, status: user.status, created_at: user.createdAt, totp_enabled: user.totp_enabled, must_change_password: user.must_change_password }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.twoFaSetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.totp_enabled) return res.status(400).json({ success: false, message: '2FA is already enabled' });

    const secret = speakeasy.generateSecret({ name: `${TWOFA_ISSUER} (${user.email})`, issuer: TWOFA_ISSUER, length: 20 });
    await prisma.user.update({ where: { id: userId }, data: { totp_secret: secret.base32 } });

    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, secret: secret.base32, qrUrl, message: 'Scan the QR code with your authenticator app, then verify with a code.' });
  } catch (error) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.twoFaVerifySetup = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') return res.status(400).json({ success: false, message: 'Code is required' });

    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totp_secret) return res.status(400).json({ success: false, message: '2FA setup not started. Call /2fa/setup first.' });
    if (user.totp_enabled) return res.status(400).json({ success: false, message: '2FA is already enabled' });

    const valid = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code.trim(), window: 1 });
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid code. Please try again.' });

    await prisma.user.update({ where: { id: userId }, data: { totp_enabled: true } });
    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.twoFaDisable = async (req, res) => {
  try {
    const { password, code } = req.body;
    if (!password || !code || typeof code !== 'string') return res.status(400).json({ success: false, message: 'Password and code are required' });

    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.totp_enabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) return res.status(401).json({ success: false, message: 'Invalid password' });

    const validTotp = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: code.trim(), window: 1 });
    if (!validTotp) return res.status(401).json({ success: false, message: 'Invalid authenticator code' });

    await prisma.user.update({ where: { id: userId }, data: { totp_secret: null, totp_enabled: false } });
    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
