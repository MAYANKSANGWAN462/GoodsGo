# GoodsGo — Database Guide (Phase 7)

> The complete database engineering reference: every table, column, enum, index,
> constraint, relationship, transaction, and locking strategy — plus
> normalization, performance, and scaling notes. Schema source of truth:
> `goodsgo-backend/src/db/migrations/001…020.sql`.

---

## 1. Engine, extensions, and conventions

- **Engine:** PostgreSQL (targeting Neon.tech serverless Postgres; any Postgres
  works). Accessed via `pg` with **no ORM** — hand-written parameterized SQL.
- **Migrations:** 20 plain-SQL files applied in filename order by
  `src/db/migrate.js`. Every statement is idempotent (`IF NOT EXISTS`,
  `CREATE OR REPLACE`, `DO $$ … EXCEPTION WHEN duplicate_object`), so re-running
  the full set is safe. This is why `railway.json` can run
  `npm run migrate && npm start` on every deploy.
- **Extensions (migration 001):**
  - `uuid-ossp` → `uuid_generate_v4()` used as the PK default on every table.
  - `pg_trgm` → GIN trigram indexes powering `ILIKE`/fuzzy city search and
    full-text-ish description search **without a dedicated search engine**.
- **Shared trigger function (001):** `update_updated_at_column()` sets
  `NEW.updated_at = NOW()`; attached via `BEFORE UPDATE` triggers on every table
  that has an `updated_at` column. Defined once, reused everywhere.
- **Conventions:**
  - Primary keys are UUIDs (opaque, non-enumerable, shard-friendly).
  - Timestamps are `TIMESTAMP WITH TIME ZONE` (store UTC, render local).
  - Money is `DECIMAL` (never float — no rounding drift on currency).
  - Coordinates are `DECIMAL(10,8)`/`DECIMAL(11,8)` with `CHECK` bounds.
  - Soft delete via `deleted_at` on user-facing entities (history integrity).
  - Type-safety substitute: PG **enums** for status columns + app-level Joi.

---

## 2. Entity–relationship overview

```
                       vehicle_types      goods_categories   (reference; app-validated)
                            (no FKs — read by /config/options)

  users ─┬─< refresh_tokens                admin_users ─┬─< platform_settings.updated_by
         ├─< email_verifications                        ├─< reported_posts.reviewed_by (deferred FK)
         ├─< password_resets                            ├─< disputes.resolved_by
         ├─< posts ─┬─< post_images                     └─< admin_audit_logs.admin_id
         │          ├─< saved_posts >── users
         │          ├─< reported_posts >── users
         │          └─< bookings ─┬─< booking_status_history
         │                        ├─< conversations ─< messages
         │                        ├─< reviews (reviewer_id, reviewee_id → users)
         │                        ├─< payments (payer_id, payee_id → users)
         │                        └─< disputes
         └─< notifications        (entity refs live in JSONB `data`, not FKs)

  Legend:  A ─< B  means "B has an FK to A" (one A, many B).
```

**Migration dependency order** (why the numbering matters): 001 extensions →
002 users → 003–005 auth tables → 006 posts → 007 post_images → 008 bookings →
009 history → 010 conversations → 011 messages → 012 reviews → 013 payments →
014 notifications → 015 saved_posts → 016 reported_posts → 017 admin_users
(**also** adds the deferred FK `reported_posts.reviewed_by → admin_users`) →
018 platform_settings → 019 disputes → 020 admin_audit_logs.

The **deferred FK** in 016/017 is a deliberate pattern: `reported_posts` (016)
needs to reference `admin_users`, but that table is created later (017). So 016
leaves `reviewed_by` as a bare `UUID` and 017 adds the constraint at the end,
idempotently. This keeps a clean linear apply order without forward references.

---

## 3. Table-by-table reference

For each table: purpose, notable columns, constraints, indexes (and *why each
index exists* — every index maps to a real query pattern), and the code that
reads/writes it.

### 3.1 `vehicle_types` / `goods_categories` (migration 001)
**Purpose:** reference/lookup tables for dropdowns. `name` = code stored on
posts; `label` = UI text; `is_active` + `display_order` control the dropdown.
**Indexes:** `(is_active, display_order ASC)` — the exact shape of the
`/config/options` query. **Read by:** `config.routes.js` (cached 10 min in memory).
**Written by:** `seeds/seed_vehicle_types.js`, `seed_goods_categories.js`.
*Note:* posts store the string value; validity is enforced at the **app layer**
(Joi against the frozen `VEHICLE_TYPES`/`GOODS_CATEGORIES` lists), not via FK —
a pragmatic denormalization so the feed query needs no join.

