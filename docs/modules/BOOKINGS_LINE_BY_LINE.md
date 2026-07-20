# Bookings Module — Line-by-Line Reference

> A truly line-by-line walkthrough of the Bookings module — the most complex
> vertical slice in GoodsGo (a 9-state machine, `SELECT … FOR UPDATE` row locking,
> role-flip logic, and transactional multi-table writes). Read alongside the code;
> line numbers refer to the files as they currently stand.
>
> Files covered, in dependency order:
> 1. `bookings.routes.js` — HTTP wiring
> 2. `bookings.validator.js` — Joi input contracts
> 3. `bookings.controller.js` — thin HTTP⇄service adapters
> 4. `bookings.service.js` — all business logic + SQL (the bulk of this document)
>
> See also: [DATABASE_GUIDE.md §5](../DATABASE_GUIDE.md) (state machine + locking),
> [API_REFERENCE.md §6](../API_REFERENCE.md) (endpoint contracts).

---

## 1. `bookings.routes.js` — the HTTP surface

**Lines 1–19 — imports & router.** `'use strict'`, then `express`; the guards
`authenticate` + `requireEmailVerified` from `auth.middleware`; the `validate`
factory; the `bookingLimiter` rate limiter; the controller; and the seven Joi
schemas destructured from the validator. `const router = express.Router()` creates
an isolated mini-app that `app.js` mounts at `/api/v1/bookings`.

**Lines 28–35 — `POST /` (create booking).** Middleware chain, in order:
`authenticate` (must be logged in → sets `req.user`), `requireEmailVerified` (403
if email unverified — gates the ability to transact), `bookingLimiter` (10/hour
per **user**, keyed on `req.user.id`), `validate(createBookingSchema)` (Joi on the
body), then `controller.createBooking`. **Order matters:** auth runs before the
rate limiter so the limiter can key on the user id; validation runs last so only
authenticated, non-rate-limited requests are parsed.

**Lines 42–47 — `GET /` (list).** `authenticate` →
`validate(bookingFilterSchema, 'query')` (note the `'query'` second arg — validates
`req.query`, not the body) → `controller.getBookings`. No rate limiter — reads are
cheap and covered by the global 100/min.

**Lines 55–60 — `GET /:bookingId`.** `authenticate` →
`validate(bookingIdParamSchema, 'params')` (UUID check on the URL segment) →
`controller.getBookingById`. Authorization (is the caller a party?) is enforced in
the **service**, not here — the route only checks the id *shape*.

**Lines 67–73 — `PUT /:bookingId/accept`.** Two `validate` calls: first the param
(UUID), then the body (`acceptBookingSchema`). This is the transactional,
race-critical endpoint; all the concurrency logic lives downstream in the service.

**Lines 79–85 / 92–97 / 104–110 — reject / withdraw / cancel.** Same shape;
`reject` and `cancel` also validate a body schema (`reason`), `withdraw` takes no
body. Note `cancel` requires a `reason` (min 5 chars — validator line 106–115),
while `reject`'s reason is optional.

**Lines 117–122 / 130–135 — mark-in-progress / complete.** Param-only validation;
no body. The *who is allowed* check (transporter vs shipper, which flips by post
type) is entirely in the service.

**Lines 142–148 — `PUT /:bookingId/dispute`.** Param + `disputeBookingSchema`
(requires a substantial `reason` + `description`).

**Lines 154–159 — `GET /:bookingId/history`.** Param-only; service enforces
party-only access.

**Takeaway:** the routes file is purely declarative — it wires *guards →
rate-limit → validation → controller* and nothing else. There is zero business
logic here, which is the layering rule in action.

---

## 2. `bookings.validator.js` — input contracts

**Lines 9–50 — `createBookingSchema`.** `post_id` is a required UUIDv4 with custom
messages (lines 10–16). Every other field (`pickup_address`,
`destination_address`, `scheduled_date`, `goods_description`,
`special_instructions`) is **optional** and `.allow('', null)` — because at request
time the requester may not know final logistics; those are firmed up on accept.
`scheduled_date` is `Joi.date().iso()` (coerced from an ISO string). Line 50:
`.options({ stripUnknown: true })` — **any field not in this schema is silently
dropped**, which is the mass-assignment defence (a client can't sneak in
`status`, `agreed_price`, `post_owner_id`, etc.).

