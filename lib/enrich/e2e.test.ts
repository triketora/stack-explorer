import { describe, it, expect } from "vitest";
import { detect } from "@/lib/detect";
import { enrich } from "@/lib/enrich";
import { AnalysisSchema } from "@/lib/types";
import { flaskPostgresRequest as req } from "@/lib/enrich/fixtures/flask-postgres";

const model = async () => JSON.stringify({
  repo: "ledger", langs: "Python",
  tiers: [
    { id: "api", idx: "01", name: "API", desc: "logic", nodes: [
      { id: "flask", name: "Flask", cat: "web framework", glyph: "Fl", tags: ["Python"], rationale: "serves api",
        pathGlobs: ["server/**"], confidence: "detected",
        alts: [{ name: "FastAPI", tag: "framework", blurb: "async", pros: ["fast"], cons: ["new"], when: "concurrency" }] },
    ] },
    { id: "data", idx: "02", name: "Data", desc: "persistence", nodes: [
      { id: "postgres", name: "PostgreSQL", cat: "relational db", glyph: "Pg", tags: ["SQL"], rationale: "system of record",
        pathGlobs: ["server/models/**"], confidence: "detected",
        alts: [{ name: "MySQL", tag: "relational", blurb: "popular", pros: ["common"], cons: ["fewer types"], when: "simplicity" }] },
    ] },
  ],
  edges: [["flask", "postgres"]],
  trace: [{ order: 1, label: "request hits Flask", nodeId: "flask" }, { order: 2, label: "queries Postgres", nodeId: "postgres" }],
});

describe("e2e flask+postgres", () => {
  it("detects, enriches, and maps files", async () => {
    const analysis = await enrich(req, detect(req.manifests), model);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.edges).toContainEqual(["flask", "postgres"]);
    const flask = analysis.tiers[0].nodes[0];
    expect(flask.files).toContain("server/app.py");
    const server = analysis.fileTree.children!.find((c) => c.name === "server")!;
    expect(server.maps).toEqual(expect.arrayContaining(["flask", "postgres"]));
  });
});
