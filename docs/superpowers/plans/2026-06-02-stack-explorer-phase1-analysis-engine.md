# Stack Explorer — Phase 1: Analysis Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure-TypeScript core that turns parsed manifests + a file path list into the structured data the UI needs — static tech detection, file-tree construction, and glob-based file→tech mapping — all unit-tested, with no UI or network.

**Architecture:** A framework-agnostic `lib/` library. `lib/types.ts` defines the `Analysis` contract and zod schemas. `lib/detect/` does deterministic manifest parsing. `lib/filetree.ts` builds a tree from paths. `lib/globs.ts` expands per-tech path globs onto that tree. Everything is a pure function tested with Vitest.

**Tech Stack:** Next.js 15 + TypeScript (scaffold only this phase), Vitest, zod, picomatch.

**Reference:** Data shapes mirror `reference/mock/src/data.jsx` (the approved prototype). The full contract is in `docs/superpowers/specs/2026-06-02-stack-explorer-design.md` §5.

**Sibling plans:** Phase 2 (`...-phase2-app-pipeline.md`), Phase 3 (`...-phase3-visualization-ui.md`).

---

### Task 1: Scaffold the Next.js + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore` (exists — verify), `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Create the Next.js app non-interactively**

Run from the repo root (the dir already contains `docs/`, `reference/`, `.git/`):

```bash
npx create-next-app@15 . --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --yes
```

If it refuses because the directory is non-empty, scaffold in a temp dir and copy:

```bash
npx create-next-app@15 /tmp/se-scaffold --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --yes
cp -R /tmp/se-scaffold/. .
rm -rf /tmp/se-scaffold
```

- [ ] **Step 2: Verify it builds and runs the type checker**

Run: `npm run build`
Expected: build completes with the default starter page, no type errors.

- [ ] **Step 3: Strip the starter page to a placeholder**

Replace `app/page.tsx` with:

```tsx
export default function Home() {
  return <main>Stack Explorer</main>;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript app"
```

---

### Task 2: Add testing + library dependencies

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install dependencies**

```bash
npm install zod picomatch @anthropic-ai/sdk
npm install -D vitest @types/picomatch
```

- [ ] **Step 2: Create `vitest.config.ts`**

Node environment is enough for Phase 1 (pure logic, no DOM). Avoid importing `@vitejs/plugin-react` here to sidestep the known Vite/Vitest plugin type conflict — it isn't needed for node-env unit tests.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "client/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify the test runner starts (no tests yet)**

Run: `npm test`
Expected: Vitest reports "No test files found" and exits 0 (or exits non-zero with "no tests" — acceptable; the next task adds one).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add vitest, zod, picomatch, anthropic sdk"
```

---

### Task 3: Define the Analysis types and zod schemas

**Files:**
- Create: `lib/types.ts`
- Test: `lib/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { AnalysisSchema } from "@/lib/types";

const minimalValid = {
  repo: "demo",
  files: 3,
  tiers: [
    {
      id: "api", idx: "01", name: "API", desc: "logic",
      nodes: [{
        id: "flask", name: "Flask", cat: "web framework", glyph: "Fl",
        tags: ["Python"], rationale: "serves the API",
        pathGlobs: ["server/app.py"], files: ["server/app.py"],
        alts: [{ name: "FastAPI", tag: "framework", blurb: "async", pros: ["fast"], cons: ["new"], when: "high concurrency" }],
      }],
    },
  ],
  edges: [["flask", "flask"]],
  fileTree: { name: "demo", type: "dir", children: [{ name: "server", type: "dir", children: [{ name: "app.py", type: "file" }] }] },
  trace: [{ order: 1, label: "request hits Flask", nodeId: "flask" }],
};

