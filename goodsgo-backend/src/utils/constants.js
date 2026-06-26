'use strict';

/**
 * GoodsGo Application Constants
 *
 * This is the single source of truth for all enum values, status strings,
 * configuration keys, and whitelists. NEVER hardcode these strings elsewhere.
 *
 * All objects are frozen (Object.freeze) so they cannot be accidentally
 * mutated at runtime — JavaScript's substitute for TypeScript enums.
 */

// ─── POST TYPES ───────────────────────────────────────────────────────────────
// Determines which form fields are shown, which Joi schema validates,
// and how the post card renders in the marketplace feed.
const POST_TYPES = Object.freeze({
  NEED_TRANSPORT: 'need_transport',       // Customer looking for a vehicle
  VEHICLE_AVAILABLE: 'vehicle_available', // Transporter has a vehicle ready
  RETURN_JOURNEY: 'return_journey'        // Transporter wants load for the return trip
});

// ─── POST STATUS ──────────────────────────────────────────────────────────────
// Lifecycle: active → booked (on booking accept) → completed
//           active → expired (via cron job)
//           active → inactive (owner hides it) or deleted (soft delete)
const POST_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BOOKED: 'booked',       // An accepted booking exists — no new requests allowed
  COMPLETED: 'completed',
  EXPIRED: 'expired',     // Past availability_date or post_expiry_days exceeded
  DELETED: 'deleted'      // Soft delete — record remains in DB
});

// ─── BOOKING STATUS ───────────────────────────────────────────────────────────
// State machine. Allowed transitions documented in bookings.service.js.
// withdrawn    — requester cancels their own pending request
// auto_rejected — cron job rejects after BOOKING_AUTO_REJECT_HOURS
const BOOKING_STATUS = Object.freeze({
  PENDING: 'pending',           // Request sent, awaiting post owner response
  ACCEPTED: 'accepted',         // Post owner accepted, conversation created
  REJECTED: 'rejected',         // Post owner rejected
  WITHDRAWN: 'withdrawn',       // Requester cancelled own pending request
  AUTO_REJECTED: 'auto_rejected', // System-cancelled due to timeout
  CANCELLED: 'cancelled',       // Either party cancelled after acceptance
  IN_PROGRESS: 'in_progress',   // Goods picked up, delivery underway
  COMPLETED: 'completed',       // Delivery confirmed, reviews unlocked
  DISPUTED: 'disputed'          // Either party raised a dispute
});

// ─── CONVERSATION STATUS ─────────────────────────────────────────────────────
// Controls whether users can send messages in a conversation.
const CONVERSATION_STATUS = Object.freeze({
  ACTIVE: 'active',    // Booking pending/accepted/in_progress — both can message
  LOCKED: 'locked',    // Booking cancelled/rejected — read-only
  ARCHIVED: 'archived' // Booking completed — read-only after 7 days post-completion
});

// ─── MESSAGE TYPES ────────────────────────────────────────────────────────────
const MESSAGE_TYPES = Object.freeze({
  TEXT: 'text',
  IMAGE: 'image',
  SYSTEM: 'system' // Auto-generated (e.g. "Booking accepted. You can now chat.")
});

// ─── REVIEW ROLES ─────────────────────────────────────────────────────────────
// Each booking can have two reviews: one for the customer, one for the transporter.
// review_role records what role the REVIEWEE played in the booking.
const REVIEW_ROLES = Object.freeze({
  AS_CUSTOMER: 'as_customer',
  AS_TRANSPORTER: 'as_transporter'
});

// ─── NOTIFICATION TYPES ──────────────────────────────────────────────────────
// Used to: (a) categorise DB records, (b) select email template, (c) build deep links.
const NOTIFICATION_TYPES = Object.freeze({
  BOOKING_REQUEST_RECEIVED: 'booking_request_received',
  BOOKING_ACCEPTED: 'booking_accepted',
  BOOKING_REJECTED: 'booking_rejected',
  BOOKING_WITHDRAWN: 'booking_withdrawn',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  BOOKING_AUTO_REJECTED: 'booking_auto_rejected',
  NEW_MESSAGE: 'new_message',
  REVIEW_RECEIVED: 'review_received',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_RELEASED: 'payment_released',
  POST_EXPIRED: 'post_expired',
  POST_EXPIRY_WARNING: 'post_expiry_warning',
  DISPUTE_RAISED: 'dispute_raised',
  DISPUTE_RESOLVED: 'dispute_resolved',
  ACCOUNT_VERIFIED: 'account_verified',
  SYSTEM: 'system'
});

