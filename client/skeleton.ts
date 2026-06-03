import type { Analysis } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { detect } from "@/lib/detect";
import { buildFallbackAnalysis } from "@/lib/enrich/fallback";

/**
 * Build the instant, LLM-free skeleton from manifests + tree (runs in the browser).
 * Detected tech is grouped into tiers and flagged `pending` so the UI renders it greyed
 * until the overview stage enriches it.
 */
export function buildSkeleton(req: AnalyzeRequest): Analysis {
  const analysis = buildFallbackAnalysis(req, detect(req.manifests));
  for (const tier of analysis.tiers) {
    for (const node of tier.nodes) node.pending = true;
  }
  return analysis;
}
