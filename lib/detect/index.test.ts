import { describe, it, expect } from "vitest";
import { detect } from "@/lib/detect";

describe("detect", () => {
  it("aggregates and dedupes across manifests with sources", () => {
    const result = detect([
      { path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) },
      { path: "client/package.json", content: JSON.stringify({ dependencies: { react: "18" } }) },
      { path: "Dockerfile", content: "FROM node" },
    ]);
    const react = result.find((t) => t.id === "react")!;
    expect(react.meta.name).toBe("React");
    expect(react.sources).toEqual(["package.json", "client/package.json"]);
    expect(result.map((t) => t.id)).toContain("docker");
  });
});