### 3.2 `users` (migration 002) — the hub
**Purpose:** one account per person; acts as shipper or transporter by context.
**Column groups:**
- *Credentials:* `email` (UNIQUE), `phone` (UNIQUE, nullable), `password_hash`
  (bcrypt, `TEXT`).
- *Profile:* `full_name`, `profile_image_url`, `profile_image_public_id`
  (Cloudinary handle for delete/replace), `bio`, `city/state/country`
  (`country` defaults `'India'`).
- *Verification flags:* `is_email_verified`, `is_phone_verified`,
  `is_identity_verified` (admin-approved KYC) — each set by its own flow.
- *Account status:* `is_active`, `suspended_at`, `suspension_reason`.
- *Rating aggregate:* `rating DECIMAL(3,2)`, `total_reviews` — **denormalized**
  and recomputed by `reviews.service` on each write, so a profile view never
  runs `AVG/COUNT` joins.
- *Cancellation tracking:* `cancellation_count` — incremented on post-acceptance
  cancellation; a public trust signal.
- *Timestamps:* `last_login_at`, `created_at`, `updated_at` (trigger),
  `deleted_at` (soft delete).

**Indexes (and why):** `email` (login lookup); partial `phone WHERE phone IS NOT
NULL` (phone flow); partial `is_active WHERE deleted_at IS NULL` (most queries
exclude dead accounts); `city WHERE city IS NOT NULL` (discovery); **GIN trigram**
on `full_name` and `email` (admin fuzzy search). Trigger: `trg_users_updated_at`.

### 3.3 `refresh_tokens` (003) — session security
**Purpose:** server-side record of issued refresh tokens for rotation +
revocation + reuse detection. **Security invariant:** stores only the
**SHA-256 hash** (`token_hash UNIQUE`), never the plaintext JWT (that lives only
in the httpOnly cookie). A DB breach therefore cannot replay sessions.
**Columns:** `expires_at`, `revoked_at` (NULL = active), `revoked_reason`
(`logout | password_change | rotation | admin | reuse_detected`).
**Indexes:** `token_hash` (verified on every refresh); `user_id` (revoke-all on
logout/password change); partial `expires_at WHERE revoked_at IS NULL` (cleanup).
**Read/written by:** `auth.service` (login, logout, refresh rotation,
resetPassword revokes all). See SECURITY_GUIDE § refresh-token rotation.

### 3.4 `email_verifications` (004) / `password_resets` (005)
**Purpose:** single-use, time-boxed tokens (64-char hex from
`crypto.randomBytes(32)`), 1-hour expiry, `used_at` marks consumption.
**Indexes:** `token` (link click lookup) + partial `user_id WHERE used_at IS
NULL` (find pending). **Written by:** `auth.service` register / forgot / reset /
resend. Tokens are stored plaintext because they are high-entropy, single-use,
and only ever looked up server-side (unlike passwords, which are attacker-guessable
and must be hashed).

### 3.5 `posts` (006) — the marketplace item
**Purpose:** one table, **three post types** (`post_type_enum`:
`need_transport | vehicle_available | return_journey`) via a discriminator
column — a *single-table inheritance* pattern that lets one feed query return all
three with type-specific fields nullable.
**Status (`post_status_enum`):** `active | inactive | booked | completed |
expired | deleted`.
**Column groups:** origin location (address + city/state + `lat/lng` with CHECK
bounds, required); destination (optional/flexible); vehicle fields
(`vehicle_type`, `vehicle_capacity_kg`, `remaining_capacity_kg`); goods fields
(category/weight/dimensions/`is_fragile` — for `need_transport`); pricing
(`budget_min/max` for shippers, `price_expectation` for transporters);
scheduling (`availability_date`, `expires_at`).
**Constraints:** `chk_posts_budget_range` (min ≤ max), lat/lng bounds.
**Indexes (13!) — each a feed filter:** `user_id, created_at DESC` (my posts);
partial indexes on `post_type`, `status`, `vehicle_type`, `goods_category`,
`origin_city`, `destination_city` (all `WHERE …` to stay small and hot);
`availability_date`; a **covering partial** `created_at DESC WHERE deleted_at IS
NULL AND status='active'` (default feed order); `(origin_lat, origin_lng)` (geo);
partial `expires_at WHERE status='active'` (cron); **GIN** `to_tsvector('english',
description)` (full-text) + **GIN trigram** on city names (`ILIKE`). This index
set is why the filtered feed is fast without a search engine.

