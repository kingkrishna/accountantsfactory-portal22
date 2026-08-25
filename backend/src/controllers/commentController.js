// Unified comment endpoints used by admin & employee dashboards.
// Client already has its own getServiceComments / addComment in clientController.

const validator = require('validator');
const { validateObjectId } = require('../utils/validation');
const prisma = require('../models/prismaClient');

async function ensureOrderAccess(role, userId, orderId) {
  const order = await prisma.serviceOrder.findFirst({ where: { id: orderId } });
  if (!order) return { ok: false, status: 404, msg: 'Order not found' };
  if (role === 'admin') return { ok: true, order };
  if (role === 'employee') {
    if (order.employee_id === userId) return { ok: true, order };
    return { ok: false, status: 403, msg: 'Not assigned to you' };
  }
  if (role === 'client') {
    if (order.user_id === userId) return { ok: true, order };
    return { ok: false, status: 403, msg: 'Access denied' };
  }
  return { ok: false, status: 403, msg: 'Forbidden' };
}

exports.list = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const { orderId } = req.params;
    const idV = validateObjectId(orderId, 'Order ID');
    if (!idV.valid) return res.status(400).json({ success: false, message: idV.error });

    const access = await ensureOrderAccess(role, userId, idV.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    const comments = await prisma.serviceComment.findMany({
      where: { service_order_id: idV.id },
      include: { user: { select: { id: true, email: true, full_name: true, role: true } } },
      orderBy: { created_at: 'asc' }
    });

    const formatted = comments.map(c => ({
      id: c.id,
      service_order_id: c.service_order_id,
      user_id: c.user_id,
      user_email: c.user && c.user.email,
      user_name: (c.user && c.user.full_name) || (c.user && c.user.email) || 'User',
      user_role: c.user && c.user.role,
      comment: c.comment,
      created_at: c.created_at
    }));

    res.json({ success: true, comments: formatted });
  } catch (e) {
    console.error('List comments error:', e);
    res.status(500).json({ success: false, message: 'Failed to load comments' });
  }
};

exports.add = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const { orderId } = req.params;
    const { comment } = req.body || {};

    const idV = validateObjectId(orderId, 'Order ID');
    if (!idV.valid) return res.status(400).json({ success: false, message: idV.error });
    if (typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    }
    if (comment.length > 5000) {
      return res.status(400).json({ success: false, message: 'Comment is too long (max 5000 characters)' });
    }

    const access = await ensureOrderAccess(role, userId, idV.id);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.msg });

    const sanitized = validator.escape(comment.trim());

    const created = await prisma.serviceComment.create({
      data: {
        service_order_id: idV.id,
        user_id: userId,
        comment: sanitized
      }
    });

    res.json({ success: true, message: 'Comment added', commentId: created.id });
  } catch (e) {
    console.error('Add comment error:', e);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};
