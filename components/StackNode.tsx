import type { Technology } from "@/lib/types";

interface Props {
  node: Technology;
  active: boolean;
  dim: boolean;
  filehit: boolean;
  onClick: (n: Technology) => void;
  onHover: (id: string | null) => void;
  registerNode: (id: string, el: HTMLElement | null) => void;
}

export function StackNode({ node, active, dim, filehit, onClick, onHover, registerNode }: Props) {
  return (
    <button
      ref={(el) => registerNode(node.id, el)}
      className={"node" + (active ? " active" : "") + (dim ? " dim" : "") + (filehit ? " filehit" : "") + (node.pending ? " pending" : "")}
      onClick={() => onClick(node)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="alt-count mono">{node.alts.length > 0 ? `${node.alts.length} alt` : "compare"}</span>
      <span className="nrow">
        <span className="glyph">{node.glyph}</span>
        <span>
          <span className="nm" style={{ display: "block" }}>{node.name}</span>
          <span className="cat">{node.cat}</span>
        </span>
      </span>
    </button>
  );
}
