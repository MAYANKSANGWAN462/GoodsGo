'use strict';

const fs   = require('fs');
const path = require('path');
const { sendMail } = require('../config/email');

// ─── Template Engine ──────────────────────────────────────────────────────────

const TEMPLATES_DIR = path.join(__dirname, 'emailTemplates');
const APP_NAME      = 'GoodsGo';
const SUPPORT_EMAIL = process.env.EMAIL_FROM || 'support@goodsgo.in';

/**
 * renderTemplate — Reads an HTML template and replaces {{ variable }} tokens.
 *
 * Returns null if the template file does not exist, allowing sendEmail() to
 * fall back to the plaintext fallback rather than crashing.
 *
 * @param {string} templateName - Filename without .html extension
 * @param {Object} variables    - Key-value pairs for {{ key }} substitution
 * @returns {string|null} Rendered HTML or null if template not found
 */
function renderTemplate(templateName, variables) {
  const filePath = path.join(TEMPLATES_DIR, `${templateName}.html`);

  let html;
  try {
    html = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null; // Template file missing — caller falls back to plain text
  }

  const allVars = {
    appName:      APP_NAME,
    year:         new Date().getFullYear(),
    supportEmail: SUPPORT_EMAIL,
    frontendUrl:  process.env.FRONTEND_URL || 'https://goodsgo.in',
    ...variables
  };

  for (const [key, value] of Object.entries(allVars)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    html = html.replace(pattern, String(value ?? ''));
  }

  return html;
}

// ─── sendEmail ────────────────────────────────────────────────────────────────

/**
 * sendEmail — Generic email dispatcher with HTML template support.
 *
 * Attempts to render the named HTML template; if the template file is missing,
 * falls back to the provided plain-text content. This ensures delivery even
 * when templates are not yet generated (e.g. during initial deployment).
 *
 * @param {Object} opts
 * @param {string} opts.to           - Recipient email address
 * @param {string} opts.subject      - Email subject line
 * @param {string} opts.templateName - Template filename (without .html)
 * @param {Object} [opts.variables]  - Template variable substitutions
 * @param {string} [opts.textFallback] - Plain text sent if template is missing
 * @returns {Promise<void>}
 * @throws {Error} On SMTP transport failure
 */
async function sendEmail({ to, subject, templateName, variables = {}, textFallback = '' }) {
  const html = renderTemplate(templateName, variables);

  const mailOptions = {
    // EMAIL_FROM should always be set in production.
    // If not, fall back to EMAIL_USER (the authenticated Gmail address) so Gmail
    // does not reject the message for mismatched sender domain.
    from:    process.env.EMAIL_FROM ||
             (process.env.EMAIL_USER ? `"${APP_NAME}" <${process.env.EMAIL_USER}>` : `"${APP_NAME}" <noreply@goodsgo.in>`),
    to,
    subject,
    ...(html ? { html } : { text: textFallback })
  };

  await sendMail(mailOptions);
}

// ─── Named Convenience Wrappers ───────────────────────────────────────────────
// Each wrapper encapsulates the template selection, subject, and variables for
// one specific email type. Keep these thin — all content lives in the templates.

/**
 * sendVerificationEmail — Sends the email verification link to a new user.
 *
 * @param {string} email           - Recipient email address
 * @param {string} fullName        - Recipient's full name (for personalisation)
 * @param {string} verificationUrl - The verification link URL
 * @returns {Promise<void>}
 */
async function sendVerificationEmail(email, fullName, verificationUrl) {
  return sendEmail({
    to:           email,
    subject:      `Verify your ${APP_NAME} account`,
    templateName: 'verify-email',
    variables:    { fullName, verificationUrl },
    textFallback: `Hi ${fullName},\n\nVerify your email: ${verificationUrl}\n\nThis link expires in 1 hour.\n\n— ${APP_NAME} Team`
  });
}

