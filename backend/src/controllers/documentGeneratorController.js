const db = require('../models/prismaClient');
const sanitizeHtml = require('sanitize-html');
const { sanitizeText, validateObjectId } = require('../utils/validation');
const { assertClientOwned, isSubAdmin, getFranchiseClientEmails } = require('../utils/franchiseScope');

// Strict allowlist for stored document templates. Sub_admin can author
// templates and the generated output is rendered in admin browsers, so any
// stored XSS would compromise the super-admin session (Vuln 8).
// Allowed: structural + text formatting + tables. Denied: <script>,
// <iframe>, <object>, all event handlers, all CSS url()s.
const TEMPLATE_HTML_SANITIZE_OPTS = {
  allowedTags: [
    'div', 'span', 'p', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'small', 'sub', 'sup',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'blockquote', 'pre', 'code',
    'img'
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan']
  },
  // Strip url() expressions from inline style. Block javascript: and data:
  // protocols on anchor + image.
  allowedStyles: {
    '*': {
      color: [/^.*$/],
      'background-color': [/^.*$/],
      'text-align': [/^left$|^right$|^center$|^justify$/],
      'font-weight': [/^bold$|^normal$|^\d{3}$/],
      'font-style': [/^italic$|^normal$/],
      'text-decoration': [/^underline$|^line-through$|^none$/],
      'font-size': [/^\d+(?:px|pt|em|rem|%)$/],
      margin: [/^[\d\s.px%-]+$/],
      padding: [/^[\d\s.px%-]+$/],
      border: [/^[\d\s.a-z#-]+$/],
      width: [/^\d+(?:px|%)$/],
      height: [/^\d+(?:px|%)$/]
    }
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true
};

function sanitizeTemplateHtml(html) {
  if (typeof html !== 'string') return '';
  return sanitizeHtml(html, TEMPLATE_HTML_SANITIZE_OPTS);
}

const VALID_TEMPLATE_TYPES = ['NOC', 'LABOUR_AUTH', 'FSSAI', 'MCA', 'OTHER'];

// ─── Document Templates ───────────────────────────────────────────────────────

exports.getDocTemplates = async (req, res) => {
  try {
    const templates = await db.documentTemplate.findMany({
      orderBy: { template_name: 'asc' },
    });

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get doc templates error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createDocTemplate = async (req, res) => {
  try {
    const { template_name, template_type, template_html } = req.body;

    if (!template_name || !template_name.trim()) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    if (!template_type || !VALID_TEMPLATE_TYPES.includes(template_type)) {
      return res.status(400).json({ success: false, message: `Invalid template_type. Must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}` });
    }

    if (!template_html || !template_html.trim()) {
      return res.status(400).json({ success: false, message: 'Template HTML content is required' });
    }

    const template = await db.documentTemplate.create({
      data: {
        template_name: sanitizeText(template_name, 200),
        template_type,
        // Vuln 8: never persist raw HTML. Strip scripts, event handlers,
        // dangerous protocols, etc. before storage so a stored XSS payload
        // can't fire in the super-admin's browser at preview/generate time.
        template_html: sanitizeTemplateHtml(template_html),
        created_by: req.user.id,
        is_active: true,
      },
    });

    res.status(201).json({ success: true, template });
  } catch (error) {
    console.error('Create doc template error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateDocTemplate = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Template ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const { template_name, template_type, template_html, is_active } = req.body;

    if (template_type !== undefined && !VALID_TEMPLATE_TYPES.includes(template_type)) {
      return res.status(400).json({ success: false, message: `Invalid template_type. Must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}` });
    }

    const data = {};
    if (template_name !== undefined) data.template_name = sanitizeText(template_name, 200);
    if (template_type !== undefined) data.template_type = template_type;
    if (template_html !== undefined) data.template_html = sanitizeTemplateHtml(template_html);
    if (is_active !== undefined) data.is_active = is_active === true;

    const template = await db.documentTemplate.update({
      where: { id: idVal.id },
      data,
    });

    res.json({ success: true, template });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    console.error('Update doc template error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteDocTemplate = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Template ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    await db.documentTemplate.delete({
      where: { id: idVal.id },
    });

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    console.error('Delete doc template error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Document Generation ──────────────────────────────────────────────────────

exports.generateDocument = async (req, res) => {
  try {
    const idVal = validateObjectId(req.params.id, 'Template ID');
    if (!idVal.valid) return res.status(400).json({ success: false, message: idVal.error });

    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }
    const userIdVal = validateObjectId(user_id, 'User ID');
    if (!userIdVal.valid) return res.status(400).json({ success: false, message: userIdVal.error });

    // Franchise gate (Vuln 3): sub_admin can only generate documents for
    // clients tagged to their own franchise.
    const own = await assertClientOwned(req.user, userIdVal.id);
    if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });
    const clientUser = own.user;

    const template = await db.documentTemplate.findFirst({ where: { id: idVal.id } });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const companyProfile = await db.companyProfile.findFirst({
      where: { user_id: userIdVal.id },
    });

    // Escape placeholder values before injecting — a maliciously-named
    // company (e.g. "ACME </td><script>...</script>") would otherwise inject
    // HTML even after template-html sanitization.
    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const now = new Date();
    let html = template.template_html;
    html = html.replace(/\{\{company_name\}\}/g, esc(companyProfile && companyProfile.company_name));
    html = html.replace(/\{\{pan_number\}\}/g, esc(companyProfile && companyProfile.pan_number));
    html = html.replace(/\{\{company_category\}\}/g, esc(companyProfile && companyProfile.company_category));
    html = html.replace(/\{\{group_code\}\}/g, esc(companyProfile && companyProfile.group_code));
    html = html.replace(/\{\{client_name\}\}/g, esc(clientUser.name || clientUser.email));
    html = html.replace(/\{\{client_email\}\}/g, esc(clientUser.email));
    html = html.replace(/\{\{date\}\}/g, now.toISOString().slice(0, 10));
    html = html.replace(/\{\{year\}\}/g, String(now.getFullYear()));

    // Re-sanitize the substituted output as defense-in-depth (template_html
    // was sanitized at write time, but DB-stored content can be tampered
    // with out-of-band).
    html = sanitizeTemplateHtml(html);

    const generatedDoc = await db.generatedDocument.create({
      data: {
        template_id: idVal.id,
        user_id: userIdVal.id,
        generated_by: req.user.id,
        template_name: template.template_name,
        generated_html: html,
        generated_at: now,
      },
    });

    res.status(201).json({ success: true, document: generatedDoc, html });
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── Generated Documents List ─────────────────────────────────────────────────

exports.getGeneratedDocuments = async (req, res) => {
  try {
    const where = {};
    if (req.query.user_id) {
      const userIdVal = validateObjectId(req.query.user_id, 'User ID');
      if (!userIdVal.valid) return res.status(400).json({ success: false, message: userIdVal.error });
      // Vuln 3: if sub_admin requested a specific user, verify ownership.
      const own = await assertClientOwned(req.user, userIdVal.id);
      if (!own.ok) return res.status(own.status).json({ success: false, message: own.message });
      where.user_id = userIdVal.id;
    }

    const documents = await db.generatedDocument.findMany({
      where,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });

    // Vuln 3: if sub_admin requested no specific user, filter the FULL list
    // down to documents whose user_id belongs to their franchise. The filter
    // runs in-memory because the data-store shim doesn't support `in:`
    // queries with hundreds of IDs cleanly.
    let scoped = documents;
    if (isSubAdmin(req.user) && !req.query.user_id) {
      const emails = await getFranchiseClientEmails(req.user);
      if (emails.size === 0) return res.json({ success: true, documents: [] });
      const franchiseClients = await db.user.findMany({ where: { role: 'client' } });
      const allowedIds = new Set(
        franchiseClients
          .filter(u => emails.has((u.email || '').toLowerCase()))
          .map(u => String(u.id))
      );
      scoped = documents.filter(d => allowedIds.has(String(d.user_id)));
    }

    res.json({ success: true, documents: scoped });
  } catch (error) {
    console.error('Get generated documents error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
