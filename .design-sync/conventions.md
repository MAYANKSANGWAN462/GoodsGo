# GoodsGo UI — Design Agent Conventions

## Wrapping and setup

No provider or root wrapper is needed. All 19 components are self-contained. Import directly from `window.GoodsGo`:

```jsx
import { Button, Card, Badge } from 'goods-go';
```

**Portal-based exceptions:** `Modal` and `ConfirmDialog` render into `document.body` via `ReactDOM.createPortal`. Always pass `isOpen={true}` in static designs; they return `null` when `isOpen` is false.

## Styling idiom: semantic Tailwind v4 tokens

This DS uses Tailwind v4 CSS-first config. Utility classes map to CSS custom properties — they automatically adapt when `.dark` is on `<html>`. **Never use raw Tailwind color scales** (`bg-gray-100`, `text-blue-500`) — always use the semantic tokens below.

### Semantic token families

| Purpose | Light token class | Dark adapts automatically |
|---|---|---|
| Brand primary | `bg-primary`, `text-primary`, `border-primary` | — |
| Brand secondary | `bg-secondary`, `text-secondary` | — |
| Page background | `bg-surface-alt` | ✓ |
| Card/panel | `bg-surface`, `bg-surface-raised` | ✓ |
| Body text | `text-text` | ✓ |
| Secondary text | `text-text-muted` | ✓ |
| Hint / placeholder | `text-text-subtle` | ✓ |
| Dividers | `border-border`, `border-border-strong` | ✓ |
| Hover overlay | `bg-overlay`, `bg-overlay-strong` | ✓ |
| Success | `bg-success`, `bg-success-subtle`, `text-success` | ✓ |
| Warning | `bg-warning`, `bg-warning-subtle`, `text-warning` | ✓ |
| Danger/error | `bg-danger`, `bg-danger-subtle`, `text-danger` | ✓ |
| Info | `bg-info`, `bg-info-subtle`, `text-info` | ✓ |

**Interaction pattern:** `hover:bg-overlay`, `active:scale-[0.97]`, `transition-all duration-150`, focus ring via `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface`.

**Dark-mode-only overrides:** prefix with `dark:` — e.g. `dark:bg-primary/20`. The semantic tokens handle most cases without explicit `dark:` overrides.

## Where the truth lives

- **Token definitions:** `_ds_bundle.css` (compiled 55 KB Tailwind output) — all `--color-*` CSS custom properties defined here
- **Per-component API:** each `components/general/<Name>/<Name>.prompt.md` — props, variants, sizes
- **Font:** "Barlow" and "Space Grotesk" load from Google Fonts at runtime; system fonts are the fallback in the design tool

## Idiomatic build example

Layout glue uses semantic token classes; DS components provide their own internal styling:

```jsx
<div className="min-h-screen bg-surface-alt">
  <div className="max-w-2xl mx-auto px-4 py-6">
    <PageHeader
      title="My Bookings"
      description="Track your transport requests."
      actions={<Button size="sm">Post transport</Button>}
    />
    <Card elevation="sm" padding="md" className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Mumbai → Pune</p>
          <p className="text-xs text-text-muted mt-0.5">3 tonnes · Furniture</p>
        </div>
        <Badge variant="warning" dot>In Transit</Badge>
      </div>
    </Card>
    <Pagination currentPage={2} totalPages={8} onPageChange={() => {}} />
  </div>
</div>
```
