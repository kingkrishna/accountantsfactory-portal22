// Admin service-order management. All writes go through prisma.serviceOrder.*
// so wrapServiceOrderModel handles the SID period encoding (db.js /
// docs/DEEP-DIVE-db-js.md). Do not bypass.

const prisma = require('../models/prismaClient');
const emailService = require('../services/emailService');
const { parseIntSafe, sanitizeText, validateObjectId } = require('../utils/validation');

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

exports.assignService = async (req, res) => {
  try {
    const { userId, serviceId, period } = req.body;

    const userIdValidation = validateObjectId(userId, 'User ID');
    if (!userIdValidation.valid) return res.status(400).json({ success: false, message: userIdValidation.error });

    const serviceIdValidation = validateObjectId(serviceId, 'Service ID');
    if (!serviceIdValidation.valid) return res.status(400).json({ success: false, message: serviceIdValidation.error });

    let sanitizedPeriod = null;
    if (period) {
      try { sanitizedPeriod = sanitizeText(period, 500); } catch (e) { return res.status(400).json({ success: false, message: e.message || 'Invalid period format' }); }
    }

    const user = await prisma.user.findFirst({ where: { id: userIdValidation.id, role: 'client' } });
    if (!user) return res.status(404).json({ success: false, message: 'Client not found' });

    const service = await prisma.service.findFirst({ where: { id: serviceIdValidation.id, is_active: true } });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found or inactive' });

    const order = await prisma.serviceOrder.create({
      data: {
        user_id: userIdValidation.id,
        service_id: serviceIdValidation.id,
        period: sanitizedPeriod,
        status: 'pending'
      }
    });

    res.json({ success: true, message: 'Service assigned successfully', orderId: order.id });
  } catch (error) {
    console.error('Assign service error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { serviceOrderId, status } = req.body;

    const idValidation = validateObjectId(serviceOrderId, 'Service Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be: ' + VALID_STATUSES.join(', ') });
    }

    const order = await prisma.serviceOrder.findUnique({ where: { id: idValidation.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

    await prisma.serviceOrder.update({ where: { id: idValidation.id }, data: { status } });
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const page = parseIntSafe(req.query.page, 1, 1, 10000);
    const limit = parseIntSafe(req.query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;
    let whereClause = {};

    // Sub-Admin Isolation: Only see orders for clients tagged to their franchise
    if (req.user.role === 'sub_admin') {
      const referrals = await prisma.referral.findMany({ where: { referrer_user_id: req.user.id } });
      const referredEmails = referrals.map(r => r.referred_email);
      const clients = await prisma.user.findMany({ where: { email: { in: referredEmails.length > 0 ? referredEmails : ['__NO_MATCH__'] } } });
      const clientIds = clients.map(c => c.id);
      whereClause.user_id = { in: clientIds.length > 0 ? clientIds : ['__NO_MATCH__'] };
    }

    const orders = await prisma.serviceOrder.findMany({
      where: whereClause,
      include: { user: { select: { email: true } }, service: { select: { name: true } }, employee: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    const total = await prisma.serviceOrder.count({ where: whereClause });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      user_id: order.user_id,
      service_id: order.service_id,
      employee_id: order.employee_id || null,
      period: order.period,
      status: order.status,
      created_at: order.createdAt,
      client_email: order.user?.email,
      service_name: order.service?.name,
      employee_email: order.employee?.email || null
    }));

    res.json({ success: true, orders: formattedOrders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Best-effort cascade: child-row delete errors must NOT block order delete.
exports.deleteServiceOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const idVal = validateObjectId(orderId, 'Order ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const order = await prisma.serviceOrder.findUnique({ where: { id: idVal.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    try { await prisma.document.deleteMany({ where: { service_order_id: idVal.id } }); } catch (_) {}
    try { await prisma.serviceComment.deleteMany({ where: { service_order_id: idVal.id } }); } catch (_) {}
    try { await prisma.workUpdate.deleteMany({ where: { service_order_id: idVal.id } }); } catch (_) {}

    await prisma.serviceOrder.delete({ where: { id: idVal.id } });
    res.json({ success: true, message: 'Service order deleted successfully' });
  } catch (error) {
    console.error('Delete service order error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.assignOrderToEmployee = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { employeeId } = req.body;

    const orderIdVal = validateObjectId(orderId, 'Order ID');
    if (!orderIdVal.valid) return res.status(400).json({ success: false, message: orderIdVal.error });

    let employeeIdVal = null;
    let employee = null;
    if (employeeId) {
      employeeIdVal = validateObjectId(employeeId, 'Employee ID');
      if (!employeeIdVal.valid) return res.status(400).json({ success: false, message: employeeIdVal.error });

      employee = await prisma.user.findFirst({ where: { id: employeeIdVal.id, role: 'employee', status: 'active' } });
      if (!employee) return res.status(404).json({ success: false, message: 'Active employee not found' });
    }

    const order = await prisma.serviceOrder.findUnique({ where: { id: orderIdVal.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await prisma.serviceOrder.update({
      where: { id: orderIdVal.id },
      data: { employee_id: employeeIdVal ? employeeIdVal.id : null }
    });

    // Fire-and-forget email so a slow SMTP server never blocks the response.
    if (employee && employee.email) {
      (async () => {
        try {
          const [service, client] = await Promise.all([
            order.service_id ? prisma.service.findUnique({ where: { id: order.service_id } }) : null,
            order.user_id ? prisma.user.findUnique({ where: { id: order.user_id } }) : null
          ]);
          await emailService.sendTaskAssignedEmail(employee.email, {
            clientName: client && client.name,
            clientEmail: client && client.email,
            serviceName: (service && service.name) || 'Service Order',
            period: order.period,
            orderId: order.id,
            notes: order.description
          });
        } catch (e) {
          console.error('Task-assigned email failed (non-blocking):', e.message);
        }
      })();
    }

    res.json({
      success: true,
      message: employeeId
        ? (employee && employee.email ? 'Assigned successfully. Email notification sent to ' + employee.email : 'Assigned successfully')
        : 'Unassigned successfully'
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getOrderWorkUpdates = async (req, res) => {
  try {
    const { orderId } = req.params;
    const idValidation = validateObjectId(orderId, 'Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const order = await prisma.serviceOrder.findUnique({
      where: { id: idValidation.id },
      include: {
        user: { select: { email: true } },
        service: { select: { name: true } },
        employee: { select: { email: true } }
      }
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const updates = await prisma.workUpdate.findMany({
      where: { service_order_id: idValidation.id },
      include: { employee: { select: { email: true } } },
      orderBy: { date: 'desc' }
    });

    res.json({
      success: true,
      order: {
        id: order.id,
        client_email: order.user?.email,
        service_name: order.service?.name,
        employee_email: order.employee?.email,
        status: order.status,
        period: order.period
      },
      updates: updates.map(u => ({
        id: u.id,
        employee_email: u.employee?.email,
        status: u.status,
        comments: u.comments,
        date: u.date
      }))
    });
  } catch (error) {
    console.error('Get order work updates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// One-shot: for every client WITHOUT a ServiceOrder, create one ServiceOrder
// (default service + round-robin across active employees). Idempotent —
// re-running it skips any client that already has at least one order.
//
// Caller can override the default service via { serviceId }, otherwise the
// first active service by id-asc is used.
exports.autoAssignAllClients = async (req, res) => {
  try {
    const { serviceId, dryRun, limit, offset } = req.body || {};
    // AppSail kills requests > ~30s. Default batch = 100; caller pages.
    const batchSize = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
    const batchOffset = Math.max(parseInt(offset) || 0, 0);

    // 1. Resolve default service
    let defaultService = null;
    if (serviceId) {
      const v = validateObjectId(serviceId, 'Service ID');
      if (!v.valid) return res.status(400).json({ success: false, message: v.error });
      defaultService = await prisma.service.findFirst({ where: { id: v.id, is_active: true } });
    } else {
      const services = await prisma.service.findMany({ where: { is_active: true } });
      defaultService = services.sort((a, b) => String(a.id).localeCompare(String(b.id)))[0] || null;
    }
    if (!defaultService) return res.status(400).json({ success: false, message: 'No active service available' });

    // 2. Active employees (round-robin pool)
    const employees = await prisma.user.findMany({ where: { role: 'employee', status: 'active' } });
    if (employees.length === 0) return res.status(400).json({ success: false, message: 'No active employees available' });

    // 3. Clients that don't yet have any ServiceOrder
    const clients = await prisma.user.findMany({ where: { role: 'client' } });
    const allOrders = await prisma.serviceOrder.findMany({ select: { id: true, user_id: true, employee_id: true } });
    const clientsWithOrders = new Set(allOrders.map(o => String(o.user_id)));
    const needAssignment = clients.filter(c => !clientsWithOrders.has(String(c.id)));

    // Also: existing orders that have no employee assigned. We'll round-robin
    // these too (so re-running on a partially-failed prior run heals the gap).
    const ordersNeedingEmployee = allOrders.filter(o => !o.employee_id);

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        summary: {
          clients_total: clients.length,
          clients_already_have_orders: clients.length - needAssignment.length,
          clients_to_assign: needAssignment.length,
          orders_without_employee: ordersNeedingEmployee.length,
          active_employees: employees.length,
          default_service: { id: defaultService.id, name: defaultService.name }
        }
      });
    }

    // 4. Round-robin create. Sequential (not Promise.all) — Catalyst REST
    //    backend rate-limits concurrent writes and the SID-encoded period
    //    write path inside wrapServiceOrderModel isn't designed for parallel
    //    bursts. ~518 sequential creates should finish well under a minute.
    // Batched two-step write: Catalyst mirrors service_id ↔ employee_id on
    // a single write (see api/src/infra/dataStore/period-encoding.js). We
    // can't set both atomically, so we (1) create with service_id+period,
    // then (2) update with employee_id. AppSail kills requests > ~30s so
    // we limit work per call to batchSize. Caller pages via { offset }.
    //
    // Work ordering: create new orders first (for clients without any),
    // then heal existing orders (null employee_id). Both contribute to
    // the same batch budget.
    const work = [];
    needAssignment.forEach((client, i) => work.push({ kind: 'create', client, rrIndex: i }));
    ordersNeedingEmployee.forEach((order, j) => work.push({ kind: 'heal', order, rrIndex: needAssignment.length + j }));

    const slice = work.slice(batchOffset, batchOffset + batchSize);
    const totalWork = work.length;
    const remaining = Math.max(0, totalWork - (batchOffset + slice.length));

    let created = 0, failed = 0, assignedToEmployee = 0, healed = 0;
    const errors = [];

    for (const item of slice) {
      const employee = employees[item.rrIndex % employees.length];
      if (item.kind === 'create') {
        try {
          const order = await prisma.serviceOrder.create({
            data: {
              user_id: item.client.id,
              service_id: defaultService.id,
              period: item.client.name ? String(item.client.name).substring(0, 200) : null,
              status: 'pending'
            }
          });
          created++;
          try {
            await prisma.serviceOrder.update({
              where: { id: order.id },
              data: { employee_id: employee.id }
            });
            assignedToEmployee++;
          } catch (eu) {
            if (errors.length < 20) errors.push(`${item.client.email} (employee assign): ${eu.message || 'unknown'}`);
          }
        } catch (e) {
          failed++;
          if (errors.length < 20) errors.push(`${item.client.email}: ${e.message || 'unknown'}`);
        }
      } else {
        try {
          await prisma.serviceOrder.update({
            where: { id: item.order.id },
            data: { employee_id: employee.id }
          });
          healed++;
        } catch (e) {
          if (errors.length < 20) errors.push(`heal-order ${item.order.id}: ${e.message || 'unknown'}`);
        }
      }
    }

    const nextOffset = batchOffset + slice.length;
    res.json({
      success: true,
      message: `Batch done: ${assignedToEmployee + healed} order${(assignedToEmployee + healed) === 1 ? '' : 's'} assigned. ${remaining} remaining.`,
      summary: {
        clients_total: clients.length,
        clients_already_had_orders: clients.length - needAssignment.length,
        total_work_pending: totalWork,
        batch_offset: batchOffset,
        batch_size: slice.length,
        next_offset: nextOffset,
        has_more: remaining > 0,
        remaining,
        created,
        assigned_to_employee: assignedToEmployee,
        healed_orders_without_employee: healed,
        failed,
        active_employees: employees.length,
        default_service: { id: defaultService.id, name: defaultService.name }
      },
      errors: errors.slice(0, 20)
    });
  } catch (error) {
    console.error('Auto-assign all clients error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
