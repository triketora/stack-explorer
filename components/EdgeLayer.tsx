"use client";

import { useState, useLayoutEffect, useEffect, useCallback, type RefObject } from "react";

interface Props {
  canvasRef: RefObject<HTMLDivElement | null>;
  nodeEls: RefObject<Map<string, HTMLElement>>;
  edges: [string, string][];
  activeId: string | null;
  bump: number;
}

interface EdgePath { id: string; d: string; a: string; b: string; ax: number; ay: number; bx: number; by: number; }

export function EdgeLayer({ canvasRef, nodeEls, edges, activeId, bump }: Props) {
  const [paths, setPaths] = useState<EdgePath[]>([]);

  const compute = useCallback(() => {
    const wrap = canvasRef.current;
    if (!wrap) return;
    const base = wrap.getBoundingClientRect();
    const out: EdgePath[] = [];
    edges.forEach(([a, b]) => {
      const ea = nodeEls.current?.get(a);
      const eb = nodeEls.current?.get(b);
      if (!ea || !eb) return;
      const ra = ea.getBoundingClientRect();
      const rb = eb.getBoundingClientRect();
      const ax = ra.left - base.left + ra.width / 2;
      const ay = ra.top - base.top + ra.height / 2;
      const bx = rb.left - base.left + rb.width / 2;
      const by = rb.top - base.top + rb.height / 2;
      const my = (ay + by) / 2;
      const d = `M ${ax} ${ay} C ${ax} ${my}, ${bx} ${my}, ${bx} ${by}`;
      out.push({ id: `${a}-${b}`, d, a, b, ax, ay, bx, by });
    });
    setPaths(out);
  }, [edges, canvasRef, nodeEls]);

  useLayoutEffect(() => {
    compute();
    const t = setTimeout(compute, 60);
    const t2 = setTimeout(compute, 260);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [compute, bump]);

  useEffect(() => {
    const onR = () => compute();
    window.addEventListener("resize", onR);
    const ro = new ResizeObserver(onR);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => { window.removeEventListener("resize", onR); ro.disconnect(); };
  }, [compute, canvasRef]);

  return (
    <svg className="edge-layer">
      {paths.map((p) => {
        const hot = !!activeId && (p.a === activeId || p.b === activeId);
        const dim = !!activeId && !hot;
        return <path key={p.id} d={p.d} className={hot ? "hot" : dim ? "dim" : ""} />;
      })}
      {paths.map((p) => {
        const hot = !!activeId && (p.a === activeId || p.b === activeId);
        if (activeId && !hot) return null;
        return (
          <g key={p.id + "-d"}>
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.ax} cy={p.ay} r="2.4" />
            <circle className={"edge-dot" + (hot ? " hot" : "")} cx={p.bx} cy={p.by} r="2.4" />
          </g>
        );
      })}
    </svg>
  );
}
