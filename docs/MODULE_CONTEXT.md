# GoodsGo — Module Context
> **Active block:** Block M — Reviews | Replace this file entirely when Block M is complete.

---

## Current Module
- **Module:** Reviews
- **Block:** M — follows Block L (Chat REST API)
- **Goal:** Two-sided post-booking review system. After a booking reaches `completed` status, both the requester (reviewing in role `as_customer`) and the post owner (reviewing in role `as_transporter`) may each leave exactly one review. Reviews drive the `rating` and `total_reviews` aggregate on the `users` table.

---

## Pre-conditions (all resolved — no blockers before starting)
- migration 012 (`reviews` table) exists with compound unique index `(booking_id, reviewer_id, review_role)` ✓
- `REVIEW_ROLES` constant exists in `constants.js` ✓
- `NOTIFICATION_TYPES.REVIEW_RECEIVED` exists in `constants.js` ✓
- `notifications.service.createNotification()` is live and never throws ✓
- `PLATFORM_SETTINGS.REVIEW_EDIT_WINDOW_HOURS` constant exists ✓
- `app.js` has a `// BLOCK M:` placeholder comment ✓

---

## Module Dependencies
- **Reads from:** `reviews`, `bookings`, `users`
- **Writes to:** `reviews`, `users` (`rating`, `total_reviews` recalculated on each review create/delete)
- **Uses:** `config/database.js` (`query()`), `utils/constants.js` (`REVIEW_ROLES`, `BOOKING_STATUS`, `PLATFORM_SETTINGS`, `NOTIFICATION_TYPES`), `utils/ApiError.js`, `utils/paginate.js`
- **Notifies:** `notifications.service.createNotification()` — lazy-require pattern for `REVIEW_RECEIVED` type
- **Middleware chain per route:** `authenticate` → (optionalAuth for public routes) → `validate(schema)` → controller

---

## Files to Create

| File | Role | Notes |
|---|---|---|
| `src/modules/reviews/reviews.validator.js` | Joi validation schemas | 3 schemas (see below) |
| `src/modules/reviews/reviews.service.js` | Business logic + DB queries | 5 exported functions |
| `src/modules/reviews/reviews.controller.js` | Thin asyncHandler handlers | One handler per service function |
| `src/modules/reviews/reviews.routes.js` | Express router | 4 routes; mounted in `app.js` |

---

## Files to Modify

| File | Change |
|---|---|
| `src/app.js` | Replace `// BLOCK M:` placeholder with `app.use('/api/v1/reviews', require('./modules/reviews/reviews.routes'))` |
| `src/modules/users/users.routes.js` | Add `router.get('/me/reviews', authenticate, reviewsController.getMyReviews)` before the `/:userId` route |

---

## API Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/reviews` | `authenticate` | Create review; body: `{ bookingId, rating, comment, reviewRole }` |
| `GET` | `/api/v1/reviews/bookings/:bookingId` | `authenticate` | Get both reviews for a completed booking (parties only) |
| `GET` | `/api/v1/reviews/users/:userId` | `optionalAuth` | Public reviews written about a user (paginated) |
| `DELETE` | `/api/v1/reviews/:reviewId` | `authenticate` | Delete own review within `review_edit_window_hours`; recalculates rating |

Plus sub-resource route via `users.routes.js`:
- `GET /api/v1/users/me/reviews` → `reviewsController.getMyReviews` (reviews I have written)

---

## Service Functions to Export

### `createReview(bookingId, reviewerId, rating, comment, reviewRole)`
- Fetch booking — throw 404 if not found.
- Verify `booking.status === BOOKING_STATUS.COMPLETED` — throw 422 if not (`REVIEW_NOT_ALLOWED` code).
- Verify `reviewerId` is `booking.requester_id` OR `booking.post_owner_id` — throw 403 if not.
- Determine `revieweeId`: if reviewRole is `as_customer`, reviewer is the transporter reviewing the customer, so reviewee is `requester_id`. If `as_transporter`, reviewer is the customer reviewing the transporter, so reviewee is `post_owner_id`. Validate that the reviewer is actually the correct party for the chosen role.
- INSERT into `reviews` — the compound unique index `(booking_id, reviewer_id, review_role)` prevents duplicates; catch `23505` Postgres error and throw `ApiError.conflict('You have already submitted a review for this booking.')`.
- Recalculate `reviewee.rating` and `reviewee.total_reviews`:
  ```sql
  UPDATE users SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = $1 AND is_visible = true),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1 AND is_visible = true)
  WHERE id = $1
  ```
- Dispatch `REVIEW_RECEIVED` notification to the reviewee (lazy-require pattern — same as booking notifications).
- Return formatted review.

### `getBookingReviews(bookingId, userId)`
- Verify `userId` is a party to the booking (requester or post_owner) — throw 404 if not.
- Fetch all reviews for the booking (0, 1, or 2 rows).
- Return `{ reviews: [...], totalCount }` — not paginated since max 2 reviews per booking.

