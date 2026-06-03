import type { Analysis } from "@/lib/types";
import { REGISTRY } from "@/lib/detect/registry";

export interface DetectionEntry {
  id: string;
  name: string;
  source: string;     // the file that proved it (first evidence path)
  rationale: string;  // baked rationale, if any (used as a blurb fallback)
}

/** One entry per detected technology in the (skeleton) analysis, with its first source file. */
export function detectionLog(analysis: Analysis): DetectionEntry[] {
  const out: DetectionEntry[] = [];
  for (const tier of analysis.tiers) {
    for (const node of tier.nodes) {
      out.push({ id: node.id, name: node.name, source: node.files[0] ?? "", rationale: node.rationale ?? "" });
    }
  }
  return out;
}

/** Short one-sentence explainer for a tech id, if known. */
export function blurbFor(id: string): string | undefined {
  return REGISTRY[id]?.blurb;
}