### 3.6 `post_images` (007)
`post_id` (CASCADE), `image_url` (Cloudinary `secure_url`),
`cloudinary_public_id` (needed to delete — without it, deleting a post orphans
images in Cloudinary), `display_order` (0 = hero). Index `(post_id,
display_order ASC)` serves both the feed JOIN and the detail gallery.

### 3.7 `bookings` (008) — the transaction core
**Purpose:** a booking request and its lifecycle. **Three user FKs:** `requester_id`,
`post_owner_id`, plus `cancelled_by`. **Status (`booking_status_enum`, 9 states):**
`pending, accepted, rejected, withdrawn, auto_rejected, cancelled, in_progress,
completed, disputed`. (State machine in § 5.)
**Negotiated terms (set on accept):** `agreed_price`, `platform_commission_pct`
(snapshot — *not* the live setting, so a later commission change can't rewrite
history), `platform_commission_amt`, `net_payout`.
**Specifics:** pickup/destination addresses, `scheduled_date`, goods description,
special instructions.
**Lifecycle timestamps:** one per state (`accepted_at`, `rejected_at`, …).
**Escrow timing:** `payment_deadline` (pay within N hours of accept).
**The critical constraint — duplicate-booking prevention:**
```sql
CREATE UNIQUE INDEX idx_bookings_one_active_per_user_per_post
  ON bookings (post_id, requester_id)
  WHERE status IN ('pending','accepted','in_progress');
```
This **partial unique index** enforces "one active booking per user per post" *at
the database level*, closing race windows that an application `SELECT`-then-
`INSERT` check would miss. After a terminal status, the same user can request
again. **Indexes:** requester/owner/post lookups, status filter, partial
`created_at WHERE status='pending'` (cron auto-reject). Trigger for `updated_at`.

### 3.8 `booking_status_history` (009) — the audit trail
**Append-only** (no updates/deletes). One row per transition: `from_status`
(NULL for initial pending), `to_status`, `changed_by` (NULL = system/cron),
`reason`, `metadata JSONB` (e.g. `{agreed_price}` on accept). Index `(booking_id,
created_at ASC)` for the timeline. This table is the backbone of dispute
resolution — it is legal-grade "who did what, when."

### 3.9 `conversations` (010) / `messages` (011) — chat
**`conversations`:** exactly one per booking (`booking_id UNIQUE`),
`participant_1_id`/`participant_2_id` stored explicitly (so "my conversations"
needs no join to bookings), `status` (`conversation_status_enum`: `active |
locked | archived` — mirrors the booking lifecycle), and **denormalized**
`last_message_at` + `last_message_preview` for a fast inbox render. Indexes:
partner-specific `(participant_N_id, last_message_at DESC NULLS LAST)`.
**`messages`:** `conversation_id` (CASCADE), `sender_id` (NULL for `system`
messages), `content`, `message_type` (`text | image | system`), `image_url` +
`image_public_id`, `is_read` + `read_at`. Indexes: `(conversation_id, created_at
ASC)` (paginated history) + partial `(conversation_id, is_read) WHERE is_read =
FALSE` (unread badge — a partial index keeps the hot set tiny).

### 3.10 `reviews` (012) — two-sided reputation
`booking_id`, `reviewer_id`, `reviewee_id`, `rating SMALLINT` (CHECK 1–5),
`comment`, `review_role` (`as_customer | as_transporter` — the role the
*reviewee* played), `is_visible` (admin can hide abuse without deleting).
**Unique index** `(booking_id, reviewer_id, review_role)` = one review per
reviewer per booking per role, but both parties can still review each other.
Partial index `(reviewee_id, created_at DESC) WHERE is_visible = TRUE` (public
profile). Writing a review triggers recomputation of the reviewee's
`users.rating`/`total_reviews` aggregate.

### 3.11 `payments` (013) — the ledger
`booking_id`, `payer_id` (customer/shipper), `payee_id` (transporter).
**Amount split:** `amount`, `platform_commission_pct/amt`, `net_payout_amt`,
`currency` (default INR). **Status (`payment_status_enum`):** `pending,
processing, completed, failed, refunded, partially_refunded`. **Gateway fields:**
`gateway_name`, `gateway_order_id`, `gateway_payment_id UNIQUE` (dedup — the
UNIQUE prevents processing the same Razorpay payment twice), `gateway_signature`,
`gateway_response JSONB`. **Refund fields** + **escrow timing** (`payment_deadline`,
`auto_release_at`). Indexes: payer/payee history, booking lookup, partial
`gateway_payment_id WHERE NOT NULL` (webhook dedup), partial cron indexes on
`payment_deadline` and `auto_release_at`.

