import type { Analysis, Tier, Technology } from "@/lib/types";
import type { DetectedTech } from "@/lib/detect";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { buildFileTree } from "@/lib/filetree";

const TIER_META: Record<string, { idx: string; name: string; desc: string }> = {
  client:  { idx: "01", name: "Client", desc: "browser-side application" },
  api:     { idx: "02", name: "Application / API", desc: "request handling & business logic" },
  data:    { idx: "03", name: "Data", desc: "persistence, cache & storage" },
  infra:   { idx: "04", name: "Delivery & Infra", desc: "build, ship & run" },
  devtest: { idx: "05", name: "Dev & Testing", desc: "build, lint, test & CI tooling" },
};
const ORDER = ["client", "api", "data", "infra", "devtest"];

export function buildFallbackAnalysis(req: AnalyzeRequest, detected: DetectedTech[]): Analysis {
  const tiersById = new Map<string, Tier>();

  for (const d of detected) {
    const tierId = d.meta.tier;
    if (!tiersById.has(tierId)) {
      const m = TIER_META[tierId];
      tiersById.set(tierId, { id: tierId, idx: m.idx, name: m.name, desc: m.desc, nodes: [] });
    }
    const node: Technology = {
      id: d.id,
      name: d.meta.name,
      cat: d.meta.cat,
      glyph: d.meta.glyph,
      tags: d.meta.tags,
      rationale: `Detected from ${d.sources.join(", ")}.`,
      pathGlobs: [],
      files: d.sources,
      confidence: "detected",
      alts: [],
      tier: tierId,
    };
    tiersById.get(tierId)!.nodes.push(node);
  }

  const tiers = ORDER.filter((id) => tiersById.has(id)).map((id) => tiersById.get(id)!);

  return {
    repo: req.repo,
    files: req.tree.length,
    tiers,
    edges: [],
    fileTree: buildFileTree(req.repo, req.tree.map((f) => f.path)),
    trace: [],
  };
}
