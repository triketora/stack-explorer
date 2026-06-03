import { describe, it, expect } from "vitest";
import { buildFallbackAnalysis } from "@/lib/enrich/fallback";
import { detect } from "@/lib/detect";
import { AnalysisSchema } from "@/lib/types";

describe("buildFallbackAnalysis", () => {
  it("returns a schema-valid analysis grouped into tiers", () => {
    const req = {
      repo: "demo",
      manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
      tree: [{ path: "client/src/App.tsx", size: 10 }, { path: "package.json", size: 20 }],
    };
    const analysis = buildFallbackAnalysis(req, detect(req.manifests));
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    const client = analysis.tiers.find((t) => t.id === "client")!;
    expect(client.nodes.map((n) => n.id)).toContain("react");
    expect(analysis.files).toBe(2);
  });
});
