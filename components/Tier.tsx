"use client";

import { useState } from "react";
import type { Tier as TierData, Technology } from "@/lib/types";
import type { DiagramCommon } from "@/components/diagram-types";
import { StackNode } from "@/components/StackNode";
import { splitCluster } from "@/lib/stack/cluster";

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

function NodeRow({ nodes, common }: { nodes: Technology[]; common: DiagramCommon }) {
  const [expanded, setExpanded] = useState(false);
  const { shown, hiddenCount } = splitCluster(nodes, undefined, expanded);
  return (
    <div className="node-row">
      {shown.map((n) => renderNode(n, common))}
      {hiddenCount > 0 && (
        <button type="button" className="cluster-more mono" onClick={() => setExpanded(true)}>
          +{hiddenCount} more
        </button>
      )}
    </div>
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
  const muted = tier.id === "devtest";

  return (
    <section className={"tier" + (muted ? " muted" : "")}>
      <div className="tier-label">
        <span className="idx mono">{tier.idx}</span>
        <span className="name">{tier.name}</span>
        <span className="desc">{tier.desc}</span>
        <span className="rule" />
      </div>

      {tier.nodes.length === 0 ? (
        <div className="tier-empty mono">—</div>
      ) : hasClusters ? (
        <div className="clusters">
          {order.map((key) => (
            <div className="cluster" key={key || "_"}>
              {key && <div className="cluster-label mono">{key}</div>}
              <NodeRow nodes={groups.get(key)!} common={common} />
            </div>
          ))}
        </div>
      ) : (
        <NodeRow nodes={tier.nodes} common={common} />
      )}
    </section>
  );
}
