'use strict';

const nodemailer = require('nodemailer');

// ─── Singleton Transporter ────────────────────────────────────────────────────
// Creating a transporter is cheap, but verifying SMTP credentials involves a
// network round-trip. We create the transporter once and reuse it for all emails.

let _transporter = null;

/**
 * getTransporter — Returns the Nodemailer transporter, creating it on first call.
 *
 * Configuration is read from environment variables at call time (not module load time),
 * so the server can start without email credentials and they can be added later.
 *
 * For Gmail:
 *  - EMAIL_HOST: smtp.gmail.com
 *  - EMAIL_PORT: 587
 *  - EMAIL_SECURE: false   (587 uses STARTTLS, not SSL)
 *  - EMAIL_USER: your Gmail address
 *  - EMAIL_PASS: App Password from myaccount.google.com/apppasswords (NOT your Gmail password)
 *    → 2FA must be enabled on the Gmail account to create App Passwords
 *
 * For production (SendGrid):
 *  - EMAIL_HOST: smtp.sendgrid.net
 *  - EMAIL_PORT: 587
 *  - EMAIL_SECURE: false
 *  - EMAIL_USER: apikey   (literal string "apikey")
 *  - EMAIL_PASS: your SendGrid API key
 *
 * @returns {nodemailer.Transporter}
 */
function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const secure = process.env.EMAIL_SECURE === 'true'; // true = port 465 SSL, false = STARTTLS
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    console.warn(
      '[Email] WARNING: EMAIL_HOST, EMAIL_USER, or EMAIL_PASS is not configured. ' +
      'Transactional emails will fail. Set these in your .env file.'
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for port 465, false for 587 (STARTTLS upgrades after connect)
    auth: {
      user,
      pass
    },
    tls: {
      // In production, enforce valid certificates (prevents MITM attacks).
      // In development/test, allow self-signed certs for local SMTP servers.
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    // Pool SMTP connections for better throughput on high-volume sending.
    // For MVP (< 100 emails/day), this is optional but good practice.
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  if (process.env.NODE_ENV === 'development' && host) {
    console.log(`[Email] Transporter created — host: ${host}:${port} | user: ${user}`);
  }

  return _transporter;
}

/**
 * verifyEmailConnection — Tests the SMTP connection without sending an email.
 *
 * Call this during server startup (optional) to surface misconfigured email
 * credentials early, before the first real email send attempt.
 *
 * Does NOT throw on failure — returns false so the server can continue.
 * The server should not refuse to start because SMTP is misconfigured.
 *
 * Usage in server.js (optional, after pool.listen):
 *   const { verifyEmailConnection } = require('./src/config/email');
 *   verifyEmailConnection(); // Fire-and-forget
 *
 * @returns {Promise<boolean>} true if SMTP connection verified, false otherwise
 */
async function verifyEmailConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (err) {
    console.warn(`[Email] SMTP verification failed: ${err.message}`);
    console.warn('[Email] Email sending will fail until credentials are corrected.');
    return false;
  }
}

/**
 * resetTransporter — Destroys the singleton so it will be recreated on next call.
 *
 * Used in tests to reset state between test suites.
 * Not needed in normal application code.
 */
function resetTransporter() {
  if (_transporter) {
    _transporter.close();
    _transporter = null;
  }
}

module.exports = { getTransporter, verifyEmailConnection, resetTransporter };