const db = require('../models/prismaClient');
const { sanitizeText, validateObjectId, parseIntSafe } = require('../utils/validation');
const { assertClientOwned, assertFilingOwned, isFullAdmin, isSubAdmin, getFranchiseClientEmails } = require('../utils/franchiseScope');

const VALID_SERVICE_TYPES = ['GST', 'INCOME_TAX', 'MCA', 'PT', 'PF', 'ESI'];
const VALID_FILING_STATUS = ['pending', 'completed', 'nil_filed'];
const VALID_PAYMENT_STATUS = ['pending', 'completed'];
const VALID_COMPANY_CATEGORIES = ['Private Limited', 'LLP', 'Individual', 'Partnership', 'OPC', 'Trust', 'Society', 'HUF', 'Other'];

// PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

// ─── Company Profile ──────────────────────────────────────────────────────────

exports.getCompanyProfile = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const profile = await db.companyProfile.findFirst({
      where: { user_id: idVal.id },
    });

    res.json({ success: true, profile: profile || {} });
  } catch (error) {
    console.error('Get company profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.upsertCompanyProfile = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const { company_name, pan_number, company_category, group_code, franchise_code } = req.body;

    // Validate company_name
    if (company_name !== undefined && company_name !== null) {
      const sanitized = sanitizeText(company_name, 200);
      if (sanitized === null) {
        return res.status(400).json({ success: false, message: 'Company name is required' });
      }
    }

    // Validate PAN number format
    if (pan_number !== undefined && pan_number !== null && pan_number !== '') {
      const upperPan = String(pan_number).toUpperCase().trim();
      if (!PAN_REGEX.test(upperPan)) {
        return res.status(400).json({ success: false, message: 'Invalid PAN number format. Expected format: ABCDE1234F' });
      }
    }

    // Validate company_category
    if (company_category !== undefined && company_category !== null && company_category !== '') {
      if (!VALID_COMPANY_CATEGORIES.includes(company_category)) {
        return res.status(400).json({ success: false, message: `Invalid company category. Must be one of: ${VALID_COMPANY_CATEGORIES.join(', ')}` });
      }
    }

    const data = {};
    if (company_name !== undefined) data.company_name = sanitizeText(company_name, 200);
    if (pan_number !== undefined) data.pan_number = pan_number ? String(pan_number).toUpperCase().trim() : '';
    if (company_category !== undefined) data.company_category = company_category || '';
    if (group_code !== undefined) data.group_code = sanitizeText(group_code, 50);
    if (franchise_code !== undefined) data.franchise_code = sanitizeText(franchise_code, 50);

    // Check if profile exists
    const existing = await db.companyProfile.findFirst({
      where: { user_id: idVal.id },
    });

    let profile;
    if (existing) {
      profile = await db.companyProfile.update({
        where: { id: existing.id },
        data,
      });
    } else {
      data.user_id = idVal.id;
      profile = await db.companyProfile.create({ data });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Upsert company profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Compliance Config ────────────────────────────────────────────────────────

exports.getComplianceConfig = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const configs = await db.complianceConfig.findMany({
      where: { user_id: idVal.id },
    });

    res.json({ success: true, configs });
  } catch (error) {
    console.error('Get compliance config error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateComplianceConfig = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const { configs } = req.body;
    if (!Array.isArray(configs)) {
      return res.status(400).json({ success: false, message: 'configs must be an array' });
    }

    // Validate all service_types first
    for (const cfg of configs) {
      if (!cfg.service_type || !VALID_SERVICE_TYPES.includes(cfg.service_type)) {
        return res.status(400).json({ success: false, message: `Invalid service_type: ${cfg.service_type}. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}` });
      }
    }

    const results = [];
    for (const cfg of configs) {
      const data = {
        is_applicable: cfg.is_applicable === true,
        is_registered: cfg.is_registered === true,
        registration_number: cfg.registration_number ? sanitizeText(cfg.registration_number, 100) : '',
      };
      if (cfg.registration_date) {
        data.registration_date = new Date(cfg.registration_date);
      }

      // Find existing by user_id + service_type
      const existing = await db.complianceConfig.findFirst({
        where: { user_id: idVal.id, service_type: cfg.service_type },
      });

      let result;
      if (existing) {
        result = await db.complianceConfig.update({
          where: { id: existing.id },
          data,
        });
      } else {
        data.user_id = idVal.id;
        data.service_type = cfg.service_type;
        result = await db.complianceConfig.create({ data });
      }
      results.push(result);
    }

    res.json({ success: true, configs: results });
  } catch (error) {
    console.error('Update compliance config error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Compliance Filings ───────────────────────────────────────────────────────

exports.getComplianceFilings = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const where = { user_id: idVal.id };
    if (req.query.year) where.financial_year = req.query.year;
    if (req.query.service_type) {
      if (!VALID_SERVICE_TYPES.includes(req.query.service_type)) {
        return res.status(400).json({ success: false, message: 'Invalid service_type filter' });
      }
      where.service_type = req.query.service_type;
    }

    const filings = await db.complianceFiling.findMany({
      where,
      orderBy: { due_date: 'asc' },
    });

    res.json({ success: true, filings });
  } catch (error) {
    console.error('Get compliance filings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addComplianceFiling = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Client ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertClientOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const { service_type, financial_year, period, due_date, filing_status, filing_date, payment_status, payment_date, notes } = req.body;

    // Validate required fields
    if (!service_type || !VALID_SERVICE_TYPES.includes(service_type)) {
      return res.status(400).json({ success: false, message: `Invalid service_type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}` });
    }
    if (filing_status && !VALID_FILING_STATUS.includes(filing_status)) {
      return res.status(400).json({ success: false, message: `Invalid filing_status. Must be one of: ${VALID_FILING_STATUS.join(', ')}` });
    }
    if (payment_status && !VALID_PAYMENT_STATUS.includes(payment_status)) {
      return res.status(400).json({ success: false, message: `Invalid payment_status. Must be one of: ${VALID_PAYMENT_STATUS.join(', ')}` });
    }

    const data = {
      user_id: idVal.id,
      service_type,
      financial_year: financial_year ? sanitizeText(financial_year, 20) : '',
      period: period ? sanitizeText(period, 50) : '',
      filing_status: filing_status || 'pending',
      payment_status: payment_status || 'pending',
      notes: notes ? sanitizeText(notes, 1000) : '',
    };

    if (due_date) data.due_date = new Date(due_date);
    if (filing_date) data.filing_date = new Date(filing_date);
    if (payment_date) data.payment_date = new Date(payment_date);

    const filing = await db.complianceFiling.create({ data });

    res.status(201).json({ success: true, filing });
  } catch (error) {
    console.error('Add compliance filing error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateComplianceFiling = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.filingId, 'Filing ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertFilingOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    const { service_type, financial_year, period, due_date, filing_status, filing_date, payment_status, payment_date, notes } = req.body;

    if (service_type && !VALID_SERVICE_TYPES.includes(service_type)) {
      return res.status(400).json({ success: false, message: `Invalid service_type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}` });
    }
    if (filing_status && !VALID_FILING_STATUS.includes(filing_status)) {
      return res.status(400).json({ success: false, message: `Invalid filing_status. Must be one of: ${VALID_FILING_STATUS.join(', ')}` });
    }
    if (payment_status && !VALID_PAYMENT_STATUS.includes(payment_status)) {
      return res.status(400).json({ success: false, message: `Invalid payment_status. Must be one of: ${VALID_PAYMENT_STATUS.join(', ')}` });
    }

    const data = {};
    if (service_type !== undefined) data.service_type = service_type;
    if (financial_year !== undefined) data.financial_year = sanitizeText(financial_year, 20);
    if (period !== undefined) data.period = sanitizeText(period, 50);
    if (filing_status !== undefined) data.filing_status = filing_status;
    if (payment_status !== undefined) data.payment_status = payment_status;
    if (notes !== undefined) data.notes = sanitizeText(notes, 1000);
    if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
    if (filing_date !== undefined) data.filing_date = filing_date ? new Date(filing_date) : null;
    if (payment_date !== undefined) data.payment_date = payment_date ? new Date(payment_date) : null;

    const filing = await db.complianceFiling.update({
      where: { id: idVal.id },
      data,
    });

    res.json({ success: true, filing });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Filing not found' });
    }
    console.error('Update compliance filing error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteComplianceFiling = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.filingId, 'Filing ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const own = await assertFilingOwned(req.user, idVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    await db.complianceFiling.delete({
      where: { id: idVal.id },
    });

    res.json({ success: true, message: 'Filing deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Filing not found' });
    }
    console.error('Delete compliance filing error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Client Self-Service ──────────────────────────────────────────────────────

exports.getClientCompliance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch company profile
    const companyProfile = await db.companyProfile.findFirst({
      where: { user_id: userId },
    });

    // Fetch only applicable compliance configs
    const allConfigs = await db.complianceConfig.findMany({
      where: { user_id: userId },
    });
    const complianceConfigs = allConfigs.filter(c => c.is_applicable === true);

    // Fetch filings with optional year filter
    const filingWhere = { user_id: userId };
    if (req.query.year) filingWhere.financial_year = req.query.year;

    const filings = await db.complianceFiling.findMany({
      where: filingWhere,
      orderBy: { due_date: 'asc' },
    });

    res.json({
      success: true,
      companyProfile: companyProfile || {},
      complianceConfigs,
      filings,
    });
  } catch (error) {
    console.error('Get client compliance error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Admin Compliance Overview ────────────────────────────────────────────────

exports.getComplianceOverview = async (req, res) => {
  try {
    // Resolve the user-id allowlist for the caller. Full admin = no filter.
    // Sub_admin = only clients whose email is in their franchise's referral
    // list. Without this, sub_admin previously saw cross-franchise totals.
    let userIdAllowlist = null;
    if (isSubAdmin(req.user)) {
      const emails = await getFranchiseClientEmails(req.user);
      if (emails.size === 0) {
        return res.json({
          success: true,
          overview: { totalClients: 0, totalFilings: 0, overdueCount: 0, countByServiceType: {} }
        });
      }
      const franchiseClients = await db.user.findMany({ where: { role: 'client' } });
      userIdAllowlist = new Set(
        franchiseClients
          .filter(u => emails.has((u.email || '').toLowerCase()))
          .map(u => String(u.id))
      );
    }

    const allConfigs = await db.complianceConfig.findMany({});
    const allFilings = await db.complianceFiling.findMany({});

    const scopedConfigs = userIdAllowlist
      ? allConfigs.filter(c => userIdAllowlist.has(String(c.user_id)))
      : allConfigs;
    const scopedFilings = userIdAllowlist
      ? allFilings.filter(f => userIdAllowlist.has(String(f.user_id)))
      : allFilings;

    const uniqueUserIds = new Set(scopedConfigs.map(c => c.user_id));
    const totalClients = uniqueUserIds.size;
    const now = new Date();
    const overdueFilings = scopedFilings.filter(f =>
      f.filing_status === 'pending' && f.due_date && new Date(f.due_date) < now
    );
    const countByServiceType = {};
    for (const st of VALID_SERVICE_TYPES) {
      countByServiceType[st] = scopedFilings.filter(f => f.service_type === st).length;
    }

    res.json({
      success: true,
      overview: {
        totalClients,
        totalFilings: scopedFilings.length,
        overdueCount: overdueFilings.length,
        countByServiceType,
      },
    });
  } catch (error) {
    console.error('Get compliance overview error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
