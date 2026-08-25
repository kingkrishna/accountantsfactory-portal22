const validator = require('validator');
const { validateObjectId, sanitizeText, parseIntSafe } = require('../utils/validation');
const prisma = require('../models/prismaClient');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const serviceCount = await prisma.serviceOrder.count({ where: { user_id: userId } });
    const referralCount = await prisma.referral.count({ where: { referrer_user_id: userId, status: 'pending' } });

    res.json({ success: true, dashboard: { totalServices: serviceCount, pendingReferrals: referralCount } });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getServices = async (req, res) => {
  try {
    const userId = req.user.id;

    const services = await prisma.serviceOrder.findMany({
      where: { user_id: userId },
      include: {
        service: { select: { name: true, description: true } },
        employee: { select: { email: true } },
        _count: { select: { documents: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedServices = services.map(service => ({
      id: service.id,
      period: service.period,
      status: service.status,
      created_at: service.createdAt,
      service_name: service.service?.name || '',
      service_description: service.service?.description || '',
      employee_email: service.employee?.email || null,
      document_count: service._count.documents
    }));

    res.json({ success: true, services: formattedServices });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAvailableServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { is_active: true },
      select: { id: true, name: true, description: true }
    });
    res.json({ success: true, services });
  } catch (error) {
    console.error('Get available services error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceOrderId } = req.query;

    const serviceOrders = await prisma.serviceOrder.findMany({
      where: { user_id: userId },
      select: { id: true }
    });
    const allowedOrderIds = serviceOrders.map(so => so.id);

    const matchQuery = {};
    if (serviceOrderId) {
      const idValidation = validateObjectId(serviceOrderId, 'Service Order ID');
      if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });
      if (!allowedOrderIds.includes(idValidation.id)) return res.status(403).json({ success: false, message: 'Access denied' });
      matchQuery.service_order_id = idValidation.id;
    } else {
      matchQuery.service_order_id = { in: allowedOrderIds };
    }

    const documents = await prisma.document.findMany({
      where: matchQuery,
      orderBy: { uploaded_at: 'desc' }
    });

    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      service_order_id: doc.service_order_id,
      file_name: doc.file_name,
      download_url: doc.download_url,
      embed_code: doc.embed_code || null,
      uploaded_at: doc.uploaded_at
    }));

    res.json({ success: true, documents: formattedDocs });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getReferrals = async (req, res) => {
  try {
    const userId = req.user.id;

    const referrals = await prisma.referral.findMany({
      where: { referrer_user_id: userId },
      include: { service: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const formattedReferrals = referrals.map(ref => ({
      id: ref.id,
      referred_name: ref.referred_name,
      referred_email: ref.referred_email,
      service_name: ref.service?.name || null,
      bonus_amount: ref.bonus_amount,
      status: ref.status,
      reason: ref.reason,
      created_at: ref.createdAt
    }));

    res.json({ success: true, referrals: formattedReferrals });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.requestService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceId, period, notes } = req.body;

    const serviceIdValidation = validateObjectId(serviceId, 'Service ID');
    if (!serviceIdValidation.valid) return res.status(400).json({ success: false, message: serviceIdValidation.error });

    let sanitizedPeriod = null;
    if (period) {
      try { sanitizedPeriod = sanitizeText(period, 100); } catch (e) { return res.status(400).json({ success: false, message: e.message || 'Invalid period format' }); }
    }

    const service = await prisma.service.findUnique({ where: { id: serviceIdValidation.id } });
    if (!service || !service.is_active) return res.status(404).json({ success: false, message: 'Service not found or inactive' });

    // Create ServiceOrder directly — this makes it visible in admin Service Orders immediately
    const order = await prisma.serviceOrder.create({
      data: {
        user_id: userId,
        service_id: serviceIdValidation.id,
        period: sanitizedPeriod,
        status: 'pending'
      }
    });

    res.json({ success: true, message: 'Service request submitted successfully. Our team will review and assign an accountant shortly.', orderId: order.id });
  } catch (error) {
    console.error('Request service error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getServiceComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceOrderId } = req.params;

    const idValidation = validateObjectId(serviceOrderId, 'Service Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const order = await prisma.serviceOrder.findFirst({ where: { id: idValidation.id, user_id: userId } });
    if (!order) return res.status(403).json({ success: false, message: 'Access denied' });

    const comments = await prisma.serviceComment.findMany({
      where: { service_order_id: idValidation.id },
      include: { user: { select: { email: true } } },
      orderBy: { created_at: 'asc' }
    });

    const formattedComments = comments.map(c => ({
      id: c.id,
      service_order_id: c.service_order_id,
      user_id: c.user_id,
      user_email: c.user?.email,
      comment: c.comment,
      created_at: c.created_at
    }));

    res.json({ success: true, comments: formattedComments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { serviceOrderId, comment } = req.body;

    if (!serviceOrderId || !comment) return res.status(400).json({ success: false, message: 'Service Order ID and comment are required' });

    const idValidation = validateObjectId(serviceOrderId, 'Service Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    if (typeof comment !== 'string' || comment.trim().length === 0) return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
    if (comment.length > 5000) return res.status(400).json({ success: false, message: 'Comment is too long (max 5000 characters)' });

    const sanitizedComment = validator.escape(comment.trim());

    const order = await prisma.serviceOrder.findFirst({ where: { id: idValidation.id, user_id: userId } });
    if (!order) return res.status(403).json({ success: false, message: 'Access denied' });

    const newComment = await prisma.serviceComment.create({
      data: {
        service_order_id: idValidation.id,
        user_id: userId,
        comment: sanitizedComment
      }
    });

    res.json({ success: true, message: 'Comment added successfully', commentId: newComment.id });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const idValidation = validateObjectId(documentId, 'Document ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const document = await prisma.document.findUnique({
      where: { id: idValidation.id },
      include: { service_order: { select: { user_id: true } } }
    });

    if (!document || !document.service_order) return res.status(404).json({ success: false, message: 'Document not found' });
    if (document.service_order.user_id !== userId) return res.status(403).json({ success: false, message: 'Access denied' });

    if (!document.download_url) return res.status(400).json({ success: false, message: 'No download URL available for this document' });

    res.json({ success: true, downloadUrl: document.download_url, fileName: document.file_name });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: 'Failed to download document' });
  }
};