// ─── PAYMENT STATUS ──────────────────────────────────────────────────────────
const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
});

// ─── REPORT REASONS ──────────────────────────────────────────────────────────
const REPORT_REASONS = Object.freeze({
  SPAM: 'spam',
  MISLEADING: 'misleading',
  INAPPROPRIATE: 'inappropriate',
  FRAUD: 'fraud',
  DUPLICATE: 'duplicate',
  OTHER: 'other'
});

// ─── REPORT STATUS ───────────────────────────────────────────────────────────
const REPORT_STATUS = Object.freeze({
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
});

// ─── ADMIN ROLES ─────────────────────────────────────────────────────────────
const ADMIN_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin', // Full access including deleting data
  ADMIN: 'admin',             // Can moderate content and manage users
  MODERATOR: 'moderator'      // Can review reports and hide posts
});

// ─── IDENTITY DOCUMENT STATUS ────────────────────────────────────────────────
const IDENTITY_DOC_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
});

// ─── IDENTITY DOCUMENT TYPES ─────────────────────────────────────────────────
const IDENTITY_DOC_TYPES = Object.freeze({
  NATIONAL_ID: 'national_id',
  DRIVERS_LICENSE: 'drivers_license',
  PASSPORT: 'passport'
});

// ─── DISPUTE STATUS ──────────────────────────────────────────────────────────
const DISPUTE_STATUS = Object.freeze({
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED_FOR_CUSTOMER: 'resolved_for_customer',
  RESOLVED_FOR_TRANSPORTER: 'resolved_for_transporter',
  RESOLVED_PARTIAL: 'resolved_partial'
});

// ─── PLATFORM SETTINGS KEYS ──────────────────────────────────────────────────
// These are the keys used in the platform_settings database table.
// Admin can change these values at runtime via the admin panel.
const PLATFORM_SETTINGS = Object.freeze({
  COMMISSION_PCT: 'platform_commission_pct',
  POST_EXPIRY_DAYS: 'post_expiry_days',
  MAX_IMAGES_PER_POST: 'max_images_per_post',
  MAX_ACTIVE_POSTS_PER_USER: 'max_active_posts_per_user',
  MIN_BOOKING_PRICE: 'min_booking_price',
  REVIEW_EDIT_WINDOW_HOURS: 'review_edit_window_hours',
  BOOKING_AUTO_REJECT_HOURS: 'booking_auto_reject_hours',
  PAYMENT_DEADLINE_HOURS: 'payment_deadline_hours',
  PAYMENT_AUTO_RELEASE_DAYS: 'payment_auto_release_days'
});

// ─── CLOUDINARY FOLDER PATHS ─────────────────────────────────────────────────
// Centralised so changing a folder path only requires one edit.
// KYC documents use a private folder — access only via signed URLs.
const CLOUDINARY_FOLDERS = Object.freeze({
  AVATARS: 'goodsgo/avatars',
  POSTS:   'goodsgo/posts',
  CHAT:    'goodsgo/chat',
  KYC:     'goodsgo/kyc' // Private — never use public URLs for this folder
});

// ─── HTTP STATUS CODES ───────────────────────────────────────────────────────
// The most commonly used status codes. Avoids magic numbers in controllers.
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  SERVICE_UNAVAILABLE: 503
});

// ─── MACHINE-READABLE ERROR CODES ────────────────────────────────────────────
// Sent in API error responses as `code` field.
// The frontend can switch on these codes for specific error handling
// (e.g. redirect to login on AUTHENTICATION_FAILED vs show inline error on VALIDATION_ERROR).
const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  UPLOAD_FAILED: 'UPLOAD_FAILED'
});

// ─── VEHICLE TYPES ───────────────────────────────────────────────────────────
// Static fallback list. At runtime, the DB reference table (vehicle_types)
// is the source of truth and is served via GET /api/v1/config/options.
// Joi validators import from here for build-time validation.
const VEHICLE_TYPES = Object.freeze([
  'truck',
  'mini_truck',
  'tempo',
  'pickup',
  'container',
  'trailer',
  'refrigerated_truck',
  'flatbed',
  'tanker',
  'van'
]);

