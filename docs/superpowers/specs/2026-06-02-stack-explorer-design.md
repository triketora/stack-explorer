# Stack Explorer — Design

**Date:** 2026-06-02
**Status:** Approved (pending written-spec review)

## 1. Purpose

A desktop webapp that turns a codebase into an explorable architecture diagram, so
someone can quickly grasp how an app is built and the key technical decisions behind
it — visually. For each detected technology, the user can drill down to comparable
alternatives with notes on why one might be chosen over another. A second lens maps
the same diagram onto the actual files and directories in the codebase.

A high-fidelity static prototype already exists and defines the target look,
interactions, and data shape. It lives at `reference/mock/` (single-file React +
Babel CDN prototype with hardcoded sample data). This project turns that prototype
into a real Next.js + TypeScript app backed by a live analysis pipeline.

## 2. Core Decisions (resolved during brainstorming)

| Decision | Choice |
|----------|--------|
| Code input | Browser folder picker (`webkitdirectory`); the browser copies relevant files up |
| Analysis engine | Hybrid: static manifest parsing + Claude API enrichment |
| Primary diagram | Layered tiers (client → API → data → infra) with data-flow edges |
| Two top-level modes | **Architecture** and **Codebase map** (segmented control), per the mock |
| Codebase map | Split view: diagram (left) + recursive file tree (right) with bidirectional hover cross-highlighting and per-node "maps to N" badges |
| Drill-down UI | Right-sliding "compare technology" panel (diagram stays visible) |
| Request trace | Narrated, ordered request walkthrough on top of the data-flow edges (highlights the path step by step) |
| Layout/theming | Single layered layout in the light "schematic instrument" theme; the mock's tweaks panel (flow/nested layouts, accent, density) is dropped |
| Persistence | Ephemeral — nothing stored server-side after the session |
| App stack | Next.js + TypeScript (App Router), single service |
| Code reuse | Port the mock's components + `styles.css` to Next.js/TSX; the mock's data shape becomes the LLM output contract |
| Deployment | Render, single web service, desktop-only |

## 3. User Flow

1. **Entry screen** ("Point at a codebase") → "drop a folder / choose a directory"
   (folder picker). Sample buttons may seed a canned analysis for demo.
2. **Client-side filtering** → browser walks the directory, discards noise
   (`node_modules`, `.git`, `dist`/`build`, lockfiles, binaries, large files), and
   builds a payload of: **manifest/config files** (full contents) + the **full
   directory tree** (paths + sizes only). `File` handles are kept in memory for
   on-demand local preview.
3. **Analyze** → payload POSTs to a Next.js API route. Static parser identifies tech
   from manifests and anchors each to real files; Claude API enriches with
   architecture grouping, alternatives, rationale, data-flow edges, file→tech
   mappings, and the request-trace steps. Result is the `Analysis` object (§5).
4. **Explore — Architecture mode (default):**
   - Layered tiers, each a bordered group with index/name/description, holding tech
     node cards (glyph, name, category, "N alt" badge).
   - Curved SVG **data-flow edges** between nodes; selecting/hovering a node
     highlights its connected path ("selected path").
   - **Trace a request:** an ordered walkthrough steps through the request path,
     highlighting each node/edge in sequence.
   - Clicking a node opens the **compare panel** (§4).
5. **Explore — Codebase map mode:** split view. Diagram on the left (narrower),
   recursive **file tree** on the right. Hovering a tech highlights its files;
   hovering/clicking a file highlights the tech node(s) it maps to. Each tree row
   shows a "maps to N" badge. Clicking a file can open its node's compare panel and,
   where useful, preview the file's contents **locally in the browser** (never uploaded).
6. Nothing persists; reloading / "New directory" clears everything.

### Payload strategy & file↔stack association

Only manifest contents + the full path list are sent to the server. The complete
directory tree (paths, extensions, sizes — not contents of non-manifest files) is
enough to associate files/directories with stack parts, because mapping is largely
structural (e.g. React proven by `package.json`, located by `client/src/**`,
`*.tsx`). For viewing actual file contents, the browser still holds the picked
`File` objects, so previews are read locally on demand — proprietary source mostly
never leaves the machine.

## 4. UI Components (ported from `reference/mock/`)

Single **Next.js + TypeScript** app (App Router). Port the prototype's React
components to TSX and reuse `styles.css` (IBM Plex Sans/Mono, graphite neutrals, one
blue accent). Drop the CDN/Babel loader and the tweaks panel.

- **App shell** (`app.jsx` → `App`) — top bar (brand, repo chip, Architecture ⇄
  Codebase map segmented control, "New directory"), entry/analyze overlay, work area.
  Replace the fake `setTimeout` analyze + `localStorage` flag with the real folder
  picker → `/api/analyze` flow. Keep ephemeral session state in React.
- **FolderPicker** (new) — `webkitdirectory` input; walks entries, applies the
  ignore-list, classifies files as *manifest* (send contents) vs *tree-only*
  (path/size). Retains `File` handles for on-demand preview.
- **Diagram** (`diagram.jsx`) — renders tiers + node cards + SVG data-flow edges;
  handles selected-path highlighting and the request-trace animation. Layered layout
  only.
