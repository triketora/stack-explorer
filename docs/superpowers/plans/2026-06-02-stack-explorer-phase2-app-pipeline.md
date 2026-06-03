# Stack Explorer — Phase 2: App + Analysis Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Phase 1 engine into a working Next.js app: a browser folder picker that filters/classifies files, a `/api/analyze` route that combines static detection with a Claude enrichment call to produce a validated `Analysis`, and a minimal page that runs the flow end-to-end and shows the raw result.

**Architecture:** Client `FolderPicker` walks the chosen directory, applies an ignore-list, classifies files as *manifest* (send contents) vs *tree-only* (send path), and POSTs `{ manifests, tree }`. The route runs `detect()` (Phase 1), builds the enrichment prompt, calls Claude (Sonnet 4.6) for the structured `Analysis`, validates with zod, expands `pathGlobs` onto the real tree via `applyGlobs`, and returns it. Failures degrade to a static-only `Analysis`.

**Tech Stack:** Next.js 15 (App Router, route handlers), `@anthropic-ai/sdk`, zod, picomatch, Vitest.

**Prerequisite:** Phase 1 complete (`lib/types.ts`, `lib/detect/`, `lib/filetree.ts`, `lib/globs.ts`).

**Reference:** Spec §3–§7; prototype entry screen `reference/mock/src/app.jsx` (the `entry` overlay + `analyze`).

---

### Task 1: Client file filter + classifier

**Files:**
- Create: `client/filter.ts`
- Test: `client/filter.test.ts`

