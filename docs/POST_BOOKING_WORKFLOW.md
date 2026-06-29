# GoodsGo — Post & Booking Workflow Specification

> **Status:** Canonical domain reference for posts, bookings, payments, reviews, chat scoping, and realtime synchronization.
> **Authority:** This document defines the *intended* behaviour. Where the existing code disagrees, the code is the bug — but **do not add database migrations to reconcile** (migrations are locked at 018). If a column/enum is missing, flag it instead of inventing schema.
> **Placement:** `docs/POST_BOOKING_WORKFLOW.md`. Reference it from `CLAUDE.md` so it is always loaded as context.

---

## 1. Actors

GoodsGo does **not** assign a fixed "shipper" or "transporter" role to an account. Role is **contextual to each post**:

| Term | Meaning in a given interaction |
|------|--------------------------------|
| **Shipper** | The party that has cargo to move. |
| **Transporter** | The party that has vehicle capacity. |
| **Post owner** | Whoever created the post being looked at. |
| **Booker / Requester** | The other party, who responds to the post from the marketplace. |
| **Admin** | Platform operator: moderation, reports, disputes. Never a booking participant. |

The same account can be a shipper on one post and a transporter on another. **All booking and form logic must be derived from `post.type` + `isOwner`, never from a stored account role.**

---

## 2. Post Types

| Post type | Created by | The post already carries | Looking for |
|-----------|-----------|--------------------------|-------------|
| **Need Transport** | Shipper | pickup location, drop location, cargo type, weight, dimensions/volume, packaging, preferred date/window, optional budget | a transporter |
| **Vehicle Available** | Transporter | vehicle type, capacity (weight/volume), route (origin → destination), available date, price (per kg / per trip), allowed cargo | cargo to fill the vehicle |
| **Return Journey Available** | Transporter | same as Vehicle Available, but for the empty return leg (usually discounted) | cargo on the way back |

**Rule:** information that belongs to the post is entered **once, by the post owner, at post creation**. It is never re-asked during booking.

---

## 3. The Booking Relationship (the core fix)

| Post type | Owner | Booker | Who accepts/rejects | Capacity model | Payer → Payee |
|-----------|-------|--------|---------------------|----------------|---------------|
| Need Transport | Shipper | Transporter | **Owner (shipper)** | Single (one transporter wins the job) | Shipper → Transporter |
| Vehicle Available | Transporter | Shipper | **Owner (transporter)** | Multi (accept shippers until capacity is filled) | Shipper → Transporter |
| Return Journey | Transporter | Shipper | **Owner (transporter)** | Multi (until capacity filled) | Shipper → Transporter |

Two invariants that must hold everywhere in code:

1. **The post owner always controls accept/reject.** The booker never accepts.
2. **Money always flows Shipper → Transporter**, regardless of who owns the post. Payment direction is computed from the role pairing, *not* from `post.user_id`.

---

## 4. Dynamic Booking Form

The form rendered on a post detail page depends on `post.type` and whether the current user is the owner.

### If the current user **is the post owner**
No booking form is shown. Instead show the **incoming requests** panel (list of pending bookers with accept/reject actions).

### Booking a **Need Transport** post (current user = transporter)
The cargo, pickup and drop are **read-only context** (display, not inputs). Collect only the transporter's offer:

