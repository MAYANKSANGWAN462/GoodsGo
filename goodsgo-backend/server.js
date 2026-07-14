'use strict';

// ─── Load environment variables FIRST ───────────────────────────────────────
// Must be the very first line before any other require() that might read
// process.env. All config files depend on env vars being available.
require('dotenv').config();

// ─── Error Monitoring (Sentry) ───────────────────────────────────────────────
// Initialised here — before all other requires — so Sentry can auto-instrument
// http, pg, and Node built-ins via its OpenTelemetry integration.
// Only active when SENTRY_DSN is set; dev and CI runs without a DSN are no-ops.
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Sample 10% of transactions in production to stay within free-tier limits.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

// ─── Validate critical environment variables on startup ──────────────────────
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ADMIN_SECRET',
  'NODE_ENV',
  'PORT'
];

const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error('FATAL: Missing required environment variables:');
  missingVars.forEach((v) => console.error(`  - ${v}`));
  console.error('Copy .env.example to .env and fill in all values.');
  process.exit(1);
}

// ─── Core imports ────────────────────────────────────────────────────────────
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const { pool } = require('./src/config/database');

// ─── Create HTTP server ───────────────────────────────────────────────────────
// Express app is passed to http.createServer so Socket.io can share
// the same port as the REST API (no separate WebSocket port needed).
const server = http.createServer(app);

// ─── Attach Socket.io ─────────────────────────────────────────────────────────
// initSocket() configures Socket.io with CORS and transport settings.
// The io instance is stored as a singleton inside config/socket.js and
// accessible via getIO() throughout the application.
const io = initSocket(server);

// ─── Register Socket.io event handlers ───────────────────────────────────────
// Block J: socket.handler.js registers the authenticate lifecycle, chat events,
// and notification mark_read event on the io instance.
const initSocketHandlers = require('./src/socket/socket.handler');
initSocketHandlers(io);

// ─── Start background jobs ────────────────────────────────────────────────────
// Post expiry + booking auto-reject — runs hourly.
// Defined in Block H (posts module) because it primarily manages post status.
const { startJobs } = require('./src/jobs/expirePosts.job');
startJobs();

// ─── Start listening ──────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

server.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  GoodsGo API Server`);
  console.log(`  Environment : ${NODE_ENV}`);
  console.log(`  Port        : ${PORT}`);
  console.log(`  Health      : http://localhost:${PORT}/health`);
  console.log('─────────────────────────────────────────');

  // Verify SMTP credentials on startup so misconfiguration shows in logs immediately.
  const { verifyEmailConnection } = require('./src/config/email');
  verifyEmailConnection();
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// When the OS sends SIGTERM (e.g. Render.com deployment restart, Docker stop),
// we: stop accepting new connections → wait for in-flight requests → close DB.
// This prevents dropped requests and incomplete DB transactions.

const SHUTDOWN_TIMEOUT_MS = 30_000; // 30 seconds max wait

/**
 * Graceful shutdown sequence
 * @param {string} signal - The signal that triggered shutdown
 */
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Graceful shutdown initiated...`);

  // Step 1: Stop accepting new HTTP connections
  server.close(async (err) => {
    if (err) {
      console.error('Error closing HTTP server:', err.message);
    } else {
      console.log('HTTP server closed. No new connections accepted.');
    }

    // Step 2: Close Socket.io connections
    if (io) {
      io.close(() => {
        console.log('Socket.io connections closed.');
      });
    }

    // Step 3: Drain the database connection pool
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch (dbErr) {
      console.error('Error closing database pool:', dbErr.message);
    }

    console.log('Shutdown complete. Goodbye.');
    process.exit(err ? 1 : 0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error(`Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) exceeded. Forcing exit.`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref(); // .unref() prevents this timer from keeping the process alive
}

// SIGTERM: sent by process managers (Render, Railway, Docker, PM2) on deploy/stop
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGINT: sent by Ctrl+C in development terminal
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Unhandled Rejection / Uncaught Exception Guards ─────────────────────────
// These are last-resort handlers. In normal operation, asyncHandler() in
// controllers catches async errors. These catch anything that slips through.

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED PROMISE REJECTION:');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  // Do NOT call process.exit() here — the server can continue for other requests.
  // Log to monitoring service in production (e.g. Sentry).
});

process.on('uncaughtException', (err) => {
  // An uncaught exception means the process is in an unknown state.
  // The only safe action is to log and exit. The process manager will restart it.
  console.error('UNCAUGHT EXCEPTION — process will exit:');
  console.error(err);
  process.exit(1);
});

module.exports = server; // Exported for integration testing