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
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
    // No pool — Gmail closes idle SMTP connections after ~30s, causing pooled
    // connections to go stale and drop emails silently. One connection per send
    // is slower but reliable for low-volume transactional email.
  });

  console.log(`[Email] Transporter created — host: ${host}:${port} | user: ${user}`);

  return _transporter;
}

// ─── Brevo HTTP API ───────────────────────────────────────────────────────────
// Free-tier cloud hosts (Railway, Render) block outbound SMTP ports (25/465/587)
// to prevent spam, so nodemailer times out in production even with valid Gmail
// credentials. Brevo's transactional API is plain HTTPS on port 443 — never
// blocked — and the free plan sends 300 emails/day to any recipient.
//
// When BREVO_API_KEY is set, sendMail() routes through Brevo; otherwise it uses
// the SMTP transporter above (local development with Gmail keeps working).
//
// Setup: brevo.com → verify sender address → Settings → API Keys → BREVO_API_KEY

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * parseFromAddress — Splits '"Name" <addr@x.com>' into { name, email }.
 * Brevo requires sender as a structured object, not an RFC 5322 string.
 *
 * @param {string} from
 * @returns {{ name: string, email: string }}
 */
function parseFromAddress(from) {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || 'GoodsGo', email: match[2].trim() };
  }
  return { name: 'GoodsGo', email: from.trim() };
}

/**
 * sendViaBrevo — Sends one transactional email through Brevo's HTTP API.
 *
 * @param {{ from: string, to: string, subject: string, html?: string, text?: string }} opts
 * @returns {Promise<object>} Brevo response body (contains messageId)
 * @throws {Error} On non-2xx API response
 */
async function sendViaBrevo({ from, to, subject, html, text }) {
  const payload = {
    sender: parseFromAddress(from),
    to: [{ email: to }],
    subject,
    ...(html ? { htmlContent: html } : { textContent: text || '' })
  };

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ─── Gmail API (OAuth2 over HTTPS) ────────────────────────────────────────────
// Sends through Google's own servers via the Gmail REST API on port 443, so it
// works on hosts that block SMTP AND gets perfect deliverability for a
// gmail.com sender (SPF/DKIM/DMARC all align because Google itself sends it).
//
// Required env vars (all three, or the Gmail path is skipped):
//   GMAIL_CLIENT_ID     — OAuth client ID from Google Cloud Console
//   GMAIL_CLIENT_SECRET — OAuth client secret
//   GMAIL_REFRESH_TOKEN — long-lived token minted via OAuth playground
// Sender address is EMAIL_USER (the Google account that authorized the app).
//
// Daily quota: 500 recipients/day for a consumer Gmail account — ample here.

let _gmailAccess = { token: null, expiresAt: 0 };

/**
 * getGmailAccessToken — Exchanges the refresh token for a short-lived access
 * token, cached until ~5 minutes before expiry.
 *
 * @returns {Promise<string>} OAuth2 access token
 * @throws {Error} If Google rejects the refresh token
 */
async function getGmailAccessToken() {
  if (_gmailAccess.token && Date.now() < _gmailAccess.expiresAt) {
    return _gmailAccess.token;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type:    'refresh_token'
    })
  });

  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`Gmail OAuth token refresh failed (HTTP ${res.status}): ${body.error_description || body.error || 'unknown error'}`);
  }

  _gmailAccess = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in - 300) * 1000
  };
  return _gmailAccess.token;
}

/**
 * buildMimeMessage — Assembles a minimal RFC 2822 message for the Gmail API.
 * Subject is RFC 2047 base64-encoded so non-ASCII characters are safe.
 *
 * @param {{ from: string, to: string, subject: string, html?: string, text?: string }} opts
 * @returns {string} base64url-encoded raw message
 */
function buildMimeMessage({ from, to, subject, html, text }) {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    html
      ? 'Content-Type: text/html; charset=UTF-8'
      : 'Content-Type: text/plain; charset=UTF-8',
    '',
    html || text || ''
  ];
  return Buffer.from(lines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * sendViaGmailApi — Sends one email through the Gmail REST API.
 *
 * @param {{ from: string, to: string, subject: string, html?: string, text?: string }} opts
 * @returns {Promise<object>} Gmail API response (contains message id)
 * @throws {Error} On non-2xx API response
 */
async function sendViaGmailApi(opts) {
  const accessToken = await getGmailAccessToken();

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ raw: buildMimeMessage(opts) })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gmail API send failed (HTTP ${res.status}): ${body}`);
  }

  return res.json();
}

/**
 * isGmailApiConfigured — All three Gmail OAuth env vars are present.
 * @returns {boolean}
 */
function isGmailApiConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
}

/**
 * sendMail — Provider-agnostic email dispatch.
 * Priority: Gmail API → Brevo HTTP API → SMTP transporter.
 *
 * @param {{ from: string, to: string, subject: string, html?: string, text?: string }} mailOptions
 * @returns {Promise<object>}
 */
async function sendMail(mailOptions) {
  if (isGmailApiConfigured()) {
    return sendViaGmailApi(mailOptions);
  }
  if (process.env.BREVO_API_KEY) {
    return sendViaBrevo(mailOptions);
  }
  return getTransporter().sendMail(mailOptions);
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
  _gmailAccess = { token: null, expiresAt: 0 };
}

module.exports = {
  getTransporter,
  sendMail,
  getGmailAccessToken,
  isGmailApiConfigured,
  verifyEmailConnection,
  resetTransporter
};