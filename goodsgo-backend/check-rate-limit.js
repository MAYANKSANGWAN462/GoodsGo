require('dotenv').config();
const http = require('http');

function req(method, path, body) {
  return new Promise((resolve) => {
    const str = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path: '/api/v1' + path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (str) opts.headers['Content-Length'] = Buffer.byteLength(str);
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const rl = res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining'] || 'N/A';
        const limit = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'] || 'N/A';
        console.log(`${res.statusCode} | limit:${limit} remaining:${rl} | ${path}`);
        try { const b = JSON.parse(d); if (!b.success) console.log('  Error:', b.message, b.code); } catch(e) {}
        resolve(res.statusCode);
      });
    });
    r.on('error', e => { console.error(path, e.message); resolve(0); });
    if (str) r.write(str);
    r.end();
  });
}

const ts = Date.now();
async function main() {
  // Make several auth requests and watch the rate limit counter
  for (let i = 1; i <= 12; i++) {
    const email = `rl${ts}${i}@test.com`;
    const status = await req('POST', '/auth/register', { full_name: 'RL Test', email, password: 'Password@123' });
    if (status === 429) { console.log(`Hit 429 on attempt #${i}`); break; }
  }
}
main();
