import { describe, it, expect } from "vitest";
import { generateAlternatives, ALT_SYSTEM_PROMPT } from "@/lib/enrich/alternatives";
import { AlternativeSchema } from "@/lib/types";
import { z } from "zod";

const tech = { id: "flask", name: "Flask", cat: "web framework", role: "serves the REST API" };

const altModel = async () => JSON.stringify([
  { name: "FastAPI", tag: "framework", blurb: "async + typed", pros: ["fast"], cons: ["newer"], when: "high concurrency" },
  { name: "Django", tag: "framework", blurb: "batteries included", pros: ["admin"], cons: ["heavier"], when: "full backend" },
]);

describe("ALT_SYSTEM_PROMPT", () => {
  it("asks for an array of alternatives with pros/cons/when", () => {
    expect(ALT_SYSTEM_PROMPT).toMatch(/alternativ/i);
    expect(ALT_SYSTEM_PROMPT).toMatch(/pros/i);
    expect(ALT_SYSTEM_PROMPT).toMatch(/when/i);
  });
});

describe("generateAlternatives", () => {
  it("returns a validated Alternative[]", async () => {
    const alts = await generateAlternatives(tech, "React + Flask + Postgres", altModel);
    expect(z.array(AlternativeSchema).parse(alts)).toHaveLength(2);
    expect(alts[0].name).toBe("FastAPI");
  });

  it("tolerates a single-object response by wrapping it", async () => {
    const single = async () => JSON.stringify({ name: "FastAPI", tag: "framework", blurb: "x", pros: ["a"], cons: ["b"], when: "c" });
    const alts = await generateAlternatives(tech, "ctx", single);
    expect(alts).toHaveLength(1);
  });

  it("throws on malformed output", async () => {
    await expect(generateAlternatives(tech, "ctx", async () => "nope")).rejects.toThrow();
  });
});