describe("AnalysisSchema", () => {
  it("accepts a minimal valid analysis", () => {
    expect(() => AnalysisSchema.parse(minimalValid)).not.toThrow();
  });
  it("rejects a node missing required fields", () => {
    const bad = structuredClone(minimalValid);
    // @ts-expect-error intentionally drop a required field
    delete bad.tiers[0].nodes[0].glyph;
    expect(() => AnalysisSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/types.test.ts`
Expected: FAIL — cannot import `AnalysisSchema` (module not found).

- [ ] **Step 3: Implement `lib/types.ts`**

```ts
import { z } from "zod";

export const AlternativeSchema = z.object({
  name: z.string(),
  tag: z.string(),
  blurb: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  when: z.string(),
});

export const TechnologySchema = z.object({
  id: z.string(),
  name: z.string(),
  cat: z.string(),
  glyph: z.string(),
  tags: z.array(z.string()),
  rationale: z.string(),
  pathGlobs: z.array(z.string()),
  files: z.array(z.string()).default([]),
  confidence: z.enum(["detected", "inferred"]).optional(),
  alts: z.array(AlternativeSchema),
  tier: z.string().optional(),
});

export const TierSchema = z.object({
  id: z.string(),
  idx: z.string(),
  name: z.string(),
  desc: z.string(),
  nodes: z.array(TechnologySchema),
});

export type TreeNode = {
  name: string;
  type: "dir" | "file";
  maps?: string[];
  children?: TreeNode[];
};

export const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    type: z.enum(["dir", "file"]),
    maps: z.array(z.string()).optional(),
    children: z.array(TreeNodeSchema).optional(),
  })
);

export const TraceStepSchema = z.object({
  order: z.number(),
  label: z.string(),
  nodeId: z.string(),
});

export const AnalysisSchema = z.object({
  repo: z.string(),
  branch: z.string().optional(),
  files: z.number(),
  langs: z.string().optional(),
  tiers: z.array(TierSchema),
  edges: z.array(z.tuple([z.string(), z.string()])),
  fileTree: TreeNodeSchema,
  trace: z.array(TraceStepSchema),
});

export type Alternative = z.infer<typeof AlternativeSchema>;
export type Technology = z.infer<typeof TechnologySchema>;
export type Tier = z.infer<typeof TierSchema>;
export type TraceStep = z.infer<typeof TraceStepSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/types.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "feat: Analysis types and zod schemas"
```

---

### Task 4: Build the file tree from a flat path list

**Files:**
- Create: `lib/filetree.ts`
- Test: `lib/filetree.test.ts`

`buildFileTree(rootName, paths)` turns `["server/app.py", "server/api/users.py"]` into a nested `TreeNode`. Directories are inferred from path segments; children are sorted dirs-first then alphabetical.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildFileTree } from "@/lib/filetree";

describe("buildFileTree", () => {
  it("nests paths into a tree, dirs before files, sorted", () => {
    const tree = buildFileTree("demo", ["server/app.py", "server/api/users.py", "README.md"]);
    expect(tree).toEqual({
      name: "demo",
      type: "dir",
      children: [
        {
          name: "server", type: "dir", children: [
            { name: "api", type: "dir", children: [{ name: "users.py", type: "file" }] },
            { name: "app.py", type: "file" },
          ],
        },
        { name: "README.md", type: "file" },
      ],
    });
  });

  it("dedupes shared directory prefixes", () => {
    const tree = buildFileTree("demo", ["a/b.py", "a/c.py"]);
    expect(tree.children).toHaveLength(1);
    expect(tree.children![0].name).toBe("a");
    expect(tree.children![0].children).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/filetree.test.ts`
Expected: FAIL — `buildFileTree` not found.

- [ ] **Step 3: Implement `lib/filetree.ts`**

```ts
import type { TreeNode } from "@/lib/types";

export function buildFileTree(rootName: string, paths: string[]): TreeNode {
  const root: TreeNode = { name: rootName, type: "dir", children: [] };

  for (const raw of paths) {
    const parts = raw.split("/").filter(Boolean);
    let cursor = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      cursor.children ??= [];
      let next = cursor.children.find((c) => c.name === part);
      if (!next) {
        next = isFile ? { name: part, type: "file" } : { name: part, type: "dir", children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    });
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode): void {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/filetree.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/filetree.ts lib/filetree.test.ts
git commit -m "feat: build nested file tree from path list"
```

---

### Task 5: Expand per-tech path globs onto the tree (compute maps[])

**Files:**
- Create: `lib/globs.ts`
- Test: `lib/globs.test.ts`

`applyGlobs(tree, techGlobs)` mutates a copy of the tree, setting each node's `maps[]` to the tech ids whose globs match that node's full path. `deriveFiles(allPaths, globs)` returns the representative matched paths for a single tech. A directory matches if its own path matches a glob OR any descendant file matches (so dirs light up in the UI).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildFileTree } from "@/lib/filetree";
import { applyGlobs, deriveFiles } from "@/lib/globs";

const paths = ["server/app.py", "server/api/users.py", "client/src/App.tsx"];

describe("applyGlobs", () => {
  it("tags files and ancestor dirs with matching tech ids", () => {
    const tree = applyGlobs(buildFileTree("demo", paths), {
      flask: ["server/**"],
      react: ["client/src/**"],
    });
    const server = tree.children!.find((c) => c.name === "server")!;
    const appPy = server.children!.find((c) => c.name === "app.py")!;
    expect(appPy.maps).toEqual(["flask"]);
    expect(server.maps).toContain("flask"); // ancestor dir lights up
    const client = tree.children!.find((c) => c.name === "client")!;
    expect(client.maps).toContain("react");
  });
});

describe("deriveFiles", () => {
  it("returns matched paths for one tech's globs", () => {
    expect(deriveFiles(paths, ["server/**"])).toEqual(["server/app.py", "server/api/users.py"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/globs.test.ts`
Expected: FAIL — `applyGlobs`/`deriveFiles` not found.

- [ ] **Step 3: Implement `lib/globs.ts`**

```ts
import picomatch from "picomatch";
import type { TreeNode } from "@/lib/types";

export type TechGlobs = Record<string, string[]>;

function makeMatchers(techGlobs: TechGlobs) {
  return Object.entries(techGlobs).map(([techId, globs]) => ({
    techId,
    isMatch: picomatch(globs.length ? globs : ["__never__"], { dot: true }),
  }));
}

export function applyGlobs(tree: TreeNode, techGlobs: TechGlobs): TreeNode {
  const matchers = makeMatchers(techGlobs);

  // Returns the union of tech ids for this node and its whole subtree.
  function visit(node: TreeNode, path: string): Set<string> {
    const full = path ? `${path}/${node.name}` : node.name;
    const own = new Set<string>();

    if (node.type === "file") {
      for (const m of matchers) if (m.isMatch(full)) own.add(m.techId);
      node.maps = own.size ? [...own] : undefined;
      return own;
    }

    const subtree = new Set<string>();
    for (const child of node.children ?? []) {
      for (const id of visit(child, full)) subtree.add(id);
    }
    // a dir also matches directly if a glob targets the dir itself
    for (const m of matchers) if (m.isMatch(full)) subtree.add(m.techId);
    node.maps = subtree.size ? [...subtree] : undefined;
    return subtree;
  }

  // Root keeps its name out of the matched path (paths are repo-relative).
  for (const child of tree.children ?? []) visit(child, "");
  return tree;
}

export function deriveFiles(allPaths: string[], globs: string[]): string[] {
  if (!globs.length) return [];
  const isMatch = picomatch(globs, { dot: true });
  return allPaths.filter((p) => isMatch(p));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/globs.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/globs.ts lib/globs.test.ts
git commit -m "feat: glob expansion computes file-tree maps and tech files"
```

---

### Task 6: Static tech registry

**Files:**
- Create: `lib/detect/registry.ts`
- Test: `lib/detect/registry.test.ts`

The registry maps a canonical tech id to display metadata used when a manifest dependency is found: `name`, `cat`, `glyph`, default `tier`, and `tags`. This guarantees consistent presentation for common tech even before the LLM runs.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { REGISTRY, lookup } from "@/lib/detect/registry";

describe("registry", () => {
  it("has entries with required display fields", () => {
    for (const [id, meta] of Object.entries(REGISTRY)) {
      expect(meta.name, id).toBeTruthy();
      expect(meta.glyph.length, id).toBeLessThanOrEqual(2);
      expect(["client", "api", "data", "infra"]).toContain(meta.tier);
    }
  });
  it("looks up a known tech", () => {
    expect(lookup("react")?.name).toBe("React");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/detect/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/detect/registry.ts`**

```ts
export type TierId = "client" | "api" | "data" | "infra";

export interface TechMeta {
  name: string;
  cat: string;
  glyph: string;   // <= 2 chars
  tier: TierId;
  tags: string[];
}

export const REGISTRY: Record<string, TechMeta> = {
  react:      { name: "React", cat: "ui library", glyph: "Re", tier: "client", tags: ["component model"] },
  vue:        { name: "Vue", cat: "ui framework", glyph: "Vu", tier: "client", tags: ["reactivity"] },
  svelte:     { name: "Svelte", cat: "ui compiler", glyph: "Sv", tier: "client", tags: ["compiled"] },
  next:       { name: "Next.js", cat: "react framework", glyph: "Nx", tier: "client", tags: ["SSR"] },
  vite:       { name: "Vite", cat: "build tool", glyph: "Vi", tier: "client", tags: ["ESM", "HMR"] },
  tailwindcss:{ name: "Tailwind CSS", cat: "styling", glyph: "Tw", tier: "client", tags: ["utility-first"] },
  "react-router": { name: "React Router", cat: "routing", glyph: "RR", tier: "client", tags: ["client routing"] },
  flask:      { name: "Flask", cat: "web framework", glyph: "Fl", tier: "api", tags: ["Python", "WSGI"] },
  fastapi:    { name: "FastAPI", cat: "web framework", glyph: "FA", tier: "api", tags: ["Python", "async"] },
  django:     { name: "Django", cat: "web framework", glyph: "Dj", tier: "api", tags: ["Python", "batteries"] },
  express:    { name: "Express", cat: "web framework", glyph: "Ex", tier: "api", tags: ["Node"] },
  sqlalchemy: { name: "SQLAlchemy", cat: "ORM", glyph: "SA", tier: "api", tags: ["ORM", "Python"] },
  prisma:     { name: "Prisma", cat: "ORM", glyph: "Pr", tier: "api", tags: ["ORM", "TypeScript"] },
  gunicorn:   { name: "Gunicorn", cat: "app server", glyph: "Gu", tier: "api", tags: ["WSGI"] },
  celery:     { name: "Celery", cat: "task queue", glyph: "Ce", tier: "api", tags: ["background jobs"] },
  postgres:   { name: "PostgreSQL", cat: "relational db", glyph: "Pg", tier: "data", tags: ["SQL"] },
  mysql:      { name: "MySQL", cat: "relational db", glyph: "My", tier: "data", tags: ["SQL"] },
  sqlite:     { name: "SQLite", cat: "relational db", glyph: "Sq", tier: "data", tags: ["embedded"] },
  mongodb:    { name: "MongoDB", cat: "document db", glyph: "Mo", tier: "data", tags: ["document"] },
  redis:      { name: "Redis", cat: "cache / broker", glyph: "Rd", tier: "data", tags: ["in-memory"] },
  docker:     { name: "Docker", cat: "containerization", glyph: "Dk", tier: "infra", tags: ["images"] },
  render:     { name: "Render", cat: "hosting (PaaS)", glyph: "Rn", tier: "infra", tags: ["PaaS"] },
  "github-actions": { name: "GitHub Actions", cat: "CI / CD", glyph: "CI", tier: "infra", tags: ["pipelines"] },
};

export function lookup(id: string): TechMeta | undefined {
  return REGISTRY[id];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/detect/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/detect/registry.ts lib/detect/registry.test.ts
git commit -m "feat: static tech registry"
```

---

### Task 7: Manifest parsers

**Files:**
- Create: `lib/detect/manifests.ts`
- Test: `lib/detect/manifests.test.ts`

Each parser takes a manifest's `{ path, content }` and returns a set of registry tech ids it proves. Map common dependency names to registry ids. Cover: `package.json` (deps+devDeps), `requirements.txt`, `Dockerfile`/`docker-compose.yml` (filename presence), `render.yaml`, `.github/workflows/*` (filename).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { detectFromManifest } from "@/lib/detect/manifests";

describe("detectFromManifest", () => {
  it("reads package.json dependencies", () => {
    const ids = detectFromManifest({
      path: "package.json",
      content: JSON.stringify({ dependencies: { react: "18", "react-router-dom": "6" }, devDependencies: { vite: "5", tailwindcss: "3" } }),
    });
    expect(ids).toEqual(expect.arrayContaining(["react", "react-router", "vite", "tailwindcss"]));
  });

  it("reads requirements.txt", () => {
    const ids = detectFromManifest({ path: "requirements.txt", content: "Flask==3.0\nSQLAlchemy==2\ncelery==5\ngunicorn==21" });
    expect(ids).toEqual(expect.arrayContaining(["flask", "sqlalchemy", "celery", "gunicorn"]));
  });

  it("detects infra by filename", () => {
    expect(detectFromManifest({ path: "Dockerfile", content: "FROM python" })).toContain("docker");
    expect(detectFromManifest({ path: "render.yaml", content: "" })).toContain("render");
    expect(detectFromManifest({ path: ".github/workflows/ci.yml", content: "" })).toContain("github-actions");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/detect/manifests.test.ts`
Expected: FAIL — `detectFromManifest` not found.

- [ ] **Step 3: Implement `lib/detect/manifests.ts`**

```ts
export interface ManifestFile {
  path: string;   // repo-relative
  content: string;
}

// npm package name -> registry id
const NPM_MAP: Record<string, string> = {
  react: "react",
  "react-dom": "react",
  "react-router-dom": "react-router",
  vue: "vue",
  svelte: "svelte",
  next: "next",
  vite: "vite",
  tailwindcss: "tailwindcss",
  express: "express",
  prisma: "prisma",
  "@prisma/client": "prisma",
};

// python distribution (lowercased) -> registry id
const PY_MAP: Record<string, string> = {
  flask: "flask",
  fastapi: "fastapi",
  django: "django",
  sqlalchemy: "sqlalchemy",
  gunicorn: "gunicorn",
  celery: "celery",
  redis: "redis",
  psycopg2: "postgres",
  "psycopg2-binary": "postgres",
  pymysql: "mysql",
  mysqlclient: "mysql",
  pymongo: "mongodb",
};

function fromPackageJson(content: string): string[] {
  try {
    const pkg = JSON.parse(content);
    const names = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
    return names.flatMap((n) => (NPM_MAP[n] ? [NPM_MAP[n]] : []));
  } catch {
    return [];
  }
}

function fromRequirements(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim().split(/[=<>!~\[\s]/)[0].toLowerCase())
    .flatMap((name) => (PY_MAP[name] ? [PY_MAP[name]] : []));
}

function fromCompose(content: string): string[] {
  const ids: string[] = ["docker"];
  if (/\bpostgres\b/i.test(content)) ids.push("postgres");
  if (/\bmysql\b/i.test(content)) ids.push("mysql");
  if (/\bredis\b/i.test(content)) ids.push("redis");
  if (/\bmongo\b/i.test(content)) ids.push("mongodb");
  return ids;
}

export function detectFromManifest(file: ManifestFile): string[] {
  const base = file.path.split("/").pop() ?? file.path;
  if (base === "package.json") return fromPackageJson(file.content);
  if (base === "requirements.txt") return fromRequirements(file.content);
  if (base === "docker-compose.yml" || base === "docker-compose.yaml") return fromCompose(file.content);
  if (base === "Dockerfile") return ["docker"];
  if (base === "render.yaml") return ["render"];
  if (file.path.startsWith(".github/workflows/")) return ["github-actions"];
  return [];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/detect/manifests.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add lib/detect/manifests.ts lib/detect/manifests.test.ts
git commit -m "feat: manifest parsers map dependencies to tech ids"
```

---

### Task 8: Detection orchestrator

**Files:**
- Create: `lib/detect/index.ts`
- Test: `lib/detect/index.test.ts`

`detect(manifests)` runs every parser, dedupes ids, joins each to registry metadata, and returns `DetectedTech[]` (id + meta + the manifest paths that proved it). Unknown ids (not in registry) are skipped here; the LLM can still introduce them later.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/detect/index.test.ts`
Expected: FAIL — `detect` not found.

- [ ] **Step 3: Implement `lib/detect/index.ts`**

```ts
import { detectFromManifest, type ManifestFile } from "@/lib/detect/manifests";
import { lookup, type TechMeta } from "@/lib/detect/registry";

export interface DetectedTech {
  id: string;
  meta: TechMeta;
  sources: string[];   // manifest paths that proved it
}

export function detect(manifests: ManifestFile[]): DetectedTech[] {
  const byId = new Map<string, DetectedTech>();
  for (const m of manifests) {
    for (const id of detectFromManifest(m)) {
      const meta = lookup(id);
      if (!meta) continue;
      const existing = byId.get(id);
      if (existing) {
        if (!existing.sources.includes(m.path)) existing.sources.push(m.path);
      } else {
        byId.set(id, { id, meta, sources: [m.path] });
      }
    }
  }
  return [...byId.values()];
}

export type { ManifestFile } from "@/lib/detect/manifests";
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/detect/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass; no type errors.

- [ ] **Step 6: Commit**

```bash
git add lib/detect/index.ts lib/detect/index.test.ts
git commit -m "feat: detection orchestrator aggregates manifests with sources"
```

---

## Self-Review Notes (Phase 1)

- **Spec coverage:** types/zod (§5) → Task 3; file tree (§5 `fileTree`) → Task 4; pathGlobs→maps computation (§5 mapping note) → Task 5; static detection (§4 static pass) → Tasks 6–8. The LLM enrich pass, API route, client filter, and UI are Phases 2–3 (out of scope here, by design).
- **Type consistency:** `DetectedTech` (Task 8) feeds Phase 2's enrichment input; `Analysis`/`Technology`/`TreeNode` (Task 3) are the shared contract used by `applyGlobs` (Task 5) and all later phases. `applyGlobs`/`deriveFiles`/`buildFileTree`/`detect`/`detectFromManifest` names are used consistently.
- **No placeholders:** every code step is complete and runnable.
