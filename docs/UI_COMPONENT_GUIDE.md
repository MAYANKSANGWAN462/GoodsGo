# GoodsGo — UI Component Guide

> **Purpose:** Reusable component library documentation. Read before building or consuming any `src/components/common/` component.
> **What this is NOT:** Implementation code. This document describes the interface, variants, and rules for each component.
> **Source of truth for component files:** `src/components/` — see `docs/FRONTEND_ARCHITECTURE.md` Section 3.

---

## 1. Design System Philosophy

GoodsGo uses **Tailwind v4 utility classes** exclusively. There is no CSS-in-JS library and no separate component library (no MUI, no Chakra UI, no shadcn/ui). All visual design is composed from Tailwind utilities.

**Core principles:**
- Components are building blocks, not page solutions. They render what they are given — they never fetch data or dispatch mutations.
- Every component that accepts props declares `propTypes`. PropTypes are the design contract.
- Variants are controlled by a `variant` or `size` prop — never by a string concatenation of conditional class names. Use a lookup object keyed by variant.
- Loading states are the caller's responsibility. A component renders either data or a skeleton/spinner — the calling page decides which.

### Design tokens (define in `src/index.css` `@theme` block)
```css
@theme {
  --color-primary: #f97316;       /* orange-500 — brand primary */
  --color-primary-dark: #ea580c;  /* orange-600 — hover state */
  --color-surface: #ffffff;
  --color-surface-alt: #f9fafb;   /* gray-50 */
  --color-border: #e5e7eb;        /* gray-200 */
  --color-text: #111827;          /* gray-900 */
  --color-text-muted: #6b7280;    /* gray-500 */
  --color-danger: #ef4444;        /* red-500 */
  --color-success: #22c55e;       /* green-500 */
  --color-warning: #f59e0b;       /* amber-500 */
}
```

---

## 2. Component Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Component name | PascalCase | `BookingStatusBadge` |
| File name | PascalCase.jsx | `BookingStatusBadge.jsx` |
| `propTypes` key | camelCase | `isLoading`, `onClose`, `variant` |
| Tailwind variant lookup | `const VARIANTS = { primary: '...', secondary: '...' }` | keyed object |

---

## 3. Accessibility Rules

- Every interactive element is keyboard-navigable (Tab, Enter, Space, Escape).
- Every icon-only button has an `aria-label`.
- Every modal has `role="dialog"`, `aria-modal="true"`, and traps focus.
- Every form input is associated with a `<label>` via `htmlFor`/`id`.
- Colour contrast meets WCAG AA (4.5:1 for text, 3:1 for large text).
- Avoid conveying state through colour alone — pair colour with text or icon.

---

## 4. Component Catalogue

---

### Button

**File:** `src/components/common/Button.jsx`

**Purpose:** The only button element used across the application. No raw `<button>` tags in pages or feature components.

