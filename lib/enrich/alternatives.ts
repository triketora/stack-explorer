import { z } from "zod";
import { AlternativeSchema, type Alternative } from "@/lib/types";
import type { AlternativesRequest } from "@/lib/analyze-contract";
import { type CallModel, stripFences } from "@/lib/enrich/model";

export const ALT_SYSTEM_PROMPT = `You are a senior software architect. Given ONE technology used in a codebase and brief context about the surrounding stack, list 2-3 realistic alternatives a team might have chosen instead.

Return ONLY a JSON array (no object wrapper, no markdown fences):
[
  { "name": string, "tag": string (short category, e.g. "framework"), "blurb": string (one line),
    "pros": string[], "cons": string[], "when": string (when to choose this instead) }
]

Rules:
- 2-3 genuinely comparable alternatives, not the technology itself.
- Keep pros/cons concrete and short. "when" should be a crisp decision cue.
- Output raw JSON array only.`;

function buildAltUserContent(req: AlternativesRequest): string {
  return [
    `Technology: ${req.tech.name} (${req.tech.cat})`,
    `Role in this codebase: ${req.tech.role}`,
    `Surrounding stack: ${req.contextSummary}`,
    `\nList 2-3 alternatives to ${req.tech.name}.`,
  ].join("\n");
}

/**
 * Generate alternatives for a single technology. Tolerates an LLM returning a
 * single object instead of an array (normalizes to an array). Throws on bad output.
 */
export async function generateAlternatives(
  tech: AlternativesRequest["tech"],
  contextSummary: string,
  callModel: CallModel,
): Promise<Alternative[]> {
  const raw = await callModel(ALT_SYSTEM_PROMPT, buildAltUserContent({ tech, contextSummary }));
  const data = JSON.parse(stripFences(raw));
  const arr = Array.isArray(data) ? data : [data];
  return z.array(AlternativeSchema).parse(arr);
}
