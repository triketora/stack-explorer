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
