# Stack Explorer — Phase 3: Visualization UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw Phase 2 page with the full "schematic instrument" UI ported from `reference/mock/`: layered diagram with data-flow edges, a compare-technology side panel, a Codebase-map split view with a cross-highlighting file tree, a narrated request-trace mode, and local file preview.

**Architecture:** Port the prototype's React components to typed TSX, driven by the `Analysis` object from `/api/analyze` (no globals, no sample data). Keep the mock's `styles.css` verbatim. Drop the tweaks panel and the `flow`/`nested` layouts (layered only). Add the request-trace stepper, which is new (the mock had only selected-path highlighting).

**Tech Stack:** Next.js 15 (client components), the mock's CSS, IBM Plex fonts.

**Prerequisite:** Phases 1–2 complete (`/api/analyze` returns a valid `Analysis`; `FolderPicker` works).

**Reference (port these):** `reference/mock/src/diagram.jsx` (Icon, StackNode, EdgeLayer, Tier, Diagram), `reference/mock/src/panels.jsx` (Drilldown, FileTreePane, TreeNode), `reference/mock/src/app.jsx` (shell/state), `reference/mock/src/styles.css`. Screenshots in `reference/mock/screenshots/` show the intended result (`01-v4.png` = architecture, `02-code.png` = codebase map).

**Verification approach:** These are UI ports; logic is already unit-tested in Phases 1–2. Verify each task with `npx tsc --noEmit` (catches prop/type mistakes) and, at the end, a visual check via `npm run dev` against `reference/mock` as the input folder. No DOM component tests (avoids the @vitejs/plugin-react ↔ Vitest type conflict; not worth it for a port).

---

### Task 1: Port global styles + fonts

**Files:**
- Overwrite: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Copy the mock stylesheet verbatim**

```bash
cp reference/mock/src/styles.css app/globals.css
```

- [ ] **Step 2: Add the IBM Plex fonts + import globals in `app/layout.tsx`**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stack Explorer",
  description: "Visualize a codebase's architecture and the choices behind it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds (globals.css is valid CSS; layout type-checks).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: port schematic-instrument styles and fonts"
```

---

### Task 2: Icon component

**Files:**
- Create: `components/Icon.tsx`

- [ ] **Step 1: Implement `components/Icon.tsx`** (ported from `diagram.jsx` lines 5–24, typed)

```tsx
const PATHS: Record<string, string> = {
  folder: "M3 5.5A1.5 1.5 0 0 1 4.5 4h3l1.5 1.8h6A1.5 1.5 0 0 1 16.5 7.3v8.2A1.5 1.5 0 0 1 15 17H4.5A1.5 1.5 0 0 1 3 15.5z",
  file: "M5 2.5h6l4 4v11A1.5 1.5 0 0 1 13.5 19h-9A1.5 1.5 0 0 1 3 17.5v-13A2 2 0 0 1 5 2.5z M11 2.5v4h4",
  chevron: "M7 4l6 6-6 6",
  layers: "M10 3l7 4-7 4-7-4 7-4z M3 13l7 4 7-4",
  close: "M5 5l10 10 M15 5L5 15",
  map: "M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2z M8 3v14 M12 5v14",
  code: "M7 6l-4 4 4 4 M13 6l4 4-4 4",
  play: "M6 4l10 6-10 6z",
};

