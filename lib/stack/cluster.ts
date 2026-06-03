export const CLUSTER_CAP = 5;

/** Split a cluster's items into the shown subset and the hidden remainder count. */
export function splitCluster<T>(items: T[], cap = CLUSTER_CAP, expanded = false): { shown: T[]; hiddenCount: number } {
  if (expanded || items.length <= cap) return { shown: items, hiddenCount: 0 };
  return { shown: items.slice(0, cap), hiddenCount: items.length - cap };
}
