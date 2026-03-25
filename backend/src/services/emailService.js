
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

const sendPaymentConfirmation = async (tenant, payment) => {
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

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendBillNotification,
  sendPaymentConfirmation,
};
