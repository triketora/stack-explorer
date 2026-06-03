"use client";

import { type RefObject } from "react";
import type { Analysis } from "@/lib/types";
import type { DiagramCommon, EdgeControls } from "@/components/diagram-types";
import { Tier } from "@/components/Tier";
import { EdgeLayer } from "@/components/EdgeLayer";
import { DiagramLegend } from "@/components/DiagramLegend";

interface Props {
  analysis: Analysis;
  common: DiagramCommon;
  controls: EdgeControls;
  edgeFocus: string | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  nodeEls: RefObject<Map<string, HTMLElement>>;
  bump: number;
}

export function StackView({ analysis, common, controls, edgeFocus, canvasRef, nodeEls, bump }: Props) {
  const techCount = analysis.tiers.flatMap((t) => t.nodes).length;
  return (
    <div className="canvas" ref={canvasRef}>
      <DiagramLegend
        techCount={techCount}
        linkCount={analysis.edges.length}
        layoutLabel="layered"
        title="Tech Stack"
        emphasis={controls.emphasis}
        legendHot={controls.legendHot}
        hasSelection={!!common.activeId}
        onDataFlowHover={controls.onDataFlowHover}
        onDataFlowClick={controls.onDataFlowClick}
      />

      <EdgeLayer
        canvasRef={canvasRef}
        nodeEls={nodeEls}
        edges={analysis.edges}
        activeId={edgeFocus}
        emphasis={controls.emphasis}
        onEdgeHover={controls.onEdgeHover}
        bump={bump}
      />

      <div className="tiers">
        {analysis.tiers.map((t) => <Tier key={t.id} tier={t} common={common} />)}
      </div>
    </div>
  );
}
