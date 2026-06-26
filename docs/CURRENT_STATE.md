# GoodsGo — Current Development State

> **Purpose:** Concise snapshot of where development stands right now.  
> **Last updated:** 2026-06-26 (after Block J — Socket Handlers)  
> **Source of truth for architecture/requirements:** `docs/PROJECT_CONTEXT.md`

---

## Current Project Phase

Backend MVP — Block J complete. Socket.io event handlers now fully wired: clients can authenticate, join conversation rooms, send/receive chat messages, relay typing indicators, mark messages read, and mark notifications read over WebSocket. Frontend not started. Chat REST API, Reviews, Payments, Admin modules not yet built.

---

## Overall Progress

| Area | Progress | Notes |
|---|---|---|
| Backend | ~71% complete (84 / 99+ planned files on disk) | Syntax-validated; never run against a live database |
| Frontend | 0% | Zero files exist |
| Database | Schema 100% designed, 18 migrations written | Never executed against a real Postgres instance |
| Deployment | 0% | No hosting account confirmed, no CI/CD |

---

## Completed Blocks (in order)

`A → B → C → D → E → F → H → K → I → J`

Block J included:
- **`src/socket/socket.handler.js`** — Main hub: authenticate lifecycle, user room join, delegates to chat and notification handlers.
- **`src/socket/chat.socket.js`** — Chat events: `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`, `messages_read`.
- **`src/socket/notification.socket.js`** — Notification event: `mark_read`.
- **`server.js`** — `// BLOCK J:` placeholder replaced with live `initSocketHandlers(io)` call.

---

## Completed Modules

| Module | Block | Status |
|---|---|---|
| Core utilities & infrastructure (`ApiError`, `ApiResponse`, `asyncHandler`, `paginate`, etc.) | A | Complete — rebuilt Block I (were 0 bytes) |
| Config layer (`database.js`, `cloudinary.js`, `email.js`, `socket.js`) | B | Complete |
| Middleware stack (error handler, sanitize, validate, rate limiter, auth, adminAuth, upload) | C | Complete |
| Database migrations (001–018) + seeds (admin, vehicle types, goods categories, platform settings) | D | Complete |
| Auth module (register, login, logout, refresh, verify, reset, resend) | E | Complete |
| Users module (profile CRUD, avatar, password change, deactivation, public profile) | F | Complete |
| Location module (geocode, reverse-geocode) | H | Complete |
| Posts module (feed, CRUD, images, search, nearby, save, report, getPostBookings) | H | Complete |
| Config routes (`GET /config/options`) | H | Complete |
| Cron job (`expirePosts.job.js` — hourly post expiry + booking auto-reject) | H | Complete |
| Bookings module (full 9-state machine, FOR UPDATE lock, conversation auto-creation) | K | Complete (dispute endpoint broken — see Blockers) |
| Notifications module (`createNotification`, `listNotifications`, `markOneRead`, `markAllRead`) | I | Complete — all lazy-require call sites now activate |
| **Socket Handlers** (`socket.handler.js`, `chat.socket.js`, `notification.socket.js`) | **J** | **Complete** — real-time notification delivery active for online users; chat socket events wired |

---

## Partially Completed Modules

| Module | What Exists | What Is Missing |
|---|---|---|
| **Chat** | DB schema (migrations 010–011). Conversation + system message created by `acceptBooking()`. Socket events: `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`, `messages_read` — all implemented in `chat.socket.js`. | **No REST endpoints.** No way to fetch message history or send images via HTTP. Block L not started. |
| **Payments** | DB schema (migration 013). `payment_deadline` set on acceptance; `auto_release_at` set on completion. | No payment service, no Razorpay SDK calls, no webhook handler. `razorpay` npm package also missing. Block N not started. |
| **Admin** | `adminAuth.middleware.js` fully built. `admin_users`, `platform_settings`, `reported_posts` tables exist. | No admin service/controller/routes. `logAdminAction` references `admin_audit_logs` table that does not exist. Block O not started. |

---

## Pending Modules (Not Started)

- **Block L** — Chat REST module (4 files: validator, service, controller, routes; message history, send-image endpoint)
- **Block M** — Reviews module (4 files)
- **Block N** — Payments module (4 files; requires `razorpay` installed first)
- **Block O** — Admin module (3 files; requires `disputes` + `admin_audit_logs` tables first)
- **Frontend** — Zero files; full planned stack documented in `PROJECT_CONTEXT.md` Section 7

---

## Current Active Module

None in progress. **Block L (Chat REST API)** is the designated next block.

---

## Current Milestone

Block L — Build the Chat REST API so clients can fetch message history and send image messages via HTTP. The socket layer for real-time messaging is already complete (Block J); Block L adds the HTTP complement.

---

## Exact Next Development Task

**Block L — Chat Module (4 files):**

