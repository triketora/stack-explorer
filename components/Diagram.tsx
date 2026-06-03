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
