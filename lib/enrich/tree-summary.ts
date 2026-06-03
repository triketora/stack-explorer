// Produce a bounded, prioritized list of paths for the LLM prompt so input size
// (and latency) stays reasonable on large repos. Glob expansion still runs against
// the FULL tree elsewhere, so the code map remains accurate.

const PRIORITY_HINTS = [
  "package.json", "requirements.txt", "pyproject.toml", "go.mod", "gemfile", "pom.xml",
  "dockerfile", "docker-compose", "render.yaml", "procfile",
  "src/", "app/", "server/", "client/", "lib/", "pages/", "api/", "components/",
];

function score(path: string): number {
  const lower = path.toLowerCase();
  const depth = path.split("/").length;
  let s = depth; // shallower = lower score = higher priority
  for (const hint of PRIORITY_HINTS) {
    if (lower.includes(hint)) { s -= 3; break; }
  }
  return s;
}

export function summarizeTree(paths: string[], cap = 600): string[] {
  if (paths.length <= cap) return paths;
  const ranked = [...paths].sort((a, b) => score(a) - score(b));
  const kept = ranked.slice(0, cap);
  const omitted = paths.length - cap;
  // Restore a stable (alphabetical) order for the kept subset, then note the elision.
  kept.sort((a, b) => a.localeCompare(b));
  return [...kept, `… ${omitted} more files omitted`];
}
