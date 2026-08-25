const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');
const { authenticateToken, requireClient } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireClient);

router.get('/compliance', complianceController.getClientCompliance);

module.exports = router;
