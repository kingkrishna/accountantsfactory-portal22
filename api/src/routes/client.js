const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const notificationController = require('../controllers/notificationController');
const { authenticateToken, requireClient } = require('../middleware/auth');

// All client routes require authentication and client role
router.use(authenticateToken);
router.use(requireClient);

router.get('/dashboard', clientController.getDashboard);
router.get('/services', clientController.getServices);
router.get('/all-services', clientController.getAvailableServices);
router.get('/documents', clientController.getDocuments);
router.get('/referrals', clientController.getReferrals);
router.post('/request-service', clientController.requestService);
router.get('/service/:serviceOrderId/comments', clientController.getServiceComments);
router.post('/service/comment', clientController.addComment);
router.get('/document/:documentId/download', clientController.downloadDocument);

// Notifications
router.get('/notifications', notificationController.getNotifications);

module.exports = router;
