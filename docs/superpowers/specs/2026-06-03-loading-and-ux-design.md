# Loading Speed & UX Pass — Design

**Date:** 2026-06-03
**Status:** Approved

## Problems (user feedback)

1. Can't zoom the System diagram.
2. Entry copy wrong/awkward.
3. "What's sent?" expansion shifts the card/button (reflow).
4. Browser shows an ugly "Upload N files to this site?" modal on folder pick.
5. Stack view mislabeled; loading placeholder should always include a Data (03) tier.
6. Loading: nothing meaningful for a long time, and the "20–40s" estimate is wrong.

## Section A — Loading & speed

### Split rationale out of the overview (lazy)
- The overview LLM call returns ONLY structure: tiers + nodes
  (`id,name,cat,glyph,tags,pathGlobs,confidence,group,kind`), `edges`, `trace`. It no longer
  produces `rationale` or `alts` — shrinking output so the populated diagram lands sooner.
- The existing per-tech lazy call (panel-open) now returns **`{ rationale, alts }`** together. The
  compare panel shows the rationale lazily (existing "finding…" loader) alongside alternatives;
  background prefetch still warms them after overview.
- `lib/enrich/overview.ts`: drop `rationale` from `OverviewNodeSchema` and the prompt; nodes get
  `rationale: ""` until the details call fills it (UI reads the lazy value).
- `lib/enrich/alternatives.ts` → generalize to **`generateDetails(tech, contextSummary, callModel)`**
  returning `{ rationale: string; alts: Alternative[] }`; prompt asks for both. Endpoint
  `/api/alternatives` → returns `{ rationale, alts }` (keep path or rename to `/api/details`; keep
  `/api/alternatives` to minimize churn, response shape extended).
- `client/useAnalysis.ts`: `AltState` → `DetailState { status; rationale; alts }`; the panel uses
  the fetched rationale (falling back to the node's rationale if present).

### Haiku for the overview structure
- `callAnthropic` gains an optional model arg; overview uses **`claude-haiku-4-5`**, the per-tech
  details call uses **`claude-sonnet-4-6`**. (Add `callModel`-with-model wiring; keep injectable
  `CallModel` type for tests.)

### Honest progress
- `ProgressBanner`: remove the fixed "20–40s". Show a staged line — *"Detected N technologies ✓ ·
  Mapping architecture & data flow…"* — plus the live `Ns` elapsed counter; after ~60s switch to
  *"Larger codebase — still working…"*. `N` comes from the skeleton's tech count (passed in).

## Section B — UI items

### Zoom/pan the System view
- `components/SystemView.tsx`: wrap the SVG in a pan/zoom container. State `{ scale, tx, ty }`
  applied as a CSS transform on an inner wrapper. Wheel = zoom to cursor; drag = pan; on-screen
  **+ / − / reset** controls bottom-right. Clamp scale 0.4–3. Stack/Code unaffected.
  Extract pure helpers in `lib/system/zoom.ts` (`clampScale`, `zoomAt`) — unit-tested.

### Copy fix
- `EntryScreen`: description → "Select a project directory and Stack Explorer maps its tech stack
  and systems architecture."

### "What's sent?" popover (no reflow)
- `EntryScreen`: render the disclosure detail as an absolutely-positioned popover anchored to the
  toggle (does not affect card/button layout). Toggle open/close; click-away/Escape closes.

### File System Access API (no upload modal)
- `client/pickDirectory.ts` (new): if `window.showDirectoryPicker` exists, use it — recursively
  walk the `FileSystemDirectoryHandle`, apply `shouldIgnore`/`classify`, read manifest contents,
  collect `{ path, size }` tree, and a `Map<path, File>` (via `getFile()`) for previews. Otherwise
  fall back to a hidden `webkitdirectory` input (current behavior). Returns
  `{ req: AnalyzeRequest, handles }`.
- `FolderPicker` uses `pickDirectory()`. The file-walk/filter logic moves into a pure-ish
  `client/walk.ts` shared by both paths where practical.

### "Tech Stack" title + canonical tiers
- `DiagramLegend` takes a `title` prop: Stack → "Tech Stack", System → "Systems Architecture".
- `client/skeleton.ts`: ensure the skeleton always contains the canonical tiers in order —
  `client (01) · api (02) · data (03) · infra (04) · devtest (05)` — inserting empty placeholders
  for any with no detected nodes, so 03 Data always shows during loading. Empty tiers render with a
  faint "—" placeholder row (`Tier` handles zero-node tiers). The enriched overview result
  replaces the skeleton (LLM may omit empty tiers; that's fine post-load).

## Components / Files

- `lib/enrich/overview.ts` — drop rationale (prompt + schema + assembly).
- `lib/enrich/alternatives.ts` → `details.ts` content: `generateDetails` returns `{rationale,alts}`.
- `lib/enrich/anthropic.ts` — model param; overview=Haiku, details=Sonnet.
- `app/api/alternatives/route.ts` — return `{ rationale, alts }`.
- `app/api/overview/route.ts` — pass Haiku model.
- `client/useAnalysis.ts` — `DetailState`; details fetch; banner tech count.
- `client/pickDirectory.ts`, `client/walk.ts` (new) — FSA + fallback.
- `components/FolderPicker.tsx` — use `pickDirectory`.
- `components/EntryScreen.tsx` — copy + popover disclosure.
- `components/ProgressBanner.tsx` — staged copy + count.
- `components/SystemView.tsx` + `lib/system/zoom.ts` — pan/zoom.
- `components/DiagramLegend.tsx` — `title` prop; `components/StackView.tsx` passes "Tech Stack".
- `client/skeleton.ts` — canonical tiers incl. empty placeholders; `components/Tier.tsx` empty-state.
- `app/globals.css` — popover, zoom controls, empty-tier placeholder.

## Testing

- Unit: `generateDetails` (parse `{rationale,alts}`, single-object tolerance, throws on bad);
  overview schema no longer requires rationale and assembles `rationale:""`; `clampScale`/`zoomAt`;
  `skeleton` includes all canonical tiers in order incl. empty `data`.
- Existing suite stays green (update tests referencing old alt-only shape / overview rationale).
- Playwright: System zoom in/out/reset + pan; entry copy; disclosure popover no reflow; picker
  fallback path; Stack titled "Tech Stack" with 03 Data present during loading; faster first paint.

## Out of scope (YAGNI)

Persisting zoom level; minimap; streaming the overview token-by-token; FSA write access.
