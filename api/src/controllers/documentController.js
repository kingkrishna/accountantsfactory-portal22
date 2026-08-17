const multer = require('multer');
const uuid = require('uuid');
const { sanitizeFileName, validateObjectId } = require('../utils/validation');
const zohoWorkDrive = require('../services/zohoWorkDrive');
const prisma = require('../models/prismaClient');

const storage = multer.memoryStorage();
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: async (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

exports.uploadDocument = async (req, res) => {
  try {
    const { serviceOrderId, fileName } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });

    const idValidation = validateObjectId(serviceOrderId, 'Service Order ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    let sanitizedFileName;
    try {
      sanitizedFileName = sanitizeFileName(fileName || req.file.originalname);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message || 'Invalid file name' });
    }

    const order = await prisma.serviceOrder.findUnique({ where: { id: idValidation.id } });
    if (!order) return res.status(404).json({ success: false, message: 'Service order not found' });

    const file = req.file;

    const { default: fileType } = await import('file-type');
    const detectedType = await fileType.fromBuffer(file.buffer);
    if (!detectedType) return res.status(400).json({ success: false, message: 'Unable to detect file type' });

    const allowedExtensions = {
      'application/pdf': ['pdf'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png']
    };

    const expectedExts = allowedExtensions[file.mimetype] || [];
    if (!expectedExts.includes(detectedType.ext)) {
      return res.status(400).json({ success: false, message: 'File content does not match declared file type' });
    }

    const uniqueFileName = `${uuid.v4()}.${detectedType.ext}`;
    const folderPath = `documents/${order.user_id}/${idValidation.id}`;

    const uploadResult = await zohoWorkDrive.uploadFile(file.buffer, uniqueFileName, folderPath, file.mimetype);
    const storageKey = `zoho:${uploadResult.fileId}:${uploadResult.fileKey}`;

    let documentId = '';

    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          user_id: order.user_id,
          service_order_id: idValidation.id,
          s3_key: storageKey,
          file_name: sanitizedFileName,
          file_size: file.size,
          file_type: file.mimetype,
          uploaded_by: req.user.id
        }
      });
      documentId = doc.id;

      try {
        await tx.auditLog.create({
          data: {
            user_id: req.user.id,
            action: 'document_upload',
            resource_type: 'document',
            resource_id: doc.id,
            ip_address: req.ip || req.connection?.remoteAddress
          }
        });
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    });

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: documentId,
        fileName: sanitizedFileName,
        fileSize: file.size,
        fileType: file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
};

exports.generateDownloadUrl = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const idValidation = validateObjectId(documentId, 'Document ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const document = await prisma.document.findUnique({
      where: { id: idValidation.id },
      include: { service_order: { select: { user_id: true } } }
    });

    if (!document || !document.service_order) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const orderUserId = document.service_order.user_id;
    if (req.user.role === 'client' && orderUserId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const zohoFileId = document.s3_key.startsWith('zoho:') ? document.s3_key.split(':')[1] : null;
    if (!zohoFileId) return res.status(400).json({ success: false, message: 'Invalid document reference' });

    const downloadUrl = await zohoWorkDrive.getDownloadUrl(zohoFileId, 3600);

    res.json({ success: true, downloadUrl: downloadUrl, fileName: document.file_name });
  } catch (error) {
    console.error('Generate download URL error:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Failed to generate download URL' : error.message });
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

    const orderUserId = document.service_order.user_id;
    if (req.user.role === 'client' && orderUserId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'admin' && orderUserId !== userId) {
      try {
        await prisma.auditLog.create({
          data: {
            user_id: req.user.id,
            action: 'admin_document_access',
            resource_type: 'document',
            resource_id: idValidation.id,
            ip_address: req.ip || req.connection?.remoteAddress
          }
        });
      } catch (auditError) {
        console.warn('Audit logging failed:', auditError);
      }
    }

    const zohoFileId = document.s3_key.startsWith('zoho:') ? document.s3_key.split(':')[1] : null;
    if (!zohoFileId) return res.status(400).json({ success: false, message: 'Invalid document reference' });

    const downloadUrl = await zohoWorkDrive.getDownloadUrl(zohoFileId, 3600);
    res.json({ success: true, downloadUrl: downloadUrl, fileName: document.file_name });
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Failed to download document' : error.message });
  }
};

exports.upload = upload.single('file');
