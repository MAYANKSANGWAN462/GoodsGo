'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

// ─── Config & Utilities ───────────────────────────────────────────────────────
const { checkConnection } = require('./config/database');

// ─── Custom Middleware (Block C) ──────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler.middleware');
const { sanitizeInputs } = require('./middleware/sanitize.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

// ─── Create Express Application ───────────────────────────────────────────────
const app = express();

// Trust Railway's / Render's / Heroku's reverse proxy so that req.ip resolves
// to the real client IP (not the proxy's internal IP). Required for rate
// limiting to be per-client, and for secure-cookie detection via X-Forwarded-Proto.
app.set('trust proxy', 1);

// ─── MIDDLEWARE CHAIN ─────────────────────────────────────────────────────────
// ORDER MATTERS. Do not rearrange without understanding the implications.

// 1. Security Headers (Helmet)
//    Sets X-Content-Type-Options, X-Frame-Options, HSTS, Content-Security-Policy, etc.
//    Must be the very first middleware — nothing should be sent before headers are secured.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind inline styles
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://*.razorpay.com'],
        // Razorpay Standard Checkout script is loaded from checkout.razorpay.com
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://*.razorpay.com'],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || 'http://localhost:5173',
          'https://api.razorpay.com',
          'https://lumberjack.razorpay.com'
        ]
      }
    },
    // Disable COEP as it blocks Cloudinary image loading in some contexts
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Policy
//    Defines which origins can make requests to this API.
//    Must be before routes so preflight OPTIONS requests are handled correctly.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Vite default
  'http://localhost:3000'  // Alternative dev port
].filter(Boolean); // Remove any undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl in dev)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      // Allow all origins ONLY in development (for flexibility). Every other
      // environment — production, staging, test — rejects unknown origins so a
      // non-production deploy is never left with a permissive credentialed CORS
      // policy just because NODE_ENV happens not to equal 'production'.
      if (process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }

      return callback(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true, // Required for httpOnly cookies (refresh token)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token', // CSRF double-submit token (Block C-07 when implemented)
      'X-Requested-With'
    ],
    exposedHeaders: ['X-Total-Count'] // For pagination headers
  })
);

// 3. Response Compression
//    Compresses JSON responses with gzip/brotli when the client advertises
//    support (Accept-Encoding). Threshold 1kb — tiny payloads aren't worth
//    the CPU. Large list responses (feed, bookings) shrink ~5-10x on the wire.
app.use(compression({ threshold: 1024 }));

// 4. Request Logging
//    'dev' format: METHOD path statusCode responseTime - bytes
//    'combined' format: Apache-style full log (use in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 5. Body Parsers
//    Limit sizes prevent JSON/form payload bombs (DoS protection).
//    10kb is generous for API payloads while blocking abuse.
//
//    The `verify` callback captures the raw body Buffer on `req.rawBody`
//    for routes whose path contains '/webhook'. This is required by Razorpay's
//    webhook signature verification (HMAC must be computed on the exact raw bytes
//    before JSON parsing — the parsed object is not equivalent for HMAC purposes).
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => {
    if (req.path && req.path.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 6. Input Sanitization
//    Strips HTML tags, removes null bytes, trims strings, prevents prototype pollution.
//    Runs on req.body, req.query, and req.params before any route handler.
app.use(sanitizeInputs);

// 7. General API Rate Limiting
//    100 requests per minute per IP on all /api/* routes.
//    Individual route files apply stricter limits on sensitive endpoints.
app.use('/api', apiLimiter);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
// No auth required. Used by load balancers and monitoring services (UptimeRobot).
// Returns 200 if server is healthy, 503 if database is unreachable.
app.get('/health', async (req, res) => {
  const dbConnected = await checkConnection();

  const status = {
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbConnected ? 'connected' : 'disconnected'
    }
  };

  res.status(dbConnected ? 200 : 503).json(status);
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
// Each route module is mounted as it is generated. The block comment tells
// you exactly which file generation block activates each line.

app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/users', require('./modules/users/users.routes'));
app.use('/api/v1/posts',    require('./modules/posts/posts.routes'));
app.use('/api/v1/location', require('./modules/location/location.routes'));
app.use('/api/v1/config',   require('./modules/config/config.routes'));

app.use('/api/v1/bookings', require('./modules/bookings/bookings.routes'));
app.use('/api/v1/chat',     require('./modules/chat/chat.routes'));
app.use('/api/v1/reviews',  require('./modules/reviews/reviews.routes'));
app.use('/api/v1/payments', require('./modules/payments/payments.routes'));
app.use('/api/v1/admin',    require('./modules/admin/admin.routes'));

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
// Catches any request that didn't match a route above.
// Must be AFTER all route registrations.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND'
  });
});

// ─── SENTRY EXPRESS ERROR HANDLER ────────────────────────────────────────────
// Captures unhandled errors as Sentry events before our formatter runs.
// Must be BEFORE errorHandler — Sentry needs to see the raw error object.
// No-op when SENTRY_DSN is unset (development / CI).
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  Sentry.setupExpressErrorHandler(app);
}

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// Handles: ApiError, JWT errors, PostgreSQL errors, Multer errors, JSON SyntaxError.
// Must be the LAST app.use() call — Express identifies it by the 4-param signature.
app.use(errorHandler);

module.exports = app;