# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** FE-9 — Reviews (Create Review + Review Lists)
> **Status:** Not started
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Current Block: FE-9 — Reviews (Create Review + Review Lists)

### Module Goal
Implement the review creation flow (on BookingDetailPage after a booking is `completed`) and the review display components used by PublicProfilePage and MyProfilePage. Also wire the inline `ReviewCard` in `PublicProfilePage` into the proper shared component.

### Why this block ninth
Profile (FE-8) established `useReviews.js` (useUserReviews, useMyReviews, useDeleteReview) and `reviews.service.js`. FE-9 adds `createReview` to the service and `useCreateReview` to the hook, then builds the display and form components.

---

### Files to Implement (exist as stubs — replace now)
```
src/components/reviews/ReviewCard.jsx    ← Single review: StarRating, comment, reviewer avatar+name,
                                            date, role badge (as_customer / as_transporter),
                                            optional delete button (own review, within edit window)
src/components/reviews/ReviewList.jsx    ← Array of ReviewCard + Pagination
src/components/reviews/ReviewForm.jsx    ← Create review form: StarRating (interactive) + comment
                                            + reviewRole select; shown on BookingDetailPage when
                                            booking is 'completed' and user hasn't reviewed yet
```

### Files to Modify (targeted changes only)
```
src/services/reviews.service.js  ← Add createReview(body)
src/hooks/useReviews.js          ← Add useCreateReview(); add useBookingReviews(bookingId)
src/pages/profile/PublicProfilePage.jsx  ← Replace inline ReviewCard with imported ReviewCard;
                                            replace inline review list with ReviewList component
src/pages/profile/MyProfilePage.jsx      ← Replace Reviews tab EmptyState with ReviewList
                                            (using useMyReviews, not paginated by userId)
src/pages/bookings/BookingDetailPage.jsx ← Add ReviewForm section after booking.status === 'completed';
                                            add useBookingReviews to show existing reviews
```

---

### Backend APIs Required
| Endpoint | Service fn | Notes |
|---|---|---|
| `POST /reviews` | `createReview` | `{ bookingId, rating, comment, reviewRole: 'as_customer'\|'as_transporter' }` |
| `GET /reviews/bookings/:bookingId` | `getBookingReviews` (new) | query key `['booking-reviews', bookingId]` |
| `GET /reviews/users/:userId` | `getUserReviews` (exists) | already implemented |
| `GET /users/me/reviews` | `getMyReviews` (exists) | already implemented |
| `DELETE /reviews/:reviewId` | `deleteReview` (exists) | already implemented |

### Component Relationships
```
BookingDetailPage (completed booking)
  └── ReviewForm (shown if no review yet from current user)
        ├── StarRating (interactive, size='lg')
        └── Textarea (comment)

PublicProfilePage
  └── ReviewList
        └── ReviewCard (read-only)

MyProfilePage (Reviews tab)
  └── ReviewList (reviews I wrote, via useMyReviews)
        └── ReviewCard (with delete button if within edit window)
```

### Design Notes
- `ReviewForm` uses React Hook Form + Yup. Schema: rating (number, 1–5, required), comment (string, 10–1000 chars, required), reviewRole (enum, required).
- `reviewRole` should be pre-determined based on user's role in the booking (requester → 'as_customer'; post owner → 'as_transporter'). Pass it as a hidden field or derive it in the hook.
- `ReviewCard`: show role badge only when the context is "reviews I wrote" (MyProfilePage). On PublicProfilePage, omit the role badge.
- On success of `createReview`: invalidate `['booking-reviews', bookingId]` and `['public-profile', revieweeId]`. The `revieweeId` is the other party in the booking.
- Delete button on ReviewCard: only for own reviews (`review.reviewerId === me.id`) and only if `review.isEditable` (or within edit window). Backend enforces; front end hides the button when not applicable.

### Testing Checklist (manual, human-executed)
- [ ] BookingDetailPage shows ReviewForm only when booking.status === 'completed'
- [ ] Submitting ReviewForm with rating 1–5, comment, and role creates a review; form disappears on success
- [ ] Rating below 1 or above 5 shows inline validation error
- [ ] Comment shorter than 10 characters shows inline validation error
- [ ] Submitting twice shows `REVIEW_ALREADY_EXISTS` toast error
- [ ] PublicProfilePage shows real ReviewList (not the inline component from FE-8)
- [ ] MyProfilePage Reviews tab shows list of reviews I've written with delete buttons
- [ ] Delete review within edit window works; outside window shows API error toast
- [ ] No token in localStorage or sessionStorage throughout the flow

---

### Notes for This Block
- `src/components/reviews/ReviewCard.jsx` stub exists — read before writing.
- `src/components/reviews/ReviewList.jsx` stub exists — read before writing.
- `src/components/reviews/ReviewForm.jsx` stub exists — read before writing.
- The inline `ReviewCard` in `PublicProfilePage.jsx` should be removed and replaced with the shared component.
- `MyProfilePage` Reviews tab currently shows `<EmptyState>` — replace with `<ReviewList>` using `useMyReviews()`.
- Check `BookingDetailPage.jsx` before editing — understand its current structure (stub sections for payment and reviews) before adding `ReviewForm`.