**Lines 55–87 — `acceptBookingSchema`.** The one required field is
`agreed_price: Joi.number().positive().required()` (lines 56–62) — the negotiated
price is mandatory to accept. The address/date/instructions fields are optional
overrides the owner may set at acceptance. `stripUnknown` again.

**Lines 91–100 — `rejectBookingSchema`.** `reason` optional, max 500.

**Lines 105–116 — `cancelBookingSchema`.** `reason` **required**, `min(5).max(500)`
— cancelling after acceptance is consequential (it re-opens the post, locks the
conversation, and increments the canceller's cancellation count), so a reason is
enforced.

**Lines 120–141 — `disputeBookingSchema`.** Both `reason` (min 10) and
`description` (min 20, max 2000) are required — a dispute must be substantive
because it routes to human admin review.

**Lines 146–151 — `bookingFilterSchema`.** `role` restricted to
`valid('requester','owner')`; `status` is a free string (comma-separated, split in
the service); `page`/`limit` with defaults (1 / 20) and `limit.max(50)`. Note the
list cap is 50 here vs the global `PAGINATION.MAX_LIMIT` of 100 — a deliberately
tighter cap for bookings.

**Lines 155–163 — `bookingIdParamSchema`.** `bookingId` required UUIDv4.

**Why validators are their own file:** the schemas are reusable, independently
testable, and keep the routes readable. `stripUnknown` on every schema is the
quiet hero — it makes the whole module mass-assignment-safe by construction.

---

## 3. `bookings.controller.js` — the thin adapter layer

Every handler follows the identical three-line pattern, e.g. `createBooking`
(lines 11–16):

```js
const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingsService.createBooking(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, 'Booking request sent successfully.', booking));
});
```

- **`asyncHandler(...)`** wraps the async function so any rejected promise reaches
  the global error handler (Express 4 won't catch it otherwise → the request would
  hang).
- It pulls exactly two things from the request — `req.user.id` (set by
  `authenticate`) and the validated `req.body`/`req.params`/`req.query` — and
  hands them to the service.
- It wraps the result in `ApiResponse` with the right status code and a
  human-readable message.

Notable per-handler details:
- `getBookings` (23–28) and `getMyBookings` (179–184) both call
  `service.getBookings(req.user.id, req.query)` and spread `{ bookings, meta }` into
  `ApiResponse(200, msg, bookings, meta)` — `meta` becomes the pagination envelope.
  `getMyBookings` exists so `users.routes.js` can mount the same logic at
  `/users/me/bookings` with a user-scoped message.
- `getBookingById` (34–39) passes `req.user.id` as the *second* arg so the service
  can enforce party-only access.
- `acceptBooking` (46–55) forwards `(bookingId, req.user.id, req.body)`; the
  success message advertises the side effect ("A conversation has been created.").
- `rejectBooking` (62–71) coerces `req.body.reason || null` — the validator allows
  an absent reason.
- Mutating endpoints that return no entity (`reject`, `withdraw`, `cancel`,
  `markInProgress`, `complete`, `raiseDispute`) send `ApiResponse(200, message)`
  with **no data payload** — the client already knows the new state.
- `getPostBookings` (164–173) serves both `GET /posts/:postId/bookings` and is
  referenced by `users.routes.js`; it takes `req.params.postId`.

**The lesson:** controllers are deliberately boring. If you're debugging behavior,
you almost never look here — you look at the service. The controller's only jobs
are: unwrap the request, call one service function, wrap the response.

---

## 4. `bookings.service.js` — all logic + SQL

This is where everything interesting lives. Walking it top to bottom.

### 4.1 Imports & helpers (lines 1–141)

**Lines 3–12 — imports.** `query` + `getClient` (the two DB access modes:
autocommit vs transaction); `emitToUser` (Socket.IO push); `ApiError`; and the
frozen constants (`BOOKING_STATUS`, `POST_STATUS`, `CONVERSATION_STATUS`,
`POST_TYPES`, `SOCKET_EVENTS`).

**Lines 14–37 — lazy notification loader.** `getNotifService()` caches a
`require('../notifications/notifications.service')` inside a `try/catch`. **Why
lazy?** During the project's block-by-block construction the notifications module
might not have existed yet; a top-level require would crash the whole module at
load. Lazy-requiring means bookings still work if notifications are absent (it
just skips them). `notify(payload)` (29–37) wraps `createNotification` in its own
`try/catch` so a notification failure never breaks a booking operation — a
consistent "side effects must not break the core transaction" theme.

**Lines 43–47 — `emitBookingStatusChanged`.** Emits `BOOKING_STATUS_CHANGED` to
**both** parties' `user:<id>` rooms. This is what lets both users' React Query
caches invalidate live without a manual refresh. It's a helper because almost
every transition calls it with the same shape.

**Line 52 — `getSetting`.** `const { getPlatformSetting: getSetting } =
require('../config/config.service')`. Renamed on import for brevity. This is the
**60-second-cached** platform-settings reader — commission % and payment
deadlines come from here, not hardcoded, so an admin can change them at runtime
without a redeploy. (Phase 8 consolidated this; it used to be duplicated in each
service.)

**Lines 56–70 — `insertHistory`.** Inserts one append-only
`booking_status_history` row inside the caller's transaction (`client`). Note it
takes a `client`, not the pool — history writes must be part of the same atomic
transaction as the status change. `metadata` is JSON-stringified if present. This
is called on *every* transition and is the backbone of dispute resolution.

**Lines 74–124 — `formatBooking`.** The camelCase serializer that converts a raw
snake_case DB row into the API shape. Key decisions:
- Money fields are `parseFloat(...)` guarded (`row.agreed_price ? parseFloat(...)
  : null`) — Postgres `DECIMAL` comes back as a **string** via `pg`, so this
  prevents string-concatenation bugs and keeps JSON numeric.
- Joined sub-objects (`post`, `requester`, `postOwner`, `conversation`) are only
  attached when their presence marker exists (e.g. `row.post_type ? {...} :
  undefined`) — so a bare booking row and a joined row both format cleanly.
- `conversation: row.conversation_id ? { id: … } : undefined` reflects that a
  conversation only exists after acceptance.

**Lines 128–141 — `BOOKING_SELECT`.** A shared SQL fragment listing all the
joined columns (`b.*` plus aliased post/requester/owner/conversation fields). It's
a constant so the three list/detail queries (`getBookings`, `getBookingById`,
`getPostBookings`) return an identical column set that `formatBooking` can consume
uniformly. The joins: `posts p`, `users r` (requester), `users o` (owner),
`LEFT JOIN conversations c` (LEFT because a conversation may not exist yet).

### 4.2 `createBooking` (lines 145–223)

1. **Lines 147–155 — load the post.** `SELECT … FROM posts WHERE id=$1 AND
   deleted_at IS NULL`. 404 if not found (a soft-deleted post is treated as gone).
2. **Lines 158–160 — can't book your own post.** `post.user_id === requesterId` →
   422 `CANNOT_BOOK_OWN_POST`.
3. **Lines 163–165 — post must be active.** Any other status (booked/completed/
   expired/inactive) → 422 `POST_NOT_ACCEPTING_BOOKINGS`, with the actual status
   interpolated into the message.
4. **Lines 168–194 — insert the booking.** A plain `INSERT … RETURNING id`. The
   `try/catch` on **line 189** specifically catches Postgres error `23505`
   (unique-violation) and rethrows it as a friendly 409 "You already have an
   active booking request for this post." **This is the application half of the
   race defence** — the DB **partial unique index**
   `idx_bookings_one_active_per_user_per_post` (see DATABASE_GUIDE §3.7) guarantees
   at most one active booking per user per post *even under concurrent requests*;
   this catch just translates the raw DB error into a clean API error. The app-level
   "post active" check (step 3) is a fast-path UX check; the index is the real
   guarantee.
5. **Lines 197–207 — initial history row, in a transaction.** Opens a client,
   `BEGIN`, `insertHistory(… null → PENDING …)` (the `from_status` is `null`
   because there's no prior state), `COMMIT`, with `ROLLBACK` on error and
   `client.release()` in `finally`. **This is the mandatory transaction pattern**
   used throughout the service — note the `finally { client.release() }` that
   prevents connection leaks.
6. **Lines 210–220 — side effects.** `emitToUser(owner, BOOKING_STATUS_CHANGED,
   …)` pushes to the owner live; `setImmediate(() => notify({ owner, 'booking_
   request_received' … }))` fires the notification *after* the response is on its
   way (off the request path).
7. **Line 222 — return the full object** via `getBookingById(bookingId,
   requesterId)` so the client gets the joined, formatted booking, not just an id.

### 4.3 `getBookings` (lines 227–290) — dynamic filtered list

- **Lines 230–246 — build the WHERE clause dynamically** with a parameter counter
  `idx`. If `role==='requester'` filter `requester_id`; if `'owner'` filter
  `post_owner_id`; else (no role) match **either** side
  (`(b.requester_id=$idx OR b.post_owner_id=$idx)` — reusing the same `$idx` for
  both, pushing the value once, then `idx++`). Every value goes into `params` —
  **no user input is ever concatenated into the SQL string.**
- **Lines 249–255 — status filter.** `status.split(',')` → trimmed non-empty
  array → `b.status = ANY($idx::booking_status_enum[])`. Casting to the enum array
  type is both correct and safe (invalid statuses would error at the DB, not
  inject).
- **Lines 260–264 — COUNT query** for pagination `total`.
- **Lines 266–277 — data query** using `BOOKING_SELECT` + the four joins + `ORDER
  BY b.created_at DESC` + `LIMIT/OFFSET` (offset computed line 258 as
  `(page-1)*limit`).
- **Lines 279–289 — return** `{ bookings: rows.map(formatBooking), meta }` where
  `meta` includes `total/page/limit/totalPages/hasNextPage/hasPreviousPage`.

### 4.4 `getBookingById` (lines 294–316) — with authorization

Single query with the full join (294–304), 404 if missing (306), then the crucial
**lines 310–313**: if the requesting user is *neither* the requester *nor* the post
owner → 403. **Authorization is re-derived from the DB row, never trusted from the
client.** Returns `formatBooking(booking)`.

### 4.5 `acceptBooking` (lines 320–487) — the crown jewel

This is the concurrency-critical, transactional heart of the app.

- **Lines 321–322 — read settings.** `getSetting('platform_commission_pct', 10)`
  and `getSetting('payment_deadline_hours', 24)` (cached, admin-tunable, with
  fallbacks).
- **Line 324 — `getClient()`** — a dedicated connection for the transaction.
- **Line 326 — `BEGIN`.**
- **Lines 329–337 — the row lock.** `SELECT … FROM bookings b JOIN posts p …
  WHERE b.id=$1 FOR UPDATE`. **This is the linchpin.** `FOR UPDATE` takes a
  pessimistic lock on the booking row; a *second* concurrent `acceptBooking` (two
  owner devices, a double-click) **blocks here** until the first transaction
  commits, then sees the already-`accepted` status and fails the guard below. This
  is what prevents a double-accept.
- **Lines 339–342 — 404 guard** (with `ROLLBACK` first — you must end the
  transaction).
- **Lines 346–349 — ownership guard.** Only `post_owner_id` may accept → 403.
- **Lines 351–354 — status guard.** Must be `pending`; else 422
  `INVALID_STATUS_TRANSITION` (this is also the guard the *loser* of a race hits).
- **Line 356 — the role flip.** `isNeedTransport = booking.post_type ===
  POST_TYPES.NEED_TRANSPORT` — the single boolean that drives all the type-specific
  behavior below.
- **Lines 359–362 — commission math.** `agreedPrice` (parsed from the body),
  `commissionAmt = agreedPrice*pct/100` (fixed to 2 decimals), `netPayout =
  agreedPrice - commissionAmt`, `paymentDeadline = now + deadlineHours`. The pct is
  **snapshotted onto the booking** (next step) so a later admin change to the
  platform commission never rewrites this booking's economics.
- **Lines 365–387 — update the booking** to `accepted` with all the negotiated
  terms, using `COALESCE($n, existing)` for the optional overrides so a missing
  field keeps the prior value.
- **Lines 391–413 — type-specific branch (need_transport only).** Because a
  `need_transport` post is single-capacity, accepting one request must close the
  post and reject the rest: `UPDATE posts SET status='booked'`; then `UPDATE
  bookings SET status='rejected' … WHERE post_id=$ AND id<>$ AND status='pending'
  RETURNING id, requester_id` (captured in `otherBookings` for notifications); then
  an `insertHistory(… PENDING→REJECTED …)` for each auto-rejected booking. **For
  `vehicle_available`/`return_journey` the post stays `active`** (lines 414–415
  comment) — multiple shippers may book capacity until the transporter closes it —
  so this whole block is skipped.
- **Lines 418–423 — history for the accepted booking**, with `metadata:
  { agreed_price, commission_pct }` (this is what shows the price in the audit
  timeline).
- **Lines 426–432 — create the conversation.** `INSERT … ON CONFLICT (booking_id)
  DO NOTHING RETURNING id` — the `ON CONFLICT` makes accept **idempotent** with
  respect to the conversation (the `conversations.booking_id` UNIQUE index means a
  retry won't create a second conversation).
- **Lines 435–441 — system message.** If a conversation was actually created,
  insert a `message_type='system'`, `sender_id=NULL` row ("Booking accepted. You
  can now chat about the details.").
- **Line 443 — `COMMIT`.** Everything above is now atomic — booking, post,
  auto-rejects, history, conversation, system message all commit together or not
  at all.
- **Lines 446–454 — realtime, post-commit.** Emit `BOOKING_STATUS_CHANGED` to both
  parties, and (need_transport only) `POST_STATUS_CHANGED` to the owner so their
  post shows as booked live. **These run after COMMIT** — you never emit "it
  happened" before the DB says it happened.
- **Lines 457–477 — notifications, fire-and-forget.** `setImmediate` notifies the
  requester ("accepted at ₹X") and every auto-rejected requester ("not selected").
- **Lines 479–484 — the `catch`/`finally`.** `ROLLBACK` on any error, always
  `client.release()`.
- **Line 486 — return** the freshly joined booking.

This one function demonstrates every core pattern: cached settings, pessimistic
locking, guard-then-act, snapshotting, type-branching, idempotent conversation
creation, atomic multi-table writes, post-commit side effects, and guaranteed
connection release.

### 4.6 `rejectBooking` (491–532) & `withdrawBooking` (536–569)

Structurally identical, simpler than accept (no lock needed — these don't race
the same way):
- Load booking (no join needed), 404 if missing.
- **Authorization differs:** reject requires `post_owner_id` (499); withdraw
  requires `requester_id` (544).
- Both require current status `pending` (500 / 545) → else 422.
- Transaction: `UPDATE status` + `insertHistory` + `COMMIT` (the standard
  BEGIN/try/ROLLBACK/finally pattern).
- Emit `emitBookingStatusChanged` to both parties. Reject also notifies the
  requester (525–531); withdraw doesn't notify (the owner finding out isn't
  actioned).

### 4.7 `cancelBooking` (573–645)

- **Lines 581–582 — party check.** Either party may cancel (unlike reject/withdraw
  which are role-specific).
- **Lines 584–587 — status guard.** Only `accepted` or `in_progress` are
  cancellable (a `cancellableStatuses` array) → else 422.
- **Transaction (589–627):** set `cancelled` + `cancelled_by` + reason; **re-open
  the post** (`UPDATE posts SET status='active' WHERE … status='booked'` — only if
  it was booked); **lock the conversation** (`conversations SET status='locked'` —
  read-only, preserved for disputes); `insertHistory`; and **increment the
  canceller's `cancellation_count`** (617–619) — the public trust signal.
- **Post-commit (629–644):** emit status change to both, emit `POST_STATUS_CHANGED
  → active` to the owner, and notify the *other* party with the reason. Line 637
  computes "the other user" as whichever party isn't the canceller.

### 4.8 `markInProgress` (649–695) & `completeBooking` (699–790) — the role flip in action

Both start by joining `posts` to get `post_type`, because **who is allowed depends
on the post type**:
- **`markInProgress`** is done by the **transporter**: for `need_transport` the
  transporter is the **requester** (663–664); otherwise the **post owner**. Wrong
  actor → 403 with a role-specific message (666–669). Requires `accepted` status
  (671–673). Transaction sets `in_progress`; emits to both.
- **`completeBooking`** is confirmed by the **shipper**: for `need_transport` the
  shipper is the **post owner** (713–714); otherwise the **requester**. Requires
  `in_progress` (721–723). Reads `payment_auto_release_days` (725) and computes
  `autoReleaseAt` (726). Transaction (728–758): set `completed`; set the **post**
  `completed`; **archive the conversation**; set the **payment's `auto_release_at`**
  (so escrow releases automatically if no dispute); `insertHistory`. Post-commit:
  emit to both + `POST_STATUS_CHANGED → completed`; notify both parties (the
  requester is prompted to review).

This pair is the clearest illustration of the "role flips by post type" concept —
the same booking has a shipper and a transporter, but *which database column* holds
which role depends on who created the post.

### 4.9 `raiseDispute` (794–848)

- Party check (802–803). Status must be `in_progress` or `completed` (805–808) —
  you can't dispute something that never got underway.
- Transaction (810–833): set booking `disputed`; **INSERT a `disputes` row**
  (`booking_id, raised_by, reason, description`); `insertHistory`.
- Post-commit: emit to both; notify the *other* party that a dispute was raised
  (admins pick it up from the disputes queue).

### 4.10 `getBookingHistory` (852–886) & `getPostBookings` (890–935)

- **`getBookingHistory`:** first an access check (party-only, 858–863), then
  `SELECT … FROM booking_status_history bsh LEFT JOIN users u ON u.id =
  bsh.changed_by … ORDER BY created_at ASC` — the LEFT JOIN turns `changed_by` into
  a name, defaulting to `'System'` (883) for cron/auto transitions. Returns the
  timeline the booking-detail page renders.
- **`getPostBookings`:** ownership check on the post (894–901, only the owner sees
  its requests), then a paginated `BOOKING_SELECT` query filtered by `post_id`.
  Same `{ bookings, meta }` shape as `getBookings`.

**Lines 939–952 — exports.** The full public surface of the module.

---

## 5. What to take away from this module

- **The controller is trivial; the service is everything.** Debug and test at the
  service layer.
- **Two DB modes, used deliberately:** `query()` for single reads/writes;
  `getClient()` + BEGIN/COMMIT/ROLLBACK/`finally release` for anything touching
  multiple tables — always with the `finally { client.release() }` guard.
- **Concurrency is handled in two complementary places:** `SELECT … FOR UPDATE` in
  `accept` (serializes the race) and the DB partial-unique index in `create`
  (guarantees no duplicate active bookings). Neither alone is sufficient; together
  they're airtight.
- **Snapshotting** (commission %) protects historical records from future config
  changes.
- **Side effects are always post-commit and fire-and-forget** (`emitToUser` after
  `COMMIT`; `setImmediate(notify)`), so they never corrupt or block the core
  transaction.
- **The role flip** (`isNeedTransport`) is the one concept that makes bookings hard
  to read at first — internalize that a single booking has a shipper and a
  transporter, and *which user column* is which depends on the post type.
