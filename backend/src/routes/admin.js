const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const notificationController = require('../controllers/notificationController');
const commentController = require('../controllers/commentController');
const referralAdminController = require('../controllers/referralAdminController');
const documentAdminController = require('../controllers/documentAdminController');
const employeeAdminController = require('../controllers/employeeAdminController');
const serviceAdminController = require('../controllers/serviceAdminController');
const clientAdminController = require('../controllers/clientAdminController');
const orderAdminController = require('../controllers/orderAdminController');
const publicController = require('../controllers/publicController');
const { authenticateToken, requireAdmin, requireFullAdmin } = require('../middleware/auth');
const prisma = require('../models/prismaClient');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Audit middleware — record every admin write operation (POST/PUT/PATCH/DELETE)
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].indexOf(req.method) === -1) return next();
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  const action = req.method + ' ' + req.path;
  const adminEmail = req.user && req.user.email ? req.user.email : 'unknown';
  // Fire-and-forget: never block the actual operation on audit failure
  setImmediate(() => {
    try {
      prisma.auditLog.create({
        data: {
          actor_email: adminEmail,
          action: action.slice(0, 200),
          ip: ip.slice(0, 60),
          user_agent: ua,
          path: req.path.slice(0, 200),
          method: req.method
        }
      }).catch(() => {});
    } catch (_) {}
  });
  next();
});

// Client Management
// Full-admin-only: system-wide bulk operations + email test
router.get('/test-email', requireFullAdmin, adminController.testEmail);
router.post('/bulk-import-clients', requireFullAdmin, clientAdminController.bulkImportClients);
router.post('/import-from-file', requireFullAdmin, clientAdminController.importClientsFromFile);

// Shared (sub_admin sees own-franchise only, full admin sees all):
router.post('/create-client', clientAdminController.createClient);
router.get('/clients', clientAdminController.getAllClients);
router.patch('/clients/:id/status', clientAdminController.updateClientStatus);
router.delete('/clients/:id', clientAdminController.deleteClient);
router.post('/users/:id/reset-password', clientAdminController.adminResetUserPassword);
// Full-admin-only: rotate weak/leaked admin or sub_admin passwords. Returns
// a CSPRNG-generated temporary password + sets must_change_password=true.
router.post('/privileged-users/:id/reset-password', requireFullAdmin, clientAdminController.adminResetPrivilegedPassword);

// Feature E: Franchise applications queue (full admin only). List + approve.
router.get('/franchise-applications', requireFullAdmin, publicController.listFranchiseApplications);
router.post('/franchise-applications/:id/approve', requireFullAdmin, publicController.approveFranchiseApplication);

// Service Catalog Management — services are global. Reading: anyone admin.
// Writing/toggling: full admin only (sub_admin can't edit the global catalog).
router.get('/services', serviceAdminController.getAllServices);
router.post('/services', requireFullAdmin, serviceAdminController.createService);
router.post('/services/bulk-create', requireFullAdmin, serviceAdminController.bulkCreateServices);
router.patch('/services/:id/toggle', requireFullAdmin, serviceAdminController.toggleService);

// Service Orders
// Full-admin-only system-wide ops
router.post('/auto-assign-all', requireFullAdmin, orderAdminController.autoAssignAllClients);

// Shared (controllers franchise-scope per-row)
router.post('/assign-service', orderAdminController.assignService);
router.put('/update-status', orderAdminController.updateStatus);
router.get('/orders', orderAdminController.getAllOrders);
router.delete('/orders/:orderId', orderAdminController.deleteServiceOrder);

// Document Links (Admin pastes Zoho URL for client to download)
router.get('/orders/:orderId/documents', documentAdminController.getOrderDocuments);
router.post('/documents/add-link', documentAdminController.addDocumentLink);
router.delete('/documents/:documentId', documentAdminController.deleteDocumentLink);

// Referrals
router.get('/referrals', referralAdminController.getAllReferrals);
router.post('/approve-referral', referralAdminController.approveReferral);

// Employee Management (full CRUD)
router.post('/employee', employeeAdminController.createEmployee);
router.get('/employees', employeeAdminController.getAllEmployees);
router.patch('/employees/:id/toggle', employeeAdminController.toggleEmployeeStatus);
router.delete('/employees/:id', employeeAdminController.deleteEmployee);
router.put('/orders/:orderId/assign-employee', orderAdminController.assignOrderToEmployee);
router.get('/orders/:orderId/work-updates', orderAdminController.getOrderWorkUpdates);
router.get('/employee-updates', employeeAdminController.getAllEmployeeUpdates);

// Notifications
router.get('/notifications', notificationController.getNotifications);

// Comments on service orders
router.get('/orders/:orderId/comments', commentController.list);
router.post('/orders/:orderId/comments', commentController.add);

module.exports = router;