1. `src/modules/chat/chat.validator.js` — Joi schemas:
   - `conversationIdParamSchema` — UUID param
   - `sendMessageSchema` — `{ content, messageType? }` (body, text messages only)
   - `listMessagesSchema` — `{ page, limit }` (query)

2. `src/modules/chat/chat.service.js`:
   - `getMyConversations(userId, page, limit)` — paginated list of conversations where user is participant_1 or participant_2, ordered by `last_message_at DESC`, joining in the other participant's profile
   - `getConversationById(conversationId, userId)` — fetch single conversation + verify participation
   - `getMessages(conversationId, userId, page, limit)` — paginated message history, verify participation first, ordered newest-first
   - `sendMessage(conversationId, userId, content)` — insert text message (socket `send_message` handles real-time; this is the REST fallback for clients without WebSocket), update conversation preview, emit `new_message` via `emitToConversation()`
   - `sendImageMessage(conversationId, userId, fileBuffer, mimeType)` — upload image to Cloudinary (CLOUDINARY_FOLDERS.CHAT), insert message with type=`image`, emit socket event

3. `src/modules/chat/chat.controller.js` — thin asyncHandler-wrapped handlers for each service function

4. `src/modules/chat/chat.routes.js` — routes mounted at `/api/v1/chat`:
   - `GET /` — `getMyConversations`
   - `GET /:conversationId` — `getConversationById`
   - `GET /:conversationId/messages` — `getMessages`
   - `POST /:conversationId/messages` — `sendMessage` (text)
   - `POST /:conversationId/messages/image` — `sendImageMessage` (multipart, uploadSingleImage middleware)

   Wire into `app.js` replacing the `// BLOCK L: ...` placeholder.
   Wire `GET /me/conversations` into `users.routes.js`.

**Pre-conditions:**
- Block J complete: socket events for chat are wired ✓
- migrations 010 (`conversations`), 011 (`messages`) exist ✓
- `upload.middleware.js` has `uploadSingleImage` for the image endpoint ✓
- `config/socket.js` has `emitToConversation()` ✓

---

## Known Blockers

| Priority | Issue | Location | Effect |
|---|---|---|---|
| 🔴 P0 | `disputes` table does not exist | `bookings.service.js: raiseDispute()` | `PUT /bookings/:id/dispute` throws 500. Transaction rolls back cleanly but dispute feature is non-functional. |
| 🔴 P0 | `admin_audit_logs` table does not exist | `adminAuth.middleware.js: logAdminAction()` | Not yet triggerable (Block O not built), but will throw the moment any admin route is wired up. |
| 🟠 P1 | `razorpay` missing from `package.json` | Not yet triggered | Will fail at Block N. Fix: add `"razorpay": "^2.9.4"` before starting Block N. |
| 🟡 P2 | `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_FULL_NAME` not in `.env.example` | `seed_admin.js` | Functional with insecure hardcoded fallback defaults. |
| 🟡 P2 | Stale JSDoc in `logAdminAction` references "migration 022" | `adminAuth.middleware.js` | Pre-consolidation numbering. Correct when Block O is built. |

---

## Important TODOs

- [ ] Run `npm install` — lock in `"axios": "^1.7.9"` added in Block I
- [ ] Get user approval to add migration files for `disputes` + `admin_audit_logs` (migration set is locked at 18)
- [ ] Build Block L (Chat REST API)
- [ ] Connect to a real PostgreSQL instance (Neon.tech) and run migrations + seeds — **never done yet**
- [ ] Build Blocks M → N → O in that order
- [ ] Begin frontend project once backend blocks are confirmed stable against a live DB

---

## Recently Completed Work

- **Block J — Socket Handlers:**
  - `socket.handler.js` — authenticate lifecycle, user room join (`user:<userId>`), delegates to chat + notification handlers after auth
  - `chat.socket.js` — 6 chat events: `join_conversation`, `leave_conversation`, `send_message`, `typing_start`, `typing_stop`, `messages_read`; participation verified on every mutating event via live DB re-fetch
  - `notification.socket.js` — `mark_read` event; delegates to `notifications.service.markOneRead()`; errors swallowed (non-critical)
  - `server.js` — `// BLOCK J:` placeholder replaced with `initSocketHandlers(io)` live call
  - All 4 files passed `node --check` syntax validation.

---

## Recommended Next Steps

1. `npm install` — lock in axios addition.
2. Connect a real Neon.tech Postgres instance and run all 18 migrations + 4 seed scripts for the first time.
3. Manually test Block J socket events against the live server.
4. Build Block L (Chat REST API) — gives the chat socket a paired HTTP complement and completes the chat feature.
5. Build Block M (Reviews) — unlocks post-booking trust signals.
6. Raise migration-lock question and get sign-off on `disputes`/`admin_audit_logs` tables before starting Block O.
