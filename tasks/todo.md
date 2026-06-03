# Stack Explorer — Execution Tracker

Branch: `build-stack-explorer`. Execution mode: subagent-driven (implementer → spec review → quality review per task).

## Phase 1 — Analysis Engine
- [ ] P1.1 Scaffold Next.js + TS
- [ ] P1.2 Add test + lib deps (vitest, zod, picomatch, anthropic)
- [ ] P1.3 Analysis types + zod schemas
- [ ] P1.4 buildFileTree
- [ ] P1.5 applyGlobs / deriveFiles
- [ ] P1.6 Static tech registry
- [ ] P1.7 Manifest parsers
- [ ] P1.8 Detection orchestrator

## Phase 2 — App + Pipeline
- [ ] P2.1 Client file filter/classifier
- [ ] P2.2 Analyze request contract
- [ ] P2.3 Static fallback Analysis builder
- [ ] P2.4 Enrichment prompt builder
- [ ] P2.5 Enrichment orchestrator
- [ ] P2.6 Anthropic adapter
- [ ] P2.7 /api/analyze route
- [ ] P2.8 FolderPicker
- [ ] P2.9 End-to-end page (raw render)
- [ ] P2.10 E2E pipeline test (mocked model)

## Phase 3 — Visualization UI
- [ ] P3.1 Port styles + fonts
- [ ] P3.2 Icon
- [ ] P3.3 diagram-types + StackNode
- [ ] P3.4 EdgeLayer
- [ ] P3.5 Tier + Diagram
- [ ] P3.6 Drilldown panel + preview
- [ ] P3.7 FileTreePane
- [ ] P3.8 TopBar + EntryScreen
- [ ] P3.9 App shell wiring + trace
- [ ] P3.10 Trace caption style + visual verify
- [ ] P3.11 Render deploy config

## Review log
(filled as tasks complete)
