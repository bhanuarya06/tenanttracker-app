const { getTransporter } = require('../config/email');
const config = require('../config/config');
const logger = require('../utils/logger');

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn('Email not sent — SMTP not configured', { to, subject });
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
      text,
    });
    logger.info('Email sent', { to, subject });
    return true;
  } catch (error) {
    logger.error('Email send failed', { to, subject, error: error.message });
    return false;
  }
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: user.email,
    subject: 'Reset Your Password — TenantTracker',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b;">Password Reset</h2>
        <p style="color: #475569;">Hi ${user.firstName},</p>
        <p style="color: #475569;">We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
};

const sendBillNotification = async (tenant, bill) => {
  const user = tenant.user || tenant;
  return sendEmail({
    to: user.email,
    subject: `New Bill — ${bill.billingPeriodString} | TenantTracker`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b;">New Bill Generated</h2>
        <p style="color: #475569;">Hi ${user.firstName},</p>
        <p style="color: #475569;">A new bill has been generated for <strong>${bill.billingPeriodString}</strong>.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="margin: 8px 0;"><strong>Amount Due:</strong> ₹${bill.totalAmount?.toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Due Date:</strong> ${new Date(bill.dueDate).toLocaleDateString()}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${config.frontendUrl}/dashboard" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Bill</a>
        </div>
      </div>
    `,
    text: `New bill for ${bill.billingPeriodString}: ₹${bill.totalAmount}. Due: ${new Date(bill.dueDate).toLocaleDateString()}`,
  });
};

const sendPaymentConfirmation = async (tenant, payment, bill) => {
  const user = tenant.user || tenant;
  return sendEmail({
    to: user.email,
    subject: `Payment Confirmed — ₹${payment.amount} | TenantTracker`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b;">Payment Confirmed</h2>
        <p style="color: #475569;">Hi ${user.firstName},</p>
        <p style="color: #475569;">Your payment has been successfully recorded.</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="margin: 8px 0;"><strong>Amount:</strong> ₹${payment.amount?.toLocaleString()}</p>
          <p style="margin: 8px 0;"><strong>Method:</strong> ${payment.paymentMethod}</p>
          <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
          ${payment.transactionId ? `<p style="margin: 8px 0;"><strong>Transaction ID:</strong> ${payment.transactionId}</p>` : ''}
        </div>
      </div>
    `,
    text: `Payment of ₹${payment.amount} confirmed. Method: ${payment.paymentMethod}`,
  });
};

const sendWelcomeEmail = async (user) => {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to TenantTracker!',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
          <div style="background: #4f46e5; border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 20px;">🏠</span>
          </div>
          <span style="font-size: 20px; font-weight: 700; color: #1e293b;">TenantTracker</span>
        </div>
        <h2 style="color: #1e293b; margin-bottom: 8px;">Welcome, ${user.firstName}!</h2>
        <p style="color: #475569;">Your account has been created successfully. You can now start managing your properties and tenants.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Account Details</p>
          <p style="margin: 4px 0; color: #1e293b;"><strong>Email:</strong> ${user.email}</p>
          <p style="margin: 4px 0; color: #1e293b;"><strong>Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${config.frontendUrl}/dashboard" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
      </div>
    `,
    text: `Welcome to TenantTracker, ${user.firstName}! Your account is ready. Visit ${config.frontendUrl}/dashboard to get started.`,
  });
};

const sendTenantOnboardingEmail = async (tenantUser, owner, property, tempPassword = null) => {
  return sendEmail({
    to: tenantUser.email,
    subject: `You've been added as a tenant — TenantTracker`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
          <div style="background: #4f46e5; border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 20px;">🏠</span>
          </div>
          <span style="font-size: 20px; font-weight: 700; color: #1e293b;">TenantTracker</span>
        </div>
        <h2 style="color: #1e293b;">Hi ${tenantUser.firstName}, you've been added as a tenant!</h2>
        <p style="color: #475569;">${owner.firstName} ${owner.lastName} has added you as a tenant at <strong>${property.name}</strong>.</p>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Your Login Details</p>
          <p style="margin: 4px 0; color: #1e293b;"><strong>Email:</strong> ${tenantUser.email}</p>
          ${tempPassword ? `<p style="margin: 4px 0; color: #1e293b;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>` : ''}
        </div>
        ${tempPassword ? `<p style="color: #f59e0b; font-size: 14px;">⚠️ Please change your password after your first login.</p>` : ''}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${config.frontendUrl}/login" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Login to Your Account</a>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">You can view your bills and make payments from your tenant dashboard.</p>
      </div>
    `,
    text: `Hi ${tenantUser.firstName}, you've been added as a tenant at ${property.name} by ${owner.firstName} ${owner.lastName}. Login at ${config.frontendUrl}/login with email: ${tenantUser.email}${tempPassword ? ` and temporary password: ${tempPassword}` : ''}.`,
  });
};

const sendOwnerPaymentAlert = async (owner, tenant, payment, bill) => {
  return sendEmail({
    to: owner.email,
    subject: `Payment received — ₹${payment.amount?.toLocaleString()} from ${tenant.firstName} ${tenant.lastName}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
          <div style="background: #4f46e5; border-radius: 10px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 20px;">🏠</span>
          </div>
          <span style="font-size: 20px; font-weight: 700; color: #1e293b;">TenantTracker</span>
        </div>
        <h2 style="color: #1e293b;">Payment Received</h2>
        <p style="color: #475569;">A payment has been made by <strong>${tenant.firstName} ${tenant.lastName}</strong>.</p>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #22c55e;">
          <p style="margin: 8px 0; color: #1e293b;"><strong>Amount:</strong> ₹${payment.amount?.toLocaleString()}</p>
          <p style="margin: 8px 0; color: #1e293b;"><strong>Method:</strong> ${payment.paymentMethod}</p>
          <p style="margin: 8px 0; color: #1e293b;"><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
          <p style="margin: 8px 0; color: #1e293b;"><strong>Bill Period:</strong> ${bill.billingPeriodString}</p>
          ${payment.transactionId ? `<p style="margin: 8px 0; color: #1e293b;"><strong>Transaction ID:</strong> ${payment.transactionId}</p>` : ''}
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${config.frontendUrl}/dashboard" style="background: #4f46e5; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Dashboard</a>
        </div>
      </div>
    `,
    text: `Payment of ₹${payment.amount} received from ${tenant.firstName} ${tenant.lastName} via ${payment.paymentMethod} for ${bill.billingPeriodString}.`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendBillNotification,
  sendPaymentConfirmation,
  sendWelcomeEmail,
  sendTenantOnboardingEmail,
  sendOwnerPaymentAlert,
};
