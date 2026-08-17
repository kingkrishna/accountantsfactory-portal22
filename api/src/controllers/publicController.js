// Mongoose model removed, Prisma used directly inside the function
const emailService = require('../services/emailService');
const validator = require('validator');

exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, mobile, contact, service, message, source, ticketId } = req.body;

        // Support both 'mobile' and 'contact' keys from the frontend
        const phoneNumber = mobile || contact;

        if (!name || !email || !phoneNumber || !service) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, mobile/contact number, and service'
            });
        }

        // Generate a ticket ID if not provided by frontend
        let finalTicketId = ticketId;
        if (!finalTicketId) {
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomPart = Math.floor(10000 + Math.random() * 90000);
            finalTicketId = `TICKET-${timestamp}-${randomPart}`;
        }

        const prisma = require('../models/prismaClient');

        // Save to database
        const newContactMessage = await prisma.contactMessage.create({
            data: {
                name,
                email,
                mobile: phoneNumber,
                service,
                message: message || '',
                source: source || 'website',
                ticket_id: finalTicketId
            }
        });

        // Optionally notify admin (if email system is configured)
        try {
            if (emailService.isConfigured()) {
                const adminEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
                if (adminEmail) {
                    const subject = `New Contact Inquiry: ${name} - ${service}`;
                    const text = `You have received a new inquiry from the website contact form.
          
Ticket ID: ${finalTicketId}
Name: ${name}
Email: ${email}
Mobile: ${phoneNumber}
Service: ${service}
Message: ${message || 'No message provided'}

Log in to the admin dashboard to view this inquiry.`;

                    await emailService.sendEmail(adminEmail, subject, text);
                }
            }
        } catch (emailError) {
            console.error('Failed to send admin notification email:', emailError);
            // We still return success as the data was saved to DB
        }

        res.status(201).json({
            success: true,
            message: 'Your inquiry has been submitted successfully.',
            ticketId: finalTicketId
        });

    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your inquiry. Please try again later.'
        });
    }
};

// Feature E: Public franchise application. Piggybacks on ContactMessage
// table with source='franchise-application' to avoid a schema migration.
// Admin approves later from the admin dashboard which fires the sub_admin
// provisioning flow.
exports.submitFranchiseApplication = async (req, res) => {
    try {
        const { name, email, mobile, city, branchCode, message } = req.body;

        if (!name || !email || !mobile || !city) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, mobile, and city.' });
        }
        if (!validator.isEmail(String(email))) {
            return res.status(400).json({ success: false, message: 'Invalid email format.' });
        }
        // Basic phone sanity: 8-15 digits after stripping non-numerics
        const digits = String(mobile).replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 15) {
            return res.status(400).json({ success: false, message: 'Invalid mobile number.' });
        }

        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(10000 + Math.random() * 90000);
        const ticketId = `FRANCHISE-${timestamp}-${randomPart}`;

        // Sanitize + cap all free-text so a malicious payload can't blow the row.
        const trim = (s, n) => String(s || '').trim().slice(0, n);
        const suggestedCode = trim(branchCode, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, '');

        const prisma = require('../models/prismaClient');
        await prisma.contactMessage.create({
            data: {
                name: trim(name, 200),
                email: trim(email, 200).toLowerCase(),
                mobile: digits,
                service: 'Franchise Application',
                message: 'City: ' + trim(city, 100) +
                    (suggestedCode ? '\nSuggested branch code: ' + suggestedCode : '') +
                    (message ? '\n\n' + trim(message, 2000) : ''),
                source: 'franchise-application',
                ticket_id: ticketId
            }
        });

        // Notify admin — non-blocking
        try {
            if (emailService.isConfigured()) {
                const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_FROM;
                if (adminEmail) {
                    await emailService.sendEmail(
                        adminEmail,
                        `New Franchise Application: ${trim(name, 100)} (${trim(city, 100)})`,
                        `A new franchise application has been received.\n\n` +
                        `Ticket ID: ${ticketId}\n` +
                        `Name: ${trim(name, 200)}\n` +
                        `Email: ${trim(email, 200)}\n` +
                        `Mobile: ${digits}\n` +
                        `City: ${trim(city, 100)}\n` +
                        `Suggested branch code: ${suggestedCode || '(none)'}\n\n` +
                        `Message:\n${trim(message, 2000) || '(no additional message)'}\n\n` +
                        `Approve or reject from the admin dashboard → Franchise Applications section.`
                    );
                }
            }
        } catch (e) { console.error('Franchise application admin notify failed:', e.message); }

        res.status(201).json({
            success: true,
            message: 'Thanks — your franchise application is received. We will review and get back to you within 2 business days.',
            ticketId
        });
    } catch (error) {
        console.error('Franchise application submit error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit. Please try again.' });
    }
};

