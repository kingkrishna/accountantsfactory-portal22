// Admin document-links per order. embed_code accepts ONLY Zoho WorkDrive
// (privacy/security: blocks arbitrary iframes).

const prisma = require('../models/prismaClient');
const { validateObjectId } = require('../utils/validation');

exports.getOrderDocuments = async (req, res) => {
  try {
    const { orderId } = req.params;

    const idValidation = validateObjectId(orderId, 'Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const order = await prisma.serviceOrder.findUnique({
      where: { id: idValidation.id },
      include: { user: { select: { email: true } }, service: { select: { name: true } } }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const docs = await prisma.document.findMany({
      where: { service_order_id: idValidation.id },
      orderBy: { uploaded_at: 'desc' }
    });

    res.json({
      success: true,
      documents: docs.map(d => ({ id: d.id, file_name: d.file_name, download_url: d.download_url, embed_code: d.embed_code || null, uploaded_at: d.uploaded_at })),
      order: { client_email: order.user?.email, service_name: order.service?.name }
    });
  } catch (error) {
    console.error('Get order documents error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Admin pastes a Zoho/download link + optional embed code for a service order
exports.addDocumentLink = async (req, res) => {
  try {
    const { orderId, fileName, downloadUrl, embedCode } = req.body;

    if (!orderId || !fileName || !downloadUrl) {
      return res.status(400).json({ success: false, message: 'Order ID, file name, and download URL are required' });
    }

    const idValidation = validateObjectId(orderId, 'Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    try { new URL(downloadUrl); } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    const order = await prisma.serviceOrder.findUnique({ where: { id: idValidation.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

    const sanitizedName = String(fileName).trim().substring(0, 200);
    // Embed allow-list: Zoho WorkDrive only
    let sanitizedEmbed = null;
    if (embedCode && typeof embedCode === 'string' && embedCode.trim()) {
      const code = embedCode.trim();
      if (code.includes('workdrive.zoho') || code.includes('workdrive.zohopublic')) {
        sanitizedEmbed = code.substring(0, 2000);
      }
    }

    const doc = await prisma.document.create({
      data: {
        user_id: order.user_id,
        service_order_id: idValidation.id,
        file_name: sanitizedName,
        download_url: downloadUrl.trim(),
        embed_code: sanitizedEmbed,
        uploaded_by: req.user.id
      }
    });

    res.json({ success: true, message: 'Document link added successfully', document: { id: doc.id, file_name: doc.file_name, download_url: doc.download_url, embed_code: doc.embed_code } });
  } catch (error) {
    console.error('Add document link error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteDocumentLink = async (req, res) => {
  try {
    const { documentId } = req.params;
    const idValidation = validateObjectId(documentId, 'Document ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const doc = await prisma.document.findUnique({ where: { id: idValidation.id } });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    await prisma.document.delete({ where: { id: idValidation.id } });
    res.json({ success: true, message: 'Document link deleted successfully' });
  } catch (error) {
    console.error('Delete document link error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
