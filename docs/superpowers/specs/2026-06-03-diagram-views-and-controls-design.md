# Diagram Views & Controls — Design

**Date:** 2026-06-03
**Status:** Approved

## Problem (from user feedback)

1. The single layered diagram is too shallow — e.g. the application tier collapses app
   servers, async queues, and ORMs together.
2. Want more grouping of related tech (e.g. all monitoring/metrics clustered) without
   over-complicating.
3. Loading the codebase map is jumpy because it changes the diagram's width.
4. Need a data-disclosure note when users are first asked to load files (not everything is
   shipped to Claude).
5. The edges get overwhelming; want better controls (hover "data flow" → highlight lines,
   click to pin; hover lines → highlight the "data flow" label).
6. "Selected path" is unclear.

## Approved Direction

Top toggle becomes **`Stack · System · Code`** (three views). Drill-down (compare panel),
the staged analysis pipeline, alternatives, and request-trace are shared.

### Stack view (enhanced)
Layered tiers (Frontend → Application/API → Data → Infra & Ops), but each tier renders
**labeled sub-clusters** so related tech groups together (e.g. App/API → *web / request*,
*async & jobs*, *data access*; Data → *persistence*, *cache / broker*, *object store*; Infra
→ *build / deploy*, *observability*). Driven by a new optional `Technology.group` label.
No `group` ⇒ one implicit cluster (backward compatible). Existing DOM-measured `EdgeLayer`
still draws data-flow edges here.

### System view (new)
Classic runtime architecture, **not grid-constrained**: a directed graph laid out
left→right by a layout engine (**dagre**). Nodes are placed by dependency rank; **edges are
routed border-to-border** (no floating arrows). Async edges (to/from a `queue`/broker) are
**dashed**. **External** services are wrapped in a **cloud** shape (bounding box of external
nodes + padding). Build/dev-time tools are **excluded** (they have no runtime `kind`).

Driven by a new optional `Technology.kind`:
`client | server | service | datastore | queue | worker | external`.
- client = browser/SPA entry; server = web/app/API servers; service = internal services;
  datastore = DB/cache/object store; queue = brokers/queues; worker = background workers;
  external = third-party. Absent ⇒ node omitted from System view.

### Code view (overlay)
The file tree **slides in as an overlay** over the right of the canvas (same pattern as the
compare panel). The diagram keeps full width underneath — **no width change, no reflow jump**
(fixes the jumpiness). Bidirectional cross-highlighting unchanged.

## Data Model Delta

Add two optional, LLM-populated fields to `Technology` (in `lib/types.ts` schema + the
overview LLM schema in `lib/enrich/overview.ts`):

```ts
group?: string;   // Stack sub-cluster label, e.g. "async & jobs", "observability"
kind?: "client" | "server" | "service" | "datastore" | "queue" | "worker" | "external";
```

Both optional → existing analyses still validate and render. `edges` unchanged (tuples).
The overview system prompt is extended to ask for `group` and `kind` per node.

New dependency: **`dagre`** (+ `@types/dagre`) for System layout.

## Components / Files

- `lib/types.ts` — add `group`/`kind` to `TechnologySchema`.
- `lib/enrich/overview.ts` — prompt asks for `group`/`kind`; `OverviewNodeSchema` accepts them
  (optional); pass through to the assembled `Analysis`.
- `lib/system/layout.ts` (new, pure) — `layoutSystem(analysis): { nodes: PositionedNode[];
  edges: RoutedEdge[]; clouds: CloudRegion[] }`. Filters to nodes with a runtime `kind`, runs
  dagre LR, computes edge anchor points (border-to-border), derives `async` per edge (endpoint
  is `queue`/`worker`), and computes cloud bounding boxes for `external` nodes. Unit-tested.
- `components/SystemView.tsx` (new) — renders the dagre output as one SVG coordinate space
  (boxes + edges + cloud), styled by `kind`; nodes clickable → same compare panel; respects
  the edge-emphasis controls.
- `components/StackView.tsx` — the current `Diagram` renamed/refactored to render tiers with
  **sub-cluster grouping** by `group`; keeps `EdgeLayer`.
- `components/DiagramLegend.tsx` (new, shared) — interactive legend: "data flow"
  (hover/click-pin) and conditional "selected connections"; emits emphasis state.
- `components/EdgeLayer.tsx` — accept an `emphasis: "none" | "hover" | "pinned"` prop; when
  active, all edges render emphasized; reciprocal hover (edge hover → notify legend).
- `components/CodeOverlay.tsx` — wraps `FileTreePane` as a slide-over (absolute, like the
  compare panel) instead of a flex split.
- `components/EntryScreen.tsx` — add the data-disclosure note (concise line + expandable
  "What's sent?").
- `app/page.tsx` — view state becomes `"stack" | "system" | "code"`; render the right view;
  hold edge-emphasis state; Code view renders Stack diagram + `CodeOverlay`.
- `components/TopBar.tsx` — three-way segmented control `Stack · System · Code`.

## Legend & line-control semantics

- Edge-emphasis state machine: `none → hover` (pointer over "data flow" legend or, reciprocally,
  the label brightens when hovering any edge) `→ pinned` (click "data flow"; click again to
  clear). Selection focus (accent edges of the active node) is independent and layers on top.
- "selected path" → **"selected connections"**, shown in the legend **only when a node is
  selected**.

## Data disclosure copy (entry screen)

> **Your code mostly stays on your device.** Stack Explorer reads the folder in your browser
> and sends only your dependency/config manifests and the list of file paths to the Claude API
> to analyze the stack. Your source file contents are **not** uploaded — file previews are read
> locally in your browser. Nothing is stored on our servers after your session.

Rendered as a one-line summary with an expandable "What's sent? ▸" for the detail.

## Error handling

- Missing `kind` on all nodes (older/edge-case analysis) → System view shows a friendly empty
  state ("Not enough runtime info to draw a system diagram") rather than a blank canvas.
- dagre failure → fall back to System-unavailable empty state; Stack/Code unaffected.
- No external nodes → no cloud (skip).

## Testing

- Unit: `group`/`kind` passthrough in overview schema; `layoutSystem` (filters build tools,
  positions nodes, edge anchors on borders, async derivation, external cloud bbox); legend
  emphasis state transitions.
- Existing suite stays green (schema additions are optional).
- Playwright: Stack sub-clusters render; System view (ranked, connected arrows, cloud);
  Code overlay causes no diagram width change; entry disclosure visible/expandable.

## Out of scope (YAGNI)

Manual node dragging; editable edge labels; persisting the selected view across reloads;
a separate observability "kind" (observability is a Stack cluster; runtime monitors get
`service`/`external` in System).