// Admin: list all franchise applications (full admin only).
exports.listFranchiseApplications = async (req, res) => {
    try {
        const prisma = require('../models/prismaClient');
        const rows = await prisma.contactMessage.findMany({
            where: { source: 'franchise-application' },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, applications: rows });
    } catch (error) {
        console.error('List franchise applications error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Admin: approve a franchise application. Creates a sub_admin using the
// applicant's email + a CSPRNG temp password + the requested branch code.
// The temp password is returned in the response so the admin can share it
// with the new franchise owner out-of-band (or an email is queued if SMTP
// is configured). Sets must_change_password=true.
exports.approveFranchiseApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const { branchCode } = req.body;
        if (!id) return res.status(400).json({ success: false, message: 'Application id required' });
        if (!branchCode) return res.status(400).json({ success: false, message: 'Branch code required for approval' });

        const prisma = require('../models/prismaClient');
        const bcrypt = require('bcryptjs');
        const crypto = require('crypto');

        const app = await prisma.contactMessage.findFirst({ where: { id: String(id), source: 'franchise-application' } });
        if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

        const existing = await prisma.user.findUnique({ where: { email: app.email.toLowerCase() } });
        if (existing) return res.status(409).json({ success: false, message: 'A user with this email already exists' });

        // CSPRNG password
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@$%*?&';
        const buf = crypto.randomBytes(16);
        let pw = '';
        for (let i = 0; i < 16; i++) pw += alphabet[buf[i] % alphabet.length];
        if (!/[A-Z]/.test(pw)) pw = 'A' + pw.slice(1);
        if (!/[a-z]/.test(pw)) pw = pw.slice(0, -1) + 'a';
        if (!/[0-9]/.test(pw)) pw = pw.slice(0, 14) + '2' + pw.slice(-1);
        if (!/[!@$%*?&]/.test(pw)) pw = pw.slice(0, 15) + '@';

        const code = String(branchCode).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!code) return res.status(400).json({ success: false, message: 'Invalid branch code' });

        const hash = await bcrypt.hash(pw, 10);
        const created = await prisma.user.create({
            data: {
                email: app.email.toLowerCase(),
                password_hash: hash,
                role: 'sub_admin',
                referral_code: code,
                status: 'active',
                must_change_password: true,
                name: app.name || null
            }
        });

        // Mark the application as processed by appending to the message text.
        try {
            await prisma.contactMessage.update({
                where: { id: app.id },
                data: {
                    message: (app.message || '') +
                        '\n\n[APPROVED ' + new Date().toISOString().slice(0, 10) +
                        ' by ' + (req.user?.email || 'admin') +
                        ' — provisioned sub_admin ' + created.email + ' as branch ' + code + ']'
                }
            });
        } catch (_) {}

        // Send welcome email (non-blocking)
        try {
            if (emailService.isConfigured()) {
                await emailService.sendEmail(
                    app.email,
                    'Welcome to the AccountantsFactory Franchise Network',
                    `Hi ${app.name || 'there'},\n\n` +
                    `Your franchise application has been approved. Your branch: ${code}.\n\n` +
                    `Log in at https://www.accountantsfactory.com/portal/login.html\n` +
                    `Email: ${app.email}\n` +
                    `Temporary password: ${pw}\n\n` +
                    `You will be asked to set a new password on your first login.\n\n` +
                    `Welcome aboard!\n— AccountantsFactory Team`
                );
            }
        } catch (e) { console.error('Franchise welcome email failed:', e.message); }

        res.json({
            success: true,
            message: 'Franchise approved and sub_admin provisioned.',
            branchCode: code,
            subAdmin: { id: created.id, email: created.email, role: created.role },
            temporaryPassword: pw
        });
    } catch (error) {
        console.error('Approve franchise application error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
