"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Technology, TreeNode as TreeNodeData } from "@/lib/types";
import { EntryScreen } from "@/components/EntryScreen";
import { TopBar, type View } from "@/components/TopBar";
import { StackView } from "@/components/StackView";
import { SystemView } from "@/components/SystemView";
import { Drilldown } from "@/components/Drilldown";
import { CodeOverlay } from "@/components/CodeOverlay";
import { LoadingPanel } from "@/components/LoadingPanel";
import type { DiagramCommon, EdgeControls, EdgeEmphasis } from "@/components/diagram-types";
import { useAnalysis } from "@/client/useAnalysis";

export default function Home() {
  const { analysis, stage, elapsedMs, overviewFailed, fileHandles, start, reset, detailFor, ensureDetails } = useAnalysis();
  const [readError, setReadError] = useState<string | null>(null);

  const [view, setView] = useState<View>("stack");
  const [activeNode, setActiveNode] = useState<Technology | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [pinnedNodeId, setPinnedNodeId] = useState<string | null>(null);  // Code view selection
  const [fileMaps, setFileMaps] = useState<string[] | null>(null);
  const [traceStep, setTraceStep] = useState<number | null>(null);
  const [bump, setBump] = useState(0);

  // edge-emphasis controls (shared by Stack + System)
  const [emphasis, setEmphasis] = useState<EdgeEmphasis>("none");
  const [legendHot, setLegendHot] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodeEls.current.set(id, el); else nodeEls.current.delete(id);
  }, []);

  useEffect(() => { setBump((b) => b + 1); }, [view, analysis]);
  useEffect(() => { setPinnedNodeId(null); }, [view]);   // selection is per-view (Code view)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { setActiveNode(null); setTraceStep(null); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (traceStep === null || !analysis) return;
    if (traceStep >= analysis.trace.length - 1) return;
    const t = setTimeout(() => setTraceStep((s) => (s === null ? null : s + 1)), 1400);
    return () => clearTimeout(t);
  }, [traceStep, analysis]);

  if (!analysis) {
    return <EntryScreen
      onPicked={(req, handles) => { setReadError(null); setView("stack"); setActiveNode(null); start(req, handles); }}
      onError={setReadError} error={readError} />;
  }

  const traceNodeId = traceStep !== null ? analysis.trace[traceStep]?.nodeId ?? null : null;
  const edgeFocus = traceNodeId ?? hoverNodeId ?? (activeNode ? activeNode.id : null);

  function openNode(n: Technology) {
    setActiveNode((cur) => {
      const next = cur && cur.id === n.id ? null : n;
      if (next) ensureDetails(next);
      return next;
    });
  }

  // In Code view a click pins a persistent selection (drives cross-highlight) and does NOT
  // open the compare panel; in Stack/System it opens the panel as usual.
  function handleNodeClick(n: Technology) {
    if (view === "code") setPinnedNodeId((cur) => (cur === n.id ? null : n.id));
    else openNode(n);
  }

  // selected node id for highlighting purposes (panel-independent in Code view)
  const selectedId = view === "code" ? pinnedNodeId : (activeNode ? activeNode.id : null);

  const common: DiagramCommon = {
    activeId: traceNodeId ?? selectedId,
    fileHits: fileMaps ? new Set(fileMaps) : null,
    mapDim: view === "code" && !!fileMaps,
    onClick: handleNodeClick,
    onHover: setHoverNodeId,
    registerNode,
  };

  const controls: EdgeControls = {
    emphasis,
    legendHot,
    onDataFlowHover: (on) => setEmphasis((cur) => (cur === "pinned" ? "pinned" : on ? "hover" : "none")),
    onDataFlowClick: () => setEmphasis((cur) => (cur === "pinned" ? "none" : "pinned")),
    onEdgeHover: (on) => setLegendHot(on),
  };

  const focusId = hoverNodeId ?? selectedId;
  const focusName = focusId ? analysis.tiers.flatMap((t) => t.nodes).find((n) => n.id === focusId)?.name ?? null : null;
  const activeDetail = activeNode ? detailFor(activeNode.id) : { status: "idle" as const, rationale: "", alts: [] };

  function startTrace() {
    setTraceStep((s) => (s === null ? 0 : null));
    setActiveNode(null);
  }
  function onClickFile(f: TreeNodeData) {
    const id = f.maps?.[0];
    if (!id) return;
    // In Code view, clicking a file pins the selection (no panel). Elsewhere, open the panel.
    if (view === "code") { setPinnedNodeId((cur) => (cur === id ? null : id)); return; }
    const node = analysis!.tiers.flatMap((t) => t.nodes).find((n) => n.id === id);
    if (node) openNode(node);
  }

  return (
    <div className="app">
      <TopBar analysis={analysis} view={view} onView={setView}
        onTrace={startTrace} tracing={traceStep !== null}
        onReset={() => { reset(); setActiveNode(null); setPinnedNodeId(null); setView("stack"); setTraceStep(null); }} />

      <div className="work">
        <div className="canvas-wrap">
          {stage === "mapping" && <LoadingPanel analysis={analysis} elapsedMs={elapsedMs} />}
          {overviewFailed && (
            <div className="notice mono">couldn&apos;t map architecture — showing the detected stack</div>
          )}

          {view === "system" ? (
            <SystemView analysis={analysis} common={common} controls={controls} edgeFocus={edgeFocus} title="Systems Architecture" />
          ) : (
            <StackView analysis={analysis} common={common} controls={controls} edgeFocus={edgeFocus}
              canvasRef={canvasRef} nodeEls={nodeEls} bump={bump} />
          )}

          {traceStep !== null && analysis.trace[traceStep] && (
            <div className="trace-caption" style={{ position: "absolute", left: 0, right: 0, bottom: 16, textAlign: "center", pointerEvents: "none" }}>
              <span className="mono" style={{ background: "var(--accent-wash)", color: "var(--accent-ink)", padding: "6px 12px", borderRadius: 999 }}>
                {analysis.trace[traceStep].order}. {analysis.trace[traceStep].label}
              </span>
            </div>
          )}

          <CodeOverlay open={view === "code"} analysis={analysis} focusName={focusName} focusId={focusId}
            onHoverFile={(maps) => setFileMaps(maps && maps.length ? maps : null)}
            onClickFile={onClickFile} />
        </div>

        <Drilldown node={activeNode} fileHandles={fileHandles}
          rationale={activeDetail.rationale} alts={activeDetail.alts} altStatus={activeDetail.status}
          onRetryAlts={() => activeNode && ensureDetails(activeNode, true)}
          onClose={() => setActiveNode(null)} />
      </div>
    </div>
  );
}
