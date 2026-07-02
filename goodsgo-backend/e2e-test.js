/**
 * GoodsGo Phase 5 — End-to-End Journey Test (corrected field names)
 * Usage: node e2e-test.js
 */
'use strict';
require('dotenv').config();
const http = require('http');
const { Pool } = require('pg');

const BASE = 'http://localhost:5000/api/v1';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const pass  = (s, m) => console.log(`  ✅ [${s}] ${m}`);
const warn  = (s, m) => console.log(`  ⚠️  [${s}] ${m}`);
const fail  = (s, m) => console.log(`  ❌ [${s}] FAIL: ${m}`);
const probe = (s, m) => console.log(`  🔍 [${s}] ${m}`);
const head  = (t)    => console.log(`\n${'─'.repeat(52)}\n  ${t}\n${'─'.repeat(52)}`);
const sleep = (ms)   => new Promise(r => setTimeout(r, ms));

function req(method, path, body, token, cookie) {
  return new Promise((resolve, reject) => {
    const url    = new URL(BASE + path);
    const str    = body ? JSON.stringify(body) : null;
    const opts   = {
      hostname: url.hostname,
      port:     parseInt(url.port) || 80,
      path:     url.pathname + url.search,
      method,
      headers:  { 'Content-Type': 'application/json' },
    };
    if (str)    opts.headers['Content-Length']  = Buffer.byteLength(str);
    if (token)  opts.headers['Authorization']   = 'Bearer ' + token;
    if (cookie) opts.headers['Cookie']          = cookie;
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); }
        catch(e) { resolve({ status: res.statusCode, body: d, headers: res.headers }); }
      });
    });
    r.on('error', reject);
    if (str) r.write(str);
    r.end();
  });
}

function getRefreshCookie(headers) {
  for (const c of (headers['set-cookie'] || [])) {
    if (c.startsWith('refresh_token=')) return c.split(';')[0];
  }
  return null;
}

// Dev bypass: fetch plaintext token from DB and call verify endpoint
async function verifyEmailDirect(email) {
  // setImmediate in register defers token insert — wait briefly
  await sleep(500);
  const r = await pool.query(
    "SELECT token FROM email_verifications WHERE user_id = (SELECT id FROM users WHERE email=$1) AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1",
    [email]
  );
  if (r.rowCount === 0) return null;
  return req('GET', `/auth/verify-email?token=${r.rows[0].token}`);
}

const ts            = Date.now();
const USER_EMAIL    = `user${ts}@test.com`;
const TRANS_EMAIL   = `trans${ts}@test.com`;
// Phone digits: use last 8 digits of timestamp so they're unique per run and valid (10 digits)
const USER_PHONE    = `98${String(ts).slice(-8)}`;
const TRANS_PHONE   = `97${String(ts).slice(-8)}`;

let userToken, userRefreshCookie, userId;
let transToken, transRefreshCookie, transId;
let userPostId, transPostId, bookingId, convId;

