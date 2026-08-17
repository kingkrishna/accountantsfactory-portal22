// Admin referrals. Carved out of adminController.js for size; same routes,
// same response shapes. See docs/NEXT-STEPS-YOUR-STYLE.md.

const prisma = require('../models/prismaClient');
const { sanitizeText, validateDecimal, validateObjectId } = require('../utils/validation');
const { assertReferralOwned } = require('../utils/franchiseScope');

exports.getAllReferrals = async (req, res) => {
  try {
    let whereClause = {};
    if (req.user.role === 'sub_admin') {
      whereClause.referrer_user_id = req.user.id;
    }

    const referrals = await prisma.referral.findMany({
      where: whereClause,
      include: { referrer: { select: { email: true } }, service: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const formattedReferrals = referrals.map(ref => ({
      id: ref.id,
      referrer_user_id: ref.referrer_user_id,
      referrer_email: ref.referrer?.email,
      referred_name: ref.referred_name,
      referred_email: ref.referred_email,
      service_id: ref.service_id,
      service_name: ref.service?.name,
      bonus_amount: ref.bonus_amount,
      status: ref.status,
      reason: ref.reason,
      created_at: ref.createdAt
    }));

    res.json({ success: true, referrals: formattedReferrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.approveReferral = async (req, res) => {
  try {
    const { referralId, approved, reason, bonusAmount } = req.body;

    const idValidation = validateObjectId(referralId, 'Referral ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    if (typeof approved !== 'boolean') return res.status(400).json({ success: false, message: 'Approved must be a boolean value' });

    let sanitizedReason = null;
    if (reason) {
      try { sanitizedReason = sanitizeText(reason, 1000); } catch (e) { return res.status(400).json({ success: false, message: e.message || 'Invalid reason format' }); }
    }

    // Empty/whitespace bonus is treated as 0 (May-2026 referral-approval fix)
    let validatedBonusAmount = 0;
    if (approved && bonusAmount !== undefined && bonusAmount !== null && String(bonusAmount).trim() !== '') {
      const amountValidation = validateDecimal(bonusAmount, 0, 999999.99, 2);
      if (!amountValidation.valid) return res.status(400).json({ success: false, message: amountValidation.error });
      validatedBonusAmount = amountValidation.value;
    }

    // Vuln 6: sub_admin must only approve/reject referrals where they are
    // the referrer. assertReferralOwned passes through for full admin.
    const own = await assertReferralOwned(req.user, idValidation.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });
    const referral = own.referral;

    // Circular-payout guard: referrer needs another approved referral, or
    // must themselves have been referred-and-approved.
    if (approved) {
      const referrerReferralsCount = await prisma.referral.count({
        where: { referrer_user_id: referral.referrer_user_id, status: 'approved', id: { not: referral.id } }
      });

      if (referrerReferralsCount === 0) {
        const referrerUser = await prisma.user.findUnique({ where: { id: referral.referrer_user_id } });
        if (referrerUser) {
          const wasReferred = await prisma.referral.findFirst({ where: { referred_email: referrerUser.email, status: 'approved' } });
          if (!wasReferred) {
            return res.status(400).json({
              success: false,
              message: 'Circular payout requirement: Referrer must have at least one approved referral or must have been referred themselves'
            });
          }
        }
      }
    }

    await prisma.referral.update({
      where: { id: idValidation.id },
      data: { status: approved ? 'approved' : 'rejected', reason: sanitizedReason, bonus_amount: validatedBonusAmount }
    });

    res.json({ success: true, message: `Referral ${approved ? 'approved' : 'rejected'} successfully` });
  } catch (error) {
    console.error('Approve referral error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
