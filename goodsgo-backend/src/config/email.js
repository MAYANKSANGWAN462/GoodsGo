'use strict';

const { Resend } = require('resend');

// ─── Resend HTTP Client ────────────────────────────────────────────────────────
// Uses Resend's HTTP API instead of SMTP, so Railway's outbound port blocks
// (25, 587, 465) do not affect email delivery.
//
// Required env var:
//   RESEND_API_KEY — from resend.com dashboard → API Keys

let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] WARNING: RESEND_API_KEY is not set — emails will fail');
  }

  _client = new Resend(apiKey);
  console.log('[Email] Resend client initialised');
  return _client;
}

/**
 * sendMail — Sends an email via Resend's HTTP API.
 *
 * @param {{ from: string, to: string, subject: string, html?: string, text?: string }} opts
 * @returns {Promise<object>} Resend response data
 * @throws {Error} On API error
 */
async function sendMail({ from, to, subject, html, text }) {
  const client = getClient();
  const payload = { from, to, subject };
  if (html)  payload.html = html;
  if (text)  payload.text = text;

  const { data, error } = await client.emails.send(payload);
  if (error) {
    const err = new Error(error.message || 'Resend API error');
    err.code = error.name;
    throw err;
  }
  return data;
}

/**
 * verifyEmailConnection — Checks that RESEND_API_KEY is present at startup.
 * Resend has no SMTP handshake to verify — the key is validated on first send.
 *
 * @returns {Promise<boolean>}
 */
async function verifyEmailConnection() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY is not set — emails will fail');
    return false;
  }
  console.log('[Email] RESEND_API_KEY is present — Resend client ready');
  return true;
}

/**
 * resetTransporter — Clears the singleton (used in tests).
 */
function resetTransporter() {
  _client = null;
}

module.exports = { sendMail, verifyEmailConnection, resetTransporter };
