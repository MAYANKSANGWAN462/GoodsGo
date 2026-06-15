'use strict';

const { Pool } = require('pg');

// ─── Connection Pool ──────────────────────────────────────────────────────────
// A pool maintains multiple PostgreSQL connections and reuses them across requests.
// Without pooling, each query would open and close a TCP connection — expensive.
//
// Neon.tech free tier: max 10 concurrent connections.
// Set DB_POOL_MAX=5 in development to leave headroom.
// Upgrade to a paid Neon plan or self-hosted PostgreSQL for higher limits.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  idleTimeoutMillis: 30_000,       // Release idle connections after 30s
  connectionTimeoutMillis: 5_000,  // Fail fast if can't get connection in 5s

  // SSL required for Neon.tech (and most cloud PostgreSQL providers).
  // rejectUnauthorized: false accepts self-signed certs (needed for some providers).
  // In development without SSL, set DATABASE_URL to a local postgres:// URL.
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('ssl') ? { rejectUnauthorized: false } : false)
});

// ─── Pool Event Handlers ──────────────────────────────────────────────────────

pool.on('connect', (client) => {
  // Runs every time a new physical DB connection is established
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] New client connected to PostgreSQL pool');
  }
});

pool.on('error', (err) => {
  // Runs when an idle client encounters an error (e.g. DB server restart)
  // The pool handles reconnection automatically — we just log the event.
  console.error('[DB] Unexpected pool client error:', err.message);
});

// ─── Query Wrapper ────────────────────────────────────────────────────────────

/**
 * query — Executes a parameterised SQL query against the connection pool.
 *
 * ALWAYS use parameterised queries ($1, $2, etc.) to prevent SQL injection.
 * NEVER interpolate user input into the query string.
 *
 * ❌ UNSAFE (SQL injection possible):
 *   await query(`SELECT * FROM users WHERE email = '${email}'`);
 *
 * ✅ SAFE (parameterised):
 *   await query('SELECT * FROM users WHERE email = $1', [email]);
 *
 * @param {string} text - SQL query string with $1, $2, ... placeholders
 * @param {Array} [params=[]] - Values corresponding to placeholders
 * @returns {Promise<{ rows: Object[], rowCount: number, command: string }>}
 * @throws {Error} PostgreSQL error (constraint violation, syntax error, etc.)
 */
async function query(text, params = []) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries in development (>100ms) so they can be optimised
    if (process.env.NODE_ENV === 'development') {
      const preview = text.replace(/\s+/g, ' ').trim().slice(0, 80);
      if (duration > 100) {
        console.warn(`[DB] SLOW QUERY (${duration}ms): ${preview}`);
      }
    }

    return result;
  } catch (err) {
    // Log the full query text on error so it's easy to reproduce
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 120);
    console.error(`[DB] Query error: ${err.message} | Query: ${preview}`);
    throw err; // Re-throw — service layer handles the error
  }
}

// ─── Transaction Client ───────────────────────────────────────────────────────

/**
 * getClient — Acquires a dedicated client from the pool for transaction use.
 *
 * Use this (not pool.query) when you need multiple queries in a single
 * atomic transaction (BEGIN → queries → COMMIT, or ROLLBACK on error).
 *
 * IMPORTANT: Always call client.release() in a finally block.
 * Failing to release a client leaks a pool connection permanently.
 *
 * Pattern used throughout bookings.service.js for accept/cancel operations:
 *
 *   const client = await getClient();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query('SELECT ... FOR UPDATE', [postId]);
 *     await client.query('UPDATE bookings SET status = $1 WHERE id = $2', [...]);
 *     await client.query('UPDATE posts SET status = $1 WHERE id = $2', [...]);
 *     await client.query('COMMIT');
 *   } catch (err) {
 *     await client.query('ROLLBACK');
 *     throw err;
 *   } finally {
 *     client.release(); // MUST always run
 *   }
 *
 * @returns {Promise<import('pg').PoolClient>}
 */
async function getClient() {
  const client = await pool.connect();

  // Wrap the original release function to log in development
  if (process.env.NODE_ENV === 'development') {
    const originalRelease = client.release.bind(client);
    client.release = (...args) => {
      console.log('[DB] Client released back to pool');
      return originalRelease(...args);
    };
  }

  return client;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

/**
 * checkConnection — Verifies the database is reachable.
 * Used by GET /health endpoint to report database status.
 *
 * @returns {Promise<boolean>} true if connected, false if unreachable
 */
async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    console.error('[DB] Health check failed:', err.message);
    return false;
  }
}

module.exports = { pool, query, getClient, checkConnection };