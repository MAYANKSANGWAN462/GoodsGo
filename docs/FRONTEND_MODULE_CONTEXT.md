# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** FE-4 — Create/Edit Post (All 3 Post Types)
> **Status:** Not started
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Current Block: FE-4 — Create/Edit Post (All 3 Post Types)

### Module Goal
Implement the Create Post and Edit Post pages. Each of the three post types (`need_transport`, `vehicle_available`, `return_journey`) has a different form. The parent page handles post-type selection and delegates to the matching form component.

### Why this block fourth
Create Post is gated on email verification. It also introduces multipart form submission (images), which is the most complex form pattern in the app. FE-5 (Bookings) links back to post detail — having posts creatable first makes the full booking loop testable.

---

### Files to Implement (exist as stubs — replace now)
```
src/pages/posts/CreatePostPage.jsx        ← Post-type selector; renders matching form
src/pages/posts/EditPostPage.jsx          ← Pre-fills matching form with existing post data
src/components/posts/NeedTransportForm.jsx
src/components/posts/VehicleAvailableForm.jsx
src/components/posts/ReturnJourneyForm.jsx
src/components/common/Select.jsx          ← Dropdown; options array prop; RHF register()
src/components/common/Textarea.jsx        ← Multi-line input; same interface as Input
```

### Files to Modify (targeted changes only)
```
src/services/posts.service.js  ← Add createPost, updatePost, deletePost, updatePostStatus
src/hooks/usePosts.js          ← Add useCreatePost, useUpdatePost, useDeletePost, useUpdatePostStatus
```

---

### Backend APIs Required
| Endpoint | Service fn | Notes |
|---|---|---|
| `POST /posts` | `createPost` | multipart; fields differ per post_type; images up to 5 |
| `PUT /posts/:postId` | `updatePost` | multipart; owner enforced backend |
| `DELETE /posts/:postId` | `deletePost` | behind ConfirmDialog |
| `PUT /posts/:postId/status` | `updatePostStatus` | toggle active/inactive |
| `GET /config/options` | already cached as `['config']` | vehicle types + goods categories |
| `GET /posts/:postId` | already in usePosts.js | for EditPostPage pre-fill |

### Post-type field maps
| Type | Fields |
|---|---|
| `need_transport` | originCity, destinationCity, scheduledDate, goodsCategoryId, weightKg, goodsDescription, specialRequirements?, priceEstimate?, images |
| `vehicle_available` | originCity, destinationCity, scheduledDate, vehicleTypeId, availableWeightKg, priceEstimate?, images |
| `return_journey` | originCity, destinationCity, scheduledDate, vehicleTypeId, availableWeightKg, priceEstimate?, images |

---

### Zustand Stores Involved
- `useAuthStore` — read `user.isEmailVerified`; show verification banner if false

### React Query Conventions
- On `createPost` success: invalidate `['posts']` + `['my-posts']`; redirect to new post detail
- On `updatePost` success: invalidate `['post', postId]` + `['my-posts']`; redirect to post detail
- On `deletePost` success: invalidate `['posts']` + `['my-posts']`; redirect to `/profile/me`

### Component Relationships
```
CreatePostPage
  ├── post-type selector (three <Button> tabs)
  └── {NeedTransportForm | VehicleAvailableForm | ReturnJourneyForm}
        ├── Select (vehicle/goods category from config)
        ├── Input (cities, weight, price)
        ├── Textarea (description, special requirements)
        └── image file input (up to 5 files)

EditPostPage
  └── usePost(postId) → pre-fill → same form component tree
```

---

### Design Notes
- Post-type selector: three tab-style buttons at the top of CreatePostPage; selected type highlighted.
- All three form components share the same layout structure — form fields + image upload area at bottom + submit button.
- Image upload: native `<input type="file" multiple accept="image/*" />` wrapped in a styled drop zone. Show thumbnails of selected files. Max 5 images.
- Email verification banner: if `!user.isEmailVerified`, show a dismissible banner at the top of CreatePostPage with a "Resend verification" button; do not hide the form entirely.
- On `EMAIL_NOT_VERIFIED` (403) error from backend, also show the banner.
- Edit mode: `EditPostPage` fetches the post, checks ownership via `user.id === post.owner.id` (redirect to unauthorized if not owner), then renders the correct form with values pre-filled.
- `Select` and `Textarea` common components must follow the same RHF/Yup/error-prop pattern as `Input`.

### Testing Checklist (manual, human-executed)
- [ ] `/posts/create` redirects to `/login` when unauthenticated
- [ ] Post-type selector tabs switch the visible form
- [ ] `need_transport` form validates and submits; new post appears in Marketplace
- [ ] `vehicle_available` form validates and submits correctly
- [ ] `return_journey` form validates and submits correctly
- [ ] Image upload preview shows thumbnails; max 5 enforced on frontend
- [ ] Editing own post pre-fills fields correctly
- [ ] Editing another user's post → 403 from backend → error toast
- [ ] Deleting a post (behind ConfirmDialog) removes it from feed
- [ ] Toggle active/inactive status updates post badge on detail page
- [ ] Email unverified banner shows and "Resend" button works

---

### Notes for This Block
- `Modal.jsx` and `ConfirmDialog.jsx` are stubs — implement `ConfirmDialog` as part of this block (needed for delete). `Modal.jsx` full implementation can wait for FE-5.
- Install no new packages — all required packages are already installed.
- Yup schemas for each form type should mirror the backend Joi schemas in `posts.validator.js`.
- `LocationAutocomplete.jsx` is NOT built in this block — use plain text inputs for city fields.
