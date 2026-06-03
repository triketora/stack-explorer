// Bake a demo Analysis snapshot by running a local repo through the running dev server's
// pipeline (/api/overview + /api/alternatives), merging rationale + alts into each node.
//
// Usage: node scripts/bake-demo.mjs <repoDir> <repoLabel> <outFile> [baseUrl]
//   node scripts/bake-demo.mjs /tmp/mastodon mastodon/mastodon lib/demo/mastodon.json
//
// Requires the dev server running with ANTHROPIC_API_KEY (default http://localhost:3100).

import fs from "node:fs";
import path from "node:path";

const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".venv", "venv", "__pycache__", ".turbo", "coverage", "vendor"];
const IGNORE_FILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", ".DS_Store"];
const BINARY_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".pdf", ".zip", ".gz", ".woff", ".woff2", ".ttf", ".mp4", ".mov", ".lock"];
const MANIFEST_BASENAMES = new Set(["package.json", "requirements.txt", "pyproject.toml", "Pipfile", "Dockerfile", "docker-compose.yml", "docker-compose.yaml", "render.yaml", "Procfile", "go.mod", "Gemfile", "pom.xml", "build.gradle"]);
const MAX_MANIFEST_BYTES = 256 * 1024;

function shouldIgnore(p) {
  const parts = p.split("/");
  if (parts.some((x) => IGNORE_DIRS.includes(x))) return true;
  const base = parts[parts.length - 1];
  if (IGNORE_FILES.includes(base)) return true;
  const dot = base.lastIndexOf(".");
  if (dot >= 0 && BINARY_EXT.includes(base.slice(dot).toLowerCase())) return true;
  return false;
}
const classify = (p) => (MANIFEST_BASENAMES.has(p.split("/").pop()) || p.startsWith(".github/workflows/")) ? "manifest" : "tree";

function walk(root) {
  const manifests = [], tree = [];
  (function rec(dir, prefix) {
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (shouldIgnore(rel)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) rec(full, rel);
      else if (e.isFile()) {
        let size = 0; try { size = fs.statSync(full).size; } catch {}
        tree.push({ path: rel, size });
        if (classify(rel) === "manifest" && size <= MAX_MANIFEST_BYTES) {
          try { manifests.push({ path: rel, content: fs.readFileSync(full, "utf8") }); } catch {}
        }
      }
    }
  })(root, "");
  return { manifests, tree };
}

async function post(base, route, body) {
  const res = await fetch(`${base}${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${route} -> HTTP ${res.status}`);
  return res.json();
}

const [repoDir, repoLabel, outFile, base = "http://localhost:3100"] = process.argv.slice(2);
if (!repoDir || !repoLabel || !outFile) { console.error("usage: bake-demo.mjs <repoDir> <repoLabel> <outFile> [baseUrl]"); process.exit(1); }

const { manifests, tree } = walk(repoDir);
console.log(`walked ${repoLabel}: ${tree.length} files, ${manifests.length} manifests`);

const analysis = await post(base, "/api/overview", { repo: repoLabel, manifests, tree });
const nodes = analysis.tiers.flatMap((t) => t.nodes);
console.log(`overview: ${nodes.length} techs, ${analysis.edges.length} edges`);

const ctx = `${repoLabel} — ${analysis.tiers.map((t) => `${t.name}: ${t.nodes.map((n) => n.name).join(", ")}`).join("; ")}`.slice(0, 1400);

// fetch details (rationale + alts) for every node, pool of 4
let i = 0, done = 0;
async function worker() {
  while (i < nodes.length) {
    const n = nodes[i++];
    try {
      const d = await post(base, "/api/alternatives", { tech: { id: n.id, name: n.name, cat: n.cat, role: n.rationale || n.cat }, contextSummary: ctx });
      n.rationale = d.rationale || n.rationale || "";
      n.alts = d.alts || [];
    } catch (e) { console.warn(`  details failed for ${n.name}: ${e.message}`); n.alts = n.alts || []; }
    console.log(`  details ${++done}/${nodes.length}: ${n.name}`);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(analysis, null, 2));
console.log(`wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`);