// ─── JOURNEY 1: USER ─────────────────────────────────────────────────────────
async function journey1() {
  head('JOURNEY 1: USER — Register → Verify Email → Login → Profile → Create Post');

  // 1. Register
  let r = await req('POST', '/auth/register', { full_name: 'Test User', email: USER_EMAIL, password: 'Password@123', phone: USER_PHONE });
  if (r.body.success) pass('Register', `${USER_EMAIL} registered`);
  else { fail('Register', `${r.status} — ${r.body.message}`); return false; }

  // 2. Login BEFORE verification — must now fail with EMAIL_NOT_VERIFIED
  r = await req('POST', '/auth/login', { email: USER_EMAIL, password: 'Password@123' });
  if (!r.body.success && r.body.code === 'EMAIL_NOT_VERIFIED') pass('PreVerifyBlock', 'Login blocked: EMAIL_NOT_VERIFIED ✓');
  else if (r.body.success) fail('PreVerifyBlock', 'BUG: Logged in without email verification!');
  else warn('PreVerifyBlock', `Unexpected: ${r.status} ${r.body.message}`);

  // 3. Verify email
  const vr = await verifyEmailDirect(USER_EMAIL);
  if (vr && vr.body.success) pass('VerifyEmail', 'Email verified via token');
  else { fail('VerifyEmail', vr ? `${vr.status} — ${vr.body.message}` : 'No token in DB'); return false; }

  // 4. Resend verification (on already-verified) — should 400 or 200-noop
  r = await req('POST', '/auth/resend-verification', { email: USER_EMAIL });
  if (!r.body.success) pass('ResendAlreadyVerified', `${r.status} on already-verified — correct`);
  else warn('ResendAlreadyVerified', 'resend succeeded on already-verified account (consider blocking this)');

  // 5. Login after verification
  r = await req('POST', '/auth/login', { email: USER_EMAIL, password: 'Password@123' });
  if (r.body.success) {
    userToken        = r.body.data.accessToken;
    userRefreshCookie = getRefreshCookie(r.headers);
    userId           = r.body.data.user.id;
    pass('Login', `Logged in. Refresh cookie: ${userRefreshCookie ? 'SET ✓' : 'MISSING ❌'}`);
    if (!userRefreshCookie) fail('LoginCookie', 'refresh_token httpOnly cookie missing in Set-Cookie header');
  } else { fail('Login', `${r.status} — ${r.body.message}`); return false; }

  // 6. Get own profile — check isActive present
  r = await req('GET', '/users/me', null, userToken);
  if (r.body.success) {
    const u = r.body.data;
    const hasActive = u.isActive !== undefined;
    pass('GetProfile', `${u.fullName}, verified:${u.isEmailVerified}, active:${u.isActive}`);
    if (!hasActive) fail('GetProfile.isActive', 'isActive missing from /users/me response');
  } else fail('GetProfile', `${r.status} — ${r.body.message}`);

  // 7. Update profile
  r = await req('PUT', '/users/me', { bio: 'Need transport for goods', city: 'Mumbai', state: 'Maharashtra' }, userToken);
  if (r.body.success) pass('UpdateProfile', `city: ${r.body.data.city}, bio set`);
  else fail('UpdateProfile', `${r.status} — ${r.body.message}`);

  // 8. Config options
  r = await req('GET', '/config/options');
  if (r.body.success) {
    const { vehicleTypes, goodsCategories } = r.body.data;
    pass('ConfigOptions', `${vehicleTypes.length} vehicle_types, ${goodsCategories.length} goods_categories`);
  } else fail('ConfigOptions', r.body.message);

  // 9. Create need_transport post — vehicle_type required for ALL post types
  r = await req('POST', '/posts', {
    post_type:         'need_transport',
    description:       'Need to move 10 boxes from Mumbai to Pune, fragile items',
    availability_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    origin_address:    'Andheri West, Mumbai',
    origin_lat:        19.1136,
    origin_lng:        72.8697,
    destination_address: 'Koregaon Park, Pune',
    destination_lat:   18.5362,
    destination_lng:   73.8936,
    vehicle_type:      'truck',
    goods_type:        'Cardboard boxes',
    goods_category:    'household_items',
    goods_weight_kg:   50,
    budget_min:        2000,
    budget_max:        3000,
    is_negotiable:     true,
  }, userToken);
  if (r.body.success) {
    userPostId = r.body.data.id;
    pass('CreatePost', `need_transport post created: ${userPostId}`);
  } else fail('CreatePost', `${r.status} — ${r.body.message} | ${JSON.stringify(r.body.errors)}`);

  // 10. Token refresh
  if (userRefreshCookie) {
    r = await req('POST', '/auth/refresh-token', null, null, userRefreshCookie);
    if (r.body.success) {
      userToken        = r.body.data.accessToken;
      userRefreshCookie = getRefreshCookie(r.headers) || userRefreshCookie;
      pass('RefreshToken', 'Access token rotated ✓');
    } else fail('RefreshToken', `${r.status} — ${r.body.message}`);
  } else warn('RefreshToken', 'Skipped — cookie missing');

  return true;
}

