import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  repo: z.string(),
  manifests: z.array(z.object({ path: z.string(), content: z.string() })),
  tree: z.array(z.object({ path: z.string(), size: z.number() })),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