interface IconProps {
  name: keyof typeof PATHS;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, className, style }: IconProps) {
  const p = PATHS[name];
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {p.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Icon.tsx
git commit -m "feat: Icon component"
```

---

### Task 3: Diagram primitives — shared view types, StackNode

**Files:**
- Create: `components/diagram-types.ts`
- Create: `components/StackNode.tsx`

`DiagramCommon` is the shared interaction bundle passed to nodes (ported from `app.jsx`'s `common`).

- [ ] **Step 1: Implement `components/diagram-types.ts`**

```ts
import type { Technology } from "@/lib/types";

export interface DiagramCommon {
  activeId: string | null;
  fileHits: Set<string> | null;   // node ids highlighted from a hovered file
  mapDim: boolean;                 // dim non-matching nodes (codebase-map mode)
  onClick: (n: Technology) => void;
  onHover: (id: string | null) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
}
```

- [ ] **Step 2: Implement `components/StackNode.tsx`** (ported from `diagram.jsx` lines 27–46)

```tsx
import type { Technology } from "@/lib/types";

interface Props {
  node: Technology;
  active: boolean;
  dim: boolean;
  filehit: boolean;
  onClick: (n: Technology) => void;
  onHover: (id: string | null) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
}

export function StackNode({ node, active, dim, filehit, onClick, onHover, registerNode }: Props) {
  return (
    <button
      ref={(el) => registerNode(node.id, el)}
      className={"node" + (active ? " active" : "") + (dim ? " dim" : "") + (filehit ? " filehit" : "")}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="alt-count mono">{node.alts.length} alt</span>
      <span className="nrow">
        <span className="glyph">{node.glyph}</span>
        <span>
          <span className="nm" style={{ display: "block" }}>{node.name}</span>
          <span className="cat">{node.cat}</span>
        </span>
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/diagram-types.ts components/StackNode.tsx
git commit -m "feat: StackNode and shared diagram interaction types"
```

---

### Task 4: EdgeLayer (layered SVG connectors)

**Files:**
- Create: `components/EdgeLayer.tsx`

Ported from `diagram.jsx` lines 49–116, keeping only the layered curve math (drop the `flow` branch). Measures node positions and draws curved edges; highlights edges touching `activeId`.

- [ ] **Step 1: Implement `components/EdgeLayer.tsx`**

```tsx
"use client";

import { useState, useLayoutEffect, useEffect, useCallback, type RefObject } from "react";

interface Props {
  canvasRef: RefObject<HTMLDivElement | null>;
  nodeEls: RefObject<Map<string, HTMLElement>>;
  edges: [string, string][];
  activeId: string | null;
  bump: number;
}

interface EdgePath { id: string; d: string; a: string; b: string; ax: number; ay: number; bx: number; by: number; }

export function EdgeLayer({ canvasRef, nodeEls, edges, activeId, bump }: Props) {
  const [paths, setPaths] = useState<EdgePath[]>([]);

  const compute = useCallback(() => {
    const wrap = canvasRef.current;
    if (!wrap) return;
    const base = wrap.getBoundingClientRect();
    const out: EdgePath[] = [];
    edges.forEach(([a, b]) => {
      const ea = nodeEls.current?.get(a);
      const eb = nodeEls.current?.get(b);
      if (!ea || !eb) return;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const ax = ra.left - base.left + ra.width / 2;
      const ay = ra.top - base.top + ra.height / 2;
      const bx = rb.left - base.left + rb.width / 2;
      const by = rb.top - base.top + rb.height / 2;
      const my = (ay + by) / 2;
      const d = `M ${ax} ${ay} C ${ax} ${my}, ${bx} ${my}, ${bx} ${by}`;
      out.push({ id: `${a}-${b}`, d, a, b, ax, ay, bx, by });
    });
    setPaths(out);
  }, [edges, canvasRef, nodeEls]);

  useLayoutEffect(() => {
    compute();
    const t = setTimeout(compute, 60);
    const t2 = setTimeout(compute, 260);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [compute, bump]);

  useEffect(() => {
    const onR = () => compute();
    window.addEventListener("resize", onR);
    const ro = new ResizeObserver(onR);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => { window.removeEventListener("resize", onR); ro.disconnect(); };
  }, [compute, canvasRef]);

  return (
    <svg className="edge-layer">
      {paths.map((p) => {
        const hot = !!activeId && (p.a === activeId || p.b === activeId);
        const dim = !!activeId && !hot;
        return <path key={p.id} d={p.d} className={hot ? "hot" : dim ? "dim" : ""} />;
      })}
      {paths.map((p) => {
        const hot = !!activeId && (p.a === activeId || p.b === activeId);
        if (activeId && !hot) return null;
        return (
          <g key={p.id + "-d"}>
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.ax} cy={p.ay} r="2.4" />
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.bx} cy={p.by} r="2.4" />
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/EdgeLayer.tsx
git commit -m "feat: EdgeLayer draws layered data-flow connectors"
```

---

### Task 5: Tier + Diagram (props-driven, layered only)

**Files:**
- Create: `components/Tier.tsx`
- Create: `components/Diagram.tsx`

Ported from `diagram.jsx` lines 119–209, reading from an `analysis` prop instead of the `STACK` global; `flow`/`nested` removed.

- [ ] **Step 1: Implement `components/Tier.tsx`**

```tsx
import type { Tier as TierData } from "@/lib/types";
import type { DiagramCommon } from "@/components/diagram-types";
import { StackNode } from "@/components/StackNode";

export function Tier({ tier, common }: { tier: TierData; common: DiagramCommon }) {
  return (
    <section className="tier">
      <div className="tier-label">
        <span className="idx mono">{tier.idx}</span>
        <span className="name">{tier.name}</span>
        <span className="desc">{tier.desc}</span>
        <span className="rule" />
      </div>
      <div className="node-row">
        {tier.nodes.map((n) => (
          <StackNode
            key={n.id}
            node={n}
            onClick={common.onClick}
            onHover={common.onHover}
            registerNode={common.registerNode}
            active={common.activeId === n.id}
            dim={common.mapDim ? !common.fileHits?.has(n.id) : false}
            filehit={!!common.fileHits?.has(n.id)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement `components/Diagram.tsx`**

```tsx
"use client";

import { type RefObject } from "react";
import type { Analysis } from "@/lib/types";
import type { DiagramCommon } from "@/components/diagram-types";
import { Tier } from "@/components/Tier";
import { EdgeLayer } from "@/components/EdgeLayer";

interface Props {
  analysis: Analysis;
  common: DiagramCommon;
  edgeFocus: string | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  nodeEls: RefObject<Map<string, HTMLElement>>;
  bump: number;
}

export function Diagram({ analysis, common, edgeFocus, canvasRef, nodeEls, bump }: Props) {
  const techCount = analysis.tiers.flatMap((t) => t.nodes).length;
  return (
    <div className="canvas" ref={canvasRef}>
      <div className="diagram-head">
        <h1>System architecture</h1>
        <span className="sub">{techCount} technologies · {analysis.edges.length} links</span>
      </div>
      <div className="diagram-legend">
        <span className="lg"><span className="swatch" /> data flow</span>
        <span className="lg"><span className="swatch accent" /> selected path</span>
        <span className="lg"><span className="swatch box" /> technology · click to compare</span>
        <span className="lg mono">layout: layered</span>
      </div>

      <EdgeLayer canvasRef={canvasRef} nodeEls={nodeEls} edges={analysis.edges} activeId={edgeFocus} bump={bump} />

      <div className="tiers">
        {analysis.tiers.map((t) => <Tier key={t.id} tier={t} common={common} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/Tier.tsx components/Diagram.tsx
git commit -m "feat: layered Tier and Diagram driven by Analysis"
```

---

### Task 6: Drilldown compare panel (with local file preview)

**Files:**
- Create: `components/Drilldown.tsx`

Ported from `panels.jsx` lines 4–83. Adds local file preview: clicking a file reads its contents from the in-memory `File` handle and shows it inline (the file never leaves the browser).

- [ ] **Step 1: Implement `components/Drilldown.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Technology } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface Props {
  node: Technology | null;
  fileHandles: Map<string, File>;
  onClose: () => void;
}

export function Drilldown({ node, fileHandles, onClose }: Props) {
  const open = !!node;
  const [preview, setPreview] = useState<{ path: string; text: string } | null>(null);

  async function openFile(path: string) {
    const clean = path.replace(/\/$/, "");
    const handle = fileHandles.get(clean);
    if (!handle) { setPreview({ path: clean, text: "(file contents unavailable)" }); return; }
    const text = await handle.text();
    setPreview({ path: clean, text: text.slice(0, 20000) });
  }

  return (
    <>
      <div className={"panel-scrim" + (open ? " show" : "")} onClick={onClose} />
      <aside className={"panel" + (open ? " show" : "")} aria-hidden={!open}>
        {node && (
          <>
            <div className="panel-head">
              <button className="panel-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
              <div className="eyebrow"><span className="idx-dot" />compare technology</div>
              <div className="title-row">
                <span className="glyph-lg">{node.glyph}</span>
                <div><h2>{node.name}</h2><span className="cat2">{node.cat}</span></div>
              </div>
              <div className="tags">{node.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
            </div>

            <div className="panel-body">
              <div className="rationale"><span className="lead">why it&apos;s here</span>{node.rationale}</div>

              <div className="sec-label">Maps to code</div>
              <div className="files-list">
                {node.files.map((f) => {
                  const dir = f.endsWith("/");
                  return (
                    <div key={f} className="file-line" onClick={() => !dir && openFile(f)}>
                      <Icon name={dir ? "folder" : "file"} style={{ width: 14, height: 14 }} />
                      <span>{f}</span>
                    </div>
                  );
                })}
              </div>

              {preview && (
                <pre className="file-preview" style={{ maxHeight: 220, overflow: "auto", fontFamily: "var(--mono)", fontSize: 12, background: "var(--surface-2)", padding: 10, borderRadius: 6 }}>
                  <div className="sec-label">{preview.path}</div>
                  {preview.text}
                </pre>
              )}

              <div className="sec-label">Alternatives &amp; tradeoffs</div>

              <div className="alt current">
                <div className="alt-head">
                  <span className="alt-name">{node.name}<span className="mono-mini">{node.cat}</span></span>
                  <span className="badge-current">current</span>
                </div>
                <div className="alt-blurb">{node.rationale}</div>
              </div>

              {node.alts.map((a) => (
                <div key={a.name} className="alt">
                  <div className="alt-head"><span className="alt-name">{a.name}<span className="mono-mini">{a.tag}</span></span></div>
                  <div className="alt-blurb">{a.blurb}</div>
                  <div className="pc">
                    <div className="pros"><div className="col-label">Pros</div><ul>{a.pros.map((p, i) => <li key={i}>{p}</li>)}</ul></div>
                    <div className="cons"><div className="col-label">Cons</div><ul>{a.cons.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                  </div>
                  <div className="when"><b>when to choose</b>{a.when}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/Drilldown.tsx
git commit -m "feat: compare panel with alternatives and local file preview"
```

---

### Task 7: FileTreePane + TreeNode (Codebase-map)

**Files:**
- Create: `components/FileTreePane.tsx`

Ported from `panels.jsx` lines 86–159, reading `analysis.fileTree` and `analysis.repo` from props instead of globals.

- [ ] **Step 1: Implement `components/FileTreePane.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Analysis, TreeNode as TreeNodeData } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  path: string;
  focusId: string | null;
  onHoverFile: (maps: string[] | null) => void;
  onClickFile: (node: TreeNodeData) => void;
  defaultOpen?: boolean;
}

function subtreeHas(n: TreeNodeData, focusId: string): boolean {
  if ((n.maps ?? []).includes(focusId)) return true;
  return (n.children ?? []).some((c) => subtreeHas(c, focusId));
}

function TreeNode({ node, depth, path, focusId, onHoverFile, onClickFile, defaultOpen }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2 || !!defaultOpen);
  const isDir = node.type === "dir";
  const maps = node.maps ?? [];
  const selfHit = !!focusId && maps.includes(focusId);
  const faded = !!focusId && !selfHit && !(isDir && subtreeHas(node, focusId));

  return (
    <div className="tnode">
      <div
        className={"trow " + (isDir ? "dir " : "") + (selfHit ? "hit " : "") + (faded ? "faded" : "")}
        style={{ paddingLeft: 8 }}
        onClick={() => (isDir ? setOpen(!open) : onClickFile(node))}
        onMouseEnter={() => onHoverFile(maps)}
        onMouseLeave={() => onHoverFile(null)}
        title={path}
      >
        <span className="tw">
          {isDir
            ? <Icon name="chevron" style={{ width: 11, height: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
            : <Icon name="file" style={{ width: 12, height: 12 }} />}
        </span>
        <span className="tname">{node.name}{isDir ? "/" : ""}</span>
        {maps.length > 0 && <span className="maps">{maps.length}</span>}
      </div>
      {isDir && open && (
        <div className="tchildren">
          {(node.children ?? []).map((c, i) => (
            <TreeNode key={c.name + i} node={c} depth={depth + 1} path={path + "/" + c.name}
              focusId={focusId} onHoverFile={onHoverFile} onClickFile={onClickFile} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PaneProps {
  analysis: Analysis;
  focusName: string | null;          // tech name for the hint line
  focusId: string | null;            // tech id used for highlighting
  onHoverFile: (maps: string[] | null) => void;
  onClickFile: (node: TreeNodeData) => void;
}

export function FileTreePane({ analysis, focusName, focusId, onHoverFile, onClickFile }: PaneProps) {
  return (
    <div className="tree-pane">
      <div className="tree-head">
        <Icon name="code" style={{ width: 16, height: 16 }} />
        <div><div className="eyebrow">codebase</div><h3>{analysis.repo}</h3></div>
      </div>
      <div className="tree-hint">
        {focusName ? <>highlighting files for <b>{focusName}</b></> : "hover a technology or a file to see what maps where"}
      </div>
      <div className="tree-body">
        {(analysis.fileTree.children ?? []).map((c, i) => (
          <TreeNode key={c.name + i} node={c} depth={1} path={c.name}
            focusId={focusId} onHoverFile={onHoverFile} onClickFile={onClickFile} defaultOpen />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FileTreePane.tsx
git commit -m "feat: FileTreePane with cross-highlighting"
```

---

### Task 8: TopBar + EntryScreen

**Files:**
- Create: `components/TopBar.tsx`
- Create: `components/EntryScreen.tsx`

Ported from `app.jsx` (top bar lines 82–100; entry overlay lines 124–145), minus the sample buttons' fake analyze (the real `FolderPicker` drives analysis).

- [ ] **Step 1: Implement `components/TopBar.tsx`**

```tsx
import type { Analysis } from "@/lib/types";
import { Icon } from "@/components/Icon";

type Mode = "arch" | "code";

interface Props {
  analysis: Analysis;
  mode: Mode;
  onMode: (m: Mode) => void;
  onTrace: () => void;
  tracing: boolean;
  onReset: () => void;
}

export function TopBar({ analysis, mode, onMode, onTrace, tracing, onReset }: Props) {
  return (
    <header className="topbar">
      <div className="brand"><span className="mark" /> Stack Explorer</div>
      <div className="repo-chip">
        <span className="dot" /><b>{analysis.repo}</b>
        <span style={{ opacity: 0.6 }}>
          {analysis.branch ? ` · ${analysis.branch}` : ""} · {analysis.files} files
        </span>
      </div>
      <div className="spacer" />
      <div className="seg" role="group" aria-label="View mode">
        <button aria-pressed={mode === "arch"} onClick={() => onMode("arch")}><Icon name="layers" /> Architecture</button>
        <button aria-pressed={mode === "code"} onClick={() => onMode("code")}><Icon name="map" /> Codebase map</button>
      </div>
      {mode === "arch" && analysis.trace.length > 0 && (
        <button className="btn-ghost" onClick={onTrace} aria-pressed={tracing}>
          <Icon name="play" /> {tracing ? "Stop trace" : "Trace a request"}
        </button>
      )}
      <button className="btn-ghost" onClick={onReset}><Icon name="folder" /> New directory</button>
    </header>
  );
}
```

- [ ] **Step 2: Implement `components/EntryScreen.tsx`**

```tsx
import { FolderPicker } from "@/components/FolderPicker";
import type { Analysis } from "@/lib/types";

interface Props {
  onAnalyzed: (analysis: Analysis, files: Map<string, File>) => void;
  onError: (message: string) => void;
  error: string | null;
}

export function EntryScreen({ onAnalyzed, onError, error }: Props) {
  return (
    <div className="entry">
      <div className="card">
        <div className="brand" style={{ fontSize: 13 }}><span className="mark" /> Stack Explorer</div>
        <h2>Point at a codebase</h2>
        <p>Select a project directory and Stack Explorer maps its architecture — every technology, why it was chosen, and what you could have used instead.</p>
        <FolderPicker onAnalyzed={onAnalyzed} onError={onError} />
        {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/TopBar.tsx components/EntryScreen.tsx
git commit -m "feat: TopBar and EntryScreen"
```

---

### Task 9: Assemble the app shell (modes, selection, cross-highlight, trace)

**Files:**
- Overwrite: `app/page.tsx`

Replaces the Phase 2 raw page. Holds all session state and wires the components. Trace mode steps through `analysis.trace`, setting `edgeFocus`/`activeId` to each step's `nodeId` and showing a caption; auto-advances every 1.4s and stops at the end.

- [ ] **Step 1: Implement `app/page.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Analysis, Technology, TreeNode as TreeNodeData } from "@/lib/types";
import { EntryScreen } from "@/components/EntryScreen";
import { TopBar } from "@/components/TopBar";
import { Diagram } from "@/components/Diagram";
import { Drilldown } from "@/components/Drilldown";
import { FileTreePane } from "@/components/FileTreePane";
import type { DiagramCommon } from "@/components/diagram-types";

type Mode = "arch" | "code";

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fileHandles, setFileHandles] = useState<Map<string, File>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("arch");
  const [activeNode, setActiveNode] = useState<Technology | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [fileMaps, setFileMaps] = useState<string[] | null>(null);
  const [traceStep, setTraceStep] = useState<number | null>(null);
  const [bump, setBump] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeEls.current.set(id, el); else nodeEls.current.delete(id);
  }, []);

  useEffect(() => { setBump((b) => b + 1); }, [mode, analysis]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setActiveNode(null); setTraceStep(null); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // auto-advance the request trace
  useEffect(() => {
    if (traceStep === null || !analysis) return;
    if (traceStep >= analysis.trace.length - 1) return;
    const t = setTimeout(() => setTraceStep((s) => (s === null ? null : s + 1)), 1400);
    return () => clearTimeout(t);
  }, [traceStep, analysis]);

  if (!analysis) {
    return <EntryScreen
      onAnalyzed={(a, files) => { setError(null); setAnalysis(a); setFileHandles(files); }}
      onError={setError} error={error} />;
  }

  const traceNodeId = traceStep !== null ? analysis.trace[traceStep]?.nodeId ?? null : null;
  const edgeFocus = traceNodeId ?? hoverNodeId ?? (activeNode ? activeNode.id : null);

  const common: DiagramCommon = {
    activeId: traceNodeId ?? (activeNode ? activeNode.id : null),
    fileHits: fileMaps ? new Set(fileMaps) : null,
    mapDim: mode === "code" && !!fileMaps,
    onClick: (n) => setActiveNode((cur) => (cur && cur.id === n.id ? null : n)),
    onHover: setHoverNodeId,
    registerNode,
  };

  const focusId = hoverNodeId ?? (activeNode ? activeNode.id : null);
  const focusName = focusId ? analysis.tiers.flatMap((t) => t.nodes).find((n) => n.id === focusId)?.name ?? null : null;

  function startTrace() {
    setTraceStep((s) => (s === null ? 0 : null));
    setActiveNode(null);
  }
  function onClickFile(f: TreeNodeData) {
    const id = f.maps?.[0];
    if (!id) return;
    const node = analysis!.tiers.flatMap((t) => t.nodes).find((n) => n.id === id);
    if (node) setActiveNode(node);
  }

  return (
    <div className="app">
      <TopBar analysis={analysis} mode={mode} onMode={setMode}
        onTrace={startTrace} tracing={traceStep !== null}
        onReset={() => { setAnalysis(null); setActiveNode(null); setMode("arch"); setTraceStep(null); }} />

      <div className={"work" + (mode === "code" ? " split" : "")}>
        <div className="canvas-wrap">
          <Diagram analysis={analysis} common={common} edgeFocus={edgeFocus}
            canvasRef={canvasRef} nodeEls={nodeEls} bump={bump} />
          {traceStep !== null && (
            <div className="trace-caption" style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", pointerEvents: "none" }}>
              <span className="mono" style={{ background: "var(--accent-wash)", color: "var(--accent-ink)", padding: "6px 12px", borderRadius: 999 }}>
                {analysis.trace[traceStep].order}. {analysis.trace[traceStep].label}
              </span>
            </div>
          )}
        </div>

        {mode === "code" && (
          <FileTreePane analysis={analysis} focusName={focusName} focusId={focusId}
            onHoverFile={(maps) => setFileMaps(maps && maps.length ? maps : null)}
            onClickFile={onClickFile} />
        )}

        <Drilldown node={activeNode} fileHandles={fileHandles} onClose={() => setActiveNode(null)} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + type check + existing tests**

Run: `npm run build && npx tsc --noEmit && npm test`
Expected: build succeeds; no type errors; all Phase 1–2 tests still pass.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble app shell with modes, selection, cross-highlight, trace"
```

---

### Task 10: Add trace-caption style + visual verification

**Files:**
- Modify: `app/globals.css` (append a small rule if `.trace-caption` needs spacing; the inline styles above already cover essentials)

- [ ] **Step 1: Append a `.canvas-wrap` position rule if missing**

Ensure the trace caption can position over the canvas. Append to `app/globals.css` only if `.canvas-wrap` lacks `position`:

```css
.canvas-wrap { position: relative; }
```

(Check first — the ported stylesheet may already set this. If it does, skip this step.)

- [ ] **Step 2: Run the app against the bundled mock as input**

Run: `ANTHROPIC_API_KEY=<real key> npm run dev`, open `http://localhost:3000`, and choose the `reference/mock` folder (or any real project). Verify against `reference/mock/screenshots/01-v4.png` and `02-code.png`:
  - Architecture mode: layered tiers, node cards with glyph + "N alt", curved edges; clicking a node opens the compare panel; selecting highlights its edges.
  - "Trace a request" steps through the path with the caption and highlights each node.
  - Codebase map: split view; hovering a tech highlights its files; hovering/clicking a file highlights the tech node(s); map-count badges show.
  - Clicking a file in the compare panel previews its contents.

- [ ] **Step 3: Take a screenshot for the record (optional)** using the `run`/`verify` skill or browser tooling, comparing to the reference screenshots.

- [ ] **Step 4: Commit any CSS tweak**

```bash
git add app/globals.css
git commit -m "style: ensure trace caption positions over canvas"
```

---

### Task 11: Deployment config for Render

**Files:**
- Create: `render.yaml`
- Modify: `README.md` (create if absent)

- [ ] **Step 1: Create `render.yaml`**

```yaml
services:
  - type: web
    name: stack-explorer
    runtime: node
    plan: starter
    buildCommand: npm ci && npm run build
    startCommand: npm run start
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: NODE_VERSION
        value: "20"
```

- [ ] **Step 2: Document setup in `README.md`**

```markdown
# Stack Explorer

Point at a codebase; get an explorable architecture diagram with alternatives and a code map.

## Local dev
```
npm install
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

## Deploy (Render)
Connect the repo; Render reads `render.yaml`. Set `ANTHROPIC_API_KEY` in the dashboard. Desktop-only.
```

- [ ] **Step 3: Verify production build locally**

Run: `npm run build && npm run start` then open `http://localhost:3000`.
Expected: app serves; entry screen renders.

- [ ] **Step 4: Commit**

```bash
git add render.yaml README.md
git commit -m "chore: Render deployment config and README"
```

---

## Self-Review Notes (Phase 3)

- **Spec coverage:** styles/theme (§4 aesthetic) → Task 1; Icon/StackNode/EdgeLayer/Tier/Diagram with selected-path (§3.4, §4) → Tasks 2–5; compare panel + local preview (§3.4–3.5, §4 Drilldown) → Task 6; Codebase-map split + cross-highlight + badges (§3.5, §4 FileTreePane) → Task 7; top bar modes + entry (§4 App shell) → Task 8; full wiring + narrated trace (§2 request trace, §3.4) → Task 9–10; Render deploy (§6) → Task 11. Tweaks panel intentionally omitted (§9 YAGNI). Flow/nested layouts omitted (§2 layered only).
- **Type consistency:** `DiagramCommon` (Task 3) used by `StackNode`/`Tier`/`Diagram`/page. `Analysis`/`Technology`/`TreeNode` (Phase 1) flow through every component. `Mode` type ("arch"|"code") consistent across `TopBar` and page. `fileHandles: Map<string, File>` produced by `FolderPicker` (Phase 2 Task 8) and consumed by `Drilldown` (Task 6) — names match.
- **No placeholders:** every component is complete; CSS is copied verbatim from the committed `reference/mock/src/styles.css`.
- **Known follow-ups (out of scope):** the ported `styles.css` includes selectors for dropped features (nested/flow, tweaks panel); harmless dead CSS, can be pruned later.
