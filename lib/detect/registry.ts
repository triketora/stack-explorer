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
