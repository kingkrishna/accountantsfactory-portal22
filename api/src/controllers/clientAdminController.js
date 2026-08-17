// Admin client management: create, bulk import (JSON + markdown file), list,
// status, password reset. Helpers shared between createClient and bulk imports.

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../models/prismaClient');
const { parseIntSafe, validateEmail, validatePassword, sanitizeText, validateObjectId } = require('../utils/validation');
const { assertClientOwned } = require('../utils/franchiseScope');

function generateReferralCode() {
  return 'REF-' + crypto.randomBytes(8).toString('hex').toUpperCase();
}

// Single-user create with unique-referral-code retry. Throws DUPLICATE_EMAIL
// (error.code) if email exists, so callers can distinguish skip from fail.
async function createUserWithReferralCode(email, password, role = 'client', maxRetries = 10, name = null, skipPasswordValidation = false) {
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) throw new Error(emailValidation.error);

  if (!skipPasswordValidation) {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) throw new Error(passwordValidation.error);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: emailValidation.email } });
  if (existingUser) {
    const error = new Error('Email already exists');
    error.code = 'DUPLICATE_EMAIL';
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  let createdUser = null;
  let attempts = 0;

  while (attempts < maxRetries) {
    const referralCode = generateReferralCode();
    try {
      createdUser = await prisma.user.create({
        data: {
          email: emailValidation.email,
          password_hash: hashedPassword,
          role,
          referral_code: referralCode,
          status: 'active',
          must_change_password: true,
          name: name ? String(name).trim().substring(0, 200) : null
        }
      });
      break;
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('referral_code')) {
        attempts++;
        continue;
      }
      throw error;
    }
  }

  if (!createdUser) throw new Error('Failed to generate unique referral code after multiple attempts');
  return createdUser;
}

// Walk known locations to find the legacy client_credentials.md import file.
function findCredentialsFile(possiblePaths = []) {
  const defaultPaths = [
    path.join(__dirname, '../../client_credentials.md'),
    path.join(__dirname, '../../_archive/client_credentials.md'),
    path.join(__dirname, '../../../_archive/client_credentials.md'),
    path.join(process.cwd(), 'client_credentials.md'),
    path.join(process.cwd(), '_archive/client_credentials.md'),
  ];
  for (const filePath of [...possiblePaths, ...defaultPaths]) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return { content, filePath };
    } catch (e) { /* try next */ }
  }
  return null;
}

exports.createClient = async (req, res) => {
  try {
    let { email, password, name, serviceId, period, referrerCode } = req.body;

    if (req.user.role === 'sub_admin' && req.user.franchise_code) {
      referrerCode = req.user.franchise_code; // Force tagging to their franchise
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return res.status(400).json({ success: false, message: emailValidation.error });

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return res.status(400).json({ success: false, message: passwordValidation.error });

    const normalizedEmail = emailValidation.email;

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdUser = null;
    let attempts = 0;
    while (attempts < 10) {
      const referralCode = generateReferralCode();
      try {
        createdUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            password_hash: hashedPassword,
            role: 'client',
            referral_code: referralCode,
            status: 'active',
            must_change_password: true,
            name: name ? String(name).trim().substring(0, 200) : null
          }
        });
        break;
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('referral_code')) {
          attempts++;
          continue;
        }
        throw error;
      }
    }

    if (!createdUser) throw new Error('Failed to create user');

    let safeReferrerCode = null;
    if (referrerCode != null && typeof referrerCode === 'string') {
      const trimmed = referrerCode.trim();
      if (trimmed.length > 0 && trimmed.length <= 50) safeReferrerCode = trimmed;
    }

    // db.js $transaction is sequential, no rollback. If a step fails the user
    // still exists. Live with it for now (audit Phase 5 hardens this).
    await prisma.$transaction(async (tx) => {
      if (safeReferrerCode) {
        const referrer = await tx.user.findUnique({ where: { referral_code: safeReferrerCode } });
        if (referrer) {
          await tx.referral.create({
            data: {
              referrer_user_id: referrer.id,
              referred_name: normalizedEmail.split('@')[0],
              referred_email: normalizedEmail,
              status: 'pending'
            }
          });
        }
      }

      if (serviceId) {
        const svcValidation = validateObjectId(serviceId, 'Service ID');
        if (!svcValidation.valid) throw new Error(svcValidation.error);

        const service = await tx.service.findFirst({ where: { id: svcValidation.id, is_active: true } });
        if (!service) throw new Error('Service not found or inactive');

        let sanitizedPeriod = null;
        if (period) {
          try { sanitizedPeriod = sanitizeText(period, 500); } catch (e) { throw new Error(e.message || 'Invalid period value'); }
        }

        await tx.serviceOrder.create({
          data: {
            user_id: createdUser.id,
            service_id: svcValidation.id,
            period: sanitizedPeriod,
            status: 'pending'
          }
        });
      }
    });

    res.json({
      success: true,
      message: 'Client created successfully',
      client: { id: createdUser.id, email: normalizedEmail, referral_code: createdUser.referral_code }
    });
  } catch (error) {
    console.error('Create client error:', error);
    const msg = error.message || '';
    res.status(msg.includes('found or inactive') || msg.includes('Invalid') ? 400 : 500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : msg
    });
  }
};

