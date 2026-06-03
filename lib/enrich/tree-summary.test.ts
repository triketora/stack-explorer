import { describe, it, expect } from "vitest";
import { summarizeTree } from "@/lib/enrich/tree-summary";

describe("summarizeTree", () => {
  it("returns all paths when under the cap", () => {
    const paths = ["server/app.py", "client/src/App.tsx", "package.json"];
    expect(summarizeTree(paths, 600)).toEqual(paths);
  });

  it("caps the number of paths and notes the elision", () => {
    const paths = Array.from({ length: 50 }, (_, i) => `src/file${i}.ts`);
    const out = summarizeTree(paths, 10);
    expect(out.length).toBeLessThanOrEqual(11); // 10 paths + 1 summary line
    expect(out.join("\n")).toMatch(/more files? omitted|\.\.\./i);
  });

  it("prioritizes shallow/manifest-like paths over deep ones", () => {
    const paths = [
      "a/b/c/d/e/deep.ts",
      "package.json",
      "src/index.ts",
    ];
    const out = summarizeTree(paths, 2);
    expect(out).toContain("package.json");
    expect(out).toContain("src/index.ts");
    expect(out).not.toContain("a/b/c/d/e/deep.ts");
  });
});
