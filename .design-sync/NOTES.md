# Design-Sync Notes — GoodsGo UI

## Repo quirks

- **Vite app, not a library.** GoodsGo is a private Vite application. The converter runs in synth mode — the package is never installed in `node_modules`. Always pass `--entry ./goodsgo-frontend/src/components/common/index.js` explicitly.

- **Barrel file required.** The entry `goodsgo-frontend/src/components/common/index.js` was created as part of this sync. It must stay in sync with the directory; if a new component is added, add its export to this file AND add it to `componentSrcMap` in config.

- **CSS path.** `cssEntry` in config uses `../goodsgo-frontend/dist/goodsgo-ui.css` (relative to `.design-sync/`). After every `npm run build` in `goodsgo-frontend/`, re-run:
  ```
  cp goodsgo-frontend/dist/assets/index-*.css goodsgo-frontend/dist/goodsgo-ui.css
  ```
  The hashed filename changes every build.

- **`cssEntry` resolution.** Paths in `cssEntry` resolve relative to `.design-sync/`, NOT the project root. `srcDir` and `componentSrcMap` resolve from the project root. Don't confuse them.

- **ErrorState.jsx had unescaped apostrophes** (`you're`, `doesn't`, `don't` in JS string literals with single quotes). Fixed to double-quoted strings on lines 25–26. esbuild rejects them; Vite/Babel was more lenient.

- **No TypeScript.** DTS parse is skipped. `componentSrcMap` drives all component discovery. When adding a component, update BOTH the barrel file AND `componentSrcMap`.

- **Floor cards (intentional).** ConfirmDialog, ErrorBoundary, and Modal show typographic floor cards:
  - `Modal` and `ConfirmDialog` use `ReactDOM.createPortal` into `document.body` — need `isOpen=true` in authored previews plus `cfg.overrides.<Name>.cardMode = "single"` to prevent layout escape
  - `ErrorBoundary` is a class component used as an error catch-all; no useful static render

- **Fonts.** Barlow, Space Grotesk, and Manrope load from Google Fonts in `index.html`. Suppressed via `runtimeFontPrefixes` — designs will render with system fonts. This is expected and acceptable.

## Re-sync command

```bash
# 1. Re-copy CSS after rebuild
cd goodsgo-frontend && npm run build && cd ..
cp goodsgo-frontend/dist/assets/index-*.css goodsgo-frontend/dist/goodsgo-ui.css

# 2. Re-stage scripts (always, to pick up converter updates)
cp -r .ds-sync-skill/package-build.mjs .ds-sync-skill/package-validate.mjs \
      .ds-sync-skill/package-capture.mjs .ds-sync-skill/resync.mjs \
      .ds-sync-skill/lib .ds-sync-skill/storybook .ds-sync/

# 3. Run
node .ds-sync/package-build.mjs \
  --config .design-sync/config.json \
  --node-modules ./goodsgo-frontend/node_modules \
  --entry ./goodsgo-frontend/src/components/common/index.js \
  --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

## Re-sync risks

- **CSS hash changes** every `vite build`. The re-sync will fail on CSS if `dist/goodsgo-ui.css` is stale (from a build where the hash changed and wasn't re-copied). Always run the copy step above first.
- **New components** added to `src/components/common/` won't appear in the sync until `index.js` AND `componentSrcMap` are both updated.
- **PropTypes changes** don't regenerate `.d.ts` files (there are none). The `.prompt.md` files are generated from JSDoc — if JSDoc is removed or changes, run a full rebuild.
- **Floor card authoring** for Modal and ConfirmDialog is deferred. Author when needed: set `cfg.overrides.Modal.cardMode = "single"` with `cfg.overrides.Modal.viewport = "500x600"`, then write `.design-sync/previews/Modal.tsx` with `isOpen={true}`.

## Known render warns

None flagged during initial sync.