// ─── JOURNEY 2: TRANSPORTER ───────────────────────────────────────────────────
async function journey2() {
  head('JOURNEY 2: TRANSPORTER — Register → Login → Vehicle Post → Book → Chat → Complete → Review');

  // 1. Register transporter
  let r = await req('POST', '/auth/register', { full_name: 'Test Transporter', email: TRANS_EMAIL, password: 'Password@123', phone: TRANS_PHONE });
  if (r.body.success) pass('Register', `${TRANS_EMAIL} registered`);
  else { fail('Register', `${r.status} — ${r.body.message}`); return false; }

  // 2. Verify
  const vr = await verifyEmailDirect(TRANS_EMAIL);
  if (vr && vr.body.success) pass('VerifyEmail', 'Verified');
  else { fail('VerifyEmail', vr ? `${vr.status} — ${vr.body.message}` : 'No token in DB'); return false; }

  // 3. Login
  r = await req('POST', '/auth/login', { email: TRANS_EMAIL, password: 'Password@123' });
  if (r.body.success) {
    transToken        = r.body.data.accessToken;
    transRefreshCookie = getRefreshCookie(r.headers);
    transId           = r.body.data.user.id;
    pass('Login', `Transporter logged in: ${transId}`);
  } else { fail('Login', `${r.status} — ${r.body.message}`); return false; }

  // 4. Create vehicle_available post
  r = await req('POST', '/posts', {
    post_type:         'vehicle_available',
    description:       'Tata 407 truck, 2 ton capacity, AC cabin available Mumbai-Pune',
    availability_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    origin_address:    'Andheri West, Mumbai',
    origin_lat:        19.1136,
    origin_lng:        72.8697,
    destination_address: 'Koregaon Park, Pune',
    destination_lat:   18.5362,
    destination_lng:   73.8936,
    vehicle_type:         'truck',
    vehicle_capacity_kg:  2000,
    budget_min:        2500,
    budget_max:        4000,
    is_negotiable:     true,
  }, transToken);
  if (r.body.success) {
    transPostId = r.body.data.id;
    pass('CreateVehiclePost', `vehicle_available post: ${transPostId}`);
  } else fail('CreateVehiclePost', `${r.status} — ${r.body.message} | ${JSON.stringify(r.body.errors)}`);

  // 5. Marketplace feed — both posts should appear
  r = await req('GET', '/posts?page=1&limit=20');
  if (r.body.success) pass('MarketplaceFeed', `Feed shows ${r.body.data.length} post(s), total: ${r.body.meta?.total}`);
  else fail('MarketplaceFeed', `${r.status} — ${r.body.message}`);

  // 6. Transporter sends booking request on USER's need_transport post
  if (!userPostId) { warn('Book', 'Skipped — user post missing'); return true; }
  r = await req('POST', '/bookings', {
    post_id:       userPostId,
    message:       'I can transport your goods. My truck is available and reliable.',
    offered_price: 2400,
  }, transToken);
  if (r.body.success) {
    bookingId = r.body.data.id;
    pass('CreateBooking', `Booking ${bookingId} created, status: ${r.body.data.status}`);
  } else fail('CreateBooking', `${r.status} — ${r.body.message}`);

  // 7. Get booking detail (transporter's view)
  if (bookingId) {
    r = await req('GET', `/bookings/${bookingId}`, null, transToken);
    if (r.body.success) pass('GetBooking', `Status: ${r.body.data.status}, offered: ₹${r.body.data.offeredPrice}`);
    else fail('GetBooking', `${r.status} — ${r.body.message}`);
  }

  // 8. User accepts the booking
  if (bookingId) {
    r = await req('PUT', `/bookings/${bookingId}/accept`, { agreed_price: 2400 }, userToken);
    if (r.body.success) pass('AcceptBooking', `Booking accepted → status: ${r.body.data?.status || 'accepted'}`);
    else fail('AcceptBooking', `${r.status} — ${r.body.message}`);
  }

  // 9. Conversations created after accept
  r = await req('GET', '/chat', null, userToken);
  if (r.body.success) {
    convId = r.body.data?.[0]?.id;
    pass('GetConversations', `${r.body.data.length} conversation(s), convId: ${convId}`);
  } else fail('GetConversations', `${r.status} — ${r.body.message}`);

  // 10. Send a chat message
  if (convId) {
    r = await req('POST', `/chat/${convId}/messages`, { content: 'Great! I will pick up at 9AM sharp.' }, userToken);
    if (r.body.success) pass('SendMessage', `Message sent in conv ${convId}`);
    else fail('SendMessage', `${r.status} — ${r.body.message}`);

    // Transporter replies
    r = await req('POST', `/chat/${convId}/messages`, { content: 'Confirmed. See you at 9AM.' }, transToken);
    if (r.body.success) pass('TransReply', 'Transporter replied in chat');
    else fail('TransReply', `${r.status} — ${r.body.message}`);

    // Get message history
    r = await req('GET', `/chat/${convId}/messages?page=1&limit=20`, null, userToken);
    if (r.body.success) pass('GetMessages', `${r.body.data.length} message(s) in conversation`);
    else fail('GetMessages', `${r.status} — ${r.body.message}`);
  }

  // 11. Initiate Razorpay payment while booking is still 'accepted'
  if (bookingId) {
    r = await req('POST', '/payments/initiate', { bookingId }, userToken);
    if (r.body.success) {
      pass('InitiatePayment', `Razorpay order: ${r.body.data.orderId}, amount: ₹${r.body.data.amount / 100}`);
    } else warn('InitiatePayment', `${r.status} — ${r.body.message}`);
  }

  // 12. Mark in-progress (transporter has picked up goods)
  if (bookingId) {
    r = await req('PUT', `/bookings/${bookingId}/mark-in-progress`, null, transToken);
    if (r.body.success) pass('MarkInProgress', `Booking status: in_progress`);
    else warn('MarkInProgress', `${r.status} — ${r.body.message}`);
  }

  // 13. Complete booking (post owner confirms delivery)
  if (bookingId) {
    r = await req('PUT', `/bookings/${bookingId}/complete`, null, userToken);
    if (r.body.success) pass('CompleteBooking', `Booking completed ✓`);
    else warn('CompleteBooking', `${r.status} — ${r.body.message}`);
  }

  // 14. User reviews transporter (reviewRole = 'as_transporter' — what role reviewee played)
  if (bookingId) {
    r = await req('POST', '/reviews', {
      bookingId,
      rating:     5,
      comment:    'Excellent service, arrived on time and handled goods carefully.',
      reviewRole: 'as_transporter',
    }, userToken);
    if (r.body.success) pass('ReviewTransporter', `Review posted: 5★ for transporter`);
    else warn('ReviewTransporter', `${r.status} — ${r.body.message}`);

    // Transporter reviews user (reviewRole = 'as_customer')
    r = await req('POST', '/reviews', {
      bookingId,
      rating:     4,
      comment:    'Goods were well packed and customer was cooperative.',
      reviewRole: 'as_customer',
    }, transToken);
    if (r.body.success) pass('ReviewUser', `Review posted: 4★ for user`);
    else warn('ReviewUser', `${r.status} — ${r.body.message}`);
  }

  // 15. Check notifications
  r = await req('GET', '/users/me/notifications?page=1&limit=10', null, userToken);
  if (r.body.success) pass('Notifications', `${r.body.data.length} notification(s) for user`);
  else fail('Notifications', `${r.status} — ${r.body.message}`);

  // 16. Saved posts
  if (transPostId) {
    r = await req('POST', `/posts/${transPostId}/save`, null, userToken);
    if (r.body.success) pass('SavePost', 'Post saved to favourites');
    else warn('SavePost', `${r.status} — ${r.body.message}`);
  }
  r = await req('GET', '/users/me/saved-posts', null, userToken);
  if (r.body.success) pass('GetSavedPosts', `${r.body.data.length} saved post(s)`);
  else fail('GetSavedPosts', `${r.status} — ${r.body.message}`);

  // 17. Transporter's reviews from reviews route: GET /reviews/users/:userId
  r = await req('GET', `/reviews/users/${transId}`, null, userToken);
  if (r.body.success) pass('PublicReviews', `${r.body.data.length} review(s) on transporter profile via /reviews/users/:id`);
  else warn('PublicReviews', `${r.status} — ${r.body.message}`);

  // 18. Logout user
  r = await req('POST', '/auth/logout', null, userToken, userRefreshCookie);
  if (r.body.success) pass('Logout', 'User logged out');
  else warn('Logout', `${r.status} — ${r.body.message}`);

  return true;
}

