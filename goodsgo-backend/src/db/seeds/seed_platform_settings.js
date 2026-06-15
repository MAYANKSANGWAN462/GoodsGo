'use strict';

// ARCHITECTURE CATCH-UP: This file was defined in the original File Generation
// Plan (Block D / Block E seeds) but was omitted during the Block D regeneration.
// It is generated here in Block K because bookings.service.js reads
// platform_commission_pct from this table.

require('dotenv').config();

const { Pool } = require('pg');

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

// ─── Default Settings ─────────────────────────────────────────────────────────
// Keys must match PLATFORM_SETTINGS constants in src/utils/constants.js.
// value_type tells the service layer how to parse the stored string value.

const DEFAULT_SETTINGS = [
  {
    key:         'platform_commission_pct',
    value:       '10',
    value_type:  'number',
    description: 'Percentage the platform takes from each completed booking payment'
  },
  {
    key:         'post_expiry_days',
    value:       '30',
    value_type:  'number',
    description: 'Number of days after which an active post is automatically expired'
  },
  {
    key:         'max_images_per_post',
    value:       '5',
    value_type:  'number',
    description: 'Maximum number of images allowed per post listing'
  },
  {
    key:         'max_active_posts_per_user',
    value:       '10',
    value_type:  'number',
    description: 'Maximum number of active/inactive posts a user can have at one time'
  },
  {
    key:         'min_booking_price',
    value:       '100',
    value_type:  'number',
    description: 'Minimum booking price allowed on the platform (INR)'
  },
  {
    key:         'review_edit_window_hours',
    value:       '24',
    value_type:  'number',
    description: 'Hours after review creation during which the reviewer can edit it'
  },
  {
    key:         'booking_auto_reject_hours',
    value:       '48',
    value_type:  'number',
    description: 'Hours before a pending booking request is automatically rejected if not responded to'
  },
  {
    key:         'payment_deadline_hours',
    value:       '24',
    value_type:  'number',
    description: 'Hours after booking acceptance within which the customer must complete payment'
  },
  {
    key:         'payment_auto_release_days',
    value:       '7',
    value_type:  'number',
    description: 'Days after booking marked in_progress before payment is auto-released to transporter'
  }
];

async function seedPlatformSettings() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     GoodsGo — Seed: Platform Settings       ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!process.env.DATABASE_URL) {
    console.error('  ❌ DATABASE_URL is not set. Configure your .env file.\n');
    process.exit(1);
  }

  const client = await pool.connect();
  let insertedCount = 0;
  let skippedCount  = 0;

  try {
    for (const setting of DEFAULT_SETTINGS) {
      const result = await client.query(
        `INSERT INTO platform_settings (key, value, value_type, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO NOTHING`,
        [setting.key, setting.value, setting.value_type, setting.description]
      );

      if (result.rowCount > 0) {
        console.log(`  ✅  Inserted: ${setting.key} = ${setting.value} (${setting.value_type})`);
        insertedCount++;
      } else {
        console.log(`  ⏭  Skipped:  ${setting.key} (already exists)`);
        skippedCount++;
      }
    }

    console.log(`\n  ─────────────────────────────────────────────`);
    console.log(`  Total: ${DEFAULT_SETTINGS.length} | Inserted: ${insertedCount} | Skipped: ${skippedCount}\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

seedPlatformSettings().catch((err) => {
  console.error('\n  ❌ Seed failed:', err.message);
  process.exit(1);
});