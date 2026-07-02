require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function purge() {
  // Remove stale test data by phone patterns and email patterns
  const res = await pool.query("SELECT id, email, phone FROM users WHERE email LIKE '%@test.com' OR phone IN ('9876543210','9876543211')");
  if (res.rowCount === 0) { console.log('No stale test users found'); await pool.end(); return; }
  const ids = res.rows.map(r => r.id);
  console.log('Purging', res.rowCount, 'stale test users:', res.rows.map(r => r.email));
  await pool.query('DELETE FROM reviews      WHERE reviewer_id = ANY($1) OR reviewee_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM messages      WHERE sender_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM conversations WHERE participant_1_id = ANY($1) OR participant_2_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM payments      WHERE booking_id IN (SELECT id FROM bookings WHERE requester_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1)))', [ids]);
  await pool.query('DELETE FROM bookings      WHERE requester_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1))', [ids]);
  await pool.query('DELETE FROM saved_posts   WHERE user_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM reported_posts WHERE reporter_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM posts         WHERE user_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM email_verifications WHERE user_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM users         WHERE id = ANY($1)', [ids]);
  console.log('Done');
  await pool.end();
}
purge().catch(e => { console.error(e.message); pool.end(); });
