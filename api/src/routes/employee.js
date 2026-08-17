const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const notificationController = require('../controllers/notificationController');
const commentController = require('../controllers/commentController');
const { authenticateToken, requireEmployee } = require('../middleware/auth');

router.use(authenticateToken, requireEmployee);

router.get('/dashboard', employeeController.getDashboard);
router.post('/order/:orderId/eod-update', employeeController.submitEODUpdate);
router.get('/order/:orderId/eod-updates', employeeController.getEODUpdates);

// Notifications
router.get('/notifications', notificationController.getNotifications);

// Comments on assigned orders
router.get('/orders/:orderId/comments', commentController.list);
router.post('/orders/:orderId/comments', commentController.add);

module.exports = router;
