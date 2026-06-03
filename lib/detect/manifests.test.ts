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
