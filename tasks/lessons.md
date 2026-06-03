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

## Execution pacing for large plans
- 29 micro-tasks × 3 subagents each is impractical. Batching by coherent module (one implementer
  + controller-run spec/quality review per batch) kept review coverage while making real progress.
- Long-running subagents occasionally hit socket errors mid-run — always independently re-check
  state (files present? committed? tests pass?) before assuming failure; work was usually done but
  the final commit was missing.
