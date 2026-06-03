"use client";

import { useState } from "react";
import type { Analysis, TreeNode as TreeNodeData } from "@/lib/types";
import { Icon } from "@/components/Icon";

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  path: string;
  focusId: string | null;
  onHoverFile: (maps: string[] | null) => void;
  onClickFile: (node: TreeNodeData) => void;
  defaultOpen?: boolean;
}

function subtreeHas(n: TreeNodeData, focusId: string): boolean {
  if ((n.maps ?? []).includes(focusId)) return true;
  return (n.children ?? []).some((c) => subtreeHas(c, focusId));
}

function TreeNode({ node, depth, path, focusId, onHoverFile, onClickFile, defaultOpen }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2 || !!defaultOpen);
  const isDir = node.type === "dir";
  const maps = node.maps ?? [];
  const selfHit = !!focusId && maps.includes(focusId);
  const faded = !!focusId && !selfHit && !(isDir && subtreeHas(node, focusId));

  return (
    <div className="tnode">
      <div
        className={"trow " + (isDir ? "dir " : "") + (selfHit ? "hit " : "") + (faded ? "faded" : "")}
        style={{ paddingLeft: 8 }}
        onClick={() => (isDir ? setOpen(!open) : onClickFile(node))}
        onMouseEnter={() => onHoverFile(maps)}
        onMouseLeave={() => onHoverFile(null)}
        title={path}
      >
        <span className="tw">
          {isDir
            ? <Icon name="chevron" style={{ width: 11, height: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
            : <Icon name="file" style={{ width: 12, height: 12 }} />}
        </span>
        <span className="tname">{node.name}{isDir ? "/" : ""}</span>
        {maps.length > 0 && <span className="maps">{maps.length}</span>}
      </div>
      {isDir && open && (
        <div className="tchildren">
          {(node.children ?? []).map((c, i) => (
            <TreeNode key={c.name + i} node={c} depth={depth + 1} path={path + "/" + c.name}
              focusId={focusId} onHoverFile={onHoverFile} onClickFile={onClickFile} />
          ))}
        </div>
      )}
    </div>
  );
}

interface PaneProps {
  analysis: Analysis;
  focusName: string | null;          // tech name for the hint line
  focusId: string | null;            // tech id used for highlighting
  onHoverFile: (maps: string[] | null) => void;
  onClickFile: (node: TreeNodeData) => void;
}

export function FileTreePane({ analysis, focusName, focusId, onHoverFile, onClickFile }: PaneProps) {
  return (
    <div className="tree-pane">
      <div className="tree-head">
        <Icon name="code" style={{ width: 16, height: 16 }} />
        <div><div className="eyebrow">codebase</div><h3>{analysis.repo}</h3></div>
      </div>
      <div className="tree-hint">
        {focusName ? <>highlighting files for <b>{focusName}</b></> : "hover a technology or a file to see what maps where"}
      </div>
      <div className="tree-body">
        {(analysis.fileTree.children ?? []).map((c, i) => (
          <TreeNode key={c.name + i} node={c} depth={1} path={c.name}
            focusId={focusId} onHoverFile={onHoverFile} onClickFile={onClickFile} defaultOpen />
        ))}
      </div>
    </div>
  );
}
