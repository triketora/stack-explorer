import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DEMOS } from "@/lib/demo";
import { AnalysisSchema } from "@/lib/types";

describe("bundled demos", () => {
  it("has at least one demo", () => {
    expect(DEMOS.length).toBeGreaterThan(0);
  });

  for (const demo of DEMOS) {
    it(`${demo.slug}: snapshot is a valid, fully-baked Analysis`, () => {
      const raw = readFileSync(`public/demo/${demo.slug}.json`, "utf8");
      const analysis = AnalysisSchema.parse(JSON.parse(raw));
      const nodes = analysis.tiers.flatMap((t) => t.nodes);
      expect(nodes.length).toBeGreaterThan(0);
      // baked = instant panels: every node has rationale + alternatives
      expect(nodes.every((n) => !!n.rationale)).toBe(true);
      expect(nodes.every((n) => n.alts.length > 0)).toBe(true);
    });
  }
});
