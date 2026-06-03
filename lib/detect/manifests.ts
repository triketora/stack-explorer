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
