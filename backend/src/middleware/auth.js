const jwt = require('jsonwebtoken');
const prisma = require('../models/prismaClient');
const { validateObjectId } = require('../utils/validation');

const JWT_OPTIONS = { algorithms: ['HS256'] };

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Authentication token required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_OPTIONS);

    if (decoded.demo === true) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        status: 'active',
        referral_code: decoded.referral_code || null,
        created_at: decoded.created_at,
        totp_enabled: false
      };
      return next();
    }

    const idVal = validateObjectId(decoded.userId, 'User ID');
    if (!idVal.valid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const user = await prisma.user.findUnique({
      where: { id: idVal.id },
      select: { id: true, email: true, role: true, status: true, referral_code: true, createdAt: true, totp_enabled: true, must_change_password: true }
    });

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account is not active' });

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      referral_code: user.referral_code,
      // For sub_admin, the referral_code IS the franchise code. Surface it
      // under a separate name so controller-level franchise checks read
      // unambiguously and can't be confused with a client's referral_code.
      // (Vuln 7: client-creation guard read req.user.franchise_code which
      // was always undefined; this populates it.)
      franchise_code: user.role === 'sub_admin' ? (user.referral_code || null) : null,
      created_at: user.createdAt,
      totp_enabled: user.totp_enabled,
      must_change_password: user.must_change_password
    };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Pass if the caller is either full admin or sub_admin. Controllers behind
// this MUST apply franchise-scoping themselves when needed — sub_admin is
// a tenant-bounded role, NOT a full admin.
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'sub_admin')) next();
  else return res.status(403).json({ success: false, message: 'Admin access required' });
};

// Pass ONLY if the caller is full admin (not sub_admin). Use this on routes
// that perform cross-tenant operations or that must never be exposed to a
// franchise-bounded role (e.g. system-wide bulk imports, super-admin
// password resets, dangerous one-shots).
const requireFullAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') next();
  else return res.status(403).json({ success: false, message: 'Full admin access required' });
};

const requireClient = (req, res, next) => {
  if (req.user && req.user.role === 'client') next();
  else return res.status(403).json({ success: false, message: 'Client access required' });
};

const requireEmployee = (req, res, next) => {
  if (req.user && req.user.role === 'employee') next();
  else return res.status(403).json({ success: false, message: 'Employee access required' });
};

module.exports = { authenticateToken, requireAdmin, requireFullAdmin, requireClient, requireEmployee };