### `getMyReviews(userId, page, limit)`
- SELECT reviews WHERE `reviewer_id = userId`, paginated, newest-first.
- JOIN users (reviewee) for their profile.
- Return `{ reviews, meta }`.

### `getUserReviews(revieweeId, page, limit)`
- SELECT reviews WHERE `reviewee_id = revieweeId AND is_visible = true`, paginated, newest-first.
- JOIN users (reviewer) for their profile.
- Return `{ reviews, meta }`.

### `deleteReview(reviewId, userId)`
- Fetch review — throw 404 if not found.
- Verify `review.reviewer_id === userId` — throw 403 if not.
- Check that `review.created_at` is within `review_edit_window_hours` (from `platform_settings`):
  ```js
  const windowHours = await getPlatformSetting('review_edit_window_hours', 24);
  const windowMs = windowHours * 60 * 60 * 1000;
  if (Date.now() - new Date(review.created_at).getTime() > windowMs) {
    throw ApiError.businessRule('The edit window for this review has expired.', 'REVIEW_EDIT_WINDOW_EXPIRED');
  }
  ```
- DELETE the review row.
- Recalculate reviewee rating (same UPDATE as in `createReview`).
- Return `{ deleted: true }`.

---

## Validation Schemas

```js
// reviews.validator.js

const createReviewSchema = Joi.object({
  bookingId:  commonSchemas.uuid.required(),
  rating:     Joi.number().integer().min(1).max(5).required(),
  comment:    Joi.string().trim().min(10).max(1000).optional().allow(''),
  reviewRole: Joi.string().valid(...Object.values(REVIEW_ROLES)).required()
});

const reviewIdParamSchema = Joi.object({
  reviewId: Joi.string().uuid({ version: 'uuidv4' }).required()
});

const bookingIdParamSchema = Joi.object({
  bookingId: Joi.string().uuid({ version: 'uuidv4' }).required()
});

const userIdParamSchema = Joi.object({
  userId: Joi.string().uuid({ version: 'uuidv4' }).required()
});

const listReviewsQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});
```

---

## Review Formatter

```js
function formatReview(row) {
  return {
    id:          row.id,
    bookingId:   row.booking_id,
    reviewerId:  row.reviewer_id,
    reviewerName: row.reviewer_name || null,
    reviewerImage: row.reviewer_image || null,
    revieweeId:  row.reviewee_id,
    revieweeName: row.reviewee_name || null,
    rating:      row.rating,
    comment:     row.comment || null,
    reviewRole:  row.review_role,
    isVisible:   row.is_visible,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at
  };
}
```

---

## Architecture Alignment Notes

- **`GET /me/reviews`** follows the `/me/*` sub-resource pattern — wired into `users.routes.js`, not a new top-level mount.
- **`GET /reviews/users/:userId`** must be declared BEFORE `GET /reviews/:reviewId` in the same router to prevent Express from capturing "users" as a reviewId UUID (it would fail UUID validation, but the ordering is cleaner).
- **`GET /reviews/bookings/:bookingId`** same issue — literal "bookings" path segment must be declared before any `/:reviewId` route.
- **Rating recalculation** is a `SELECT AVG()` over all visible reviews for the reviewee — run inside the same operation as the review write/delete, not asynchronously, so the `users.rating` column is always consistent with the `reviews` table.
- **`getSetting()` pattern**: Follow the existing pattern from `posts.service.js` and `bookings.service.js` — define a local `getPlatformSetting(key, defaultValue)` function at the top of `reviews.service.js` that queries `platform_settings`. Do not extract to a shared module (acknowledged tech debt from Section 32).
- **No transaction needed** for `createReview`: the compound unique index prevents duplicates atomically, and if the rating recalculation UPDATE fails after a successful review INSERT, the review row is still valid — the rating will be corrected on the next review write. Logs the UPDATE failure instead of rolling back.
- **`deleteReview` does use a transaction**: delete + rating recalculation must be atomic — a deleted review that doesn't recalculate the rating would leave the user's rating permanently inflated.

---

## Post-Block-M Checklist (replace this file with Block N brief when done)
- [ ] `reviews.validator.js`, `reviews.service.js`, `reviews.controller.js`, `reviews.routes.js` written and syntax-validated
- [ ] `app.js` updated — `// BLOCK M:` placeholder replaced with live mount
- [ ] `users.routes.js` updated — `GET /me/reviews` wired in
- [ ] `PROJECT_CONTEXT.md` Section 6 (folder structure), Section 3.6 (Reviews — moved from Pending to Complete), Section 11 (API — new review endpoints), Section 12 (Services) updated
- [ ] `CURRENT_STATE.md` updated: Block M in completed list, Block N as next
- [ ] This file replaced with Block N brief
