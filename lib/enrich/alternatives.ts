import { z } from "zod";
import { AlternativeSchema, type Alternative } from "@/lib/types";
import type { AlternativesRequest } from "@/lib/analyze-contract";
import { type CallModel, stripFences } from "@/lib/enrich/model";

export const DETAILS_SYSTEM_PROMPT = `You are a senior software architect. Given ONE technology used in a codebase and brief context about the surrounding stack, explain why it fits here and list realistic alternatives.

Return ONLY a JSON object (no markdown fences):
{
  "rationale": string,   // 1-3 sentences: why this technology is a reasonable choice in THIS stack
  "alts": [              // 2-3 genuinely comparable alternatives (not the technology itself)
    { "name": string, "tag": string (short category, e.g. "framework"), "blurb": string (one line),
      "pros": string[], "cons": string[], "when": string (when to choose this instead) }
  ]
}

Rules:
- Keep pros/cons concrete and short. "when" should be a crisp decision cue.
- Output raw JSON only.`;

function buildDetailsUserContent(req: AlternativesRequest): string {
  return [
    `Technology: ${req.tech.name} (${req.tech.cat})`,
    `Role in this codebase: ${req.tech.role}`,
    `Surrounding stack: ${req.contextSummary}`,
    `\nExplain why ${req.tech.name} fits here and give 2-3 alternatives.`,
  ].join("\n");
}

const DetailsSchema = z.object({
  rationale: z.string(),
  alts: z.array(AlternativeSchema),
});

export interface TechDetails {
  rationale: string;
  alts: Alternative[];
}

/**
 * Generate the rationale + alternatives for a single technology. Tolerates an LLM returning a
 * bare array of alternatives (wraps it with an empty rationale). Throws on unparseable output.
 */
export async function generateDetails(
  tech: AlternativesRequest["tech"],
  contextSummary: string,
  callModel: CallModel,
): Promise<TechDetails> {
  const raw = await callModel(DETAILS_SYSTEM_PROMPT, buildDetailsUserContent({ tech, contextSummary }));
  const data = JSON.parse(stripFences(raw));
  if (Array.isArray(data)) {
    return { rationale: "", alts: z.array(AlternativeSchema).parse(data) };
  }
  return DetailsSchema.parse(data);
}
