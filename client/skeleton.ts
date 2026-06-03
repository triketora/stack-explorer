import type { Analysis, Tier } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { detect } from "@/lib/detect";
import { buildFallbackAnalysis, TIER_META, TIER_ORDER } from "@/lib/enrich/fallback";

/**
 * Build the instant, LLM-free skeleton from manifests + tree (runs in the browser).
 * Detected tech is grouped into tiers and flagged `pending` so the UI renders it greyed.
 * The skeleton always includes the canonical tiers in order (01 Client … 05 Dev & Testing),
 * inserting empty placeholders for any with no detected tech, so e.g. 03 Data always shows.
 */
export function buildSkeleton(req: AnalyzeRequest): Analysis {
  const base = buildFallbackAnalysis(req, detect(req.manifests));
  const byId = new Map(base.tiers.map((t) => [t.id, t]));

  const tiers: Tier[] = TIER_ORDER.map((id) => {
    const existing = byId.get(id);
    if (existing) {
      for (const node of existing.nodes) node.pending = true;
      return existing;
    }
    const m = TIER_META[id];
    return { id, idx: m.idx, name: m.name, desc: m.desc, nodes: [] };  // empty placeholder
  });

  return { ...base, tiers };
}
