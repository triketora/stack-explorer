import picomatch from "picomatch";
import type { TreeNode } from "@/lib/types";

export type TechGlobs = Record<string, string[]>;

function makeMatchers(techGlobs: TechGlobs) {
  return Object.entries(techGlobs).map(([techId, globs]) => ({
    techId,
    isMatch: picomatch(globs.length ? globs : ["__never__"], { dot: true }),
  }));
}

export function applyGlobs(tree: TreeNode, techGlobs: TechGlobs): TreeNode {
  const matchers = makeMatchers(techGlobs);

  // Returns the union of tech ids for this node and its whole subtree.
  function visit(node: TreeNode, path: string): Set<string> {
    const full = path ? `${path}/${node.name}` : node.name;
    const own = new Set<string>();

    if (node.type === "file") {
      for (const m of matchers) if (m.isMatch(full)) own.add(m.techId);
      node.maps = own.size ? [...own] : undefined;
      return own;
    }

    const subtree = new Set<string>();
    for (const child of node.children ?? []) {
      for (const id of visit(child, full)) subtree.add(id);
    }
    // a dir also matches directly if a glob targets the dir itself
    for (const m of matchers) if (m.isMatch(full)) subtree.add(m.techId);
    node.maps = subtree.size ? [...subtree] : undefined;
    return subtree;
  }

  // Root keeps its name out of the matched path (paths are repo-relative).
  for (const child of tree.children ?? []) visit(child, "");
  return tree;
}

export function deriveFiles(allPaths: string[], globs: string[]): string[] {
  if (!globs.length) return [];
  const isMatch = picomatch(globs, { dot: true });
  return allPaths.filter((p) => isMatch(p));
}
