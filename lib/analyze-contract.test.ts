import { describe, it, expect } from "vitest";
import { AnalyzeRequestSchema } from "@/lib/analyze-contract";

describe("AnalyzeRequestSchema", () => {
  it("validates a request body", () => {
    expect(() => AnalyzeRequestSchema.parse({
      repo: "demo",
      manifests: [{ path: "package.json", content: "{}" }],
      tree: [{ path: "server/app.py", size: 12 }],
    })).not.toThrow();
  });
  it("rejects missing tree", () => {
    expect(() => AnalyzeRequestSchema.parse({ repo: "demo", manifests: [] })).toThrow();
  });
});
