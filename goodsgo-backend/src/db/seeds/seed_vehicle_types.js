'use strict';

require('dotenv').config();

const { Pool } = require('pg');

// ─── Configuration ────────────────────────────────────────────────────────────

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
// name  = code value stored in posts.vehicle_type and validated by Joi
//         MUST match VEHICLE_TYPES array in src/utils/constants.js
// label = human-readable display name for frontend dropdowns
// display_order = controls sort order in dropdowns (lower = higher in list)

const VEHICLE_TYPES = [
  { name: 'truck',              label: 'Truck',                 display_order: 1  },
  { name: 'mini_truck',         label: 'Mini Truck',            display_order: 2  },
  { name: 'tempo',              label: 'Tempo',                 display_order: 3  },
  { name: 'pickup',             label: 'Pickup',                display_order: 4  },
  { name: 'container',          label: 'Container',             display_order: 5  },
  { name: 'trailer',            label: 'Trailer',               display_order: 6  },
  { name: 'refrigerated_truck', label: 'Refrigerated Truck',    display_order: 7  },
  { name: 'flatbed',            label: 'Flatbed',               display_order: 8  },
  { name: 'tanker',             label: 'Tanker',                display_order: 9  },
  { name: 'van',                label: 'Van',                   display_order: 10 }
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seedVehicleTypes() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     GoodsGo — Seed: Vehicle Types           ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!process.env.DATABASE_URL) {
    console.error('  ❌ DATABASE_URL is not set. Configure your .env file.\n');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    let insertedCount = 0;
    let skippedCount  = 0;

    for (const vt of VEHICLE_TYPES) {
      const result = await client.query(
        `INSERT INTO vehicle_types (name, label, is_active, display_order)
         VALUES ($1, $2, TRUE, $3)
         ON CONFLICT (name) DO NOTHING`,
        [vt.name, vt.label, vt.display_order]
      );

      if (result.rowCount > 0) {
        console.log(`  ✅  Inserted: ${vt.name} (${vt.label})`);
        insertedCount++;
      } else {
        console.log(`  ⏭  Skipped:  ${vt.name} (already exists)`);
        skippedCount++;
      }
    }

    console.log(`\n  ─────────────────────────────────────────────`);
    console.log(`  Total: ${VEHICLE_TYPES.length} | Inserted: ${insertedCount} | Skipped: ${skippedCount}\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

seedVehicleTypes().catch((err) => {
  console.error('\n  ❌ Seed failed:', err.message);
  process.exit(1);
});