- Vehicle to use (select from saved vehicles, or vehicle type + capacity)
- Quoted price (or "accept listed budget")
- Estimated pickup date/time (must fall inside the post's window)
- Optional message

**Do NOT ask for:** cargo type, weight, dimensions, pickup/drop locations — they belong to the post.

### Booking a **Vehicle Available** / **Return Journey** post (current user = shipper)
The vehicle, capacity and route are **read-only context**. Collect only the shipment details:

- Cargo type, weight, volume/dimensions, packaging, special handling
- Pickup point and drop point (must be on / within the listed route)
- Quoted or accepted price
- Optional message

**Do NOT ask for:** vehicle type, capacity, route — they belong to the post.

### Implementation note
A single `<BookingForm postType … isOwner … />` component should branch on these inputs and render the correct field set. There must be exactly one source of truth for "what fields apply to this scenario" so the UI, the validator, and the API contract cannot drift.

---

## 5. Booking Lifecycle (state machine)

```
                 booker                owner                 owner/transporter        shipper
   (create) ───▶ PENDING ──accept──▶ ACCEPTED ──pickup──▶ IN_TRANSIT ──deliver──▶ DELIVERED ──confirm──▶ COMPLETED
                    │                    │                                                                  │
              booker│cancel        owner │reject                                                            ▼
                    ▼                    ▼                                                            (payment released,
                CANCELLED            REJECTED                                                          both can review)

   Any state after ACCEPTED ──raise dispute──▶ DISPUTED ──(admin)──▶ resolved → COMPLETED | CANCELLED
```

| Transition | Allowed actor | Effect |
|------------|---------------|--------|
| create request | Booker | status = `pending`; notify owner |
| accept | Owner | status = `accepted`; see capacity rules below; notify booker |
| reject | Owner | status = `rejected` (terminal); notify booker |
| cancel (before accept) | Booker | status = `cancelled` (terminal); notify owner |
| cancel (after accept) | Either party, with reason | status = `cancelled`; notify the other; may require admin if payment started |
| pickup / start | Transporter | status = `in_transit` *(optional state — map to existing enum if present, else skip)* |
| mark delivered | Transporter | status = `delivered` (awaiting shipper confirmation) |
| confirm completion | Shipper | status = `completed`; unlock payment + reviews |
| raise dispute | Either party | status = `disputed`; route to admin |

> Reconcile the exact string values with `utils/constants.js`. Use whatever the backend already defines; do not introduce new enum values that need a migration.

### Capacity rules on accept
- **Need Transport (single):** accepting one booking sets `post.status = booked` and **auto-rejects or holds** remaining pending requests for that job.
- **Vehicle Available / Return Journey (multi):** accepting reduces remaining capacity; keep the post `open` until capacity is exhausted, then set `post.status = booked`/`full`.

### Edge rules (enforce in service + UI)
- Owner cannot book their own post.
- Cannot create a booking on an `expired`, `closed`, `completed`, or `full` post.
- A user cannot have two `pending` requests on the same post.
- A rejected/cancelled booking does not block creating a new request later, unless the post is closed.

---

## 6. Payments

- Triggered/unlocked only after `completed`.
- **Payer = the shipper, payee = the transporter**, resolved from the post-type matrix in §3 — never from `post.user_id`.
- Payment status changes (`pending` → `paid`/`released` → `refunded`) must emit a realtime event (see §9) and update: the booking detail, the payment history page, both dashboards, and the admin payments view.

---

## 7. Reviews

- Bidirectional and only after `completed`.
- Shipper reviews transporter; transporter reviews shipper.
- A user may submit at most one review per completed booking.
- Posting a review updates the counterpart's public profile rating in realtime.

---

## 8. Chat Scoping

Every conversation is keyed by **(post, booking?, participants)**:

- Chat is initiated **from a post or a booking**, not from a standalone page. Every post card and post detail page exposes a **Chat** action.
- Clicking Chat opens the conversation tied to that post between the current user and the post owner (creating it if absent).
- Once a booking exists, the conversation is also linked to that booking so status changes can post inline system messages ("Booking accepted", "Marked delivered").
- A standalone messages page may still exist as an aggregated inbox, but it lists the same post/booking-scoped conversations.

---

## 9. Realtime Synchronization Contract

No screen should require a manual refresh. Reuse the existing `socket.handler.js` and the `user:{id}` / post / booking / conversation rooms.

| Event (logical) | Emitted when | Clients update |
|-----------------|--------------|----------------|
| `booking:created` | booker submits request | owner's dashboard, post requests panel, notifications badge |
| `booking:status_changed` | accept / reject / cancel / deliver / complete / dispute | booking page, booking detail, related post, both dashboards, chat (system message), admin bookings |
| `post:status_changed` | post becomes booked/full/expired/closed | marketplace card, post detail, owner dashboard, admin posts |
| `chat:message` | new message | open chat window, conversation list, unread badge |
| `notification:new` | any notify event above | notification badge + list, instantly |
| `payment:status_changed` | payment created/released/refunded | booking, payment history, dashboards, admin payments |
| `user:updated` | email verified, profile/avatar change | navbar, profile pages, any "Verify Email" banner (must disappear) |

### Frontend state rule
Frontend state must always converge to backend state. On every relevant socket event, invalidate or patch the matching React Query cache key so the UI re-derives from server truth rather than stale local state. Examples that must work with zero refresh:
- Email verified → every "Verify Email" warning disappears everywhere.
- Booking status change → every page showing that booking updates.
- New message → unread count increments immediately.

---

## 10. End-to-End Flows to Validate

**Shipper (Need Transport):** register → verify email → login → create Need-Transport post → receive transporter requests → accept one → chat → confirm delivery → pay → review.

**Transporter (Vehicle Available):** register → login → create Vehicle-Available post (or browse Need-Transport posts) → receive/ send requests → accept shipper / get accepted → chat → mark delivered → get paid → review.

**Admin:** manage users → moderate posts → resolve reports → resolve disputes.

Each step must reflect instantly on every other connected surface per §9.

---

## 11. Status Enum Reference (reconcile with `constants.js`)

- **Post:** `open` (a.k.a. active), `booked`, `full`, `in_progress`, `completed`, `expired`, `closed`.
- **Booking:** `pending`, `accepted`, `rejected`, `cancelled`, `in_transit`(opt.), `delivered`, `completed`, `disputed`.
- **Payment:** `pending`, `paid`/`released`, `refunded`, `failed`.

Use the existing values verbatim. If a state above has no backend equivalent and would require a migration, **omit it and note the gap** in the final report rather than adding migration 019.
