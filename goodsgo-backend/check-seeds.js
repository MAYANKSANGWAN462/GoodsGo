require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

Promise.all([
  p.query('SELECT COUNT(*) FROM vehicle_types'),
  p.query('SELECT COUNT(*) FROM goods_categories'),
  p.query('SELECT COUNT(*) FROM platform_settings'),
  p.query("SELECT email FROM admin_users LIMIT 1"),
]).then(([vt, gc, ps, au]) => {
  console.log('vehicle_types:', vt.rows[0].count);
  console.log('goods_categories:', gc.rows[0].count);
  console.log('platform_settings:', ps.rows[0].count);
  console.log('admin_users:', au.rowCount, au.rowCount > 0 ? '(email: ' + au.rows[0].email + ')' : '(EMPTY — run seed:admin)');
  return p.end();
}).catch(e => { console.error('FAIL:', e.message); p.end(); });