**Props:**
| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | node | required | Button label |
| `variant` | `'primary' \| 'secondary' \| 'danger' \| 'ghost'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding and font size |
| `isLoading` | bool | `false` | Replaces children with a spinner; disables the button |
| `disabled` | bool | `false` | Disables interaction |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | func | — | Click handler |
| `className` | string | — | Additional Tailwind classes (for layout/width overrides only) |
| `fullWidth` | bool | `false` | Sets `w-full` |

**Variants:**
- `primary` — Brand orange background, white text
- `secondary` — White background, brand border, brand text
- `danger` — Red background, white text — for destructive actions
- `ghost` — Transparent, no border, text colour — for subtle actions in dense UI

**Loading state:** `<Spinner size="sm" />` inside the button; button becomes disabled and non-clickable.

---

### Input

**File:** `src/components/common/Input.jsx`

**Purpose:** All text input fields. Integrates with React Hook Form via `register`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `label` | string | Field label text |
| `id` | string | HTML id; ties label to input |
| `error` | string | Error message shown below the field |
| `helperText` | string | Hint text below the field (suppressed when `error` is set) |
| `type` | string | HTML input type (default `'text'`) |
| `disabled` | bool | |
| `...rest` | — | Spread onto `<input>` — captures `register()` output from RHF |

**States:** Normal, focused (brand-coloured border), error (red border + error text), disabled (muted).

---

### Select

**File:** `src/components/common/Select.jsx`

**Purpose:** Dropdown select fields. Same visual language as `Input`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `label` | string | |
| `id` | string | |
| `options` | `Array<{ value, label }>` | Options list |
| `error` | string | |
| `placeholder` | string | Placeholder option (value = '') |
| `disabled` | bool | |
| `...rest` | — | Spread onto `<select>` — captures RHF `register()` output |

---

### Textarea

**File:** `src/components/common/Textarea.jsx`

**Purpose:** Multi-line text input. Same interface as `Input`.

**Additional props:**
| Prop | Type | Default |
|---|---|---|
| `rows` | number | `4` |

---

### Modal

**File:** `src/components/common/Modal.jsx`

**Purpose:** Portal-based dialog overlay. Used for booking requests, confirm dialogs, review forms, and report forms.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `isOpen` | bool | Controls visibility |
| `onClose` | func | Called on backdrop click or Escape key |
| `title` | string | Modal heading |
| `children` | node | Modal body content |
| `size` | `'sm' \| 'md' \| 'lg'` | Modal width (default `'md'`) |
| `footer` | node | Optional footer with action buttons |

**Behaviour:**
- Rendered via `ReactDOM.createPortal` into `document.body`.
- Focus trapped inside while open.
- Scroll locked on body while open.
- Closes on Escape key press.
- Backdrop click calls `onClose`.

---

### Spinner

**File:** `src/components/common/Spinner.jsx`

**Purpose:** Inline loading indicator. Used inside `Button` (loading state) and as page-level loading screens.

**Props:**
| Prop | Type | Default |
|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `className` | string | For colour override (`text-white` inside coloured buttons) |

---

### Avatar

**File:** `src/components/common/Avatar.jsx`

**Purpose:** User avatar image. Falls back to initials on image error or null `src`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `src` | string | Image URL (Cloudinary) |
| `name` | string | User's full name — used for initials fallback |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | |
| `className` | string | |

**Fallback:** Extracts first two initials from `name` via `src/utils/generateInitials.js`.

---

### Badge

**File:** `src/components/common/Badge.jsx`

**Purpose:** Colour-coded label chip. Used for post types, booking statuses, admin roles.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `children` | node | Badge text |
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | Colour preset |
| `size` | `'sm' \| 'md'` | |

**Note:** `PostTypeBadge` and `BookingStatusBadge` are feature-level thin wrappers around `Badge` that map domain values (`'need_transport'`, `'pending'`, etc.) to `variant` and label.

---

### Card

**File:** `src/components/common/Card.jsx`

**Purpose:** Surface container with consistent shadow and border radius.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `children` | node | |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | Inner padding preset (default `'md'`) |
| `className` | string | For width/margin overrides |
| `onClick` | func | Makes card interactive (adds hover state + cursor-pointer) |

---

### Pagination

**File:** `src/components/common/Pagination.jsx`

**Purpose:** Page navigation controls for list endpoints that return `meta.totalPages`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `currentPage` | number | |
| `totalPages` | number | |
| `onPageChange` | func | Called with the new page number |

**Behaviour:** Shows Previous / 1 / 2 / … / N / Next. Ellipsis for large page counts. Does not render if `totalPages <= 1`.

---

### EmptyState

**File:** `src/components/common/EmptyState.jsx`

**Purpose:** Zero-results display. Every list screen has an empty state.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `icon` | node | SVG/emoji icon (optional) |
| `title` | string | Primary message |
| `message` | string | Secondary explanation |
| `action` | node | Optional CTA `<Button>` |

---

### ErrorBoundary

**File:** `src/components/common/ErrorBoundary.jsx`

**Purpose:** React class-based error boundary. Catches render errors in the entire subtree and shows a fallback UI instead of a blank screen. Mounted once in `AppRoutes` wrapping the whole `<Routes>` tree.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `children` | node | Required. The route tree or component subtree to guard. |

**Behaviour:**
- Catches via `getDerivedStateFromError` — shows built-in fallback card (red error message + "Reload page" button).
- Logs full error + `componentStack` at `console.error` with `[ErrorBoundary]` tag.
- "Reload page" calls `window.location.reload()` after resetting state.
- No `fallback` prop — uses a single built-in fallback UI. Adding a custom fallback prop is a future enhancement.

---

### LocationAutocomplete

**File:** `src/components/location/LocationAutocomplete.jsx`

**Purpose:** Controlled address input with debounced geocoding. Shows one suggestion from the `GET /location/geocode` endpoint below the field. Used in post creation/editing forms for origin and destination fields via RHF `Controller`.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `id` | string | Required. Ties `<label>` to `<input>`. |
| `value` | string | Required. Controlled text value (RHF `field.value`). |
| `onChange` | func | Required. Called on every keystroke (pass RHF `field.onChange`). |
| `onSelect` | func | Required. Called when user picks a suggestion: `(displayName, { lat, lng })`. |
| `label` | string | Required. Field label. |
| `placeholder` | string | Input placeholder text. |
| `error` | string | Validation error message. |

**Behaviour:**
- Waits 400ms after the user stops typing (debounce via `useDebounce`).
- Only fires if the typed value is ≥ 3 characters.
- Shows a Spinner (sm) inside the input while the geocode request is in flight.
- Shows ONE suggestion row below the field on success; nothing on null/error.
- Suggestion click: fills `value` with `displayName`, calls `onSelect` with coordinates, closes dropdown.
- Uses `onMouseDown` + `e.preventDefault()` on the suggestion button to prevent input blur before selection registers.

**Usage with React Hook Form:**
```jsx
import { Controller } from 'react-hook-form';
import LocationAutocomplete from '../location/LocationAutocomplete';