### 3.12 `notifications` (014)
`user_id` (CASCADE), `type` (`notification_type_enum`, 17 values), `title`,
`body`, `data JSONB` (deep-link payload — entity IDs live **here, not as FK
columns**, so a notification survives deletion of the entity it references),
`is_read` + `read_at`. Indexes: `(user_id, created_at DESC)` (feed) + partial
`(user_id) WHERE is_read = FALSE` (badge count).

### 3.13 `saved_posts` (015) / `reported_posts` (016)
**`saved_posts`:** join table, `UNIQUE(user_id, post_id)`; save = INSERT,
unsave = DELETE (toggle). **`reported_posts`:** `reason` +`status` enums,
`UNIQUE(reporter_id, post_id)` (one report per user per post), admin resolution
fields (`reviewed_by` → admin_users via the deferred FK), partial FIFO index
`(status, created_at ASC) WHERE status IN ('pending','under_review')` (triage
queue).

### 3.14 `admin_users` (017) — separate identity domain
Completely separate from `users`. `role` (`admin_role_enum`:
`super_admin | admin | moderator`) mapped to numeric levels 3/2/1 in
`adminAuth.middleware`. This is the **privilege-separation boundary**: admin auth
uses a different table *and* a different JWT secret.

### 3.15 `platform_settings` (018) — runtime config
Key–value store (`key` PK, `value TEXT`, `value_type`, `description`,
`updated_by` → admin). Lets super-admins change commission %, expiry days,
payment deadlines, etc. **without a redeploy**. `config.service` reads it with a
**60-second in-memory TTL cache**, invalidated when an admin updates a setting.
Seeded by `seed_platform_settings.js`.

### 3.16 `disputes` (019)
`booking_id` (CASCADE), `raised_by` (SET NULL — keep the dispute if the user is
removed), `reason`, `description`, `evidence_urls JSONB` (Cloudinary refs),
`status` (`dispute_status_enum`: `open | under_review | resolved_for_customer |
resolved_for_transporter | resolved_partial`), `resolved_by` (admin, SET NULL),
timestamps. Indexes on booking, raised_by (partial), status, created_at.

### 3.17 `admin_audit_logs` (020) — forensics
**Append-only.** `admin_id` (SET NULL to preserve history), `action_type`,
`target_type`, `target_id`, `ip_address INET`, `metadata JSONB`. Written by the
`logAdminAction` middleware which wraps `res.json` and logs only 2xx admin
mutations. Composite index `(admin_id, created_at DESC)` ("what did admin X do")
+ partial `target_id` ("who touched entity Y").

---

## 4. Relationships, cascade, and FK strategy

Two deliberate deletion strategies:
- **`ON DELETE CASCADE`** for *owned* children whose existence is meaningless
  without the parent: a user's tokens/verifications, a post's images, a booking's
  history/conversation, a conversation's messages, a user's notifications.
- **`ON DELETE SET NULL`** for *audit/reference* links that must survive the
  referenced row's deletion: `booking_status_history.changed_by`,
  `messages.sender_id` (system messages), `disputes.raised_by/resolved_by`,
  `admin_audit_logs.admin_id`, `reported_posts.reviewed_by`,
  `platform_settings.updated_by`.

In practice, core entities (users, posts, bookings, payments) are **never
hard-deleted** — they are soft-deleted or status-transitioned. The CASCADE rules
are safety nets, and SET NULL preserves the historical/audit record.

---

## 5. The booking state machine (transactions + locking)

Allowed transitions (enforced in `bookings.service`, recorded in
`booking_status_history`):

```
                 ┌──────────── withdrawn (requester cancels pending)
                 │
   (create) → pending ──accept──> accepted ──mark-in-progress──> in_progress ──complete──> completed
                 │  │  │              │                              │                          │
                 │  │  └reject────────┘                              └──dispute──> disputed <───┘
                 │  └auto_reject (cron, timeout)                     (cancel allowed from
                 │                                                    accepted & in_progress)
   terminal: rejected, withdrawn, auto_rejected, cancelled, completed, disputed
```

**Concurrency safety — `acceptBooking`** is the crux. Two owners' devices (or a
double-click) could try to accept simultaneously; a `need_transport` post must
end with exactly one accepted booking. The service:

