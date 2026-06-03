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
