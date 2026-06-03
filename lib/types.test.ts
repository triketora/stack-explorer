import { describe, it, expect } from "vitest";
import { AnalysisSchema } from "@/lib/types";

const minimalValid = {
  repo: "demo",
  files: 3,
  tiers: [
    {
      id: "api", idx: "01", name: "API", desc: "logic",
      nodes: [{
        id: "flask", name: "Flask", cat: "web framework", glyph: "Fl",
        tags: ["Python"], rationale: "serves the API",
        pathGlobs: ["server/app.py"], files: ["server/app.py"],
        alts: [{ name: "FastAPI", tag: "framework", blurb: "async", pros: ["fast"], cons: ["new"], when: "high concurrency" }],
      }],
    },
  ],
  edges: [["flask", "flask"]],
  fileTree: { name: "demo", type: "dir", children: [{ name: "server", type: "dir", children: [{ name: "app.py", type: "file" }] }] },
  trace: [{ order: 1, label: "request hits Flask", nodeId: "flask" }],
};

describe("AnalysisSchema", () => {
  it("accepts a minimal valid analysis", () => {
    expect(() => AnalysisSchema.parse(minimalValid)).not.toThrow();
  });
  it("rejects a node missing required fields", () => {
    const bad = structuredClone(minimalValid);
    // @ts-expect-error intentionally drop a required field
    delete bad.tiers[0].nodes[0].glyph;
    expect(() => AnalysisSchema.parse(bad)).toThrow();
  });
});