// ─── GOODS CATEGORIES ────────────────────────────────────────────────────────
// Same pattern as VEHICLE_TYPES — static fallback, DB is source of truth at runtime.
const GOODS_CATEGORIES = Object.freeze([
  'electronics',
  'furniture',
  'food_and_beverages',
  'clothing_and_textiles',
  'machinery',
  'construction_materials',
  'chemicals',
  'pharmaceuticals',
  'automotive_parts',
  'agricultural_produce',
  'household_items',
  'office_supplies',
  'fragile_goods',
  'hazardous_materials',
  'perishables',
  'other'
]);

// ─── SAFE SORT COLUMNS FOR POSTS ─────────────────────────────────────────────
// Whitelist of column names that may be used in ORDER BY clauses.
// NEVER interpolate user-supplied sort column directly into SQL.
// Always check against this list first.
const ALLOWED_POST_SORT_COLUMNS = Object.freeze([
  'created_at',
  'availability_date',
  'price_expectation',
  'budget_min',
  'goods_weight_kg',
  'view_count'
]);

// ─── SORT ORDERS ─────────────────────────────────────────────────────────────
const SORT_ORDERS = Object.freeze({
  ASC: 'ASC',
  DESC: 'DESC'
});

// ─── PAGINATION DEFAULTS ─────────────────────────────────────────────────────
const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
});

// ─── RATE LIMIT CONFIGURATION ────────────────────────────────────────────────
// Centralised here so they can be tuned without hunting through middleware files.
const RATE_LIMITS = Object.freeze({
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 10                     // 10 login/register attempts per window per IP
  },
  FORGOT_PASSWORD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX: 3
  },
  RESEND_VERIFICATION: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX: 3
  },
  API_GENERAL: {
    WINDOW_MS: 60 * 1000,      // 1 minute
    MAX: 100                    // 100 requests per minute per IP
  },
  UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX: 20                     // 20 file uploads per hour per IP
  },
  POST_CREATE: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX: 5                      // 5 post creations per hour per user
  },
  BOOKING_REQUEST: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX: 10                     // 10 booking requests per hour per user
  },
  CHAT_MESSAGE: {
    WINDOW_MS: 60 * 1000,       // 1 minute
    MAX: 60                     // 60 messages per minute per user
  }
});

// ─── FILE UPLOAD LIMITS ──────────────────────────────────────────────────────
const UPLOAD_LIMITS = Object.freeze({
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,          // 5MB per file
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_POST_IMAGES: 5,
  AVATAR_MAX_WIDTH: 400,
  AVATAR_MAX_HEIGHT: 400,
  POST_IMAGE_MAX_WIDTH: 1200,
  POST_IMAGE_MAX_HEIGHT: 900
});

// ─── SOCKET ROOM PREFIXES ────────────────────────────────────────────────────
// Naming convention for Socket.io rooms.
// User room: "user:uuid" — targeted notifications
// Conversation room: "conv:uuid" — chat messages
const SOCKET_ROOMS = Object.freeze({
  USER_PREFIX: 'user:',
  CONVERSATION_PREFIX: 'conv:'
});

// ─── SOCKET EVENTS ───────────────────────────────────────────────────────────
// All socket event names in one place. Prevents typo mismatches between
// server emit and client listener.
const SOCKET_EVENTS = Object.freeze({
  // Connection lifecycle
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',

  // Chat — client to server
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MARK_READ: 'mark_read',

  // Chat — server to client
  NEW_MESSAGE: 'new_message',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  MESSAGES_READ: 'messages_read',

  // Notifications — server to client
  NOTIFICATION: 'notification',
  BOOKING_STATUS_CHANGED: 'booking_status_changed'
});

module.exports = {
  POST_TYPES,
  POST_STATUS,
  BOOKING_STATUS,
  CONVERSATION_STATUS,
  MESSAGE_TYPES,
  REVIEW_ROLES,
  NOTIFICATION_TYPES,
  PAYMENT_STATUS,
  REPORT_REASONS,
  REPORT_STATUS,
  ADMIN_ROLES,
  IDENTITY_DOC_STATUS,
  IDENTITY_DOC_TYPES,
  DISPUTE_STATUS,
  PLATFORM_SETTINGS,
  CLOUDINARY_FOLDERS,
  HTTP_STATUS,
  ERROR_CODES,
  VEHICLE_TYPES,
  GOODS_CATEGORIES,
  ALLOWED_POST_SORT_COLUMNS,
  SORT_ORDERS,
  PAGINATION,
  RATE_LIMITS,
  UPLOAD_LIMITS,
  SOCKET_ROOMS,
  SOCKET_EVENTS
};