/**
 * sendPasswordResetEmail — Sends the password reset link.
 *
 * @param {string} email    - Recipient email address
 * @param {string} fullName - Recipient's full name
 * @param {string} resetUrl - The password reset link URL
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email, fullName, resetUrl) {
  return sendEmail({
    to:           email,
    subject:      `Reset your ${APP_NAME} password`,
    templateName: 'reset-password',
    variables:    { fullName, resetUrl },
    textFallback: `Hi ${fullName},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\n— ${APP_NAME} Team`
  });
}

/**
 * sendWelcomeEmail — Sent after successful email verification.
 *
 * @param {string} email    - Recipient email address
 * @param {string} fullName - Recipient's full name
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(email, fullName) {
  return sendEmail({
    to:           email,
    subject:      `Welcome to ${APP_NAME}!`,
    templateName: 'welcome',
    variables:    { fullName },
    textFallback: `Hi ${fullName},\n\nWelcome to ${APP_NAME}! Your email has been verified and your account is ready.\n\n— ${APP_NAME} Team`
  });
}

/**
 * sendBookingRequestEmail — Notifies a post owner they have a new booking request.
 *
 * @param {{ email: string, fullName: string }} recipient - Post owner
 * @param {{ title: string, body: string, bookingId?: string }} details
 * @returns {Promise<void>}
 */
async function sendBookingRequestEmail(recipient, details) {
  return sendEmail({
    to:           recipient.email,
    subject:      `New booking request — ${APP_NAME}`,
    templateName: 'booking-request',
    variables: {
      fullName:  recipient.fullName,
      title:     details.title || 'New booking request',
      body:      details.body  || 'You have received a new booking request.',
      bookingId: details.bookingId || '',
      frontendUrl: process.env.FRONTEND_URL || 'https://goodsgo.in'
    },
    textFallback:
      `Hi ${recipient.fullName},\n\n${details.body || 'You have a new booking request.'}\n\n` +
      `Log in to view it.\n\n— ${APP_NAME} Team`
  });
}

/**
 * sendBookingAcceptedEmail — Notifies a requester their booking was accepted.
 *
 * @param {{ email: string, fullName: string }} recipient - Requester
 * @param {{ title: string, body: string, bookingId?: string }} details
 * @returns {Promise<void>}
 */
async function sendBookingAcceptedEmail(recipient, details) {
  return sendEmail({
    to:           recipient.email,
    subject:      `Your booking has been accepted — ${APP_NAME}`,
    templateName: 'booking-accepted',
    variables: {
      fullName:  recipient.fullName,
      title:     details.title || 'Booking accepted!',
      body:      details.body  || 'Your booking request has been accepted.',
      bookingId: details.bookingId || '',
      frontendUrl: process.env.FRONTEND_URL || 'https://goodsgo.in'
    },
    textFallback:
      `Hi ${recipient.fullName},\n\n${details.body || 'Your booking request has been accepted.'}\n\n` +
      `Log in to view the details.\n\n— ${APP_NAME} Team`
  });
}

/**
 * sendBookingCancelledEmail — Notifies the other party that a booking was cancelled.
 *
 * @param {{ email: string, fullName: string }} recipient - The party being notified
 * @param {{ title: string, body: string, bookingId?: string }} details
 * @returns {Promise<void>}
 */
async function sendBookingCancelledEmail(recipient, details) {
  return sendEmail({
    to:           recipient.email,
    subject:      `A booking has been cancelled — ${APP_NAME}`,
    templateName: 'booking-cancelled',
    variables: {
      fullName:  recipient.fullName,
      title:     details.title || 'Booking cancelled',
      body:      details.body  || 'A booking has been cancelled.',
      bookingId: details.bookingId || '',
      frontendUrl: process.env.FRONTEND_URL || 'https://goodsgo.in'
    },
    textFallback:
      `Hi ${recipient.fullName},\n\n${details.body || 'A booking has been cancelled.'}\n\n` +
      `Log in to view your bookings.\n\n— ${APP_NAME} Team`
  });
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendBookingRequestEmail,
  sendBookingAcceptedEmail,
  sendBookingCancelledEmail
};