- **Drilldown / compare panel** (`panels.jsx` → `Drilldown`) — right-sliding aside
  with scrim. Shows glyph, name, category, tags, "why it's here" rationale, "Maps to
  code" file list, and "Alternatives & tradeoffs": the current choice (badged
  `current`) plus each alternative's blurb, Pros/Cons columns, and "when to choose".
- **FileTreePane** (`panels.jsx` → `FileTreePane`, `TreeNode`) — recursive tree for
  Codebase map mode with bidirectional hover cross-highlighting and map-count badges.

### Server (Next.js API routes)
- **`POST /api/analyze`** — receives `{ manifests: [...], tree: [...] }`.
  - **Static pass** (`lib/detect/`): parse known manifests → detected technologies,
    each with source files + confidence. Deterministic, no LLM.
  - **LLM pass** (`lib/enrich/`): one structured Claude API call. Input = detected
    tech + manifest excerpts + file tree. Output = the full `Analysis` object (§5),
    validated with zod. Prompt caching on the system prompt.
- No DB, no file storage. `ANTHROPIC_API_KEY` is a Render env var.

**Why this split:** the static pass guarantees obvious tech is never missed and gives
grounded file anchors; the LLM pass supplies the grouping, rationale, alternatives,
edges, file mappings, and trace a rules DB can't. If the LLM call fails, a basic
diagram still renders from the static pass alone (tiers + nodes + files, no
alternatives/edges/trace).

## 5. Data Model

The mock's shape is the contract the pipeline produces and the UI consumes.

```ts
type Analysis = {
  repo: string;            // "acme/ledger-app" (or chosen folder name)
  branch?: string;
  files: number;           // total files scanned
  langs?: string;          // "Python · TypeScript · SQL"
  tiers: Tier[];           // ordered: client → api → data → infra (+ extras)
  edges: [string, string][];   // data-flow edges between node ids
  fileTree: TreeNode;      // directory tree, each node carrying maps[]
  trace: TraceStep[];      // ordered narrated request path
};

type Tier = {
  id: string;              // "client" | "api" | "data" | "infra" | ...
  idx: string;             // "01".."04"
  name: string;            // "Application / API"
  desc: string;            // "request handling & business logic"
  nodes: Technology[];
};

type Technology = {
  id: string;              // "flask"
  name: string;            // "Flask"
  cat: string;             // "web framework"
  glyph: string;           // 2-char chip, e.g. "Fl"
  tags: string[];          // ["Python", "WSGI", "REST"]
  rationale: string;       // "why it's here"
  pathGlobs: string[];     // LLM-emitted globs; client expands → fileTree maps[]
  files: string[];         // representative matched paths/dirs (derived from pathGlobs)
  confidence?: "detected" | "inferred";  // detected = from manifest, inferred = LLM
  alts: Alternative[];
  tier?: string;           // backfilled
};

type Alternative = {
  name: string;            // "FastAPI"
  tag: string;             // "framework"
  blurb: string;           // one-line description
  pros: string[];
  cons: string[];
  when: string;            // "when to choose"
};

type TreeNode = {
  name: string;
  type: "dir" | "file";
  maps?: string[];         // tech node ids this file/dir belongs to
  children?: TreeNode[];
};

type TraceStep = {
  order: number;
  label: string;           // "Flask route handles the request"
  nodeId: string;          // node highlighted at this step
};
```

**File→tech mapping is computed, not enumerated by the LLM.** For each technology the
LLM emits `pathGlobs: string[]` (e.g. `flask → ["server/app.py", "server/api/**"]`).
The client computes every `fileTree` node's `maps[]` deterministically by matching the
real (browser-walked) tree against those globs. This keeps the LLM output small and
reliable regardless of repo size, while preserving the per-file cross-highlighting UX.
`Technology.files` is then derived as the representative subset of matched paths.

`confidence` is an addition to the mock for honesty (manifest-detected vs
LLM-inferred). `files`/`fileTree.maps` drive the compare panel's "Maps to code" list
and the Codebase-map cross-highlighting. `edges` drive data-flow connectors and
selected-path highlighting; `trace` drives the narrated request walkthrough.

## 6. Deployment

- Single Render web service: `next build` / `next start`, Node runtime.
- `ANTHROPIC_API_KEY` set in the Render dashboard. Model: Claude Sonnet 4.6 for the
  enrichment call (fast/cheap, capable for structured extraction).
- Desktop-only — no investment in responsive/mobile layouts.

## 7. Error Handling

- Upload too large → client warns and trims to manifests + tree.
- No manifests found → "couldn't identify a stack; here's the raw tree."
- LLM failure/timeout → fall back to static-only diagram with a notice.
- Malformed LLM JSON → one repair retry, then graceful static fallback.

## 8. Testing

- Unit tests for static detectors (fixture manifests → expected tech).
- Unit tests for the client file-filter/classifier.
- zod schema validation on LLM output so a bad response can't crash the UI.
- End-to-end fixtures (a Next.js app; a Flask+Postgres app) through the pipeline with
  the LLM mocked, asserting the produced `Analysis` renders.

## 9. Out of Scope (YAGNI)

Auth/accounts; saved/shareable analyses; private-repo GitHub integration; mobile/
responsive; monorepo special-casing; editing the diagram; the tweaks panel
(alternate layouts, accent, density). All deferrable.
