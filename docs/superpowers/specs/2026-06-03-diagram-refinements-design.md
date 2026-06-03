# Diagram Refinements — Design

**Date:** 2026-06-03
**Status:** Approved

## Problems (user feedback)

1. Default data-flow lines are too prominent; should be light by default and darken on
   hover/highlight.
2. Too many technologies crammed into the Stack and System views — illegible. Prefer removing
   minor ones over showing everything.
3. Testing/dev tooling should be visually distinct from the main app stack.
4. In Code view, clicking a node opens the compare panel; instead it should make a persistent
   selection (so node↔file cross-highlight stays while the user scrolls the tree).

## Design

### 1. Lighter edges by default
- Stack `.edge-layer path` and System `.sys-edge` default to a faint hairline stroke; the
  `hover`/`all`/`pinned` and `hot`/selection states darken (grey → accent). Mostly CSS; the
  emphasis/selection state machine already exists.

### 2. Curate the stack
- **Overview prompt:** include only *architecturally significant* technologies — skip minor or
  transitive dependencies, plugins, small utilities, type stubs. Put dev/test/build tooling in the
  `devtest` tier (below).
- **Per-cluster cap (Stack):** each cluster renders the first `CLUSTER_CAP` (= 5) nodes; extras
  collapse behind a **"+N more"** chip that expands that cluster in place (local component state).
  Nothing is permanently hidden.
- **System:** relies on LLM curation (no mid-topology cap).

### 3. Dev & Testing tier
- New Stack tier id `devtest` ("Dev & Testing", idx `05`) holding bundlers, linters/formatters,
  test frameworks, and CI. Hosting/runtime infra (Docker, Render) stays in Infra & Ops.
- Rendered **muted** (lighter borders/text) via a `muted` modifier when `tier.id === "devtest"`,
  so it reads as secondary.
- Excluded from System view (these have no runtime `kind`).
- Static path updated so the skeleton also groups them: registry `tier` for `vite` and
  `github-actions` → `devtest`; `fallback.ts` `TIER_META` + `ORDER` gain `devtest` last.

### 4. Code view = persistent selection, no panel
- New `pinnedNodeId` state in `app/page.tsx`. In Code view:
  - clicking a node sets/toggles `pinnedNodeId` (does NOT set `activeNode`, so the compare panel
    stays closed and no alternatives are fetched);
  - clicking a file row sets `pinnedNodeId` to its first mapped tech;
  - the file-tree focus = `hoverNodeId ?? pinnedNodeId`, and the diagram highlights the pinned node.
- In Stack/System views, clicking still opens the compare panel (`activeNode`) as today.
- `pinnedNodeId` clears on view change and on reset.

## Components / Files

- `app/globals.css` — lighter default edge strokes; `.tier.muted` styling; `.cluster-more` chip.
- `lib/enrich/overview.ts` — prompt: significance curation + `devtest` tier guidance.
- `lib/detect/registry.ts` — `TierId` adds `"devtest"`; `vite`, `github-actions` → `devtest`.
- `lib/enrich/fallback.ts` — `TIER_META` + `ORDER` add `devtest` (idx 05, last).
- `components/Tier.tsx` — per-cluster cap with "+N more" expand; `muted` class when `devtest`.
  Extract a small pure helper `splitCluster(nodes, cap)` → `{ shown, hiddenCount }` (unit-tested).
- `components/StackView.tsx` — pass through (no API change).
- `app/page.tsx` — `pinnedNodeId`; view-dependent `onClick` (pin in Code, open elsewhere);
  `onClickFile` pins in Code; focus/active wiring; clear on view change/reset.
- `components/EdgeLayer.tsx` / `SystemView.tsx` — no logic change (CSS handles lightness).

## Testing

- Unit: `splitCluster` (cap, hiddenCount, under-cap passthrough); `fallback` places `devtest`
  tier last with the right tools; registry tiers for `vite`/`github-actions`.
- Existing suite stays green.
- Playwright: edges faint by default and darken on legend hover/pin; Dev & Testing tier muted and
  separate; clusters capped with working "+N more"; Code-view node click pins selection and does
  NOT open the compare panel.

## Out of scope (YAGNI)

Per-user significance threshold controls; remembering expanded clusters across analyses; a
separate "minor tech" toggle (superseded by LLM curation + cap).
