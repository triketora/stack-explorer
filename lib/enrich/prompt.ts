import type { AnalyzeRequest } from "@/lib/analyze-contract";
import type { DetectedTech } from "@/lib/detect";

export const SYSTEM_PROMPT = `You are a senior software architect. Given a codebase's manifests and file tree, produce a JSON description of its technology stack for a visualization tool.

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
          "alts": [ { "name": string, "tag": string, "blurb": string, "pros": string[], "cons": string[], "when": string } ]  // 2-3 alternatives
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
- Do NOT include a "fileTree" or per-node "files" field; the server computes those from pathGlobs.
- Output raw JSON only — no markdown fences, no commentary.`;

export function buildUserContent(req: AnalyzeRequest, detected: DetectedTech[]): string {
  const detectedBlock = detected.map((d) => `- ${d.id} (${d.meta.name}, tier=${d.meta.tier}) from ${d.sources.join(", ")}`).join("\n");
  const manifestBlock = req.manifests
    .map((m) => `### ${m.path}\n${m.content.slice(0, 4000)}`)
    .join("\n\n");
  const treeBlock = req.tree.map((f) => f.path).join("\n");

  return [
    `Repository: ${req.repo}`,
    `\n## Detected technologies (ground truth)\n${detectedBlock || "(none)"}`,
    `\n## Manifest files\n${manifestBlock || "(none)"}`,
    `\n## File tree (${req.tree.length} paths)\n${treeBlock}`,
  ].join("\n");
}
