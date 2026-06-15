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
// name  = code value stored in posts.goods_category and validated by Joi
//         MUST match GOODS_CATEGORIES array in src/utils/constants.js
// label = human-readable display name for frontend dropdowns

const GOODS_CATEGORIES = [
  { name: 'electronics',            label: 'Electronics',                display_order: 1  },
  { name: 'furniture',              label: 'Furniture',                  display_order: 2  },
  { name: 'food_and_beverages',     label: 'Food & Beverages',           display_order: 3  },
  { name: 'clothing_and_textiles',  label: 'Clothing & Textiles',        display_order: 4  },
  { name: 'machinery',              label: 'Machinery',                  display_order: 5  },
  { name: 'construction_materials', label: 'Construction Materials',     display_order: 6  },
  { name: 'chemicals',              label: 'Chemicals',                  display_order: 7  },
  { name: 'pharmaceuticals',        label: 'Pharmaceuticals',            display_order: 8  },
  { name: 'automotive_parts',       label: 'Automotive Parts',           display_order: 9  },
  { name: 'agricultural_produce',   label: 'Agricultural Produce',       display_order: 10 },
  { name: 'household_items',        label: 'Household Items',            display_order: 11 },
  { name: 'office_supplies',        label: 'Office Supplies',            display_order: 12 },
  { name: 'fragile_goods',          label: 'Fragile Goods',              display_order: 13 },
  { name: 'hazardous_materials',    label: 'Hazardous Materials',        display_order: 14 },
  { name: 'perishables',            label: 'Perishables',                display_order: 15 },
  { name: 'other',                  label: 'Other',                      display_order: 16 }
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seedGoodsCategories() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     GoodsGo — Seed: Goods Categories        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  if (!process.env.DATABASE_URL) {
    console.error('  ❌ DATABASE_URL is not set. Configure your .env file.\n');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    let insertedCount = 0;
    let skippedCount  = 0;

    for (const gc of GOODS_CATEGORIES) {
      const result = await client.query(
        `INSERT INTO goods_categories (name, label, is_active, display_order)
         VALUES ($1, $2, TRUE, $3)
         ON CONFLICT (name) DO NOTHING`,
        [gc.name, gc.label, gc.display_order]
      );

      if (result.rowCount > 0) {
        console.log(`  ✅  Inserted: ${gc.name} (${gc.label})`);
        insertedCount++;
      } else {
        console.log(`  ⏭  Skipped:  ${gc.name} (already exists)`);
        skippedCount++;
      }
    }

    console.log(`\n  ─────────────────────────────────────────────`);
    console.log(`  Total: ${GOODS_CATEGORIES.length} | Inserted: ${insertedCount} | Skipped: ${skippedCount}\n`);

  } finally {
    client.release();
    await pool.end();
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

seedGoodsCategories().catch((err) => {
  console.error('\n  ❌ Seed failed:', err.message);
  process.exit(1);
});