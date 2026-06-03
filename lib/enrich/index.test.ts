import { describe, it, expect } from "vitest";
import { enrich } from "@/lib/enrich";
import { detect } from "@/lib/detect";
import { AnalysisSchema } from "@/lib/types";

const req = {
  repo: "demo",
  manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
  tree: [{ path: "client/src/App.tsx", size: 1 }, { path: "client/src/main.tsx", size: 1 }],
};

const goodModel = async () => JSON.stringify({
  repo: "demo", langs: "TypeScript",
  tiers: [{ id: "client", idx: "01", name: "Client", desc: "ui", nodes: [
    { id: "react", name: "React", cat: "ui library", glyph: "Re", tags: ["spa"], rationale: "renders ui",
      pathGlobs: ["client/src/**"], confidence: "detected",
      alts: [{ name: "Vue", tag: "framework", blurb: "progressive", pros: ["simple"], cons: ["smaller"], when: "small teams" }] },
  ] }],
  edges: [], trace: [{ order: 1, label: "browser renders", nodeId: "react" }],
});

describe("enrich", () => {
  it("expands pathGlobs into fileTree maps and derives files", async () => {
    const analysis = await enrich(req, detect(req.manifests), goodModel);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    const node = analysis.tiers[0].nodes[0];
    expect(node.files).toEqual(["client/src/App.tsx", "client/src/main.tsx"]);
    const client = analysis.fileTree.children!.find((c) => c.name === "client")!;
    expect(client.maps).toContain("react");
  });

  it("falls back to static analysis on malformed model output", async () => {
    const analysis = await enrich(req, detect(req.manifests), async () => "not json");
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.tiers[0].nodes[0].id).toBe("react"); // from fallback
  });
});
