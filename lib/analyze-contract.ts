import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  repo: z.string(),
  manifests: z.array(z.object({ path: z.string(), content: z.string() })),
  tree: z.array(z.object({ path: z.string(), size: z.number() })),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// The overview stage takes the same payload as the original analyze request.
export const OverviewRequestSchema = AnalyzeRequestSchema;
export type OverviewRequest = AnalyzeRequest;

// The alternatives stage asks for one technology's alternatives, given brief context.
export const AlternativesRequestSchema = z.object({
  tech: z.object({
    id: z.string(),
    name: z.string(),
    cat: z.string(),
    role: z.string(),   // the tech's rationale/role, for context
  }),
  contextSummary: z.string(),   // short description of the surrounding stack
});

export type AlternativesRequest = z.infer<typeof AlternativesRequestSchema>;
