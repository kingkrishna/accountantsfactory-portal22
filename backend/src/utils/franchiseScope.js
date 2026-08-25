// Franchise-ownership checks for sub_admin authorization.
//
// Sub_admin is a tenant-bounded admin role: they share /api/admin/* routes
// with full admins, but can only act on users tagged to their own franchise.
// A client is "in" a sub_admin's franchise iff there exists a Referral row
// with referrer_user_id = <sub_admin id> AND referred_email = <client email>.
// An employee or another sub_admin is "in" iff that user's referral_code
// matches the sub_admin's franchise code.
//
// Every controller behind requireAdmin that takes a target ID MUST invoke
// the right helper for that target's kind. If the caller is a full admin,
// these helpers no-op.

const prisma = require('../models/prismaClient');

// True iff caller is full admin (no franchise scoping needed).
function isFullAdmin(reqUser) {
  return !!(reqUser && reqUser.role === 'admin');
}

// True iff caller is a sub_admin with a franchise tag.
function isSubAdmin(reqUser) {
  return !!(reqUser && reqUser.role === 'sub_admin');
}

// Resolve the set of client emails that belong to this sub_admin's franchise.
// Cached on the request object so multiple checks in the same handler share
// a single DB read.
async function getFranchiseClientEmails(reqUser) {
  if (!isSubAdmin(reqUser)) return new Set();
  if (reqUser._franchiseEmailCache) return reqUser._franchiseEmailCache;

  const referrals = await prisma.referral.findMany({
    where: { referrer_user_id: reqUser.id }
  });
  const emails = new Set(referrals.map(r => (r.referred_email || '').toLowerCase()).filter(Boolean));
  reqUser._franchiseEmailCache = emails;
  return emails;
}

// Returns { ok: true, user } or { ok: false, status, message }. Verifies
// that `targetUserId` references a client owned by the calling sub_admin.
// Full admin always passes.
async function assertClientOwned(reqUser, targetUserId) {
  const user = await prisma.user.findFirst({ where: { id: targetUserId, role: 'client' } });
  if (!user) return { ok: false, status: 404, message: 'Client not found' };
  if (isFullAdmin(reqUser)) return { ok: true, user };
  if (!isSubAdmin(reqUser)) return { ok: false, status: 403, message: 'Access denied' };

  const emails = await getFranchiseClientEmails(reqUser);
  if (!emails.has((user.email || '').toLowerCase())) {
    return { ok: false, status: 403, message: 'Access denied (out of franchise)' };
  }
  return { ok: true, user };
}

// Verifies that `targetUserId` is an employee (or sub_admin) tagged to the
// calling sub_admin's franchise via referral_code. Full admin always passes.
async function assertEmployeeOwned(reqUser, targetUserId) {
  const user = await prisma.user.findFirst({
    where: { id: targetUserId, role: { in: ['employee', 'sub_admin'] } }
  });
  if (!user) return { ok: false, status: 404, message: 'Employee not found' };
  if (isFullAdmin(reqUser)) return { ok: true, user };
  if (!isSubAdmin(reqUser)) return { ok: false, status: 403, message: 'Access denied' };
  if (!reqUser.franchise_code) return { ok: false, status: 403, message: 'Access denied (no franchise)' };

  if ((user.referral_code || '').toUpperCase() !== reqUser.franchise_code.toUpperCase()) {
    return { ok: false, status: 403, message: 'Access denied (out of franchise)' };
  }
  return { ok: true, user };
}

// Verifies that a compliance filing belongs to the caller's franchise by
// resolving the filing -> user_id -> client and then delegating to
// assertClientOwned. Full admin always passes.
async function assertFilingOwned(reqUser, filingId) {
  const filing = await prisma.complianceFiling.findFirst({ where: { id: filingId } });
  if (!filing) return { ok: false, status: 404, message: 'Filing not found' };
  if (isFullAdmin(reqUser)) return { ok: true, filing };
  const check = await assertClientOwned(reqUser, filing.user_id);
  if (!check.ok) return check;
  return { ok: true, filing, user: check.user };
}

// Verifies that a referral belongs to this sub_admin (i.e. they are the
// referrer). Full admin always passes.
async function assertReferralOwned(reqUser, referralId) {
  const referral = await prisma.referral.findUnique({ where: { id: referralId } });
  if (!referral) return { ok: false, status: 404, message: 'Referral not found' };
  if (isFullAdmin(reqUser)) return { ok: true, referral };
  if (!isSubAdmin(reqUser)) return { ok: false, status: 403, message: 'Access denied' };
  if (String(referral.referrer_user_id) !== String(reqUser.id)) {
    return { ok: false, status: 403, message: 'Access denied (out of franchise)' };
  }
  return { ok: true, referral };
}

module.exports = {
  isFullAdmin,
  isSubAdmin,
  getFranchiseClientEmails,
  assertClientOwned,
  assertEmployeeOwned,
  assertFilingOwned,
  assertReferralOwned
};
