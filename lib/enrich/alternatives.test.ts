import { describe, it, expect } from "vitest";
import { generateDetails, DETAILS_SYSTEM_PROMPT } from "@/lib/enrich/alternatives";
import { AlternativeSchema } from "@/lib/types";
import { z } from "zod";

const tech = { id: "flask", name: "Flask", cat: "web framework", role: "serves the REST API" };

const detailsModel = async () => JSON.stringify({
  rationale: "Lightweight WSGI framework that fits a small, explicit API.",
  alts: [
    { name: "FastAPI", tag: "framework", blurb: "async + typed", pros: ["fast"], cons: ["newer"], when: "high concurrency" },
    { name: "Django", tag: "framework", blurb: "batteries included", pros: ["admin"], cons: ["heavier"], when: "full backend" },
  ],
});

describe("DETAILS_SYSTEM_PROMPT", () => {
  it("asks for rationale and alternatives with pros/cons/when", () => {
    expect(DETAILS_SYSTEM_PROMPT).toMatch(/rationale/i);
    expect(DETAILS_SYSTEM_PROMPT).toMatch(/alternativ/i);
    expect(DETAILS_SYSTEM_PROMPT).toMatch(/pros/i);
    expect(DETAILS_SYSTEM_PROMPT).toMatch(/when/i);
  });
});

describe("generateDetails", () => {
  it("returns rationale + validated alternatives", async () => {
    const d = await generateDetails(tech, "React + Flask + Postgres", detailsModel);
    expect(d.rationale).toMatch(/WSGI/);
    expect(z.array(AlternativeSchema).parse(d.alts)).toHaveLength(2);
    expect(d.alts[0].name).toBe("FastAPI");
  });

  it("tolerates a bare alternatives array (empty rationale)", async () => {
    const arrModel = async () => JSON.stringify([
      { name: "FastAPI", tag: "framework", blurb: "x", pros: ["a"], cons: ["b"], when: "c" },
    ]);
    const d = await generateDetails(tech, "ctx", arrModel);
    expect(d.rationale).toBe("");
    expect(d.alts).toHaveLength(1);
  });

  it("throws on malformed output", async () => {
    await expect(generateDetails(tech, "ctx", async () => "nope")).rejects.toThrow();
  });
});