Pure functions over a list of `{ path, size }` descriptors (so they're testable without the DOM). `shouldIgnore(path)` drops noise. `classify(path)` returns `"manifest" | "tree"`. `MAX_MANIFEST_BYTES` caps manifest size.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run client/filter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `client/filter.ts`**

```ts
export const MAX_MANIFEST_BYTES = 256 * 1024;

const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".venv", "venv", "__pycache__", ".turbo", "coverage", "vendor"];
const IGNORE_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", ".DS_Store"];
const BINARY_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf", ".zip", ".gz", ".woff", ".woff2", ".ttf", ".mp4", ".mov", ".lock"];

const MANIFEST_BASENAMES = new Set([
  "package.json", "requirements.txt", "pyproject.toml", "Pipfile",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  "render.yaml", "Procfile", "go.mod", "Gemfile", "pom.xml", "build.gradle",
]);

export function shouldIgnore(path: string): boolean {
  const parts = path.split("/");
  if (parts.some((p) => IGNORE_DIRS.includes(p))) return true;
  const base = parts[parts.length - 1];
  if (IGNORE_FILES.includes(base)) return true;
  const dot = base.lastIndexOf(".");
  if (dot >= 0 && BINARY_EXT.includes(base.slice(dot).toLowerCase())) return true;
  return false;
}

export function classify(path: string): "manifest" | "tree" {
  const base = path.split("/").pop() ?? path;
  if (MANIFEST_BASENAMES.has(base)) return "manifest";
  if (path.startsWith(".github/workflows/")) return "manifest";
  return "tree";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run client/filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/filter.ts client/filter.test.ts
git commit -m "feat: client file ignore-list and manifest classifier"
```

---

### Task 2: Analyze request/response contract

**Files:**
- Create: `lib/analyze-contract.ts`
- Test: `lib/analyze-contract.test.ts`

Shared zod schema for the POST body so client and server agree. `manifests: {path, content}[]`, `tree: {path, size}[]`, `repo: string`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/analyze-contract.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/analyze-contract.ts`**

```ts
import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  repo: z.string(),
  manifests: z.array(z.object({ path: z.string(), content: z.string() })),
  tree: z.array(z.object({ path: z.string(), size: z.number() })),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/analyze-contract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analyze-contract.ts lib/analyze-contract.test.ts
git commit -m "feat: analyze request contract"
```

---

### Task 3: Static-only fallback Analysis builder

**Files:**
- Create: `lib/enrich/fallback.ts`
- Test: `lib/enrich/fallback.test.ts`

`buildFallbackAnalysis(req, detected)` produces a valid `Analysis` from Phase 1 outputs alone — tiers grouped by registry `tier`, nodes with empty `alts`/`pathGlobs` (sources used as `files`), empty `edges`/`trace`, real `fileTree`. Used when the LLM is unavailable, so the app always renders something.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildFallbackAnalysis } from "@/lib/enrich/fallback";
import { detect } from "@/lib/detect";
import { AnalysisSchema } from "@/lib/types";

describe("buildFallbackAnalysis", () => {
  it("returns a schema-valid analysis grouped into tiers", () => {
    const req = {
      repo: "demo",
      manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
      tree: [{ path: "client/src/App.tsx", size: 10 }, { path: "package.json", size: 20 }],
    };
    const analysis = buildFallbackAnalysis(req, detect(req.manifests));
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    const client = analysis.tiers.find((t) => t.id === "client")!;
    expect(client.nodes.map((n) => n.id)).toContain("react");
    expect(analysis.files).toBe(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/enrich/fallback.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/enrich/fallback.ts`**

```ts
import type { Analysis, Tier, Technology } from "@/lib/types";
import type { DetectedTech } from "@/lib/detect";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { buildFileTree } from "@/lib/filetree";

const TIER_META: Record<string, { idx: string; name: string; desc: string }> = {
  client: { idx: "01", name: "Client", desc: "browser-side application" },
  api:    { idx: "02", name: "Application / API", desc: "request handling & business logic" },
  data:   { idx: "03", name: "Data", desc: "persistence, cache & storage" },
  infra:  { idx: "04", name: "Delivery & Infra", desc: "build, ship & run" },
};
const ORDER = ["client", "api", "data", "infra"];

export function buildFallbackAnalysis(req: AnalyzeRequest, detected: DetectedTech[]): Analysis {
  const tiersById = new Map<string, Tier>();

  for (const d of detected) {
    const tierId = d.meta.tier;
    if (!tiersById.has(tierId)) {
      const m = TIER_META[tierId];
      tiersById.set(tierId, { id: tierId, idx: m.idx, name: m.name, desc: m.desc, nodes: [] });
    }
    const node: Technology = {
      id: d.id,
      name: d.meta.name,
      cat: d.meta.cat,
      glyph: d.meta.glyph,
      tags: d.meta.tags,
      rationale: `Detected from ${d.sources.join(", ")}.`,
      pathGlobs: [],
      files: d.sources,
      confidence: "detected",
      alts: [],
      tier: tierId,
    };
    tiersById.get(tierId)!.nodes.push(node);
  }

  const tiers = ORDER.filter((id) => tiersById.has(id)).map((id) => tiersById.get(id)!);

  return {
    repo: req.repo,
    files: req.tree.length,
    tiers,
    edges: [],
    fileTree: buildFileTree(req.repo, req.tree.map((f) => f.path)),
    trace: [],
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/enrich/fallback.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/enrich/fallback.ts lib/enrich/fallback.test.ts
git commit -m "feat: static-only fallback analysis builder"
```

---

### Task 4: Enrichment prompt builder

**Files:**
- Create: `lib/enrich/prompt.ts`
- Test: `lib/enrich/prompt.test.ts`

`SYSTEM_PROMPT` (cacheable, static) instructs Claude to return strict JSON matching the `Analysis` shape but **without** `fileTree`/`files` (the server computes those from `pathGlobs`); each tech must include `pathGlobs`. `buildUserContent(req, detected)` serializes detected tech, manifest excerpts, and the directory tree (paths only) into one string.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/enrich/prompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/enrich/prompt.ts`**

```ts
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import type { DetectedTech } from "@/lib/detect";

export const SYSTEM_PROMPT = `You are a senior software architect. Given a codebase's manifests and file tree, produce a JSON description of its technology stack for a visualization tool.

Return ONLY a JSON object with this exact shape:
{
  "repo": string,
  "langs": string,                      // e.g. "Python · TypeScript · SQL"
  "tiers": [                            // ordered: client, api, data, infra (omit empty tiers)
    { "id": "client"|"api"|"data"|"infra", "idx": "01".."04", "name": string, "desc": string,
      "nodes": [
        { "id": string, "name": string, "cat": string, "glyph": string (<=2 chars),
          "tags": string[], "rationale": string (why this choice; 1-3 sentences),
          "pathGlobs": string[],        // globs locating this tech in the tree, e.g. ["server/api/**","server/app.py"]
          "confidence": "detected"|"inferred",
          "alts": [ { "name": string, "tag": string, "blurb": string, "pros": string[], "cons": string[], "when": string } ]  // 2-3 alternatives
        }
      ]
    }
  ],
  "edges": [ [fromNodeId, toNodeId] ],  // data-flow between nodes
  "trace": [ { "order": number, "label": string, "nodeId": string } ]  // ordered path of a typical request
}

Rules:
- Use the provided detected technologies as ground truth; add inferred ones (mark confidence "inferred").
- pathGlobs MUST reference real paths/dirs from the provided tree.
- Do NOT include a "fileTree" or per-node "files" field; the server computes those from pathGlobs.
- Output raw JSON only — no markdown fences, no commentary.`;

export function buildUserContent(req: AnalyzeRequest, detected: DetectedTech[]): string {
  const detectedBlock = detected.map((d) => `- ${d.id} (${d.meta.name}, tier=${d.meta.tier}) from ${d.sources.join(", ")}`).join("\n");
  const manifestBlock = req.manifests
    .map((m) => `### ${m.path}\n${m.content.slice(0, 4000)}`)
    .join("\n\n");
  const treeBlock = req.tree.map((f) => f.path).join("\n");

  return [
    `Repository: ${req.repo}`,
    `\n## Detected technologies (ground truth)\n${detectedBlock || "(none)"}`,
    `\n## Manifest files\n${manifestBlock || "(none)"}`,
    `\n## File tree (${req.tree.length} paths)\n${treeBlock}`,
  ].join("\n");
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/enrich/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/enrich/prompt.ts lib/enrich/prompt.test.ts
git commit -m "feat: enrichment prompt builder"
```

---

### Task 5: Enrichment orchestrator (parse, validate, expand, fallback)

**Files:**
- Create: `lib/enrich/index.ts`
- Test: `lib/enrich/index.test.ts`

`enrich(req, detected, callModel)` takes an injectable `callModel(system, user) => Promise<string>` (so tests mock the LLM). It parses the JSON (stripping accidental fences), validates the LLM portion, then attaches the server-computed `fileTree` (via `buildFileTree` + `applyGlobs` from each node's `pathGlobs`) and derived per-node `files` (via `deriveFiles`). On any failure it returns `buildFallbackAnalysis`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { enrich } from "@/lib/enrich";
import { detect } from "@/lib/detect";
import { AnalysisSchema } from "@/lib/types";

const req = {
  repo: "demo",
  manifests: [{ path: "package.json", content: JSON.stringify({ dependencies: { react: "18" } }) }],
  tree: [{ path: "client/src/App.tsx", size: 1 }, { path: "client/src/main.tsx", size: 1 }],
};

const goodModel = async () => JSON.stringify({
  repo: "demo", langs: "TypeScript",
  tiers: [{ id: "client", idx: "01", name: "Client", desc: "ui", nodes: [
    { id: "react", name: "React", cat: "ui library", glyph: "Re", tags: ["spa"], rationale: "renders ui",
      pathGlobs: ["client/src/**"], confidence: "detected",
      alts: [{ name: "Vue", tag: "framework", blurb: "progressive", pros: ["simple"], cons: ["smaller"], when: "small teams" }] },
  ] }],
  edges: [], trace: [{ order: 1, label: "browser renders", nodeId: "react" }],
});

describe("enrich", () => {
  it("expands pathGlobs into fileTree maps and derives files", async () => {
    const analysis = await enrich(req, detect(req.manifests), goodModel);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    const node = analysis.tiers[0].nodes[0];
    expect(node.files).toEqual(["client/src/App.tsx", "client/src/main.tsx"]);
    const client = analysis.fileTree.children!.find((c) => c.name === "client")!;
    expect(client.maps).toContain("react");
  });

  it("falls back to static analysis on malformed model output", async () => {
    const analysis = await enrich(req, detect(req.manifests), async () => "not json");
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.tiers[0].nodes[0].id).toBe("react"); // from fallback
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/enrich/index.test.ts`
Expected: FAIL — `enrich` not found.

- [ ] **Step 3: Implement `lib/enrich/index.ts`**

```ts
import { z } from "zod";
import type { Analysis } from "@/lib/types";
import { TierSchema, TraceStepSchema } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import type { DetectedTech } from "@/lib/detect";
import { buildFileTree } from "@/lib/filetree";
import { applyGlobs, deriveFiles, type TechGlobs } from "@/lib/globs";
import { buildFallbackAnalysis } from "@/lib/enrich/fallback";

export type CallModel = (system: string, user: string) => Promise<string>;

// LLM returns everything except fileTree/files (server computes those).
const LlmAnalysisSchema = z.object({
  repo: z.string(),
  langs: z.string().optional(),
  tiers: z.array(TierSchema),
  edges: z.array(z.tuple([z.string(), z.string()])),
  trace: z.array(TraceStepSchema),
});

function stripFences(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("```")) return t.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
  return t;
}

export async function enrich(req: AnalyzeRequest, detected: DetectedTech[], callModel: CallModel): Promise<Analysis> {
  try {
    const { SYSTEM_PROMPT, buildUserContent } = await import("@/lib/enrich/prompt");
    const raw = await callModel(SYSTEM_PROMPT, buildUserContent(req, detected));
    const parsed = LlmAnalysisSchema.parse(JSON.parse(stripFences(raw)));

    const allPaths = req.tree.map((f) => f.path);
    const techGlobs: TechGlobs = {};
    for (const tier of parsed.tiers) {
      for (const node of tier.nodes) {
        techGlobs[node.id] = node.pathGlobs;
        node.files = deriveFiles(allPaths, node.pathGlobs);
        node.tier = tier.id;
      }
    }

    const fileTree = applyGlobs(buildFileTree(req.repo, allPaths), techGlobs);

    return {
      repo: parsed.repo,
      langs: parsed.langs,
      files: req.tree.length,
      tiers: parsed.tiers,
      edges: parsed.edges,
      fileTree,
      trace: parsed.trace,
    };
  } catch {
    return buildFallbackAnalysis(req, detected);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/enrich/index.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/enrich/index.ts lib/enrich/index.test.ts
git commit -m "feat: enrichment orchestrator with glob expansion and fallback"
```

---

### Task 6: Anthropic client adapter

**Files:**
- Create: `lib/enrich/anthropic.ts`
- Create: `.env.example`

A thin `callAnthropic` implementing `CallModel`, with prompt caching on the system block. Not unit-tested (network); covered indirectly via the mocked `enrich` test and the e2e test.

- [ ] **Step 1: Implement `lib/enrich/anthropic.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { CallModel } from "@/lib/enrich";

export const callAnthropic: CallModel = async (system, user) => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const block = res.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
};
```

- [ ] **Step 2: Create `.env.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/enrich/anthropic.ts .env.example
git commit -m "feat: anthropic call adapter with prompt caching"
```

---

### Task 7: `/api/analyze` route handler

**Files:**
- Create: `app/api/analyze/route.ts`
- Test: `app/api/analyze/route.test.ts`

POST handler: validate body with `AnalyzeRequestSchema`, run `detect`, call `enrich` with `callAnthropic`, return the `Analysis`. 400 on invalid body. The test injects a fake model by importing the route's internal `analyzeRequest(req, callModel)` helper (export it) so no network is hit.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { analyzeRequest } from "@/app/api/analyze/route";
import { AnalysisSchema } from "@/lib/types";

describe("analyzeRequest", () => {
  it("produces a valid analysis using an injected model", async () => {
    const body = {
      repo: "demo",
      manifests: [{ path: "requirements.txt", content: "Flask==3" }],
      tree: [{ path: "server/app.py", size: 10 }],
    };
    const model = async () => JSON.stringify({
      repo: "demo", tiers: [{ id: "api", idx: "01", name: "API", desc: "logic", nodes: [
        { id: "flask", name: "Flask", cat: "web framework", glyph: "Fl", tags: ["Python"], rationale: "serves api",
          pathGlobs: ["server/**"], confidence: "detected",
          alts: [{ name: "FastAPI", tag: "framework", blurb: "async", pros: ["fast"], cons: ["new"], when: "concurrency" }] },
      ] }], edges: [], trace: [],
    });
    const analysis = await analyzeRequest(body, model);
    expect(() => AnalysisSchema.parse(analysis)).not.toThrow();
    expect(analysis.tiers[0].nodes[0].files).toEqual(["server/app.py"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/api/analyze/route.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement `app/api/analyze/route.ts`**

```ts
import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, type AnalyzeRequest } from "@/lib/analyze-contract";
import { detect } from "@/lib/detect";
import { enrich, type CallModel } from "@/lib/enrich";
import { callAnthropic } from "@/lib/enrich/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function analyzeRequest(body: AnalyzeRequest, callModel: CallModel) {
  return enrich(body, detect(body.manifests), callModel);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const analysis = await analyzeRequest(parsed.data, callAnthropic);
  return NextResponse.json(analysis);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run app/api/analyze/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/analyze/route.ts app/api/analyze/route.test.ts
git commit -m "feat: /api/analyze route handler"
```

---

### Task 8: FolderPicker component

**Files:**
- Create: `components/FolderPicker.tsx`

Client component rendering a `webkitdirectory` file input. On selection it: filters via `shouldIgnore`, classifies via `classify`, reads manifest contents (respecting `MAX_MANIFEST_BYTES`), builds the `tree` list, retains a `Map<path, File>` for later preview, and calls `onAnalyzed(analysis, fileHandles)` after POSTing to `/api/analyze`. Derives `repo` from the first path segment.

- [ ] **Step 1: Implement `components/FolderPicker.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { shouldIgnore, classify, MAX_MANIFEST_BYTES } from "@/client/filter";
import type { Analysis } from "@/lib/types";

interface Props {
  onAnalyzed: (analysis: Analysis, files: Map<string, File>) => void;
  onError: (message: string) => void;
}

export function FolderPicker({ onAnalyzed, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList) {
    setBusy(true);
    try {
      const all = Array.from(fileList);
      const kept = all.filter((f) => !shouldIgnore(relPath(f)));
      const repo = relPath(all[0]).split("/")[0] || "project";

      const manifests: { path: string; content: string }[] = [];
      const tree: { path: string; size: number }[] = [];
      const handles = new Map<string, File>();

      for (const f of kept) {
        const path = stripRoot(relPath(f));
        handles.set(path, f);
        tree.push({ path, size: f.size });
        if (classify(path) === "manifest" && f.size <= MAX_MANIFEST_BYTES) {
          manifests.push({ path, content: await f.text() });
        }
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo, manifests, tree }),
      });
      if (!res.ok) throw new Error(`analyze failed (${res.status})`);
      const analysis: Analysis = await res.json();
      onAnalyzed(analysis, handles);
    } catch (e) {
      onError(e instanceof Error ? e.message : "analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drop" onClick={() => inputRef.current?.click()}>
      {busy ? <span>analyzing…</span> : <span>drop a folder here, or click to choose a directory ↵</span>}
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error non-standard directory attributes
        webkitdirectory="" directory=""
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

function relPath(f: File): string {
  // webkitRelativePath looks like "repo/server/app.py"
  return (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
}
function stripRoot(p: string): string {
  const i = p.indexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/FolderPicker.tsx
git commit -m "feat: FolderPicker reads, filters, and analyzes a directory"
```

---

### Task 9: Minimal end-to-end page (raw Analysis render)

**Files:**
- Modify: `app/page.tsx`
- Create: `app/globals.css` (if not present from scaffold — minimal styles; full theme arrives in Phase 3)

A client page that shows the `FolderPicker` until an `Analysis` arrives, then dumps the result (repo, tier/node names, file count) as readable text. This proves the full pipeline before the Phase 3 visualization.

- [ ] **Step 1: Implement `app/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { FolderPicker } from "@/components/FolderPicker";
import type { Analysis } from "@/lib/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!analysis) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Stack Explorer</h1>
        <p>Point at a codebase to map its architecture.</p>
        <FolderPicker onAnalyzed={(a) => { setError(null); setAnalysis(a); }} onError={setError} />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <button onClick={() => setAnalysis(null)}>← New directory</button>
      <h1>{analysis.repo} · {analysis.files} files</h1>
      {analysis.tiers.map((t) => (
        <section key={t.id}>
          <h2>{t.idx} {t.name}</h2>
          <ul>{t.nodes.map((n) => <li key={n.id}>{n.name} — {n.cat} ({n.alts.length} alts, {n.files.length} files)</li>)}</ul>
        </section>
      ))}
    </main>
  );
}
```

- [ ] **Step 2: Verify build + full test suite**

Run: `npm run build && npm test && npx tsc --noEmit`
Expected: build succeeds; all tests pass; no type errors.

- [ ] **Step 3: Manual smoke test**

Run: `ANTHROPIC_API_KEY=<real key> npm run dev`, open `http://localhost:3000`, choose this repo's own folder (or `reference/mock`). Expect tiers + nodes to list. If no key is set, expect the static fallback (detected nodes only, 0 alts).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: end-to-end analyze page rendering raw Analysis"
```

---

### Task 10: End-to-end pipeline test with mocked model

**Files:**
- Create: `lib/enrich/e2e.test.ts`
- Create: `lib/enrich/fixtures/flask-postgres.ts`

A fixture (manifests + tree for a Flask+Postgres app) run through `detect` → `enrich` with a canned model response, asserting the produced `Analysis` validates and that file mapping + edges survive.

- [ ] **Step 1: Create the fixture `lib/enrich/fixtures/flask-postgres.ts`**

```ts
export const flaskPostgresRequest = {
  repo: "ledger",
  manifests: [
    { path: "requirements.txt", content: "Flask==3.0\nSQLAlchemy==2.0\npsycopg2-binary==2.9\ngunicorn==21" },
    { path: "Dockerfile", content: "FROM python:3.12" },
  ],
  tree: [
    { path: "server/app.py", size: 100 },
    { path: "server/api/accounts.py", size: 80 },
    { path: "server/models/user.py", size: 60 },
    { path: "Dockerfile", size: 30 },
  ],
};
```

- [ ] **Step 2: Write the failing test**

```ts
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
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx vitest run lib/enrich/e2e.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/enrich/e2e.test.ts lib/enrich/fixtures/flask-postgres.ts
git commit -m "test: e2e pipeline with mocked model"
```

---

## Self-Review Notes (Phase 2)

- **Spec coverage:** client filter/classify (§3.2) → Task 1; payload contract (§3) → Task 2; static fallback / graceful degradation (§7) → Task 3; Claude enrichment + caching (§4 LLM pass, §6 model) → Tasks 4–6; `/api/analyze` (§4) → Task 7; folder picker + local handles (§3, §4 FolderPicker) → Task 8; end-to-end flow (§3) → Task 9; e2e test (§8) → Task 10. Malformed-JSON repair retry (§7) is simplified to a single fallback here; a retry can be added in `enrich` later if needed — noted as a deliberate v1 simplification.
- **Type consistency:** `AnalyzeRequest` (Task 2) is consumed by Tasks 3/4/5/7/8. `CallModel` (Task 5) implemented by Task 6, injected in Tasks 5/7/10. `Analysis` (Phase 1) returned by `enrich`/route/page. `shouldIgnore`/`classify`/`MAX_MANIFEST_BYTES` (Task 1) used in Task 8.
- **No placeholders:** every step has complete code/commands.
