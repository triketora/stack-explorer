import { z } from "zod";
import type { Analysis } from "@/lib/types";
import { TraceStepSchema } from "@/lib/types";
import type { OverviewRequest } from "@/lib/analyze-contract";
import type { DetectedTech } from "@/lib/detect";
import { buildFileTree } from "@/lib/filetree";
import { applyGlobs, deriveFiles, type TechGlobs } from "@/lib/globs";
import { type CallModel, stripFences } from "@/lib/enrich/model";
import { summarizeTree } from "@/lib/enrich/tree-summary";
import { detect } from "@/lib/detect";

export const OVERVIEW_SYSTEM_PROMPT = `You are a senior software architect. Given a codebase's manifests and file tree, produce a JSON description of its technology stack for a visualization tool.

Return ONLY a JSON object with this exact shape:
{
  "repo": string,
  "langs": string,                      // e.g. "Python · TypeScript · SQL"
  "tiers": [                            // ordered: client, api, data, infra (omit empty tiers)
    { "id": "client"|"api"|"data"|"infra", "idx": "01".."04", "name": string, "desc": string,
      "nodes": [
        { "id": string, "name": string, "cat": string, "glyph": string (<=2 chars),
          "tags": string[], "rationale": string (why this choice; 1-3 sentences),
          "pathGlobs": string[],        // globs locating this tech in the tree, e.g. ["server/api/**","server/app.py"]
          "confidence": "detected"|"inferred",
          "group": string,              // sub-cluster label within the tier, e.g. "web / request", "async & jobs", "data access", "persistence", "cache / broker", "object store", "build / deploy", "observability"
          "kind": "client"|"server"|"service"|"datastore"|"queue"|"worker"|"external"|"buildtool"  // runtime role; use "buildtool" for build/dev-only tools (bundlers, linters, CI, styling, routing libs)
        }
      ]
    }
  ],
  "edges": [ [fromNodeId, toNodeId] ],  // data-flow between nodes
  "trace": [ { "order": number, "label": string, "nodeId": string } ]  // ordered path of a typical request
}

Rules:
- Use the provided detected technologies as ground truth; add inferred ones (mark confidence "inferred").
- pathGlobs MUST reference real paths/dirs from the provided tree.
- Do NOT include "alts"/alternatives, a "fileTree", or per-node "files" — those are handled separately.
- Output raw JSON only — no markdown fences, no commentary.`;

export function buildOverviewUserContent(req: OverviewRequest, detected: DetectedTech[]): string {
  const detectedBlock = detected.map((d) => `- ${d.id} (${d.meta.name}, tier=${d.meta.tier}) from ${d.sources.join(", ")}`).join("\n");
  const manifestBlock = req.manifests.map((m) => `### ${m.path}\n${m.content.slice(0, 4000)}`).join("\n\n");
  const treePaths = summarizeTree(req.tree.map((f) => f.path));

  return [
    `Repository: ${req.repo}`,
    `\n## Detected technologies (ground truth)\n${detectedBlock || "(none)"}`,
    `\n## Manifest files\n${manifestBlock || "(none)"}`,
    `\n## File tree (${req.tree.length} paths; showing ${treePaths.length})\n${treePaths.join("\n")}`,
  ].join("\n");
}

// LLM overview output: like the full Analysis but without alts/files/fileTree.
const OverviewNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  cat: z.string(),
  glyph: z.string(),
  tags: z.array(z.string()),
  rationale: z.string(),
  pathGlobs: z.array(z.string()),
  confidence: z.enum(["detected", "inferred"]).optional(),
  group: z.string().optional(),
  // accept "buildtool" from the model but treat it as "no runtime kind" downstream
  kind: z.enum([
    "client", "server", "service", "datastore", "queue", "worker", "external", "buildtool",
  ]).optional(),
});
const OverviewTierSchema = z.object({
  id: z.string(),
  idx: z.string(),
  name: z.string(),
  desc: z.string(),
  nodes: z.array(OverviewNodeSchema),
});
const LlmOverviewSchema = z.object({
  repo: z.string(),
  langs: z.string().optional(),
  tiers: z.array(OverviewTierSchema),
  edges: z.array(z.tuple([z.string(), z.string()])),
  trace: z.array(TraceStepSchema),
});

/**
 * Run the overview LLM call and assemble a (schema-valid) Analysis with empty alts.
 * Throws on model/parse failure so the caller can keep the client-side skeleton.
 */
export async function enrichOverview(
  req: OverviewRequest,
  detected: DetectedTech[],
  callModel: CallModel,
): Promise<Analysis> {
  const raw = await callModel(OVERVIEW_SYSTEM_PROMPT, buildOverviewUserContent(req, detected));
  const parsed = LlmOverviewSchema.parse(JSON.parse(stripFences(raw)));

  const allPaths = req.tree.map((f) => f.path);
  const techGlobs: TechGlobs = {};
  const tiers = parsed.tiers.map((tier) => ({
    ...tier,
    nodes: tier.nodes.map((n) => {
      techGlobs[n.id] = n.pathGlobs;
      // "buildtool" is not a runtime kind — drop it so the System view excludes the node
      const kind = n.kind === "buildtool" ? undefined : n.kind;
      return {
        ...n,
        kind,
        files: deriveFiles(allPaths, n.pathGlobs),
        alts: [],
        tier: tier.id,
        pending: false,
      };
    }),
  }));

  const fileTree = applyGlobs(buildFileTree(req.repo, allPaths), techGlobs);

  return {
    repo: parsed.repo,
    langs: parsed.langs,
    files: req.tree.length,
    tiers,
    edges: parsed.edges,
    fileTree,
    trace: parsed.trace,
  };
}

/** Convenience wrapper: static detection + overview enrichment from a raw request. */
export function runOverview(req: OverviewRequest, callModel: CallModel): Promise<Analysis> {
  return enrichOverview(req, detect(req.manifests), callModel);
}