```sql
BEGIN;
  SELECT … FROM bookings b JOIN posts p …
    WHERE b.id = $1 FOR UPDATE;      -- row lock: serializes concurrent accepts
  -- guards: owner check, status must be 'pending'
  UPDATE bookings SET status='accepted', agreed_price=…, commission…, payment_deadline=…;
  -- need_transport only:
  UPDATE posts SET status='booked';
  UPDATE bookings SET status='rejected' WHERE post_id=$ AND id<>$ AND status='pending';
  INSERT booking_status_history …;   -- for accepted + each auto-rejected
  INSERT conversations … ON CONFLICT (booking_id) DO NOTHING;
  INSERT messages (…, 'system');     -- "Booking accepted. You can now chat."
COMMIT;
```

`FOR UPDATE` makes the second transaction block until the first commits; it then
sees status `accepted` and fails the guard with a 422 — no double-accept. The
partial unique index (§3.7) is the second line of defence for
create-time duplicates. `vehicle_available`/`return_journey` posts stay `active`
after accept (multiple shippers may book capacity), so they skip the post→booked
+ auto-reject block.

Other transactional flows: `cancelBooking` (booking→cancelled, post→active,
conversation→locked, increment cancellation_count — all atomic);
`completeBooking` (booking→completed, post→completed, conversation→archived, set
payment `auto_release_at`); `raiseDispute` (booking→disputed + insert dispute);
`verifyEmail` / `resetPassword` (multi-table updates wrapped in BEGIN/COMMIT).

**Locking strategy in one line:** pessimistic row locks (`SELECT … FOR UPDATE`)
only where a real race exists (accept), DB-level unique/partial indexes for the
rest, and short transactions to minimize lock hold time.

---

## 6. Normalization & deliberate denormalization

The schema is essentially **3NF**, with three *intentional* denormalizations,
each justified:

| Denormalization | Why | Kept correct by |
|---|---|---|
| `users.rating` / `total_reviews` | Avoid AVG/COUNT join on every profile view | Recomputed by `reviews.service` on write/delete |
| `conversations.last_message_at` / `last_message_preview` | Fast inbox list without a per-row subquery | Updated on every message insert |
| Post storing `vehicle_type`/`goods_category` strings (not FK) | Feed query needs no join; values are stable | App-level Joi validation against frozen lists |

Trade-off: denormalized values can drift if a writer forgets to update them —
mitigated by centralizing writes in one service function per aggregate.

---

## 7. Performance considerations

- **Indexing philosophy:** every index corresponds to a real query; **partial
  indexes** (`WHERE …`) keep hot indexes tiny (only active posts, only unread
  messages/notifications, only pending bookings).
- **Full-text without a search engine:** `pg_trgm` GIN + `to_tsvector` GIN cover
  fuzzy city and description search up to tens of thousands of rows.
- **Geo search:** Haversine computed in SQL (`buildHaversineSQL`) rather than
  PostGIS — a pragmatic choice (PostGIS availability on Neon free tier wasn't
  verified). Revisit with PostGIS + GiST when post volume nears 100k (see
  PERFORMANCE_ANALYSIS + SCALABILITY_GUIDE).
- **Connection pooling:** `pg.Pool` max 10 (Neon free-tier ceiling). This is the
  first bottleneck at scale — raise `DB_POOL_MAX` on a bigger DB, then add
  PgBouncer/Neon pooling and read replicas.
- **Pagination everywhere:** list endpoints use `LIMIT/OFFSET` with sane
  defaults (20, max 100). OFFSET pagination degrades on deep pages — keyset
  (cursor) pagination is the scale-up fix.

---

## 8. Scaling & future migrations

- **Vertical first:** bigger Neon compute + higher `DB_POOL_MAX` handles the
  early curve cheaply.
- **Read replicas:** route feed/profile reads to replicas; writes to primary.
- **Connection pooler:** PgBouncer / Neon pooling when connections (not CPU)
  become the limit.
- **Partitioning:** `messages`, `notifications`, `admin_audit_logs`,
  `booking_status_history` are append-heavy and time-series-shaped → range
  partition by month when they reach tens of millions of rows.
- **Archival:** move `completed`/`archived`/old audit rows to cold storage.
- **PostGIS:** replace Haversine SQL with `geography` + GiST for fast radius
  queries at high post volume.
- **Migration discipline going forward:** migrations are **forward-only**. There
  is no down-migration mechanism; a rollback means writing a new corrective
  migration. **Always snapshot Neon before any migration that drops a column or
  table.** (See DEPLOYMENT_GUIDE § rollback.)

---

## 9. Seeds

`seed:all` runs (idempotently): `seed_vehicle_types`, `seed_goods_categories`,
`seed_platform_settings` (commission %, expiry days, payment deadlines, etc.),
`seed_admin` (the initial super-admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`/
`ADMIN_FULL_NAME` — **override the placeholder password; rotate it if exposed**).
`seed:demo` populates sample data for local development.
