"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { Analysis } from "@/lib/types";
import type { DiagramCommon, EdgeControls } from "@/components/diagram-types";
import { DiagramLegend } from "@/components/DiagramLegend";
import { layoutSystem, type CloudRegion } from "@/lib/system/layout";
import { zoomAt, IDENTITY, type ViewTransform } from "@/lib/system/zoom";

interface Props {
  analysis: Analysis;
  common: DiagramCommon;
  controls: EdgeControls;
  edgeFocus: string | null;
  title: string;
}

function cloudShapes(c: CloudRegion, i: number) {
  const { x, y, width: w, height: h } = c;
  return (
    <g key={`cloud-${i}`} className="sys-cloud">
      <rect x={x} y={y + h * 0.32} width={w} height={h * 0.68} rx={26} />
      <ellipse cx={x + w * 0.28} cy={y + h * 0.42} rx={w * 0.22} ry={h * 0.34} />
      <ellipse cx={x + w * 0.55} cy={y + h * 0.3} rx={w * 0.26} ry={h * 0.36} />
      <ellipse cx={x + w * 0.78} cy={y + h * 0.44} rx={w * 0.2} ry={h * 0.32} />
      <text className="sys-cloud-label" x={x + 12} y={y + h * 0.32 + 4}>EXTERNAL</text>
    </g>
  );
}

export function SystemView({ analysis, common, controls, edgeFocus, title }: Props) {
  const layout = useMemo(() => layoutSystem(analysis), [analysis]);
  const emphasizeAll = controls.emphasis !== "none";

  const [t, setT] = useState<ViewTransform>(IDENTITY);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const moved = useRef(false);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setT((cur) => zoomAt(cur, factor, cx, cy));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty };
    moved.current = false;
  }, [t.tx, t.ty]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    setT((cur) => ({ ...cur, tx: drag.current!.tx + dx, ty: drag.current!.ty + dy }));
  }, []);
  const endDrag = useCallback(() => { drag.current = null; }, []);

  // suppress node click that follows a pan-drag
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (moved.current) { e.stopPropagation(); moved.current = false; }
  }, []);

  function zoomButton(factor: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 0;
    const cy = rect ? rect.height / 2 : 0;
    setT((cur) => zoomAt(cur, factor, cx, cy));
  }

  const legend = (
    <DiagramLegend
      techCount={layout.nodes.length}
      linkCount={layout.edges.length}
      layoutLabel="system"
      title={title}
      emphasis={controls.emphasis}
      legendHot={controls.legendHot}
      hasSelection={!!common.activeId}
      onDataFlowHover={controls.onDataFlowHover}
      onDataFlowClick={controls.onDataFlowClick}
    />
  );

  if (layout.nodes.length === 0) {
    return (
      <div className="canvas">
        {legend}
        <div className="sys-empty subtitle">Not enough runtime information to draw a system diagram yet.</div>
      </div>
    );
  }

  const W = Math.max(layout.width, 400);
  const H = Math.max(layout.height, 300);

  function edgeClass(from: string, to: string): string {
    if (edgeFocus) return from === edgeFocus || to === edgeFocus ? "hot" : "dim";
    return emphasizeAll ? "all" : "";
  }

  return (
    <div className="canvas">
      {legend}
      <div
        className="sys-viewport"
        ref={viewportRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
      >
        <div className="sys-zoom" style={{ transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})`, transformOrigin: "0 0" }}>
          <svg className="sys-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
            <defs>
              <marker id="sys-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" />
              </marker>
            </defs>

            {layout.clouds.map(cloudShapes)}

            <g className="sys-edges">
              {layout.edges.map((e) => {
                const d = e.points.length ? "M " + e.points.map((p) => `${p.x} ${p.y}`).join(" L ") : "";
                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    d={d}
                    className={"sys-edge " + edgeClass(e.from, e.to) + (e.async ? " async" : "")}
                    markerEnd="url(#sys-arrow)"
                    onMouseEnter={() => controls.onEdgeHover(true)}
                    onMouseLeave={() => controls.onEdgeHover(false)}
                  />
                );
              })}
            </g>

            <g className="sys-nodes">
              {layout.nodes.map((n) => {
                const active = common.activeId === n.id;
                return (
                  <g
                    key={n.id}
                    className={`sys-node kind-${n.tech.kind ?? "service"}` + (active ? " active" : "")}
                    onClick={() => common.onClick(n.tech)}
                    onMouseEnter={() => common.onHover(n.id)}
                    onMouseLeave={() => common.onHover(null)}
                  >
                    <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={8} />
                    <text className="sys-node-name" x={n.x + n.width / 2} y={n.y + n.height / 2 - 3}>{n.tech.name}</text>
                    <text className="sys-node-cat" x={n.x + n.width / 2} y={n.y + n.height / 2 + 13}>{n.tech.kind}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <div className="sys-zoom-controls">
          <button type="button" onClick={() => zoomButton(1.2)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomButton(1 / 1.2)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setT(IDENTITY)} aria-label="Reset zoom">⤢</button>
        </div>
      </div>
    </div>
  );
}
