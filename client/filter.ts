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
