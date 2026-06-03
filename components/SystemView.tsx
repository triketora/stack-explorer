"use client";

import { useMemo } from "react";
import type { Analysis } from "@/lib/types";
import type { DiagramCommon, EdgeControls } from "@/components/diagram-types";
import { DiagramLegend } from "@/components/DiagramLegend";
import { layoutSystem, type CloudRegion } from "@/lib/system/layout";

interface Props {
  analysis: Analysis;
  common: DiagramCommon;
  controls: EdgeControls;
  edgeFocus: string | null;
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

export function SystemView({ analysis, common, controls, edgeFocus }: Props) {
  const layout = useMemo(() => layoutSystem(analysis), [analysis]);
  const emphasizeAll = controls.emphasis !== "none";

  if (layout.nodes.length === 0) {
    return (
      <div className="canvas">
        <DiagramLegend techCount={0} linkCount={0} layoutLabel="system"
          emphasis={controls.emphasis} legendHot={controls.legendHot} hasSelection={false}
          onDataFlowHover={controls.onDataFlowHover} onDataFlowClick={controls.onDataFlowClick} />
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
      <DiagramLegend
        techCount={layout.nodes.length}
        linkCount={layout.edges.length}
        layoutLabel="system"
        emphasis={controls.emphasis}
        legendHot={controls.legendHot}
        hasSelection={!!common.activeId}
        onDataFlowHover={controls.onDataFlowHover}
        onDataFlowClick={controls.onDataFlowClick}
      />
      <div className="sys-scroll">
        <svg className="sys-svg" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          <defs>
            <marker id="sys-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" />
            </marker>
          </defs>

          {layout.clouds.map(cloudShapes)}

          <g className="sys-edges">
            {layout.edges.map((e) => {
              const d = e.points.length
                ? "M " + e.points.map((p) => `${p.x} ${p.y}`).join(" L ")
                : "";
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
    </div>
  );
}
