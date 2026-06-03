import { z } from "zod";
import type { Analysis } from "@/lib/types";
import { TierSchema, TraceStepSchema } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import type { DetectedTech } from "@/lib/detect";
import { buildFileTree } from "@/lib/filetree";
import { applyGlobs, deriveFiles, type TechGlobs } from "@/lib/globs";
import { buildFallbackAnalysis } from "@/lib/enrich/fallback";

export type CallModel = (system: string, user: string) => Promise<string>;

// LLM returns everything except fileTree/files (server computes those).
const LlmAnalysisSchema = z.object({
  repo: z.string(),
  langs: z.string().optional(),
  tiers: z.array(TierSchema),
  edges: z.array(z.tuple([z.string(), z.string()])),
  trace: z.array(TraceStepSchema),
});

function stripFences(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) return t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  return t;
}

export async function enrich(req: AnalyzeRequest, detected: DetectedTech[], callModel: CallModel): Promise<Analysis> {
  try {
    const { SYSTEM_PROMPT, buildUserContent } = await import("@/lib/enrich/prompt");
    const raw = await callModel(SYSTEM_PROMPT, buildUserContent(req, detected));
    const parsed = LlmAnalysisSchema.parse(JSON.parse(stripFences(raw)));

    const allPaths = req.tree.map((f) => f.path);
    const techGlobs: TechGlobs = {};
    for (const tier of parsed.tiers) {
      for (const node of tier.nodes) {
        techGlobs[node.id] = node.pathGlobs;
        node.files = deriveFiles(allPaths, node.pathGlobs);
        node.tier = tier.id;
      }
    }

    const fileTree = applyGlobs(buildFileTree(req.repo, allPaths), techGlobs);

    return {
      repo: parsed.repo,
      langs: parsed.langs,
      files: req.tree.length,
      tiers: parsed.tiers,
      edges: parsed.edges,
      fileTree,
      trace: parsed.trace,
    };
  } catch {
    return buildFallbackAnalysis(req, detected);
  }
}
