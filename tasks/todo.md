# Stack Explorer — Execution Tracker

Branch: `build-stack-explorer`. Execution mode: subagent-driven (implementer → spec review → quality review per task).

## Phase 1 — Analysis Engine
- [x] P1.1 Scaffold Next.js + TS (verified: tsc clean, build OK)
- [x] P1.2 Add test + lib deps (vitest, zod, picomatch, anthropic)
- [x] P1.3 Analysis types + zod schemas (verified)
- [x] P1.4 buildFileTree (verified)
- [x] P1.5 applyGlobs / deriveFiles (verified)
- [x] P1.6 Static tech registry (verified)
- [x] P1.7 Manifest parsers (verified)
- [x] P1.8 Detection orchestrator (verified) — Phase 1 COMPLETE, 12/12 tests pass

## Phase 2 — App + Pipeline
- [x] P2.1 Client file filter/classifier (verified)
- [x] P2.2 Analyze request contract (verified)
- [x] P2.3 Static fallback Analysis builder (verified)
- [x] P2.4 Enrichment prompt builder (verified)
- [x] P2.5 Enrichment orchestrator (verified)
- [x] P2.6 Anthropic adapter (verified)
- [x] P2.7 /api/analyze route (verified)
- [x] P2.8 FolderPicker (verified)
- [x] P2.9 End-to-end page (raw render) (verified)
- [x] P2.10 E2E pipeline test (mocked model) (verified) — Phase 2 COMPLETE, 24 tests, build OK
      note: vitest.config include extended with app/**/*.test.ts (plan gap, fixed)

## Phase 3 — Visualization UI
- [x] P3.1 Port styles + fonts (verified)
- [x] P3.2 Icon (verified)
- [x] P3.3 diagram-types + StackNode (verified)
- [x] P3.4 EdgeLayer (verified)
- [x] P3.5 Tier + Diagram (verified)
- [x] P3.6 Drilldown panel + preview (verified)
- [x] P3.7 FileTreePane (verified)
- [x] P3.8 TopBar + EntryScreen (verified)
- [x] P3.9 App shell wiring + trace (verified)
- [x] P3.10 Trace caption style + visual verify (verified — see review log)
- [x] P3.11 Render deploy config (verified)

## Review log
- Phases 1–2: 24 unit/e2e tests pass; tsc clean; production build succeeds; /api/analyze is a dynamic route.
- Per-batch spec + quality review done by controller (code verbatim from reviewed plans).
- Visual verification (Playwright, sample Analysis via temp page, now removed):
  - Entry screen: themed card + IBM Plex fonts + drop zone ✓
  - Architecture: layered tiers, node cards w/ "N alt" badges, selected-path edges, compare panel
    (rationale, maps-to-code, alternatives w/ pros/cons/when) ✓
  - Codebase map: split diagram + file tree, map-count badges, bidirectional cross-highlight ✓
- Trace mode wired (auto-advancing stepper + caption); verified by code + tsc (not screenshotted).
- Known notes:
  - vitest.config include extended with app/**/*.test.ts (plan gap, fixed).
  - .gitignore: added !.env.example exception.
  - Git history was flattened during scaffold (cp -R replaced .git); all content preserved.
  - LLM path not exercised end-to-end (no ANTHROPIC_API_KEY in env); static fallback path + all
    components verified. User should smoke-test with a real key.
  - Ported styles.css retains dead CSS for dropped features (flow/nested/tweaks) — harmless.

## Progressive generation (follow-up feature) — COMPLETE
- [x] Spec + approved design (docs/superpowers/specs/2026-06-02-progressive-generation-design.md)
- [x] Client-side instant skeleton (client/skeleton.ts)
- [x] Tree summarizer to bound prompt size (lib/enrich/tree-summary.ts)
- [x] Overview stage — LLM call WITHOUT alternatives (lib/enrich/overview.ts, /api/overview)
- [x] Lazy alternatives stage (lib/enrich/alternatives.ts, /api/alternatives) + idle prefetch pool(2)
- [x] Staged orchestration hook (client/useAnalysis.ts) + ProgressBanner + pending styling + alt states
- [x] Removed old single-call /api/analyze + enrich/{prompt,index}
- Verified live: overview ~78s → ~24s; skeleton <1s; alternatives ~14s (prefetched). 31 tests, build clean, tsc clean.

## Diagram views & controls (2026-06-03) — COMPLETE
- [x] Stack view sub-clusters (Technology.group) — labeled groups per tier incl. observability
- [x] System view (new): dagre L→R topology, kind-tinted nodes, border-anchored arrows, async dashed, external cloud
- [x] Technology.kind (client/server/service/datastore/queue/worker/external); buildtool excluded from System
- [x] Code view = slide-over overlay (no diagram resize / no jump)
- [x] Interactive "data flow" legend (hover-all, click-pin, reciprocal edge→label); "selected path" → "selected connections" (only when selected)
- [x] Entry data-disclosure note (expandable "What's sent?")
- Verified live: Stack 8 clusters/16 links, System 9 nodes/10 edges, code overlay width unchanged, disclosure expands. 35 tests, build+tsc clean.

## Diagram refinements (2026-06-03b) — COMPLETE
- [x] Lighter default edges (hair-2, tucked behind nodes); darken on hover/pin/selection
- [x] Curation: overview prompt keeps only significant tech; per-cluster cap (5) + "+N more" (lib/stack/cluster.ts)
- [x] Dev & Testing tier (devtest, idx 05), muted; registry vite/github-actions + fallback ordering
- [x] Code view: node/file click = persistent selection (pinnedNodeId), no compare panel
- [x] Fix: raised .tiers z-index so edge SVG (pointer-events:stroke) no longer steals node clicks
- Verified live: tiers incl muted Dev & Test, pin emphasizes all edges, stack click opens panel,
  code click pins (no panel) + highlights files. 40 tests, build+tsc clean.
