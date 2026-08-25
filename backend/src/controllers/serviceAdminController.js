// Admin: service catalog (not service orders).
// bulk-create seeds the 17 default services; existing-by-name skips.

const prisma = require('../models/prismaClient');
const { validateObjectId } = require('../utils/validation');

const DEFAULT_SERVICES = [
  { name: 'Private Limited Company',                     description: 'Company registration for private entities. Starting from Rs.14,999/-' },
  { name: 'Limited Liability Partnership',               description: 'LLP registration for partnerships. Starting from Rs.9,999/-' },
  { name: 'One Person Company',                          description: 'Company registration for sole entrepreneurs' },
  { name: 'Partnership Firm',                            description: 'Registration for partnership firms' },
  { name: 'Startup India Registration',                  description: 'Startup India recognition and registration' },
  { name: 'GST Registration',                            description: 'Goods and Services Tax registration' },
  { name: 'Sole Proprietorship',                         description: 'Registration for sole proprietorships' },
  { name: 'Virtual CFO Services',                        description: 'Virtual Chief Financial Officer services' },
  { name: 'Business Advisory Services',                  description: 'Expert business advisory and consultation' },
  { name: 'Management Consulting Services',              description: 'Business management consulting' },
  { name: 'Bookkeeping Services',                        description: 'Professional bookkeeping and accounting' },
  { name: 'Tax Filing Services',                         description: 'Income tax filing and compliance' },
  { name: 'GST Filing Services',                         description: 'GST return and compliance filing' },
  { name: 'Payroll and Employee Benefit Services',       description: 'Payroll processing and employee benefits management' },
  { name: 'Business Compliance and Regulatory Services', description: 'Business compliance and regulatory requirements' },
  { name: 'Wealth Management Services',                  description: 'Personal and corporate wealth management' },
  { name: 'MCA Annual Return Filing Services',           description: 'MCA e-filing and annual compliance' }
];

exports.getAllServices = async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
    const formattedServices = services.map(s => ({
      id: s.id, name: s.name, description: s.description, is_active: s.is_active,
      created_at: s.createdAt, updated_at: s.updatedAt
    }));
    res.json({ success: true, services: formattedServices });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createService = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Service name must be at least 2 characters' });
    }
    const sanitizedName = name.trim().substring(0, 200);
    const sanitizedDesc = description ? String(description).trim().substring(0, 1000) : '';

    const existing = await prisma.service.findFirst({ where: { name: { equals: sanitizedName } } });
    if (existing) return res.status(400).json({ success: false, message: 'A service with this name already exists' });

    const service = await prisma.service.create({
      data: { name: sanitizedName, description: sanitizedDesc, is_active: true }
    });
    res.json({ success: true, message: 'Service created successfully', service: { id: service.id, name: service.name, description: service.description, is_active: service.is_active } });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.bulkCreateServices = async (req, res) => {
  try {
    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const svc of DEFAULT_SERVICES) {
      try {
        const sanitizedName = (svc.name || '').trim().substring(0, 200);
        const sanitizedDesc = (svc.description || '').trim().substring(0, 1000);

        if (!sanitizedName || sanitizedName.length < 2) {
          skipped++;
          continue;
        }

        const existing = await prisma.service.findFirst({ where: { name: { equals: sanitizedName } } });
        if (existing) { skipped++; continue; }

        await prisma.service.create({
          data: { name: sanitizedName, description: sanitizedDesc, is_active: true }
        });
        created++;
      } catch (err) {
        errors.push(svc.name + ': ' + (err.message || 'Unknown error'));
      }
    }

    res.json({
      success: true,
      message: 'Service creation completed',
      summary: { total: DEFAULT_SERVICES.length, created, skipped },
      errors: errors.slice(0, 5)
    });
  } catch (error) {
    console.error('Bulk create services error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
    });
  }
};

exports.toggleService = async (req, res) => {
  try {
    const { id } = req.params;
    const idValidation = validateObjectId(id, 'Service ID');
    if (!idValidation.valid) return res.status(400).json({ success: false, message: idValidation.error });

    const service = await prisma.service.findUnique({ where: { id: idValidation.id } });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const updated = await prisma.service.update({
      where: { id: idValidation.id },
      data: { is_active: !service.is_active }
    });
    res.json({ success: true, message: `Service ${updated.is_active ? 'activated' : 'deactivated'} successfully`, is_active: updated.is_active });
  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports._defaultServices = DEFAULT_SERVICES; // for tests / future seed scripts
