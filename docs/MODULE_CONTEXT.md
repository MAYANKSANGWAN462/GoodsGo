# GoodsGo — Module Context
> **Active block:** Block L — Chat REST API | Replace this file entirely when Block L is complete.

---

## Current Module
- **Module:** Chat (REST API layer)
- **Block:** L — follows Block J (Socket Handlers)
- **Goal:** Build the HTTP REST complement to the socket-based chat already wired in Block J. Clients can fetch conversation lists, fetch message history, send text messages via REST, and upload image messages. The socket layer handles real-time delivery; the REST layer handles initial data load and image upload.

---

## Pre-conditions (all resolved — no blockers before starting)
- Block J complete: `chat.socket.js` handles `send_message`, `typing_start`, `typing_stop`, `messages_read`, `join_conversation`, `leave_conversation` ✓
- `config/socket.js` exports `emitToConversation(conversationId, event, data)` — REST send endpoints must emit socket events so that connected clients receive real-time updates ✓
- migrations 010 (`conversations`), 011 (`messages`) exist ✓
- `upload.middleware.js` has `uploadSingleImage` middleware available ✓
- `uploadImage.js` has `uploadToCloudinary(buffer, mimeType, folder, options)` and `CLOUDINARY_FOLDERS` — use `CLOUDINARY_FOLDERS.CHAT` (or define if not present) for image storage ✓
- `app.js` has a `// BLOCK L: ...` placeholder comment for the chat route mount ✓

---

## Module Dependencies
- **Reads from:** `conversations`, `messages`, `users` (joined for participant profile data)
- **Writes to:** `messages`, `conversations` (last_message_at, last_message_preview)
- **Uses:** `config/database.js` (`query()`), `config/socket.js` (`emitToConversation()`), `utils/uploadImage.js` (Cloudinary image upload for image messages), `utils/constants.js` (`SOCKET_EVENTS`, `CONVERSATION_STATUS`, `MESSAGE_TYPES`, `CLOUDINARY_FOLDERS`), `utils/ApiError.js`, `utils/paginate.js`
- **Middleware chain per route:** `authenticate` → (uploadSingleImage for image route) → `validate(schema)` → controller
- **No new migrations needed**

---

## Files to Create

| File | Role | Notes |
|---|---|---|
| `src/modules/chat/chat.validator.js` | Joi validation schemas | `conversationIdParamSchema`, `sendMessageSchema`, `listMessagesQuerySchema` |
| `src/modules/chat/chat.service.js` | Business logic + DB queries | 5 exported functions (see below) |
| `src/modules/chat/chat.controller.js` | Thin asyncHandler-wrapped handlers | One handler per service function |
| `src/modules/chat/chat.routes.js` | Express router | 5 routes; mounted in `app.js` |

---

## Files to Modify

| File | Change |
|---|---|
| `src/app.js` | Replace `// BLOCK L:` placeholder with `app.use('/api/v1/chat', require('./modules/chat/chat.routes'))` |
| `src/modules/users/users.routes.js` | Add `router.get('/me/conversations', authenticate, asyncHandler(chatController.getMyConversations))` before the `/:userId` route |

---

## API Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/v1/chat` | `authenticate` | List all of the authenticated user's conversations, ordered by `last_message_at DESC`, paginated |
| `GET` | `/api/v1/chat/:conversationId` | `authenticate` | Get single conversation detail + verify participation |
| `GET` | `/api/v1/chat/:conversationId/messages` | `authenticate` | Paginated message history, newest-first |
| `POST` | `/api/v1/chat/:conversationId/messages` | `authenticate` | Send a text message; also emits `new_message` socket event |
| `POST` | `/api/v1/chat/:conversationId/messages/image` | `authenticate` + `uploadSingleImage` | Upload + send an image message via Cloudinary |

---

## Service Functions to Export

### `getMyConversations(userId, page, limit)`
- Query: `SELECT c.*, u.full_name, u.profile_image_url` joined where `participant_1_id = userId OR participant_2_id = userId`, the "other participant" is derived as `CASE WHEN c.participant_1_id = $1 THEN c.participant_2_id ELSE c.participant_1_id END`.
- Join `users` to get the other participant's `full_name` and `profile_image_url`.
- Join `bookings` to get `status` (so frontend can show booking state in chat header).
- Order: `c.last_message_at DESC NULLS LAST`.
- Paginated via `paginate()`.
- Returns: `{ conversations, meta }`.

### `getConversationById(conversationId, userId)`
- Verify participation: `SELECT ... WHERE id = $1 AND (participant_1_id = $2 OR participant_2_id = $2)`.
- Throw `ApiError.notFound('Conversation')` on fail (no existence disclosure — same user gets 404 for both "not found" and "not a participant").
- Return formatted conversation with both participants' profiles and booking status.

