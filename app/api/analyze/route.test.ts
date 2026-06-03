import { describe, it, expect } from "vitest";
import { analyzeRequest } from "@/app/api/analyze/route";
import { AnalysisSchema } from "@/lib/types";

describe("analyzeRequest", () => {
  it("produces a valid analysis using an injected model", async () => {
    const body = {
      repo: "demo",
      manifests: [{ path: "requirements.txt", content: "Flask==3" }],
      tree: [{ path: "server/app.py", size: 10 }],
    };
    const model = async () => JSON.stringify({
      repo: "demo", tiers: [{ id: "api", idx: "01", name: "API", desc: "logic", nodes: [
        { id: "flask", name: "Flask", cat: "web framework", glyph: "Fl", tags: ["Python"], rationale: "serves api",
          pathGlobs: ["server/**"], confidence: "detected",
          alts: [{ name: "FastAPI", tag: "framework", blurb: "async", pros: ["fast"], cons: ["new"], when: "concurrency" }] },
      ] }], edges: [], trace: [],
    });
    const analysis = await analyzeRequest(body, model);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.tiers[0].nodes[0].files).toEqual(["server/app.py"]);
  });
});
