export interface ViewTransform { scale: number; tx: number; ty: number; }

export const MIN_SCALE = 0.4;
export const MAX_SCALE = 3;

export function clampScale(s: number, min = MIN_SCALE, max = MAX_SCALE): number {
  return Math.max(min, Math.min(max, s));
}

/**
 * Zoom by `factor` around the point (cx, cy) in container coordinates, keeping that point
 * visually fixed. Returns a new transform.
 */
export function zoomAt(t: ViewTransform, factor: number, cx: number, cy: number): ViewTransform {
  const scale = clampScale(t.scale * factor);
  const k = scale / t.scale;
  return {
    scale,
    tx: cx - (cx - t.tx) * k,
    ty: cy - (cy - t.ty) * k,
  };
}

export const IDENTITY: ViewTransform = { scale: 1, tx: 0, ty: 0 };
