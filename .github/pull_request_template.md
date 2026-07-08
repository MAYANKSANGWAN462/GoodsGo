## Summary

<!-- One to three sentences describing what this PR does and why. -->

## Changes

<!-- List the files changed and the reason for each change. -->

-
-

## Testing

<!-- Describe how you verified this change works correctly. -->

### Manual testing performed

-
-

---

## Backend checklist (skip if no backend changes)

- [ ] `'use strict';` on every new file
- [ ] CommonJS (`require`/`module.exports`) — no ESM syntax
- [ ] All SQL is fully parameterized — no string interpolation of user input
- [ ] All thrown errors are `ApiError` instances with a meaningful `code`
- [ ] All new async route handlers wrapped in `asyncHandler()`
- [ ] New constants added to `src/utils/constants.js` — not inlined
- [ ] JSDoc present on every new exported function
- [ ] New endpoints have the correct middleware chain: rate limiter → auth → validate → controller
- [ ] Any transaction uses `BEGIN`/`COMMIT`/`ROLLBACK` with `client.release()` in `finally`
- [ ] No secrets, tokens, or passwords appear in logs
- [ ] `node --check` passes on all modified files

## Frontend checklist (skip if no frontend changes)

- [ ] No TypeScript introduced — `.js`/`.jsx` only
- [ ] `propTypes` declared on every component that accepts props
- [ ] No API calls made directly from a component — all calls via `src/services/`
- [ ] No auth token written to `localStorage` or `sessionStorage`
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## Security

- [ ] No secrets, API keys, or credentials committed
- [ ] No `console.log` debugging left behind
- [ ] No new dependency added without justification
