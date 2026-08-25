// Admin: employee CRUD + per-employee assignment view.
// Delete unassigns this employee from every order first (no FK cascade in
// Catalyst — we own it).

const bcrypt = require('bcryptjs');
const prisma = require('../models/prismaClient');
const { parseIntSafe, validateEmail, validatePassword, validateObjectId } = require('../utils/validation');
const { assertEmployeeOwned, isSubAdmin } = require('../utils/franchiseScope');

exports.createEmployee = async (req, res) => {
  try {
    const { email, password, role, branchCode } = req.body;

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) return res.status(400).json({ success: false, message: emailValidation.error });

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return res.status(400).json({ success: false, message: passwordValidation.error });

    // Only full admin can mint sub_admin accounts. A sub_admin minting another
    // sub_admin would create a parallel franchise outside their own — collapse
    // the role to plain employee and force-tag to their franchise.
    let effectiveRole;
    let effectiveReferralCode = null;
    if (role === 'sub_admin') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only full admin can create sub_admin accounts' });
      }
      effectiveRole = 'sub_admin';
      effectiveReferralCode = branchCode ? String(branchCode).trim().toUpperCase() : null;
      if (!effectiveReferralCode) {
        return res.status(400).json({ success: false, message: 'branchCode is required for sub_admin' });
      }
    } else {
      effectiveRole = 'employee';
      // For sub_admin callers, force the new employee into their franchise.
      if (isSubAdmin(req.user)) {
        effectiveReferralCode = req.user.franchise_code || null;
      }
    }

    const normalizedEmail = emailValidation.email;

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password_hash: hashedPassword,
        role: effectiveRole,
        referral_code: effectiveReferralCode,
        status: 'active',
        must_change_password: true
      }
    });

    res.json({ success: true, message: 'Employee created successfully', employee: { id: employee.id, email: employee.email } });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const page = parseIntSafe(req.query.page, 1, 1, 10000);
    const limit = parseIntSafe(req.query.limit, 20, 1, 100);
    const skip = (page - 1) * limit;

    // Vuln 5: sub_admin only sees employees + sub_admins tagged to their
    // own franchise. Full admin sees everyone.
    let where;
    if (isSubAdmin(req.user)) {
      const code = req.user.franchise_code;
      if (!code) return res.json({ success: true, employees: [], pagination: { page: 1, limit, total: 0, pages: 0 } });
      where = { role: { in: ['employee', 'sub_admin'] }, referral_code: code };
    } else {
      where = { role: { in: ['employee', 'sub_admin'] } };
    }

    const employees = await prisma.user.findMany({
      where,
      select: { id: true, email: true, status: true, createdAt: true, role: true, referral_code: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });
    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      employees: employees.map(e => ({ ...e, created_at: e.createdAt })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const idValidation = validateObjectId(id, 'Employee ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    // Vuln 5: franchise ownership. Full admin passes through; sub_admin
    // may only toggle within their own franchise.
    const own = await assertEmployeeOwned(req.user, idValidation.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    // Sub_admin: only toggle plain employees. Full admin: may toggle
    // employees AND sub_admins (needed to disable a franchise owner).
    if (own.user.role === 'sub_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only full admin can toggle sub_admin accounts' });
    }

    const newStatus = own.user.status === 'active' ? 'inactive' : 'active';
    await prisma.user.update({ where: { id: idValidation.id }, data: { status: newStatus } });
    res.json({ success: true, message: `${own.user.role === 'sub_admin' ? 'Sub-admin' : 'Employee'} ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, status: newStatus });
  } catch (error) {
    console.error('Toggle employee status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const idValidation = validateObjectId(id, 'Employee ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    // Vuln 5: franchise ownership.
    const own = await assertEmployeeOwned(req.user, idValidation.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });

    // Sub_admin: only delete plain employees. Full admin: may delete
    // employees AND sub_admins (needed to remove a defunct franchise).
    if (own.user.role === 'sub_admin' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only full admin can delete sub_admin accounts' });
    }

    // Unassign first so orders don't dangle. db.js $transaction has no rollback
    // (docs/DEEP-DIVE-db-js.md), so we order this conservatively.
    await prisma.serviceOrder.updateMany({ where: { employee_id: idValidation.id }, data: { employee_id: null } });
    await prisma.user.delete({ where: { id: idValidation.id } });
    res.json({ success: true, message: `${own.user.role === 'sub_admin' ? 'Sub-admin' : 'Employee'} deleted successfully` });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Per-employee workload view: orders + latest EOD per order + counters.
// O(employees × orders) walk — fine at current scale, see audit Phase-4 plan.
exports.getAllEmployeeUpdates = async (req, res) => {
  try {
    // Sub_admin sees only employees in their franchise. Full admin sees all.
    // (Missed in Vuln 5 security fix; this endpoint was leaking cross-
    // franchise employee workload data to every sub_admin.)
    let where = { role: 'employee' };
    if (isSubAdmin(req.user)) {
      if (!req.user.franchise_code) return res.json({ success: true, employees: [] });
      where.referral_code = req.user.franchise_code;
    }

    const employees = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, status: true }
    });

    const result = [];
    for (const emp of employees) {
      const orders = await prisma.serviceOrder.findMany({
        where: { employee_id: emp.id },
        include: {
          user: { select: { email: true, name: true } },
          service: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const ordersWithUpdates = [];
      for (const order of orders) {
        const latestUpdate = await prisma.workUpdate.findFirst({
          where: { service_order_id: order.id },
          orderBy: { date: 'desc' }
        });
        ordersWithUpdates.push({
          order_id: order.id,
          client_email: order.user?.email || 'N/A',
          client_name: order.user?.name || null,
          service_name: order.service?.name || 'N/A',
          period: order.period || '',
          order_status: order.status,
          created_at: order.createdAt,
          latest_update: latestUpdate ? {
            status: latestUpdate.status,
            comments: latestUpdate.comments,
            date: latestUpdate.date
          } : null
        });
      }

      const counts = { pending: 0, in_progress: 0, completed: 0, total: orders.length };
      for (const o of orders) {
        if (o.status === 'pending') counts.pending++;
        else if (o.status === 'in_progress') counts.in_progress++;
        else if (o.status === 'completed') counts.completed++;
      }

      result.push({
        employee_id: emp.id,
        employee_email: emp.email,
        employee_name: emp.name || null,
        employee_status: emp.status,
        total_assigned: orders.length,
        completed_count: counts.completed,
        counters: counts,
        orders: ordersWithUpdates
      });
    }

    res.json({ success: true, employees: result });
  } catch (error) {
    console.error('Get employee updates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
