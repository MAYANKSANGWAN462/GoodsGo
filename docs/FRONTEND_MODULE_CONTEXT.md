# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** FE-10 — Payments (Razorpay Initiate + Verify)
> **Status:** Not started
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Current Block: FE-10 — Payments (Razorpay Initiate + Verify)

### Module Goal
Implement the Razorpay payment flow on BookingDetailPage (replace the "Payment — available in a future update" stub) and build PaymentHistoryPage. The frontend calls `POST /payments/initiate` to get a Razorpay order, opens the Razorpay checkout modal client-side, then calls `POST /payments/verify` with the payment result.

### Why this block tenth
The BookingDetailPage payment stub has existed since FE-5. Reviews (FE-9) are now wired. Payments are the last major transactional feature before the admin panel.

---

### Files to Implement (exist as stubs — replace now)
```
src/pages/payments/PaymentHistoryPage.jsx  ← Payment history list + initiate button per booking
```

### Files to Create (new — not in scaffold)
```
src/hooks/usePayments.js   ← useInitiatePayment(), useVerifyPayment()
```

### Files to Modify (targeted changes only)
```
src/services/payments.service.js          ← Implement initiatePayment(bookingId) and
                                             verifyPayment(body) — currently a stub
src/pages/bookings/BookingDetailPage.jsx  ← Replace payment stub with real PaymentSection:
                                             show payment status, initiate button, and
                                             verify callback via Razorpay modal
src/App.jsx                               ← Replace PlaceholderPage for /payments with
                                             real PaymentHistoryPage import
```

---

### Backend APIs Required
| Endpoint | Service fn | Notes |
|---|---|---|
| `POST /payments/initiate` | `initiatePayment(bookingId)` | Returns `{ orderId, amount, currency, key, paymentRowId }` |
| `POST /payments/verify` | `verifyPayment({ bookingId, orderId, paymentId, signature })` | Called inside Razorpay `handler` callback |

### Razorpay Integration Notes
- Load the Razorpay script dynamically at checkout time (not at app startup):
  ```js
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  document.body.appendChild(script);
  ```
- Call `new window.Razorpay({ key, amount, currency, order_id, handler: fn }).open()` after script loads.
- The `handler` callback receives `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }` — call `verifyPayment` inside it.
- Do NOT install the `razorpay` npm package on the frontend — that is backend-only. The frontend uses only the CDN script.
- `amount` from the backend is in paise (smallest currency unit). Display in rupees: `amount / 100`.

### Component Relationships
```
BookingDetailPage (accepted booking, payment not yet done)
  └── PaymentSection (inline, not a separate component file needed)
        ├── "Pay Now" Button → initiatePayment mutation → opens Razorpay modal
        └── On Razorpay success → verifyPayment mutation → invalidate ['booking', bookingId]

PaymentHistoryPage
  └── List of booking payments for current user (if backend supports GET /payments)
      If no dedicated list endpoint exists: show a placeholder or link to bookings
```

### Design Notes
- Payment is only available when `booking.status === 'accepted'` and no successful payment exists yet.
- After `verifyPayment` succeeds, invalidate `['booking', bookingId]` so the booking status updates.
- Show `isLoading` on the "Pay Now" button while `initiatePayment` is pending.
- If `initiatePayment` fails (e.g. booking not accepted), show `toast.error`.
- `PaymentHistoryPage`: Check if `GET /api/v1/payments` or a sub-route exists in the backend. If no payment list endpoint is available, show a message directing users to their Bookings page. Verify in `docs/PROJECT_CONTEXT.md` Section 11 before building.

### Testing Checklist (manual, human-executed)
- [ ] BookingDetailPage shows payment section only when booking.status === 'accepted'
- [ ] Clicking "Pay Now" calls initiate, opens Razorpay modal with correct amount
- [ ] Completing payment in Razorpay modal calls verify; booking status updates on success
- [ ] Failing payment (dismiss modal) does not call verify and shows no error state
- [ ] PaymentHistoryPage loads without errors (even if empty)
- [ ] No token in localStorage or sessionStorage throughout the flow

---

### Notes for This Block
- Check `src/services/payments.service.js` before writing — it may already have stubs.
- Verify if `GET /payments` or `GET /users/me/payments` endpoint exists in backend (PROJECT_CONTEXT.md Section 11) before building the history list.
- `src/App.jsx` currently has a PlaceholderPage or redirect for `/payments` — replace with the real PaymentHistoryPage.
- The payment section in BookingDetailPage currently reads "Payment — available in a future update." — replace the entire stub block.
