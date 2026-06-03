# Lessons

Patterns learned while building Stack Explorer, to avoid repeating mistakes.

## Scaffolding into an existing repo can destroy git history
- `npx create-next-app` refuses non-empty dirs; the temp-dir + `cp -R /tmp/x/. .` workaround
  copies the generator's `.git` over the repo's, flattening history.
- **Rule:** copy with `rsync -a --exclude='.git' /tmp/x/ ./` (or `rm -rf /tmp/x/.git` first).
  Also merge `.gitignore` instead of letting the scaffold overwrite project-specific ignores.
- Captured as a user-level skill: `scaffold-generator-clobbers-existing-git`.

## Post-edit harness diagnostics are often stale
- After a subagent creates `@/lib/...` files, the harness repeatedly reported "Cannot find
  module '@/...'" and phantom implicit-any errors — all false. My own `npx tsc --noEmit` was clean
  every time.
- **Rule:** trust a fresh `tsc --noEmit` + `npm test` run over post-edit diagnostics and over the
  subagent's prose. (Matches the existing `verify-subagent-build-claims-stale-diagnostics` skill.)

## Plan gap: vitest `include` must cover every test location
- The Phase 2 plan's `vitest.config.ts` `include` only listed `lib/**` and `client/**`, so the
  `app/api/.../route.test.ts` was invisible to the runner. Fixed by adding `app/**/*.test.ts`.
- **Rule:** when writing test-running config in a plan, enumerate ALL directories that will hold
  tests, including `app/`.

## Verifying a directory-upload UI without an API key
- The app needs a Claude key + a `webkitdirectory` upload, neither easy to automate. To visually
  verify the ported UI, I built a temporary `app/verify-ui/page.tsx` that renders the real
  components against a hand-written sample `Analysis`, screenshotted it with Playwright, then
  deleted it.
- Gotchas: install Playwright with `npm i playwright --no-save` and run the screenshot script
  from the **project root** (so `import 'playwright'` resolves); `npx playwright install chromium`
  for the browser binary.

## Next 15 route files: only export handlers + config, or `tsc` breaks
- Exporting an arbitrary helper (e.g. `overviewRequest`) from `app/api/.../route.ts` makes
  `next build` pass BUT a standalone `npx tsc --noEmit` (which includes generated
  `.next/types/**`) fails: "incompatible with index signature 'never'". Next's generated route
  validator only allows `GET/POST/...` + `runtime`/`maxDuration`/`dynamic` exports.
- **Rule:** keep route files thin (just the handler + config); put testable wiring in `lib/` and
  unit-test it there. Don't export helpers from route modules.

## Background prefetch needs a real worker pool, not setTimeout pumps
- A prefetch "pump" that does `ensureX(); setTimeout(pump, 150)` does NOT limit concurrency —
  it launches everything within ~Nx150ms because it never waits for completion. Firing 12
  concurrent LLM calls stalled them (rate-limit/queue) and alternatives never resolved.
- **Rule:** for bounded concurrency, make the loader return a Promise and run K async workers that
  `await` each item off a shared queue/index. Verified by a live Playwright run (alternatives only
  rendered after switching to a true pool of 2).

## Playwright can drive webkitdirectory uploads
- To E2E-test a folder-upload UI, `setInputFiles('input[type=file]', '/abs/dir')` with a DIRECTORY
  path uploads its contents (webkitRelativePath set), even on a `hidden` input. Point it at a tiny
  fixture dir to keep the live LLM round-trip fast.

## Playwright `state:'detached'` races when the element isn't there yet
- To wait for a loading banner to finish I used `waitForSelector('.progress-banner',
  {state:'detached'})`. It resolved INSTANTLY and screenshotted the skeleton, because "detached"
  also matches "not in the DOM yet" — the banner hadn't appeared at call time.
- **Rule:** don't wait for the disappearance of a not-yet-rendered element. Wait for a POSITIVE
  post-condition instead (e.g. `waitForSelector('.cluster')` / an enriched-state marker), or wait
  for the element to be `visible` first, THEN `detached`. Verified: switching the wait to the
  enriched `.cluster` selector made the screenshots correct.

## System view = dagre, not hand-placed coordinates
- Repeated hand-drawn SVG mocks had floating arrows / nonsensical ordering. The fix was never
  better coordinates — it was a layout engine. `dagre` (rankdir LR) computes node positions in
  dependency order and gives edge `points` that anchor to borders. Render boxes AND edges in ONE
  SVG coordinate space (viewBox) so they never drift; mixing px-positioned divs with a scaled SVG
  is what makes arrows miss.

## An SVG overlay with pointer-events on strokes can steal clicks from nodes beneath
- Edges render in an absolutely-positioned `.edge-layer` SVG at `z-index:1` ABOVE the node boxes,
  with `path { pointer-events: stroke }` so edges are hoverable. But edges terminate at node
  centers — so the stroke sits exactly over the node's center and intercepts the click. Symptom:
  Playwright `.node.click()` times out (actionability: covered) or a force-click sets no state.
- **Rule:** keep interactive elements above any pointer-enabled overlay. Fix was
  `.tiers { position: relative; z-index: 2 }` so nodes paint above the edge SVG; edges still
  hover along their visible length (the bit under a node is covered, which is fine). Verified:
  stack-view node click opened the panel again, code-view click pinned selection.

## Execution pacing for large plans
- 29 micro-tasks × 3 subagents each is impractical. Batching by coherent module (one implementer
  + controller-run spec/quality review per batch) kept review coverage while making real progress.
- Long-running subagents occasionally hit socket errors mid-run — always independently re-check
  state (files present? committed? tests pass?) before assuming failure; work was usually done but
  the final commit was missing.

## Cut LLM latency: fast structural pass + lazy detail pass
- The overview was slow because one Sonnet call generated structure AND prose (rationale + alts).
  Split it: a FAST structural pass on Haiku (tiers/nodes/edges/kind/group, no prose) for first
  paint, then a per-item Sonnet "details" call (rationale + alternatives) loaded lazily on demand +
  background-prefetched. Overview dropped ~24s → ~10.5s. Pattern: put only what's needed for the
  first render in the hot path; defer prose to lazy calls.

## File System Access API avoids the "Upload N files to this site?" modal
- `<input webkitdirectory>` triggers Chrome's scary "Upload 2654 files?" confirmation.
  `window.showDirectoryPicker()` (Chromium) opens a normal directory picker with NO upload-count
  modal, and lets you read entries lazily (only read the files you need; keep handles for preview).
  Feature-detect and fall back to the webkitdirectory input on Firefox/Safari.

## CSS transform wrapper for pan/zoom (not SVG viewBox)
- For pan/zoom over an SVG diagram, applying a CSS `transform: translate() scale()` (origin 0 0) to
  a wrapper DIV keeps cursor math in plain px space (wheel zoom-to-cursor via
  `tx' = cx - (cx-tx)*k`), far simpler than mutating SVG viewBox. Suppress the click that follows a
  pan-drag with an `onClickCapture` that checks a "moved" flag, so dragging doesn't fire node clicks.

## Execution pacing for large plans
## Mask LLM latency by reusing instant local data
- The wait felt bad because the page showed only a greyed skeleton + spinner during the LLM call.
  We already had, instantly and for free, the static detection (tech + the exact file that proved
  each) and a skeleton. Turn that into a "productive wait": a live detection log
  ("✓ React · client/package.json"), a rotating one-line blurb per detected tech to READ (static
  registry text), and a shimmer on the skeleton. Pattern: before reaching for streaming or faster
  models, surface the cheap local signals you already computed — it changes perceived speed a lot
  with zero added latency.
