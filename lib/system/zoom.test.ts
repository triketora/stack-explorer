import { describe, it, expect } from "vitest";
import { clampScale, zoomAt, IDENTITY, MIN_SCALE, MAX_SCALE } from "@/lib/system/zoom";

describe("clampScale", () => {
  it("bounds to [MIN, MAX]", () => {
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(1)).toBe(1);
  });
});

describe("zoomAt", () => {
  it("keeps the cursor point visually fixed", () => {
    const cx = 200, cy = 100;
    const t = zoomAt(IDENTITY, 2, cx, cy);
    expect(t.scale).toBe(2);
    // a point at (cx,cy) maps to the same screen position before & after
    const before = { x: cx * IDENTITY.scale + IDENTITY.tx, y: cy * IDENTITY.scale + IDENTITY.ty };
    const after = { x: cx * t.scale + t.tx, y: cy * t.scale + t.ty };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("respects clamping (no zoom past max)", () => {
    let t = IDENTITY;
    for (let i = 0; i < 10; i++) t = zoomAt(t, 2, 0, 0);
    expect(t.scale).toBe(MAX_SCALE);
  });
});