// ─── JOURNEY 3: ADMIN ─────────────────────────────────────────────────────────
async function journey3() {
  head('JOURNEY 3: ADMIN — Login → Stats → Users → Suspend → Posts → Reports → Disputes → Settings');

  let r = await req('POST', '/auth/admin/login', {
    email:    process.env.ADMIN_EMAIL || 'admin@goodsgo.com',
    password: process.env.ADMIN_PASSWORD || 'GoodsGo@2026Admin',
  });
  if (!r.body.success) { fail('Login', `${r.status} — ${r.body.message}`); return false; }
  // Admin response: { data: { adminToken, admin } }
  const adminToken = r.body.data.adminToken;
  if (!adminToken) { fail('Login', 'adminToken missing in response'); return false; }
  pass('Login', `Admin token: ${adminToken.slice(0,20)}...`);

  // Dashboard stats — no /admin/stats endpoint; frontend fetches meta.total from each list
  const [ur, pr, rr, dr] = await Promise.all([
    req('GET', '/admin/users?limit=1', null, adminToken),
    req('GET', '/admin/posts?limit=1', null, adminToken),
    req('GET', '/admin/reports?status=pending&limit=1', null, adminToken),
    req('GET', '/admin/disputes?status=open&limit=1', null, adminToken),
  ]);
  if (ur.body.success && pr.body.success) {
    pass('Stats', `Users:${ur.body.meta?.total} Posts:${pr.body.meta?.total} Reports(pending):${rr.body.meta?.total} Disputes(open):${dr.body.meta?.total}`);
  } else fail('Stats', 'One or more admin list calls failed');

  // Users list
  r = await req('GET', '/admin/users?page=1&limit=10', null, adminToken);
  if (r.body.success) {
    pass('Users', `${r.body.data.length} users, total: ${r.body.meta?.total}`);
    const found = r.body.data.some(u => u.email === USER_EMAIL);
    if (found) pass('UsersFind', `Test user ${USER_EMAIL} visible in admin list ✓`);
  } else fail('Users', `${r.status} — ${r.body.message}`);

  // Individual user detail
  if (userId) {
    r = await req('GET', `/admin/users/${userId}`, null, adminToken);
    if (r.body.success) pass('UserDetail', `email: ${r.body.data.email}, isActive: ${r.body.data.isActive}`);
    else fail('UserDetail', `${r.status} — ${r.body.message}`);

    // Suspend
    r = await req('PUT', `/admin/users/${userId}/suspend`, { reason: 'E2E test suspension' }, adminToken);
    if (r.body.success) {
      pass('Suspend', `User suspended ✓`);
      // Verify suspended user cannot login
      const lr = await req('POST', '/auth/login', { email: USER_EMAIL, password: 'Password@123' });
      if (!lr.body.success) pass('SuspendEnforced', `Suspended user login blocked: ${lr.body.code} ✓`);
      else fail('SuspendEnforced', 'BUG: Suspended user can still login');
    } else fail('Suspend', `${r.status} — ${r.body.message}`);

    // Reactivate
    r = await req('PUT', `/admin/users/${userId}/reactivate`, null, adminToken);
    if (r.body.success) pass('Reactivate', `User reactivated ✓`);
    else fail('Reactivate', `${r.status} — ${r.body.message}`);
  }

  // Posts
  r = await req('GET', '/admin/posts?page=1&limit=10', null, adminToken);
  if (r.body.success) pass('Posts', `${r.body.data.length} posts, total: ${r.body.meta?.total}`);
  else fail('Posts', `${r.status} — ${r.body.message}`);

  // Hide/restore a post
  if (userPostId) {
    r = await req('PUT', `/admin/posts/${userPostId}/hide`, null, adminToken);
    if (r.body.success) pass('HidePost', 'Post hidden ✓');
    else fail('HidePost', `${r.status} — ${r.body.message}`);

    r = await req('PUT', `/admin/posts/${userPostId}/restore`, null, adminToken);
    if (r.body.success) pass('RestorePost', 'Post restored ✓');
    else fail('RestorePost', `${r.status} — ${r.body.message}`);
  }

  // Reports
  r = await req('GET', '/admin/reports?page=1&limit=10', null, adminToken);
  if (r.body.success) pass('Reports', `${r.body.data.length} reports`);
  else fail('Reports', `${r.status} — ${r.body.message}`);

  // Disputes
  r = await req('GET', '/admin/disputes?page=1&limit=10', null, adminToken);
  if (r.body.success) pass('Disputes', `${r.body.data.length} disputes`);
  else fail('Disputes', `${r.status} — ${r.body.message}`);

  // Settings
  r = await req('GET', '/admin/settings', null, adminToken);
  if (r.body.success) pass('Settings', `${r.body.data.length} platform settings loaded`);
  else fail('Settings', `${r.status} — ${r.body.message}`);

  return true;
}

