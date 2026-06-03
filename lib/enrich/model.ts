// Shared LLM-call abstraction so the model is injectable in tests.
export type CallModel = (system: string, user: string) => Promise<string>;

/** Strip accidental ```json fences from a model's text response. */
export function stripFences(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) return t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  return t;
}
