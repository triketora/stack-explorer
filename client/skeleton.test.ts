import { describe, it, expect } from "vitest";
import { buildSkeleton } from "@/client/skeleton";
import { AnalysisSchema } from "@/lib/types";

describe("buildSkeleton", () => {
  it("builds a schema-valid skeleton with pending nodes and no LLM", () => {
    const req = {
      repo: "demo",
      manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
      tree: [{ path: "client/src/App.tsx", size: 10 }, { path: "package.json", size: 20 }],
    };
    const skeleton = buildSkeleton(req);
    expect(() => AnalysisSchema.parse(skeleton)).not.toThrow();
    const nodes = skeleton.tiers.flatMap((t) => t.nodes);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.every((n) => n.pending === true)).toBe(true);
    expect(skeleton.edges).toEqual([]);
    expect(skeleton.fileTree.children?.length).toBeGreaterThan(0);
  });
});