<Controller
  name="origin_address"
  control={control}
  render={({ field, fieldState }) => (
    <LocationAutocomplete
      id="origin_address"
      label="From (city / area)"
      placeholder="e.g. New Delhi"
      value={field.value ?? ''}
      onChange={field.onChange}
      onSelect={(displayName, coords) => {
        field.onChange(displayName);
        setOriginCoords(coords);
      }}
      error={fieldState.error?.message}
    />
  )}
/>
```

---

### ConfirmDialog

**File:** `src/components/common/ConfirmDialog.jsx`

**Purpose:** Confirmation modal for destructive or irreversible actions (cancel booking, delete post, deactivate account, suspend user).

**Props:**
| Prop | Type | Description |
|---|---|---|
| `isOpen` | bool | |
| `onClose` | func | |
| `onConfirm` | func | Called when user clicks confirm |
| `title` | string | |
| `message` | string | Consequences explanation |
| `confirmLabel` | string | Confirm button text (default `'Confirm'`) |
| `confirmVariant` | `'danger' \| 'primary'` | (default `'danger'`) |
| `isLoading` | bool | Disables confirm button while mutation is in flight |

---

### StarRating

**File:** `src/components/common/StarRating.jsx`

**Purpose:** 1–5 star display or interactive input.

**Props:**
| Prop | Type | Description |
|---|---|---|
| `value` | number | Current rating (0–5) |
| `onChange` | func | If provided, renders interactive stars; if absent, renders read-only |
| `size` | `'sm' \| 'md' \| 'lg'` | |
| `readOnly` | bool | Force read-only even if `onChange` is provided |

---

## 5. Toast Conventions (react-hot-toast)

Use `toast.success()`, `toast.error()`, `toast.loading()` from `react-hot-toast`. The `<Toaster>` is mounted once in `src/main.jsx`.

**When to show a toast:**
| Scenario | Toast type |
|---|---|
| Successful mutation (save post, send message, update profile) | `toast.success('...')` |
| API error from a mutation | `toast.error(err.message)` |
| Long operation in progress | `toast.loading('...')` |
| New notification received (high priority) | `toast.success(notification.title, { icon: '🔔' })` |

**When NOT to use a toast:**
- Read errors (a failed query shows an inline error state, not a toast).
- Form validation errors (show inline below the field).
- Navigation events.

---

## 6. Loading States

| Context | Loading pattern |
|---|---|
| Page-level (full page loading) | Centred `<Spinner size="lg" />` inside the page container |
| List loading (feed, bookings) | Skeleton cards matching the shape of `PostCard` / `BookingCard` |
| Button submitting | `<Button isLoading={true}>` — built-in spinner |
| Inline data (e.g., unread count) | Suppress the number until loaded; never show `undefined` |

---

## 7. Error States

| Context | Error pattern |
|---|---|
| Page-level query failure | Inline error card with retry button; do not redirect |
| Mutation failure | `toast.error(err.message)` + re-enable the submit button |
| 404 from a detail page | Redirect to `/404` |
| 403 from a detail page | Redirect to `/unauthorized` |
| Field-level API error | Display below the relevant field via the form's `setError` |

---

## 8. Empty States

Every list screen must have an empty state using `<EmptyState>`. Do not show a blank screen.

| Screen | Empty state message | CTA |
|---|---|---|
| Marketplace feed | "No posts match your filters" | "Clear filters" or "Create a post" |
| My posts | "You haven't created any posts yet" | "Create your first post" |
| Saved posts | "No saved posts yet" | "Browse marketplace" |
| Bookings | "No bookings yet" | — |
| Notifications | "You're all caught up" | — |
| Conversations | "No conversations yet" | — |
| Reviews | "No reviews yet" | — |

---

## 9. Form Conventions

- **`<Input>` + `<Select>` + `<Textarea>` + `<Button type="submit">`** — the only form elements used. No raw HTML form controls.
- **React Hook Form** — all forms use the `useForm()` hook; inputs are registered via `{...register('fieldName')}`.
- **Yup validation** — passed to `useForm({ resolver: yupResolver(schema) })`.
- **Error display** — `<Input error={errors.fieldName?.message} />` — always pass the RHF `errors` object's field message.
- **Submit state** — Pass `isLoading` from the mutation's `isPending` to the submit `<Button>`.
- **Disabled state** — Disable the submit button while `isPending` is true.

---

## 10. Responsive Behaviour

- Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Mobile-first. All base styles target mobile.
- `PostCard` and `BookingCard` — full width on mobile, grid layout on desktop.
- `PostFilters` — collapsible drawer on mobile; fixed sidebar on desktop.
- `ChatPage` — stacked (list above, chat below) on mobile; split view on desktop.
- `AdminLayout` — sidebar collapses to mobile hamburger; admin pages are desktop-primary.

---

## 11. Component Update Protocol

When adding a new reusable component to `src/components/common/`:

1. Add its entry to Section 4 of this document.
2. Follow the prop naming and structure of existing entries.
3. Add `propTypes` to the component file.
4. If it introduces a new design token, add it to the `@theme` block in `src/index.css` and document it in Section 1 of this file.
