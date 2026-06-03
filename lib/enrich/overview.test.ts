import { describe, it, expect } from "vitest";
import { enrichOverview, runOverview, OVERVIEW_SYSTEM_PROMPT } from "@/lib/enrich/overview";
import { detect } from "@/lib/detect";
import { AnalysisSchema } from "@/lib/types";

const req = {
  repo: "demo",
  manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
  tree: [{ path: "client/src/App.tsx", size: 1 }, { path: "client/src/main.tsx", size: 1 }],
};

const overviewModel = async () => JSON.stringify({
  repo: "demo", langs: "TypeScript",
  tiers: [{ id: "client", idx: "01", name: "Client", desc: "ui", nodes: [
    { id: "react", name: "React", cat: "ui library", glyph: "Re", tags: ["spa"], rationale: "renders ui",
      pathGlobs: ["client/src/**"], confidence: "detected" },
  ] }],
  edges: [], trace: [{ order: 1, label: "browser renders", nodeId: "react" }],
});

describe("OVERVIEW_SYSTEM_PROMPT", () => {
  it("requests pathGlobs and explicitly excludes alternatives", () => {
    expect(OVERVIEW_SYSTEM_PROMPT).toMatch(/pathGlobs/);
    expect(OVERVIEW_SYSTEM_PROMPT).toMatch(/do not.*(alts|alternatives)/i);
  });
});

describe("enrichOverview", () => {
  it("expands globs, defaults alts to [], and is schema-valid", async () => {
    const analysis = await enrichOverview(req, detect(req.manifests), overviewModel);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    const node = analysis.tiers[0].nodes[0];
    expect(node.alts).toEqual([]);
    expect(node.files).toEqual(["client/src/App.tsx", "client/src/main.tsx"]);
    const client = analysis.fileTree.children!.find((c) => c.name === "client")!;
    expect(client.maps).toContain("react");
  });

  it("throws on malformed model output (so the route can keep the skeleton)", async () => {
    await expect(enrichOverview(req, detect(req.manifests), async () => "not json")).rejects.toThrow();
  });
});

describe("runOverview", () => {
  it("wires static detection + overview enrichment from a raw request", async () => {
    const analysis = await runOverview(req, overviewModel);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.tiers[0].nodes[0].id).toBe("react");
  });
});
