// Lightweight in-app notifications.
// Derives notifications from existing data (orders, status changes, comments)
// per role. "Unread" tracking uses a per-user "last-seen" timestamp stored
// client-side in localStorage (the API just returns events with timestamps,
// the client decides which are unread by comparing).

const prisma = require('../models/prismaClient');

function ts(d) {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

// GET /api/admin/notifications, /api/client/notifications, /api/employee/notifications
async function getNotifications(req, res) {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const limit = 20;
    const items = [];

    if (role === 'admin') {
      // Recent service orders (created OR status changed) + new comments
      const orders = await prisma.serviceOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { user: true, service: true }
      });
      for (const o of orders) {
        items.push({
          id: 'order-' + o.id,
          type: 'order_created',
          title: 'New service order',
          body: ((o.user && (o.user.full_name || o.user.email)) || 'Client') + ' — ' + ((o.service && o.service.name) || 'Service'),
          ts: ts(o.createdAt),
          link: '#service-orders'
        });
        if (o.updatedAt && ts(o.updatedAt) > ts(o.createdAt) + 1000) {
          items.push({
            id: 'order-status-' + o.id + '-' + ts(o.updatedAt),
            type: 'order_status',
            title: 'Order status: ' + (o.status || 'updated'),
            body: ((o.user && (o.user.full_name || o.user.email)) || 'Client') + ' — ' + ((o.service && o.service.name) || 'Service'),
            ts: ts(o.updatedAt),
            link: '#service-orders'
          });
        }
      }
      // Recent comments
      try {
        const comments = await prisma.serviceComment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: { user: true }
        });
        for (const c of comments) {
          items.push({
            id: 'comment-' + c.id,
            type: 'comment',
            title: 'New comment',
            body: ((c.user && (c.user.full_name || c.user.email)) || 'User') + ': ' + String(c.message || c.comment || '').slice(0, 80),
            ts: ts(c.createdAt),
            link: '#service-orders'
          });
        }
      } catch (_) {}
    } else if (role === 'client') {
      // Their own orders + comments on their orders
      const orders = await prisma.serviceOrder.findMany({
        where: { user_id: userId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { service: true }
      });
      const orderIds = orders.map(o => o.id);
      for (const o of orders) {
        items.push({
          id: 'my-order-' + o.id + '-' + ts(o.updatedAt || o.createdAt),
          type: 'my_order_status',
          title: 'Order: ' + (o.status || 'pending'),
          body: ((o.service && o.service.name) || 'Service'),
          ts: ts(o.updatedAt || o.createdAt),
          link: '#services'
        });
      }
      try {
        const comments = await prisma.serviceComment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: true }
        });
        for (const c of comments) {
          if (!orderIds.includes(c.service_order_id)) continue;
          if (c.user_id === userId) continue; // not your own comments
          items.push({
            id: 'my-comment-' + c.id,
            type: 'comment',
            title: 'New reply on your order',
            body: ((c.user && (c.user.full_name || c.user.email)) || 'Team') + ': ' + String(c.message || c.comment || '').slice(0, 80),
            ts: ts(c.createdAt),
            link: '#services'
          });
        }
      } catch (_) {}
    } else if (role === 'employee') {
      // Orders assigned to this employee
      const orders = await prisma.serviceOrder.findMany({
        where: { employee_id: userId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { user: true, service: true }
      });
      const orderIds = orders.map(o => o.id);
      for (const o of orders) {
        items.push({
          id: 'task-' + o.id + '-' + ts(o.updatedAt || o.createdAt),
          type: 'task_assigned',
          title: 'Task: ' + ((o.service && o.service.name) || 'Service'),
          body: 'Client: ' + ((o.user && (o.user.full_name || o.user.email)) || 'Unknown'),
          ts: ts(o.updatedAt || o.createdAt),
          link: '#tasks'
        });
      }
      try {
        const comments = await prisma.serviceComment.findMany({
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { user: true }
        });
        for (const c of comments) {
          if (!orderIds.includes(c.service_order_id)) continue;
          if (c.user_id === userId) continue;
          items.push({
            id: 'task-comment-' + c.id,
            type: 'comment',
            title: 'New comment on your task',
            body: ((c.user && (c.user.full_name || c.user.email)) || 'Client') + ': ' + String(c.message || c.comment || '').slice(0, 80),
            ts: ts(c.createdAt),
            link: '#tasks'
          });
        }
      } catch (_) {}
    }

    items.sort((a, b) => b.ts - a.ts);
    const top = items.slice(0, limit);

    res.json({
      success: true,
      notifications: top,
      server_now: Date.now()
    });
  } catch (e) {
    console.error('Notifications error:', e);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
}

module.exports = { getNotifications };
