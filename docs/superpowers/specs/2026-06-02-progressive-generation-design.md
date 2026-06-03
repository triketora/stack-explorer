# Progressive Generation — Design

**Date:** 2026-06-02
**Status:** Approved

## Problem

The single `/api/analyze` Claude call takes ~78s (one synthetic 14-file repo), almost all of it
generating one large JSON (alternatives dominate the output). The user sees a blank wait with no
feedback. Goal: show meaningful content fast, refine progressively, and explain the wait.

## Approach (approved)

Three stages, smallest/fastest first:

1. **Skeleton — instant, client-side, no network.** `lib/detect` + `buildFileTree` +
   `buildFallbackAnalysis` are pure TS, so the browser computes the skeleton as soon as files are
   read: tiers + detected tech (rendered "pending"), real file tree, no LLM. Paints in <1s.
2. **Overview — `POST /api/overview` (~15–30s).** The main LLM call, but the prompt OMITS
   alternatives (they were the bulk of output tokens). Returns per-tech `rationale`, `pathGlobs`,
   `confidence`, plus `edges`, `trace`, `langs`. Server expands `pathGlobs` against the FULL tree
   → `fileTree` maps + `node.files`. The prompt sends a SUMMARIZED tree (cap ~600 paths) to bound
   latency, but glob expansion uses the full tree for an accurate code map.
3. **Alternatives — `POST /api/alternatives` (~3–6s each), lazy.** Small per-tech call returning
   just that tech's `Alternative[]`. Fetched on first panel-open (cached); after the overview
   lands, remaining techs are prefetched in the background, 2 at a time.

Client holds one `Analysis`: starts as skeleton → overview merged (nodes sharpen, edges/trace
appear) → per-tech `alts` fill in.

## Loading UX (option A — skeleton-first)

Client status machine: `reading → mapping → ready`.
- **reading:** brief "Reading files…" before skeleton paints.
- **mapping:** skeleton visible with pending node styling (greyed, no edges); a slim
  **ProgressBanner** pinned to the canvas top: "Mapping architecture & data flow… usually 20–40s"
  with a live elapsed-seconds counter + indeterminate bar. After ~60s elapsed it switches to
  "Larger codebase — still working…".
- **ready:** banner fades; nodes sharpen; edges + trace available.
- **Compare panel before alts load:** shows name/role/rationale/files immediately + an inline
  "finding alternatives…" loader; alts replace it when fetched. Per-tech alt state:
  `idle | loading | ready | error`, cached by tech id.

The time estimate is static copy + an honest live elapsed timer (no fake countdown).

## Components / Files

- `client/skeleton.ts` — `buildSkeleton(req)`: `detect` + `buildFallbackAnalysis`, nodes flagged
  pending (confidence stays "detected"; a separate `pending` flag drives styling).
- `lib/enrich/tree-summary.ts` — `summarizeTree(paths, cap=600)`: prioritized, bounded path list.
- `lib/enrich/overview.ts` — overview prompt (no `alts`) + `enrichOverview(req, detected,
  callModel)`. Refactors today's `prompt.ts` / `index.ts`.
- `lib/enrich/alternatives.ts` — `ALT_SYSTEM_PROMPT` + `generateAlternatives(tech, contextSummary,
  callModel)` → `Alternative[]`.
- `lib/analyze-contract.ts` — add `OverviewRequest` (= current AnalyzeRequest) and
  `AlternativesRequestSchema` (`{ tech: {id,name,cat,role}, contextSummary }`).
- `app/api/overview/route.ts`, `app/api/alternatives/route.ts` — both export injectable helpers
  for tests. Remove `app/api/analyze/route.ts`.
- Client: `components/ProgressBanner.tsx`; pending styling in `StackNode` + CSS;
  alt-loading/error states in `Drilldown`; staged orchestration + prefetch queue in a
  `useAnalysis` hook used by `app/page.tsx`.

## Data model changes

- `Technology` gains optional `pending?: boolean` (skeleton/overview-not-yet styling) — UI only.
- `alts` may be empty until fetched; UI distinguishes "not loaded" via per-tech alt state map
  held in the hook (not on the Analysis).

## Error handling

- Overview fails/tims out → keep skeleton, non-blocking notice "couldn't map architecture; showing
  detected stack."
- Alternatives fail → panel shows "couldn't load alternatives" + Retry.
- Malformed LLM JSON in either → one parse attempt, then graceful: overview falls back to
  skeleton; alternatives return [] with error state.

## Testing

- Unit: `buildSkeleton` (pending flags, schema-valid), `summarizeTree` (cap + prioritization),
  `enrichOverview` (no alts in output, globs expand, fallback on bad JSON), `generateAlternatives`
  (parse/validate), both route helpers with injected model.
- Build + Playwright pass: skeleton paints → mapping banner → ready → lazy alt loader.
- Live smoke test with real key: overview latency materially below the prior ~78s.

## Out of scope (YAGNI)

Streaming/SSE; caching analyses server-side; cancel/abort UI; persistent alt cache across reloads.
