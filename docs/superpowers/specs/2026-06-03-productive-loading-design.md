# Productive Loading — Design

**Date:** 2026-06-03
**Status:** Approved

## Problem

The overview takes ~10s+ even after speedups. The user wants the wait to *feel* productive —
something to read and a nice animation — rather than a greyed skeleton + spinner.

## Approach

A **LoadingPanel** shown while `stage === "mapping"` (fades out when the overview lands), built
entirely from data we already have instantly (static detection + skeleton). No added latency.

### 1. Live detection log
- Built from the skeleton's detected nodes — each fallback node carries `name` and `files`
  (= the source files that proved it). `lib/loading.ts#detectionLog(analysis)` →
  `{ name, source }[]` (first file per detected, non-pending-agnostic; skeleton nodes only).
- Rendered as `✓ {name} · {source}` lines with a staggered fade-in, capped (~8) with a final
  `↳ mapping architecture & data flow…` line, plus the elapsed counter + indeterminate bar.

### 2. "While you wait" blurbs
- New short `blurb` on each registry `TechMeta` (one sentence). `LoadingPanel` rotates through the
  detected nodes that have a registry blurb (lookup by node id), ~3s each.
- `lib/loading.ts#blurbFor(nodeId)` returns the registry blurb or undefined.

### 3. Scan shimmer
- Gentle shimmer sweep on greyed `.node.pending` skeleton nodes (CSS keyframe). Diagram feels alive.

## Components / Files

- `lib/detect/registry.ts` — add `blurb: string` to `TechMeta` and to every entry.
- `lib/loading.ts` (new, pure) — `detectionLog(analysis): {name; source}[]`,
  `blurbFor(id): string | undefined`. Unit-tested.
- `components/LoadingPanel.tsx` (new) — floating card: detection log + rotating blurb + progress;
  takes `{ analysis, elapsedMs }`. Replaces `ProgressBanner` usage in the page.
  (Delete `ProgressBanner.tsx` — superseded.)
- `app/page.tsx` — render `<LoadingPanel>` when `stage === "mapping"` (was ProgressBanner).
- `app/globals.css` — `.node.pending` shimmer; `.loading-panel`, log line stagger, blurb card.

## Behavior

- Panel appears as soon as the skeleton renders (instant) and shows the detection log immediately.
- Blurb rotates every 3s; stops when unmounted (overview ready).
- After ~60s elapsed, the progress line switches to "Larger codebase — still working…".
- Panel positioned top-right of `.canvas-wrap` (absolute), non-blocking; pointer-events none except
  nothing interactive inside.

## Testing

- Unit: `detectionLog` (one entry per detected node with name + first source; empty placeholder
  tiers contribute nothing); every `REGISTRY` entry has a non-empty `blurb`.
- Existing suite green.
- Playwright: during mapping the panel shows ≥1 detection log line, a blurb, and `.node.pending`
  has a shimmer animation; panel gone once `.cluster`/enriched content appears.

## Out of scope (YAGNI)

LLM-generated blurbs; streaming the overview; blurbs for LLM-inferred tech not in the registry
(they simply don't rotate in).