exports.bulkImportClients = async (req, res) => {
  try {
    const { clients } = req.body;
    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid clients array' });
    }

    let created = 0, skipped = 0, failed = 0;
    const errors = [];

    for (const client of clients) {
      try {
        const email = (client.email || '').trim();
        const password = (client.password || '').trim();
        if (!email || !password) {
          failed++;
          errors.push('Skipped: Missing email or password');
          continue;
        }
        try {
          await createUserWithReferralCode(email, password, 'client');
          created++;
        } catch (err) {
          if (err.code === 'DUPLICATE_EMAIL') skipped++;
          else { failed++; errors.push(`${email}: ${err.message}`); }
        }
      } catch (err) {
        failed++;
        errors.push(`${client.email || 'unknown'}: ${err.message || 'Unknown error'}`);
      }
    }

    res.json({
      success: true,
      message: 'Bulk import completed',
      summary: { total: clients.length, created, skipped, failed },
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

// One-shot offline import: bcrypt rounds=4 for speed (offset by
// must_change_password=true forcing a fresh hash on first login).
exports.importClientsFromFile = async (req, res) => {
  try {
    const fileData = findCredentialsFile();
    if (!fileData) {
      return res.status(404).json({ success: false, message: 'Client credentials file not found' });
    }

    const { content: fileContent, filePath } = fileData;

    // Parse markdown table rows: | id | name | email | password |
    const clients = [];
    const lines = fileContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('---') && !line.includes('ID') && !line.includes('Initial Password')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 4) {
          const id = parts[0];
          const name = parts[1];
          const email = parts[2];
          const password = parts[3].replace(/`/g, '');
          if (id && email && password && email.includes('@')) {
            clients.push({ email, password, clientId: id, name });
          }
        }
      }
    }

    if (clients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid clients found in credentials file' });
    }

    let created = 0, skipped = 0, failed = 0;
    const errors = [];

    // Single SELECT for set-based dedup (no N+1 lookups)
    const existingUsers = await prisma.user.findMany({ select: { email: true } });
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    const newClients = [];
    for (const client of clients) {
      if (existingEmails.has(client.email.toLowerCase())) skipped++;
      else newClients.push(client);
    }

    const hashed = await Promise.all(newClients.map(async (client) => {
      try {
        const password_hash = await bcrypt.hash(client.password, 4);
        const referral_code = generateReferralCode();
        return {
          email: client.email.toLowerCase().trim(),
          password_hash,
          role: 'client',
          referral_code,
          status: 'active',
          must_change_password: true,
          name: client.name ? String(client.name).trim().substring(0, 200) : null
        };
      } catch (err) {
        failed++;
        errors.push(`${client.email}: ${err.message}`);
        return null;
      }
    }));

    const validRecords = hashed.filter(Boolean);
    if (validRecords.length > 0) {
      const result = await prisma.user.createMany({ data: validRecords, skipDuplicates: true });
      created = result.count;
      skipped += (validRecords.length - result.count);
    }

    res.json({
      success: true,
      message: `Import from ${path.basename(filePath)} completed`,
      summary: { total: clients.length, created, skipped, failed },
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('Import from file error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const page = parseIntSafe(req.query.page, 1, 1, 10000);
    const limit = parseIntSafe(req.query.limit, 1000, 1, 5000);
    const skip = (page - 1) * limit;

    let whereClause = { role: 'client' };
    
    // Sub-Admin Isolation: Only see clients tagged to their franchise
    if (req.user.role === 'sub_admin') {
      const referrals = await prisma.referral.findMany({ where: { referrer_user_id: req.user.id } });
      const referredEmails = referrals.map(r => r.referred_email);
      whereClause.email = { in: referredEmails.length > 0 ? referredEmails : ['__NO_MATCH__'] };
    }

    const clients = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, email: true, name: true, role: true, referral_code: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    const total = await prisma.user.count({ where: whereClause });

    res.json({
      success: true,
      clients: clients.map(c => ({ ...c, created_at: c.createdAt })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateClientStatus = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { status } = req.body;

    const idValidation = validateObjectId(userId, 'User ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    if (!['active', 'inactive', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be: active, inactive, or blocked' });
    }

    // Vuln 4: sub_admin must only mutate clients in their own franchise.
    const own = await assertClientOwned(req.user, idValidation.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    await prisma.user.update({ where: { id: idValidation.id }, data: { status } });
    res.json({ success: true, message: 'Client status updated successfully', status });
  } catch (error) {
    console.error('Update client status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin-issued temporary password. Refuses to act on admins (they must use
// forgot-password). Also invalidates any outstanding reset-token rows.
exports.adminResetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'User id required' });

    const idValidation = validateObjectId(id, 'User ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const user = await prisma.user.findUnique({ where: { id: idValidation.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Vuln 4: never reset admin OR sub_admin passwords via this endpoint —
    // they must use forgot-password (which validates the email out-of-band).
    // Original code only blocked role==='admin', letting a sub_admin reset
    // another sub_admin's password.
    if (user.role === 'admin' || user.role === 'sub_admin') {
      return res.status(403).json({ success: false, message: 'Cannot reset admin or sub_admin password via this endpoint' });
    }
    // Vuln 4: sub_admin can only reset passwords for users in their own
    // franchise. Currently the controller only handles clients (the role
    // filter below) — verify ownership for sub_admin callers.
    if (req.user.role === 'sub_admin') {
      if (user.role !== 'client') {
        return res.status(403).json({ success: false, message: 'Sub-admins can only reset client passwords' });
      }
      const own = await assertClientOwned(req.user, idValidation.id);
      if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });
    }

    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const digits  = '23456789';
    const symbols = '@$!%*?&';
    let pw = '';
    for (let i = 0; i < 4; i++) pw += letters[Math.floor(Math.random() * letters.length)];
    for (let i = 0; i < 4; i++) pw += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 0; i < 2; i++) pw += symbols[Math.floor(Math.random() * symbols.length)];
    pw = pw.split('').sort(() => Math.random() - 0.5).join('');
    if (!/[A-Z]/.test(pw)) pw = 'A' + pw.slice(1);
    if (!/[a-z]/.test(pw)) pw = pw.slice(0, -1) + 'a';

    const hashedPassword = await bcrypt.hash(pw, 10);
    await prisma.user.update({
      where: { id: idValidation.id },
      data: { password_hash: hashedPassword, must_change_password: true }
    });

    try {
      await prisma.passwordResetToken.updateMany({
        where: { user_id: idValidation.id, used: false },
        data: { used: true }
      });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Password reset. Share this temporary password with the user — they must change it on first login.',
      email: user.email,
      temporaryPassword: pw,
      must_change_password: true
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Hard-delete a client account. Full admin can delete anywhere; sub_admin
// only within their own franchise. Unassigns any orders that reference the
// client so the delete doesn't dangle FK-less refs (Catalyst has no cascade).
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const idValidation = validateObjectId(id, 'Client ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const own = await assertClientOwned(req.user, idValidation.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    // Detach child rows before deleting the user (no cascade on Catalyst).
    try { await prisma.serviceOrder.updateMany({ where: { user_id: idValidation.id }, data: { user_id: null } }); } catch (_) {}
    try { await prisma.referral.updateMany({ where: { referred_email: own.user.email }, data: { referred_email: '' } }); } catch (_) {}
    await prisma.user.delete({ where: { id: idValidation.id } });

    res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Privileged-account password reset. Distinct from adminResetUserPassword
// (which is for clients only and is callable by sub_admin within their
// franchise). This endpoint can reset admin OR sub_admin accounts and is
// FULL-ADMIN-ONLY (gated by requireFullAdmin in the router). Used to rotate
// weak/leaked privileged credentials without giving a sub_admin the power
// to do so against their peers.
exports.adminResetPrivilegedPassword = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'User id required' });

    const idValidation = validateObjectId(id, 'User ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const user = await prisma.user.findUnique({ where: { id: idValidation.id } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Only admin/sub_admin accounts via this endpoint. Clients use the
    // existing adminResetUserPassword path which carries franchise scoping.
    if (user.role !== 'admin' && user.role !== 'sub_admin') {
      return res.status(400).json({
        success: false,
        message: 'Use POST /admin/users/:id/reset-password for client accounts.'
      });
    }

    // CSPRNG-backed password gen — 16 chars from A-Za-z2-9!@$%*?&. The old
    // adminResetUserPassword uses Math.random which is OK for clients (they
    // change on first login) but not appropriate for admin/sub_admin
    // accounts where the operator may distribute the temp value out-of-band.
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@$%*?&';
    const buf = crypto.randomBytes(16);
    let pw = '';
    for (let i = 0; i < 16; i++) pw += alphabet[buf[i] % alphabet.length];
    // Ensure character-class minimums (one upper, one lower, one digit, one symbol).
    if (!/[A-Z]/.test(pw)) pw = 'A' + pw.slice(1);
    if (!/[a-z]/.test(pw)) pw = pw.slice(0, -1) + 'a';
    if (!/[0-9]/.test(pw)) pw = pw.slice(0, 14) + '2' + pw.slice(-1);
    if (!/[!@$%*?&]/.test(pw)) pw = pw.slice(0, 15) + '@';

    const hashedPassword = await bcrypt.hash(pw, 10);
    await prisma.user.update({
      where: { id: idValidation.id },
      data: { password_hash: hashedPassword, must_change_password: true }
    });

    try {
      await prisma.passwordResetToken.updateMany({
        where: { user_id: idValidation.id, used: false },
        data: { used: true }
      });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Password reset. Share this temporary password with the user — they must change it on first login.',
      email: user.email,
      role: user.role,
      temporaryPassword: pw,
      must_change_password: true
    });
  } catch (error) {
    console.error('Admin privileged password reset error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Helpers exported for tests / future composition.
exports._internals = { generateReferralCode, createUserWithReferralCode, findCredentialsFile };
