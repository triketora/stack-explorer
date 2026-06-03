import { describe, it, expect } from "vitest";
import { REGISTRY, lookup } from "@/lib/detect/registry";

describe("registry", () => {
  it("has entries with required display fields", () => {
    for (const [id, meta] of Object.entries(REGISTRY)) {
      expect(meta.name, id).toBeTruthy();
      expect(meta.glyph.length, id).toBeLessThanOrEqual(2);
      expect(["client", "api", "data", "infra", "devtest"]).toContain(meta.tier);
    }
  });
  it("looks up a known tech", () => {
    expect(lookup("react")?.name).toBe("React");
  });
});