// ─── EDGE CASE PROBES ─────────────────────────────────────────────────────────
async function edgeProbes() {
  head('EDGE CASE PROBES');

  // Rate limiter note: probe registrations may hit auth rate limit from earlier tests
  // Use small delays between rapid calls

  // Duplicate email
  let r = await req('POST', '/auth/register', { full_name: 'Dup', email: USER_EMAIL, password: 'Password@123' });
  if (!r.body.success && r.status === 409) probe('DuplicateEmail', '409 Conflict ✓');
  else fail('DuplicateEmail', `Expected 409, got ${r.status}`);

  // Wrong password
  r = await req('POST', '/auth/login', { email: USER_EMAIL, password: 'WrongPass@999' });
  if (!r.body.success && (r.status === 401 || r.status === 400)) probe('WrongPassword', `${r.status} returned ✓`);
  else fail('WrongPassword', `Expected 401/400, got ${r.status}`);

  // No token on protected route
  r = await req('GET', '/users/me');
  if (!r.body.success && r.status === 401) probe('NoToken', '401 on /users/me ✓');
  else fail('NoToken', `Expected 401, got ${r.status}`);

  // User token on admin route → 401 (admin uses different auth middleware)
  if (transToken) {
    r = await req('GET', '/admin/users', null, transToken);
    if (!r.body.success && (r.status === 401 || r.status === 403)) probe('UserOnAdmin', `${r.status} for user token on /admin ✓`);
    else fail('UserOnAdmin', `Expected 401/403, got ${r.status}`);
  }

  // Marketplace search
  r = await req('GET', '/posts/search?q=Mumbai&page=1&limit=5');
  if (r.body.success) probe('Search', `"Mumbai" → ${r.body.data.length} result(s) ✓`);
  else fail('Search', `${r.status} — ${r.body.message}`);

  // Post detail (public, no auth)
  if (transPostId) {
    r = await req('GET', `/posts/${transPostId}`);
    if (r.body.success) probe('PostDetail', `Public post detail loads: "${r.body.data.description?.slice(0,40)}" ✓`);
    else fail('PostDetail', `${r.status} — ${r.body.message}`);
  }

  // User cannot book their own post (422 = business rule rejection, also valid)
  if (userPostId && userToken) {
    r = await req('POST', '/bookings', { post_id: userPostId, message: 'Self booking test', offered_price: 100 }, userToken);
    if (!r.body.success && (r.status === 403 || r.status === 400 || r.status === 422)) probe('OwnPostBook', `Self-booking blocked: ${r.status} — "${r.body.message}" ✓`);
    else warn('OwnPostBook', `${r.status} — self-booking may not be blocked: ${r.body.message}`);
  }

  // Double review — same booking same role
  if (bookingId && transToken) {
    r = await req('POST', '/reviews', { bookingId, rating: 3, comment: 'Duplicate review attempt test.', reviewRole: 'as_customer' }, transToken);
    if (!r.body.success && (r.status === 409 || r.status === 400 || r.status === 403)) probe('DuplicateReview', `Duplicate review blocked: ${r.status} ✓`);
    else warn('DuplicateReview', `${r.status} — duplicate review may not be blocked`);
  }

  // Report own post — test edge case
  if (transPostId && transToken) {
    r = await req('POST', `/posts/${transPostId}/report`, { reason: 'spam', description: 'E2E test report' }, transToken);
    if (!r.body.success) probe('ReportOwnPost', `Reporting own post blocked: ${r.status} ✓`);
    else warn('ReportOwnPost', 'User can report own post (consider blocking)');
  }

  // Invalid UUID in booking route
  r = await req('GET', '/bookings/not-a-uuid', null, transToken);
  if (!r.body.success && r.status === 400) probe('InvalidUUID', '400 for non-UUID in :bookingId ✓');
  else warn('InvalidUUID', `Expected 400, got ${r.status}`);

  // Forgot password (anti-enumeration: always 200)
  r = await req('POST', '/auth/forgot-password', { email: 'nonexistent@example.com' });
  if (r.status === 200) probe('ForgotPasswordEnum', 'Forgot password returns 200 for unknown email (anti-enumeration) ✓');
  else warn('ForgotPasswordEnum', `Forgot password returned ${r.status} — may leak account existence`);

  r = await req('POST', '/auth/forgot-password', { email: USER_EMAIL });
  if (r.status === 200) probe('ForgotPasswordKnown', 'Forgot password returns 200 for known email ✓');
  else warn('ForgotPasswordKnown', `${r.status} — ${r.body.message}`);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function cleanup() {
  head('CLEANUP');
  try {
    // Must delete in FK-safe order: reviews → messages → conversations → bookings → posts → users
    const userIds = await pool.query('SELECT id FROM users WHERE email = ANY($1)', [[USER_EMAIL, TRANS_EMAIL]]);
    if (userIds.rowCount > 0) {
      const ids = userIds.rows.map(r => r.id);
      await pool.query('DELETE FROM reviews       WHERE reviewer_id = ANY($1) OR reviewee_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM notifications WHERE user_id     = ANY($1)', [ids]);
      await pool.query('DELETE FROM messages       WHERE sender_id  = ANY($1)', [ids]);
      await pool.query('DELETE FROM conversations  WHERE participant_1_id = ANY($1) OR participant_2_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM payments       WHERE booking_id IN (SELECT id FROM bookings WHERE requester_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1)))', [ids]);
      await pool.query('DELETE FROM bookings       WHERE requester_id = ANY($1) OR post_id IN (SELECT id FROM posts WHERE user_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM saved_posts    WHERE user_id     = ANY($1)', [ids]);
      await pool.query('DELETE FROM reported_posts WHERE reporter_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM posts          WHERE user_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM refresh_tokens WHERE user_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM email_verifications WHERE user_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users          WHERE id = ANY($1)', [ids]);
    }
    pass('Cleanup', `Test data removed`);
  } catch(e) { warn('Cleanup', e.message); }
  await pool.end();
}

async function main() {
  console.log('\n' + '═'.repeat(54));
  console.log('  GoodsGo Phase 5 — E2E Journey Tests');
  console.log('  ' + new Date().toISOString());
  console.log('  Backend: http://localhost:5000');
  console.log('═'.repeat(54));

  try {
    await journey1();
    await journey2();
    await journey3();
    await edgeProbes();
  } catch(e) {
    console.error('\nUNCAUGHT:', e.message, e.stack);
  } finally {
    await cleanup();
  }

  console.log('\n' + '═'.repeat(54));
  console.log('  Complete — see ✅/❌/⚠️/🔍 above.');
  console.log('═'.repeat(54) + '\n');
}

main();
