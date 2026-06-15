'use strict';

require('dotenv').config();

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ─── Configuration ────────────────────────────────────────────────────────────

const SALT_ROUNDS = 12;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10_000,
  ssl: (() => {
    const url = process.env.DATABASE_URL || '';
    if (url.includes('neon.tech') || url.includes('sslmode=require') || process.env.NODE_ENV === 'production') {
      return { rejectUnauthorized: false };
    }
    return false;
  })()
});

// ─── Seed Data ────────────────────────────────────────────────────────────────

// Read from environment variables — never hardcode credentials.
// Add these to your .env file before running this seed:
//   ADMIN_EMAIL=admin@goodsgo.in
//   ADMIN_PASSWORD=ChangeThisPassword123!
//   ADMIN_FULL_NAME=GoodsGo Admin
const ADMIN_EMAIL     = process.env.ADMIN_EMAIL     || 'admin@goodsgo.in';
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD  || 'Admin@123456';
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || 'GoodsGo Super Admin';

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seedAdmin() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     GoodsGo — Seed: Admin User              ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!process.env.DATABASE_URL) {
    console.error('  ❌ DATABASE_URL is not set. Configure your .env file.\n');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Check if admin already exists
    const existing = await client.query(
      'SELECT id, email, role FROM admin_users WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      const admin = existing.rows[0];
      console.log(`  ⏭  Admin already exists — skipping.`);
      console.log(`      Email : ${admin.email}`);
      console.log(`      Role  : ${admin.role}`);
      console.log(`      ID    : ${admin.id}\n`);
      return;
    }

    // Validate password strength before hashing
    if (ADMIN_PASSWORD.length < 8) {
      console.error('  ❌ ADMIN_PASSWORD must be at least 8 characters.\n');
      process.exit(1);
    }

    // Hash password
    console.log('  🔐  Hashing password (bcrypt, 12 rounds)...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    // Insert admin
    const result = await client.query(
      `INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, 'super_admin', TRUE)
       RETURNING id, email, role, created_at`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FULL_NAME]
    );

    const admin = result.rows[0];

    console.log('  ✅  Super admin created successfully.');
    console.log(`      Email     : ${admin.email}`);
    console.log(`      Full Name : ${ADMIN_FULL_NAME}`);
    console.log(`      Role      : ${admin.role}`);
    console.log(`      ID        : ${admin.id}`);
    console.log(`      Created   : ${admin.created_at}`);
    console.log('\n  ⚠  IMPORTANT: Change the admin password after first login.');
    console.log('     Update ADMIN_PASSWORD in your .env and re-run if needed.\n');

  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

seedAdmin().catch((err) => {
  console.error('\n  ❌ Seed failed:', err.message);
  process.exit(1);
});