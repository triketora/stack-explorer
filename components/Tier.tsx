import type { Tier as TierData } from "@/lib/types";
import type { DiagramCommon } from "@/components/diagram-types";
import { StackNode } from "@/components/StackNode";

export function Tier({ tier, common }: { tier: TierData; common: DiagramCommon }) {
  return (
    <section className="tier">
      <div className="tier-label">
        <span className="idx mono">{tier.idx}</span>
        <span className="name">{tier.name}</span>
        <span className="desc">{tier.desc}</span>
        <span className="rule" />
      </div>
      <div className="node-row">
        {tier.nodes.map((n) => (
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
        ))}
      </div>
    </section>
  );
}
