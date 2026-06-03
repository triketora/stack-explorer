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
