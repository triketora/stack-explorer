import type { Tier as TierData, Technology } from "@/lib/types";
import type { DiagramCommon } from "@/components/diagram-types";
import { StackNode } from "@/components/StackNode";

function renderNode(n: Technology, common: DiagramCommon) {
  return (
    <StackNode
      key={n.id}
      node={n}
      onClick={common.onClick}
      onHover={common.onHover}
      registerNode={common.registerNode}
      active={common.activeId === n.id}
      dim={common.mapDim ? !common.fileHits?.has(n.id) : false}
      filehit={!!common.fileHits?.has(n.id)}
    />
  );
}

export function Tier({ tier, common }: { tier: TierData; common: DiagramCommon }) {
  // Group nodes by their sub-cluster label, preserving first-seen order.
  const order: string[] = [];
  const groups = new Map<string, Technology[]>();
  for (const n of tier.nodes) {
    const key = n.group ?? "";
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(n);
  }
  const hasClusters = order.some((k) => k !== "") && order.length > 1;

  return (
    <section className="tier">
      <div className="tier-label">
        <span className="idx mono">{tier.idx}</span>
        <span className="name">{tier.name}</span>
        <span className="desc">{tier.desc}</span>
        <span className="rule" />
      </div>

      {hasClusters ? (
        <div className="clusters">
          {order.map((key) => (
            <div className="cluster" key={key || "_"}>
              {key && <div className="cluster-label mono">{key}</div>}
              <div className="node-row">{groups.get(key)!.map((n) => renderNode(n, common))}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="node-row">{tier.nodes.map((n) => renderNode(n, common))}</div>
      )}
    </section>
  );
}
