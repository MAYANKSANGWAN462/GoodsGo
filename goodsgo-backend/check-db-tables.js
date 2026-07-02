require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  .then(r => {
    if (r.rowCount === 0) {
      console.log('NO_TABLES: Database exists but is empty — migrations not yet run');
    } else {
      console.log('Tables (' + r.rowCount + '):');
      r.rows.forEach(row => console.log(' -', row.table_name));
    }
    return p.end();
  })
  .catch(e => {
    console.error('FAIL:', e.message);
    return p.end();
  });
