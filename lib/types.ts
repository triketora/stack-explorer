import { z } from "zod";

export const AlternativeSchema = z.object({
  name: z.string(),
  tag: z.string(),
  blurb: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  when: z.string(),
});

export const TechnologySchema = z.object({
  id: z.string(),
  name: z.string(),
  cat: z.string(),
  glyph: z.string(),
  tags: z.array(z.string()),
  rationale: z.string(),
  pathGlobs: z.array(z.string()),
  files: z.array(z.string()).default([]),
  confidence: z.enum(["detected", "inferred"]).optional(),
  alts: z.array(AlternativeSchema),
  tier: z.string().optional(),
  pending: z.boolean().optional(),   // UI-only: skeleton/not-yet-enriched styling
  group: z.string().optional(),      // Stack sub-cluster label, e.g. "async & jobs"
  kind: z.enum([
    "client", "server", "service", "datastore", "queue", "worker", "external",
  ]).optional(),                      // System role; absent ⇒ excluded from System view
});

export type TechKind = NonNullable<z.infer<typeof TechnologySchema>["kind"]>;

export const TierSchema = z.object({
  id: z.string(),
  idx: z.string(),
  name: z.string(),
  desc: z.string(),
  nodes: z.array(TechnologySchema),
});

export type TreeNode = {
  name: string;
  type: "dir" | "file";
  maps?: string[];
  children?: TreeNode[];
};

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(["dir", "file"]),
    maps: z.array(z.string()).optional(),
    children: z.array(TreeNodeSchema).optional(),
  })
);

export const TraceStepSchema = z.object({
  order: z.number(),
  label: z.string(),
  nodeId: z.string(),
});

export const AnalysisSchema = z.object({
  repo: z.string(),
  branch: z.string().optional(),
  files: z.number(),
  langs: z.string().optional(),
  tiers: z.array(TierSchema),
  edges: z.array(z.tuple([z.string(), z.string()])),
  fileTree: TreeNodeSchema,
  trace: z.array(TraceStepSchema),
});

export type Alternative = z.infer<typeof AlternativeSchema>;
export type Technology = z.infer<typeof TechnologySchema>;
export type Tier = z.infer<typeof TierSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
