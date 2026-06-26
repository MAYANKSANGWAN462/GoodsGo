# GoodsGo — Frontend Module Context

> **Purpose:** Active implementation brief. Regenerate this file completely after every completed frontend module.
> **Current block:** FE-3 — Config Fetch + Marketplace Feed + Post Detail
> **Status:** Not started
> **Max size:** 150 lines. This constraint is intentional — keep it tight.

---

## Current Block: FE-3 — Config Fetch + Marketplace Feed + Post Detail

### Module Goal
Fetch reference data (vehicle types, goods categories) at app startup, implement the public Marketplace feed page with filtering, and the Post Detail page. Make Marketplace publicly accessible (optionalAuth). Wire `posts.service.js` and `usePosts.js`.

### Why this block third
Marketplace is the product's gravitational centre — the first feature page users see. It also establishes the PostCard/PostList/PostFilters pattern that FE-4 (Create Post) and FE-5 (Bookings) build on.

---

### Files to Implement (exist as stubs — replace now)
```
src/services/posts.service.js           ← getFeed, getPostById, toggleSave, reportPost, getMyPosts
src/hooks/usePosts.js                   ← useQuery + useMutation wrappers for posts service
src/pages/marketplace/MarketplacePage.jsx  ← Feed: PostFilters + PostList; URL search params
src/pages/marketplace/PostDetailPage.jsx   ← Post detail: gallery, details, save button, report
```

### Files to Create (new)
```
src/services/config.service.js          ← getConfigOptions() — GET /config/options
src/components/posts/PostCard.jsx       ← Feed card: type badge, route, price, date, avatar
src/components/posts/PostList.jsx       ← PostCard array + Pagination + loading skeleton
src/components/posts/PostFilters.jsx    ← Filter panel: type, city, date, price
src/components/posts/PostTypeBadge.jsx  ← Thin Badge wrapper for post_type values
src/components/posts/PostImageGallery.jsx  ← Image carousel for detail view
src/constants/postTypes.js              ← POST_TYPES display labels + badge variant map
```

### Files to Modify (existing — targeted changes only)
```
src/App.jsx    ← Move MarketplacePage + PostDetailPage outside ProtectedRoute (optionalAuth)
               ← Add config startup fetch (useQuery with staleTime: Infinity)
```

---

### Backend APIs Required
| Endpoint | Service fn | Query key | Notes |
|---|---|---|---|
| `GET /config/options` | `getConfigOptions` | `['config']` | `staleTime: Infinity`; fetch once in App.jsx |
| `GET /posts` | `getFeed` | `['posts', filters]` | `staleTime: 60_000`; sync filters to URL params |
| `GET /posts/:postId` | `getPostById` | `['post', postId]` | `optionalAuth` |
| `POST /posts/:postId/save` | `toggleSave` | invalidate `['post', postId]`, `['saved-posts']` | optimistic toggle |
| `POST /posts/:postId/report` | `reportPost` | — | mutation only; show toast |

---

### Zustand Stores Involved
- `useAuthStore` — read `isAuthenticated` for conditional save/report buttons

### React Query Conventions
- `['config']` — `staleTime: Infinity`, fetched once; pass data to PostFilters via React Query
- `['posts', filters]` — `staleTime: 60_000`; `filters` = full URL param object (type, city, page, etc.)
- `['post', postId]` — single post detail; invalidated on save toggle

### Component Relationships
```
MarketplacePage
  ├── PostFilters (sidebar/drawer)
  └── PostList
        └── PostCard × N
              └── PostTypeBadge
              └── Avatar (owner)

PostDetailPage
  ├── PostImageGallery
  ├── PostTypeBadge
  └── Avatar (owner)
```

---

### Design Notes
- Filter state is synced to URL search params (`useSearchParams`) — bookmarkable and shareable.
- PostFilters: collapsible drawer on mobile (`<768px`), fixed sidebar on desktop.
- PostCard: full-width on mobile, 2-column grid on `sm`, 3-column on `lg`.
- PostDetailPage: image gallery top, details below; save button (auth only); report button (auth + not owner).
- Loading: skeleton cards matching PostCard shape while feed loads.
- Empty state: `<EmptyState>` with "No posts match your filters" + clear filters CTA.
- Error state: inline error card with retry — do NOT redirect.

### Testing Checklist (manual, human-executed)
- [ ] `npm run dev` — `/marketplace` loads without login
- [ ] Feed displays post cards with type badge, route, price
- [ ] Filtering by post type (need_transport / vehicle_available / return_journey) works
- [ ] URL updates when filters change; page reload restores filters
- [ ] Pagination controls work; page param updates in URL
- [ ] Clicking a card navigates to `/marketplace/posts/:id`
- [ ] Post detail shows images, description, owner avatar, price
- [ ] Save button appears for authenticated users; toggles bookmark
- [ ] Save button absent for unauthenticated users
- [ ] Report button absent for post owner
- [ ] Config data (vehicle types, goods categories) fetched once on startup and used in filters
- [ ] Empty state renders when no posts match filters

---

### Notes for This Block
- `BookingRequestModal` is NOT built in this block — post detail shows a "Request Booking" button that is stubbed (opens a placeholder modal or navigates to the bookings page). Full modal in FE-5.
- Install no new packages — all required packages (axios, react-query, prop-types, date-fns) are already installed.
- `src/components/common/Badge.jsx`, `Card.jsx`, `Pagination.jsx`, `EmptyState.jsx` are stubs — implement them as part of this block since PostCard, PostList, and PostFilters need them.
