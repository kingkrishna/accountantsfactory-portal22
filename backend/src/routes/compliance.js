const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

// Company Profile
router.get('/clients/:id/company-profile', complianceController.getCompanyProfile);
router.put('/clients/:id/company-profile', complianceController.upsertCompanyProfile);

// Compliance Config
router.get('/clients/:id/compliance-config', complianceController.getComplianceConfig);
router.put('/clients/:id/compliance-config', complianceController.updateComplianceConfig);

// Compliance Filings
router.get('/clients/:id/compliance-filings', complianceController.getComplianceFilings);
router.post('/clients/:id/compliance-filings', complianceController.addComplianceFiling);
router.put('/compliance-filings/:filingId', complianceController.updateComplianceFiling);
router.delete('/compliance-filings/:filingId', complianceController.deleteComplianceFiling);

// Overview
router.get('/compliance-overview', complianceController.getComplianceOverview);

module.exports = router;
