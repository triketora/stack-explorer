import { describe, it, expect } from "vitest";
import { SYSTEM_PROMPT, buildUserContent } from "@/lib/enrich/prompt";

describe("prompt", () => {
  it("system prompt demands pathGlobs and forbids fileTree", () => {
    expect(SYSTEM_PROMPT).toMatch(/pathGlobs/);
    expect(SYSTEM_PROMPT).toMatch(/do not.*fileTree/i);
  });
  it("user content includes detected tech, manifests, and the tree", () => {
    const content = buildUserContent(
      { repo: "demo", manifests: [{ path: "package.json", content: "{\"x\":1}" }], tree: [{ path: "server/app.py", size: 5 }] },
      [{ id: "react", meta: { name: "React", cat: "ui library", glyph: "Re", tier: "client", tags: [] }, sources: ["package.json"] }],
    );
    expect(content).toMatch(/react/);
    expect(content).toMatch(/server\/app.py/);
    expect(content).toMatch(/package.json/);
  });
});
