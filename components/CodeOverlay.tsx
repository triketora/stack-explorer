"use client";

import type { Analysis, TreeNode as TreeNodeData } from "@/lib/types";
import { FileTreePane } from "@/components/FileTreePane";

interface Props {
  open: boolean;
  analysis: Analysis;
  focusName: string | null;
  focusId: string | null;
  onHoverFile: (maps: string[] | null) => void;
  onClickFile: (node: TreeNodeData) => void;
}

/** File tree as a slide-over panel so opening it never resizes the diagram (no jump). */
export function CodeOverlay({ open, analysis, focusName, focusId, onHoverFile, onClickFile }: Props) {
  return (
    <aside className={"code-overlay" + (open ? " show" : "")} aria-hidden={!open}>
      <FileTreePane
        analysis={analysis}
        focusName={focusName}
        focusId={focusId}
        onHoverFile={onHoverFile}
        onClickFile={onClickFile}
      />
    </aside>
  );
}
