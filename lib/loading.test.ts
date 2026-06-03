import { describe, it, expect } from "vitest";
import { detectionLog, blurbFor } from "@/lib/loading";
import { REGISTRY } from "@/lib/detect/registry";
import type { Analysis } from "@/lib/types";

const analysis: Analysis = {
  repo: "demo", files: 3,
  tiers: [
    { id: "client", idx: "01", name: "Client", desc: "", nodes: [
      { id: "react", name: "React", cat: "ui", glyph: "Re", tags: [], rationale: "", pathGlobs: [], files: ["client/package.json"], alts: [] },
    ] },
    { id: "data", idx: "03", name: "Data", desc: "", nodes: [] },   // empty placeholder
    { id: "infra", idx: "04", name: "Infra", desc: "", nodes: [
      { id: "docker", name: "Docker", cat: "infra", glyph: "Dk", tags: [], rationale: "", pathGlobs: [], files: ["Dockerfile"], alts: [] },
    ] },
  ],
  edges: [], fileTree: { name: "demo", type: "dir", children: [] }, trace: [],
};

describe("detectionLog", () => {
  it("returns one entry per detected node with its first source; skips empty tiers", () => {
    expect(detectionLog(analysis)).toEqual([
      { id: "react", name: "React", source: "client/package.json" },
      { id: "docker", name: "Docker", source: "Dockerfile" },
    ]);
  });
});

describe("blurbFor", () => {
  it("returns the registry blurb for a known tech", () => {
    expect(blurbFor("react")).toMatch(/interface/i);
    expect(blurbFor("nope-xyz")).toBeUndefined();
  });
});

describe("registry blurbs", () => {
  it("every registry entry has a non-empty blurb", () => {
    for (const [id, meta] of Object.entries(REGISTRY)) {
      expect(meta.blurb, id).toBeTruthy();
      expect(meta.blurb.length, id).toBeGreaterThan(10);
    }
  });
});
