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
