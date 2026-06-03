import type { EdgeEmphasis } from "@/components/diagram-types";

interface Props {
  techCount: number;
  linkCount: number;
  layoutLabel: string;        // "layered" | "system"
  title: string;              // "Tech Stack" | "Systems Architecture"
  emphasis: EdgeEmphasis;
  legendHot: boolean;         // reciprocal highlight when an edge is hovered
  hasSelection: boolean;
  onDataFlowHover: (on: boolean) => void;
  onDataFlowClick: () => void;
}

export function DiagramLegend({
  techCount, linkCount, layoutLabel, title, emphasis, legendHot, hasSelection,
  onDataFlowHover, onDataFlowClick,
}: Props) {
  const active = emphasis !== "none" || legendHot;
  return (
    <>
      <div className="diagram-head">
        <h1>{title}</h1>
        <span className="sub">{techCount} technologies · {linkCount} links</span>
      </div>
      <div className="diagram-legend">
        <button
          type="button"
          className={"lg lg-btn" + (active ? " on" : "") + (emphasis === "pinned" ? " pinned" : "")}
          onMouseEnter={() => onDataFlowHover(true)}
          onMouseLeave={() => onDataFlowHover(false)}
          onClick={onDataFlowClick}
          title="Hover to highlight all data-flow lines; click to pin"
        >
          <span className="swatch" /> data flow{emphasis === "pinned" ? " (pinned)" : ""}
        </button>
        {hasSelection && (
          <span className="lg"><span className="swatch accent" /> selected connections</span>
        )}
        <span className="lg"><span className="swatch box" /> technology · click to compare</span>
        <span className="lg mono">layout: {layoutLabel}</span>
      </div>
    </>
  );
}
