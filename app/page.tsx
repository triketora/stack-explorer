"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Technology, TreeNode as TreeNodeData } from "@/lib/types";
import { EntryScreen } from "@/components/EntryScreen";
import { TopBar } from "@/components/TopBar";
import { Diagram } from "@/components/Diagram";
import { Drilldown } from "@/components/Drilldown";
import { FileTreePane } from "@/components/FileTreePane";
import { ProgressBanner } from "@/components/ProgressBanner";
import type { DiagramCommon } from "@/components/diagram-types";
import { useAnalysis } from "@/client/useAnalysis";

type Mode = "arch" | "code";

export default function Home() {
  const { analysis, stage, elapsedMs, overviewFailed, fileHandles, start, reset, altStateFor, ensureAlts } = useAnalysis();
  const [readError, setReadError] = useState<string | null>(null);

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
      onPicked={(req, handles) => { setReadError(null); setMode("arch"); setActiveNode(null); start(req, handles); }}
      onError={setReadError} error={readError} />;
  }

  const traceNodeId = traceStep !== null ? analysis.trace[traceStep]?.nodeId ?? null : null;
  const edgeFocus = traceNodeId ?? hoverNodeId ?? (activeNode ? activeNode.id : null);

  function openNode(n: Technology) {
    setActiveNode((cur) => {
      const next = cur && cur.id === n.id ? null : n;
      if (next) ensureAlts(next);
      return next;
    });
  }

  const common: DiagramCommon = {
    activeId: traceNodeId ?? (activeNode ? activeNode.id : null),
    fileHits: fileMaps ? new Set(fileMaps) : null,
    mapDim: mode === "code" && !!fileMaps,
    onClick: openNode,
    onHover: setHoverNodeId,
    registerNode,
  };

  const focusId = hoverNodeId ?? (activeNode ? activeNode.id : null);
  const focusName = focusId ? analysis.tiers.flatMap((t) => t.nodes).find((n) => n.id === focusId)?.name ?? null : null;
  const activeAlt = activeNode ? altStateFor(activeNode.id) : { status: "idle" as const, alts: [] };

  function startTrace() {
    setTraceStep((s) => (s === null ? 0 : null));
    setActiveNode(null);
  }
  function onClickFile(f: TreeNodeData) {
    const id = f.maps?.[0];
    if (!id) return;
    const node = analysis!.tiers.flatMap((t) => t.nodes).find((n) => n.id === id);
    if (node) openNode(node);
  }

  return (
    <div className="app">
      <TopBar analysis={analysis} mode={mode} onMode={setMode}
        onTrace={startTrace} tracing={traceStep !== null}
        onReset={() => { reset(); setActiveNode(null); setMode("arch"); setTraceStep(null); }} />

      <div className={"work" + (mode === "code" ? " split" : "")}>
        <div className="canvas-wrap">
          {stage === "mapping" && <ProgressBanner elapsedMs={elapsedMs} />}
          {overviewFailed && (
            <div className="notice mono">couldn&apos;t map architecture — showing the detected stack</div>
          )}
          <Diagram analysis={analysis} common={common} edgeFocus={edgeFocus}
            canvasRef={canvasRef} nodeEls={nodeEls} bump={bump} />
          {traceStep !== null && analysis.trace[traceStep] && (
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

        <Drilldown node={activeNode} fileHandles={fileHandles}
          alts={activeAlt.alts} altStatus={activeAlt.status}
          onRetryAlts={() => activeNode && ensureAlts(activeNode, true)}
          onClose={() => setActiveNode(null)} />
      </div>
    </div>
  );
}