### `getMessages(conversationId, userId, page, limit)`
- Verify participation first (throw 404 if not a participant).
- Query: `SELECT m.*, u.full_name AS sender_name, u.profile_image_url AS sender_image FROM messages m LEFT JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = $1 ORDER BY m.created_at DESC LIMIT $2 OFFSET $3`.
- Paginated.
- Returns: `{ messages, meta }`.

### `sendMessage(conversationId, userId, content)`
- Verify participation + verify `conversations.status = 'active'` (throw 409 if locked/archived).
- Insert into `messages` with `message_type = 'text'`.
- Update `conversations.last_message_at` and `last_message_preview` (first 255 chars).
- Emit `emitToConversation(conversationId, SOCKET_EVENTS.NEW_MESSAGE, formattedMessage)`.
- Return formatted message.

### `sendImageMessage(conversationId, userId, fileBuffer, mimeType)`
- Verify participation + verify `conversations.status = 'active'`.
- Upload to Cloudinary via `uploadToCloudinary(fileBuffer, mimeType, CLOUDINARY_FOLDERS.CHAT)` — store both `image_url` (secure_url) and `image_public_id` (public_id) on the message row.
- Insert into `messages` with `message_type = 'image'`, `content = ''`, `image_url = <cloudinary url>`, `image_public_id = <public id>`.
- Update conversation preview to `[Image]`.
- Emit socket event.
- Return formatted message.

---

## Conversation Formatter

```js
function formatConversation(row, currentUserId) {
  return {
    id:                   row.id,
    bookingId:            row.booking_id,
    bookingStatus:        row.booking_status,
    otherParticipant: {
      id:               row.other_participant_id,
      fullName:         row.other_participant_name,
      profileImageUrl:  row.other_participant_image
    },
    status:               row.status,
    lastMessageAt:        row.last_message_at || null,
    lastMessagePreview:   row.last_message_preview || null,
    createdAt:            row.created_at
  };
}
```

## Message Formatter

```js
function formatMessage(row) {
  return {
    id:             row.id,
    conversationId: row.conversation_id,
    senderId:       row.sender_id,
    senderName:     row.sender_name || null,
    senderImage:    row.sender_image || null,
    content:        row.content,
    messageType:    row.message_type,
    imageUrl:       row.image_url || null,
    isRead:         row.is_read,
    readAt:         row.read_at || null,
    createdAt:      row.created_at
  };
}
```

---

## Architecture Alignment Notes

- **`GET /me/conversations`** should be nested under `users.routes.js` (following the `/me/*` pattern established for posts, bookings, notifications), NOT a separate top-level route. Add it as `router.get('/me/conversations', authenticate, asyncHandler(chatController.getMyConversations))` in `users.routes.js` before the `/:userId` route.
- **`/api/v1/chat/*`** is the top-level REST namespace for all other chat endpoints (conversation detail, message list, send message, send image). This gets its own `app.use()` mount in `app.js`.
- The route `/chat/:conversationId/messages/image` (specific literal path) must be declared **before** `/chat/:conversationId/messages` (param route) — same Express declaration-order rule applied in `posts.routes.js`.
- Check whether `CLOUDINARY_FOLDERS.CHAT` exists in `constants.js` before using it. If it is missing, add it to `constants.js` first (do not inline the folder name string in `chat.service.js`).
- No rate limiter is defined for chat send yet — add a `chatMessageLimiter` (e.g. 60 messages/min/user-ID) to `rateLimiter.middleware.js` and apply it to the `POST` message endpoints.

---

## Validation Schemas

```js
// chat.validator.js
const conversationIdParamSchema = Joi.object({
  conversationId: commonSchemas.uuid.required()
});

const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required()
});

const listMessagesQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});

const listConversationsQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(20).default(10)
});
```

---

## Post-Block-L Checklist (replace this file with Block M brief when done)
- [ ] `chat.validator.js`, `chat.service.js`, `chat.controller.js`, `chat.routes.js` written and syntax-validated
- [ ] `CLOUDINARY_FOLDERS.CHAT` confirmed in `constants.js` (add if missing)
- [ ] `chatMessageLimiter` added to `rateLimiter.middleware.js`
- [ ] `app.js` updated — `// BLOCK L:` placeholder replaced with live mount
- [ ] `users.routes.js` updated — `GET /me/conversations` wired in
- [ ] `PROJECT_CONTEXT.md` Section 6 (folder structure), Section 3.5 (Chat — moved from Partial to Complete), Section 11 (API — new chat endpoints), Section 12 (Services) updated
- [ ] `CURRENT_STATE.md` updated: Block L in completed list, Block M as next
- [ ] This file replaced with Block M brief
