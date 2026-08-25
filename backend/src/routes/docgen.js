const express = require('express');
const router = express.Router();
const docGenController = require('../controllers/documentGeneratorController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/doc-templates', docGenController.getDocTemplates);
router.post('/doc-templates', docGenController.createDocTemplate);
router.put('/doc-templates/:id', docGenController.updateDocTemplate);
router.delete('/doc-templates/:id', docGenController.deleteDocTemplate);
router.post('/doc-templates/:id/generate', docGenController.generateDocument);
router.get('/generated-documents', docGenController.getGeneratedDocuments);

module.exports = router;
