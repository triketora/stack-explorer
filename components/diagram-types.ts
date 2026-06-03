import type { Technology } from "@/lib/types";

export type EdgeEmphasis = "none" | "hover" | "pinned";

export interface EdgeControls {
  emphasis: EdgeEmphasis;
  legendHot: boolean;
  onDataFlowHover: (on: boolean) => void;
  onDataFlowClick: () => void;
  onEdgeHover: (on: boolean) => void;
}

export interface DiagramCommon {
  activeId: string | null;
  fileHits: Set<string> | null;   // node ids highlighted from a hovered file
  mapDim: boolean;                 // dim non-matching nodes (codebase-map mode)
  onClick: (n: Technology) => void;
  onHover: (id: string | null) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
}
