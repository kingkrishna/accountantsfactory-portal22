const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles sending emails for password reset and other notifications
 */

class EmailService {
  constructor() {
    // Initialize transporter based on environment configuration
    this.transporter = null;
    this.fromEmail = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@accountantsfactory.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'AccountantsFactory';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on configuration
   */
  initializeTransporter() {
    // Check if email is configured
    if (!process.env.EMAIL_SERVICE && !process.env.SMTP_HOST) {
      console.warn('Email service not configured. Email features will not work.');
      return;
    }

    // Support for different email services
    if (process.env.EMAIL_SERVICE === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
        }
      });
    } else if (process.env.EMAIL_SERVICE === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        },
        tls: { rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false' }
      });
    } else if (process.env.SMTP_HOST) {
      // Custom SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
        }
      });
    } else {
      // Development mode - use ethereal email (testing)
      console.warn('Using Ethereal Email for testing. Emails will not be sent in production.');
    }
  }

  /**
   * Send password reset email
   * @param {String} toEmail - Recipient email address
   * @param {String} resetToken - Password reset token
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetEmail(toEmail, resetToken) {
    if (!this.transporter) {
      // In development, log the reset link instead
      if (process.env.NODE_ENV !== 'production') {
        const resetUrl = `${this.frontendUrl}/portal/reset-password.html?token=${resetToken}`;
        console.log(`\n=== Password Reset Email (Development Mode) ===`);
        console.log(`To: ${toEmail}`);
        console.log(`Reset URL: ${resetUrl}`);
        console.log(`===============================================\n`);
        return { success: true, message: 'Email logged (development mode)' };
      }
      throw new Error('Email service not configured');
    }

    const resetUrl = `${this.frontendUrl}/portal/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: toEmail,
      subject: 'Password Reset Request - AccountantsFactory',
      html: this.getPasswordResetEmailTemplate(resetUrl),
      text: this.getPasswordResetEmailText(resetUrl)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Get HTML template for password reset email
   * @param {String} resetUrl - Password reset URL
   * @returns {String} - HTML email template
   */
  getPasswordResetEmailTemplate(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - AccountantsFactory</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h2>
          
          <p>Hello,</p>
          
          <p>We received a request to reset your password for your AccountantsFactory account.</p>
          
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <p style="color: #dc3545; font-size: 14px; margin-top: 30px;">
            <strong>Important:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="color: #666; font-size: 12px; margin-bottom: 0;">
            This is an automated email from AccountantsFactory. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get plain text version of password reset email
   * @param {String} resetUrl - Password reset URL
   * @returns {String} - Plain text email
   */
  getPasswordResetEmailText(resetUrl) {
    return `
Password Reset Request - AccountantsFactory

Hello,

We received a request to reset your password for your AccountantsFactory account.

Click the link below to reset your password:
${resetUrl}

Important: This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

This is an automated email from AccountantsFactory. Please do not reply to this email.
    `.trim();
  }

  /**
   * Notify an employee that a task (service order) has been assigned to them.
   */
  async sendTaskAssignedEmail(toEmail, { clientName, clientEmail, serviceName, period, orderId, notes }) {
    if (!this.transporter) {
      console.warn('[emailService] Task-assigned email skipped (SMTP not configured): ' + toEmail);
      return { success: false, message: 'Email service not configured' };
    }
    const dashboardUrl = `${this.frontendUrl}/portal/employee/dashboard.html`;
    const safe = (s) => String(s == null ? '' : s).replace(/[<>"']/g, c => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const html = `
      <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;line-height:1.6;">
        <div style="background:#f8f9fa;padding:28px;border-radius:10px;border-left:4px solid #0c9782;">
          <h2 style="color:#0c9782;margin-top:0;">📋 New Task Assigned</h2>
          <p>Hello,</p>
          <p>You have been assigned a new service order to work on.</p>
          <table style="width:100%;margin:18px 0;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#666;width:35%;"><strong>Client:</strong></td><td style="padding:6px 0;">${safe(clientName || clientEmail)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;"><strong>Service:</strong></td><td style="padding:6px 0;">${safe(serviceName)}</td></tr>
            <tr><td style="padding:6px 0;color:#666;"><strong>Period:</strong></td><td style="padding:6px 0;">${safe(period || '—')}</td></tr>
            <tr><td style="padding:6px 0;color:#666;"><strong>Order ID:</strong></td><td style="padding:6px 0;font-family:monospace;font-size:13px;">${safe(orderId)}</td></tr>
            ${notes ? `<tr><td style="padding:6px 0;color:#666;vertical-align:top;"><strong>Notes:</strong></td><td style="padding:6px 0;">${safe(notes)}</td></tr>` : ''}
          </table>
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${dashboardUrl}" style="background:#0c9782;color:#fff;padding:12px 26px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">Open Employee Dashboard</a>
          </div>
          <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;"/>
          <p style="font-size:12px;color:#888;margin:0;">This is an automated notification from AccountantsFactory Portal. Please complete the task and submit EOD updates from your dashboard.</p>
        </div>
      </body></html>`;
    const text = `New Task Assigned - AccountantsFactory\n\nClient: ${clientName || clientEmail}\nService: ${serviceName}\nPeriod: ${period || '-'}\nOrder ID: ${orderId}\n${notes ? 'Notes: ' + notes + '\n' : ''}\nOpen your dashboard: ${dashboardUrl}`;
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: toEmail,
      subject: `New task assigned: ${serviceName}${clientName ? ' — ' + clientName : ''}`,
      html, text
    };
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('[emailService] Task-assigned email sent to ' + toEmail + ': ' + info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('[emailService] Task-assigned email failed:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Check if email service is configured
   * @returns {Boolean}
   */
  isConfigured() {
    return !!this.transporter;
  }

  /**
   * Send a generic email
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} text - Plain text body
   * @returns {Promise<Object>}
   */
  async sendEmail(to, subject, text) {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to,
      subject,
      text
    };
    const info = await this.transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    if (!this.transporter) {
      return { success: false, message: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is configured correctly' };
    } catch (error) {
      return { success: false, message: `Email service error: ${error.message}` };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
