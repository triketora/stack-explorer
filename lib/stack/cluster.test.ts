import { describe, it, expect } from "vitest";
import { splitCluster, CLUSTER_CAP } from "@/lib/stack/cluster";

describe("splitCluster", () => {
  it("passes through when at or under the cap", () => {
    const items = [1, 2, 3];
    expect(splitCluster(items, 5)).toEqual({ shown: [1, 2, 3], hiddenCount: 0 });
  });

  it("caps and reports the hidden remainder", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(splitCluster(items, 5)).toEqual({ shown: [1, 2, 3, 4, 5], hiddenCount: 2 });
  });

  it("shows everything when expanded", () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    expect(splitCluster(items, 5, true)).toEqual({ shown: items, hiddenCount: 0 });
  });

  it("defaults to CLUSTER_CAP", () => {
    const items = Array.from({ length: CLUSTER_CAP + 3 }, (_, i) => i);
    expect(splitCluster(items).shown).toHaveLength(CLUSTER_CAP);
    expect(splitCluster(items).hiddenCount).toBe(3);
  });
});
