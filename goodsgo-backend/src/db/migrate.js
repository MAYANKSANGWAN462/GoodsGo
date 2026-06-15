'use strict';

// Load environment variables before any other require
require('dotenv').config();

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

// ─── Configuration ────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Dedicated pool for the migration runner — max: 1 for sequential execution.
// Separate from the app pool so pool.end() here does not affect a running server.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 15_000,
  ssl: (() => {
    const url = process.env.DATABASE_URL || '';
    if (
      url.includes('neon.tech') ||
      url.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production'
    ) {
      return { rejectUnauthorized: false };
    }
    return false;
  })()
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute a short SHA-256 checksum for a migration file.
 * Stored in schema_migrations for integrity verification.
 * If a previously-applied file's checksum changes, it signals tampering.
 * @param {string} content - SQL file content
 * @returns {string} 16-character hex digest
 */
function fileChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Read and sort all .sql files from the migrations directory.
 * Alphabetical sort equals numerical order due to 001_, 002_... prefix convention.
 * @returns {string[]} Sorted array of .sql filenames
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No .sql files found in: ${MIGRATIONS_DIR}`);
  }

  return files;
}

/**
 * Ensure the schema_migrations tracking table exists.
 * This table is NOT itself tracked in schema_migrations (bootstrapping).
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 * @param {import('pg').PoolClient} client
 */
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id          SERIAL       PRIMARY KEY,
      filename    VARCHAR(255) NOT NULL UNIQUE,
      checksum    VARCHAR(16)  NOT NULL,
      applied_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Return the set of migration filenames that have already been applied.
 * @param {import('pg').PoolClient} client
 * @returns {Promise<Set<string>>}
 */
async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    'SELECT filename FROM schema_migrations ORDER BY filename ASC'
  );
  return new Set(rows.map((r) => r.filename));
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function runMigrations() {
  const isDryRun = process.argv.includes('--dry-run');

  // ── Banner ──────────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     GoodsGo — Database Migration Runner     ║');
  console.log('╚══════════════════════════════════════════════╝');
  if (isDryRun) {
    console.log('\n  ⚠  DRY RUN — no changes will be made\n');
  } else {
    console.log('');
  }

  // ── Environment check ───────────────────────────────────────────────────────
  if (!process.env.DATABASE_URL) {
    console.error('  ❌ DATABASE_URL is not set in your .env file.');
    console.error('     Copy .env.example → .env and configure DATABASE_URL.\n');
    process.exit(1);
  }

  let client;

  try {
    // ── Connect ───────────────────────────────────────────────────────────────
    client = await pool.connect();
    console.log('  ✅  Connected to PostgreSQL');

    // ── Bootstrap tracking table (no-op if already exists) ───────────────────
    if (!isDryRun) {
      await ensureMigrationsTable(client);
    }

    // ── Discover state ────────────────────────────────────────────────────────
    const allFiles = getMigrationFiles();
    const applied  = isDryRun ? new Set() : await getAppliedMigrations(client);
    const pending  = allFiles.filter((f) => !applied.has(f));

    console.log(`\n  Total migrations : ${allFiles.length}`);
    console.log(`  Already applied  : ${applied.size}`);
    console.log(`  Pending          : ${pending.length}`);
    console.log('\n  ──────────────────────────────────────────────');

    if (pending.length === 0) {
      console.log('\n  ✅  Database is already up to date.\n');
      return;
    }

    // ── Run pending migrations ────────────────────────────────────────────────
    let successCount = 0;

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql      = fs.readFileSync(filepath, 'utf-8');
      const checksum = fileChecksum(sql);

      if (isDryRun) {
        console.log(`  📋  Would apply: ${filename}  [checksum: ${checksum}]`);
        successCount++;
        continue;
      }

      // Each migration runs in its own transaction.
      // PostgreSQL DDL (CREATE TABLE, CREATE INDEX, ALTER TABLE) IS transactional —
      // any failure rolls back the entire file cleanly.
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
          [filename, checksum]
        );
        await client.query('COMMIT');

        console.log(`  ✅  ${filename}`);
        successCount++;

      } catch (err) {
        await client.query('ROLLBACK');

        console.error(`\n  ❌  FAILED: ${filename}`);
        console.error(`      Error    : ${err.message}`);
        if (err.detail)   console.error(`      Detail   : ${err.detail}`);
        if (err.hint)     console.error(`      Hint     : ${err.hint}`);
        if (err.position) console.error(`      Position : character ${err.position}`);
        console.error('\n  ⚠  Subsequent migrations were NOT applied.\n');

        // Exit — do not continue after a failure to avoid broken partial state
        throw new Error(`Migration failed at "${filename}".`);
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n  ──────────────────────────────────────────────');
    if (isDryRun) {
      console.log(`\n  📋  Dry run complete.`);
      console.log(`      ${successCount} migration(s) would be applied.`);
      console.log(`      Run without --dry-run to execute.\n`);
    } else {
      console.log(`\n  ✅  Migration complete.`);
      console.log(`      ${successCount} migration(s) applied successfully.\n`);
    }

  } catch (err) {
    if (!err.message.startsWith('Migration failed at')) {
      console.error(`\n  ❌  Runner error: ${err.message}\n`);
    }
    throw err;

  } finally {
    if (client) client.release();
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

runMigrations().catch(() => process.exit(1));