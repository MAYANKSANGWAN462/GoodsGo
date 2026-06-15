'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

// ─── Config & Utilities ───────────────────────────────────────────────────────
const { checkConnection } = require('./config/database');

// ─── Custom Middleware (Block C) ──────────────────────────────────────────────
const errorHandler = require('./middleware/errorHandler.middleware');
const { sanitizeInputs } = require('./middleware/sanitize.middleware');
const { apiLimiter } = require('./middleware/rateLimiter.middleware');

// ─── Create Express Application ───────────────────────────────────────────────
const app = express();

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
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], // Cloudinary images
        scriptSrc: ["'self'"],
        connectSrc: [
          "'self'",
          process.env.FRONTEND_URL || 'http://localhost:5173'
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

      // In production, reject unknown origins
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error(`CORS: Origin ${origin} not allowed`));
      }

      // In development, allow all origins (for flexibility)
      return callback(null, true);
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

// 3. Request Logging
//    'dev' format: METHOD path statusCode responseTime - bytes
//    'combined' format: Apache-style full log (use in production)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 4. Body Parsers
//    Limit sizes prevent JSON/form payload bombs (DoS protection).
//    10kb is generous for API payloads while blocking abuse.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 5. Input Sanitization
//    Strips HTML tags, removes null bytes, trims strings, prevents prototype pollution.
//    Runs on req.body, req.query, and req.params before any route handler.
app.use(sanitizeInputs);

// 6. General API Rate Limiting
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
// BLOCK L: app.use('/api/v1/chat',     require('./modules/chat/chat.routes'));
// BLOCK M: app.use('/api/v1/reviews',  require('./modules/reviews/reviews.routes'));
// BLOCK N: app.use('/api/v1/payments', require('./modules/payments/payments.routes'));
// BLOCK O: app.use('/api/v1/admin',    require('./modules/admin/admin.routes'));

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

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// Handles: ApiError, JWT errors, PostgreSQL errors, Multer errors, JSON SyntaxError.
// Must be the LAST app.use() call — Express identifies it by the 4-param signature.
app.use(errorHandler);

module.exports = app;