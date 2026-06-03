export type TierId = "client" | "api" | "data" | "infra" | "devtest";

export interface TechMeta {
  name: string;
  cat: string;
  glyph: string;   // <= 2 chars
  tier: TierId;
  tags: string[];
  blurb: string;   // one-sentence explainer (shown while loading)
}

export const REGISTRY: Record<string, TechMeta> = {
  react:      { name: "React", cat: "ui library", glyph: "Re", tier: "client", tags: ["component model"], blurb: "A declarative, component-based library for building user interfaces, maintained by Meta." },
  vue:        { name: "Vue", cat: "ui framework", glyph: "Vu", tier: "client", tags: ["reactivity"], blurb: "A progressive UI framework with a gentle learning curve and reactive data binding." },
  svelte:     { name: "Svelte", cat: "ui compiler", glyph: "Sv", tier: "client", tags: ["compiled"], blurb: "A compiler that turns components into tiny vanilla-JS bundles with no virtual DOM." },
  next:       { name: "Next.js", cat: "react framework", glyph: "Nx", tier: "client", tags: ["SSR"], blurb: "A React framework with file-based routing, server rendering, and API routes." },
  vite:       { name: "Vite", cat: "build tool", glyph: "Vi", tier: "devtest", tags: ["ESM", "HMR"], blurb: "A fast dev server and bundler with instant hot-module reloading." },
  tailwindcss:{ name: "Tailwind CSS", cat: "styling", glyph: "Tw", tier: "client", tags: ["utility-first"], blurb: "A utility-first CSS framework that keeps styling in your markup." },
  "react-router": { name: "React Router", cat: "routing", glyph: "RR", tier: "client", tags: ["client routing"], blurb: "The standard client-side router for React single-page apps." },
  flask:      { name: "Flask", cat: "web framework", glyph: "Fl", tier: "api", tags: ["Python", "WSGI"], blurb: "A lightweight, explicit Python web framework you assemble piece by piece." },
  fastapi:    { name: "FastAPI", cat: "web framework", glyph: "FA", tier: "api", tags: ["Python", "async"], blurb: "An async-first Python framework with type-driven validation and auto-generated docs." },
  django:     { name: "Django", cat: "web framework", glyph: "Dj", tier: "api", tags: ["Python", "batteries"], blurb: "A batteries-included Python framework with an ORM, admin, and auth built in." },
  express:    { name: "Express", cat: "web framework", glyph: "Ex", tier: "api", tags: ["Node"], blurb: "A minimal, unopinionated Node.js web framework — the JavaScript backend default." },
  sqlalchemy: { name: "SQLAlchemy", cat: "ORM", glyph: "SA", tier: "api", tags: ["ORM", "Python"], blurb: "Python's most popular ORM, mapping objects to SQL with a raw-SQL escape hatch." },
  prisma:     { name: "Prisma", cat: "ORM", glyph: "Pr", tier: "api", tags: ["ORM", "TypeScript"], blurb: "A schema-first ORM that generates a fully typed database client for TypeScript." },
  gunicorn:   { name: "Gunicorn", cat: "app server", glyph: "Gu", tier: "api", tags: ["WSGI"], blurb: "A production WSGI server that runs multiple Python worker processes." },
  celery:     { name: "Celery", cat: "task queue", glyph: "Ce", tier: "api", tags: ["background jobs"], blurb: "A distributed task queue for running background jobs off the request path." },
  postgres:   { name: "PostgreSQL", cat: "relational db", glyph: "Pg", tier: "data", tags: ["SQL"], blurb: "A powerful open-source relational database with rich types and JSON support." },
  mysql:      { name: "MySQL", cat: "relational db", glyph: "My", tier: "data", tags: ["SQL"], blurb: "A widely used open-source relational database known for speed and simplicity." },
  sqlite:     { name: "SQLite", cat: "relational db", glyph: "Sq", tier: "data", tags: ["embedded"], blurb: "A zero-config, single-file embedded database — great for dev and small apps." },
  mongodb:    { name: "MongoDB", cat: "document db", glyph: "Mo", tier: "data", tags: ["document"], blurb: "A document database storing flexible JSON-like records with easy sharding." },
  redis:      { name: "Redis", cat: "cache / broker", glyph: "Rd", tier: "data", tags: ["in-memory"], blurb: "An in-memory data store used for caching, sessions, and as a message broker." },
  docker:     { name: "Docker", cat: "containerization", glyph: "Dk", tier: "infra", tags: ["images"], blurb: "Packages apps into reproducible container images so dev matches production." },
  render:     { name: "Render", cat: "hosting (PaaS)", glyph: "Rn", tier: "infra", tags: ["PaaS"], blurb: "A managed platform that builds and runs web services with push-to-deploy." },
  "github-actions": { name: "GitHub Actions", cat: "CI / CD", glyph: "CI", tier: "devtest", tags: ["pipelines"], blurb: "GitHub's built-in CI/CD that runs tests and deploys on every push." },
};

export function lookup(id: string): TechMeta | undefined {
  return REGISTRY[id];
}
