require('dotenv').config();

const { query } = require('./src/config/database');

(async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('SUCCESS');
    console.log(result.rows[0]);
  } catch (err) {
    console.error(err);
  }
})();