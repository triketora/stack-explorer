import { describe, it, expect } from "vitest";
import { shouldIgnore, classify } from "@/client/filter";

describe("shouldIgnore", () => {
  it("drops dependency/build/vcs/binaries", () => {
    expect(shouldIgnore("node_modules/x/index.js")).toBe(true);
    expect(shouldIgnore(".git/config")).toBe(true);
    expect(shouldIgnore("dist/bundle.js")).toBe(true);
    expect(shouldIgnore("logo.png")).toBe(true);
    expect(shouldIgnore("package-lock.json")).toBe(true);
  });
  it("keeps real source and config", () => {
    expect(shouldIgnore("server/app.py")).toBe(false);
    expect(shouldIgnore("package.json")).toBe(false);
  });
});

describe("classify", () => {
  it("flags manifests for content upload", () => {
    expect(classify("package.json")).toBe("manifest");
    expect(classify("server/requirements.txt")).toBe("manifest");
    expect(classify(".github/workflows/ci.yml")).toBe("manifest");
    expect(classify("server/app.py")).toBe("tree");
  });
});
