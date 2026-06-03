import { describe, it, expect } from "vitest";
import { layoutSystem } from "@/lib/system/layout";
import type { Analysis, Technology } from "@/lib/types";

function tech(id: string, kind: Technology["kind"]): Technology {
  return { id, name: id, cat: "", glyph: id.slice(0, 2), tags: [], rationale: "", pathGlobs: [], files: [], alts: [], kind };
}

const analysis: Analysis = {
  repo: "demo", files: 0,
  tiers: [
    { id: "client", idx: "01", name: "Client", desc: "", nodes: [tech("browser", "client"), tech("vite", undefined)] },
    { id: "api", idx: "02", name: "API", desc: "", nodes: [tech("flask", "server"), tech("celery", "worker")] },
    { id: "data", idx: "03", name: "Data", desc: "", nodes: [tech("postgres", "datastore"), tech("redis", "queue")] },
    { id: "infra", idx: "04", name: "Infra", desc: "", nodes: [tech("stripe", "external")] },
  ],
  edges: [["browser", "flask"], ["flask", "postgres"], ["celery", "redis"], ["flask", "stripe"]],
  fileTree: { name: "demo", type: "dir", children: [] },
  trace: [],
};

describe("layoutSystem", () => {
  const layout = layoutSystem(analysis);

  it("excludes nodes without a runtime kind (build tools)", () => {
    expect(layout.nodes.map((n) => n.id)).not.toContain("vite");
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(
      ["browser", "celery", "flask", "postgres", "redis", "stripe"].sort(),
    );
  });

  it("ranks left→right by dependency (client < server < datastore)", () => {
    const x = (id: string) => layout.nodes.find((n) => n.id === id)!.x;
    expect(x("browser")).toBeLessThan(x("flask"));
    expect(x("flask")).toBeLessThan(x("postgres"));
  });

  it("routes edges with points and marks queue/worker edges async", () => {
    const e = (a: string, b: string) => layout.edges.find((x) => x.from === a && x.to === b)!;
    expect(e("browser", "flask").points.length).toBeGreaterThanOrEqual(2);
    expect(e("celery", "redis").async).toBe(true);   // worker↔queue
    expect(e("flask", "postgres").async).toBe(false);
  });

  it("drops edges whose endpoints are excluded, and wraps externals in a cloud", () => {
    expect(layout.edges.every((e) => e.from !== "vite" && e.to !== "vite")).toBe(true);
    expect(layout.clouds.length).toBeGreaterThan(0);
  });
});
