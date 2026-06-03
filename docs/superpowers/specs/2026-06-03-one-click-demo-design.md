# One-Click Demo — Design

**Date:** 2026-06-03
**Status:** Approved

## Problem

Viewers need an instant way to see the app without uploading a folder or waiting ~25s for the
live pipeline. Add a one-click "explore a sample" option on the landing page that loads a
pre-baked analysis of a recognizable OSS app (Mastodon), while still showing a brief taste of the
loading experience.

## Approach

**Pre-baked snapshot + short loading replay.**

### Bake step (one-time, build-time artifact)
- Shallow-clone `mastodon/mastodon`, run it through the real pipeline (the same walker as the
  client → `/api/overview` → `/api/alternatives` per tech), merge `rationale` + `alts` into each
  node, and save the complete `Analysis` to `lib/demo/mastodon.json`.
- The result is authentic tool output. Lightly curate if it returns cluttered (trim to
  architecturally significant tech) so the demo diagram is legible.

### Demo registry
- `lib/demo/index.ts` — `export const DEMOS: DemoEntry[]` where
  `DemoEntry = { slug: string; label: string; repo: string; analysis: Analysis }`.
  Imports `mastodon.json` (validated by `AnalysisSchema` at module load in dev/test).

### Landing page
- `EntryScreen`: under the folder picker, a row "Or explore a sample:" with a chip per demo
  (just Mastodon for now). Clicking calls a new `onDemo(demo)` prop.

### loadDemo (in `useAnalysis`)
1. Build a **skeleton-ified** copy of the baked analysis: nodes `pending: true`, **keep rationale**,
   `edges: []`, `trace: []`. `setAnalysis(skeleton)`, `stage:"mapping"`, start the elapsed timer →
   the LoadingPanel (detection log + blurb + shimmer) plays.
2. Pre-fill the details cache (`detailsById`) from the baked nodes (`{status:"ready", rationale,
   alts}`) so compare panels are instant after reveal.
3. After **~3000ms**, `setAnalysis(fullBaked)`, `stage:"ready"`.
- `fileHandles` empty → side-panel file preview shows its existing "unavailable" fallback.

### Blurb fallback (loading reads well for non-registry tech)
- `lib/loading.ts#detectionLog` also returns each node's `rationale`. `LoadingPanel` chooses
  `blurbFor(id) ?? trimmed(rationale)` for the "while you wait" card, so Mastodon's Ruby tech
  (not in the registry) still shows a readable blurb during the demo. In the real flow rationale is
  empty during loading, so behavior is unchanged (only registry blurbs show).

## Components / Files

- `lib/demo/mastodon.json` (new, baked artifact) + `lib/demo/index.ts` (registry).
- `client/useAnalysis.ts` — add `loadDemo(demo)`; `UseAnalysis` gains it.
- `components/EntryScreen.tsx` — sample chip row + `onDemo` prop.
- `app/page.tsx` — pass `onDemo` → `loadDemo`.
- `lib/loading.ts` — `detectionLog` returns `rationale`; `components/LoadingPanel.tsx` uses the
  registry-blurb-or-rationale fallback.
- `app/globals.css` — sample chip styling.
- Bake tooling: a throwaway script run once (not committed, or committed under `scripts/` as
  `scripts/bake-demo.mjs` for repeatability) — decision: commit it under `scripts/` so demos can be
  refreshed.

## Testing

- `lib/demo/index.test.ts` — every demo's `analysis` passes `AnalysisSchema`; nodes carry `alts`
  and non-empty `rationale` (so the panel is instant).
- `lib/loading.test.ts` — `detectionLog` includes rationale; blurb fallback returns rationale when
  no registry blurb.
- Playwright: click the Mastodon chip → LoadingPanel shows during the ~3s replay → diagram reveals;
  switching to System shows the rich topology; opening a tech shows alts instantly (no network).

## Out of scope (YAGNI)

Multiple bundled demos (structure supports it, ship one); live re-baking in the app; bundling the
repo source for file previews in the demo.
