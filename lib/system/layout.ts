import dagre from "dagre";
import type { Analysis, Technology } from "@/lib/types";

export interface PositionedNode {
  id: string;
  x: number;       // top-left
  y: number;
  width: number;
  height: number;
  tech: Technology;
}

export interface RoutedEdge {
  from: string;
  to: string;
  points: { x: number; y: number }[];
  async: boolean;
}

export interface CloudRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SystemLayout {
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  clouds: CloudRegion[];
  width: number;
  height: number;
}

const NODE_W = 156;
const NODE_H = 54;
const CLOUD_PAD = 26;

const ASYNC_KINDS = new Set<NonNullable<Technology["kind"]>>(["queue", "worker"]);

export function layoutSystem(analysis: Analysis): SystemLayout {
  const all = analysis.tiers.flatMap((t) => t.nodes);
  const runtime = all.filter((n) => !!n.kind);            // exclude build/dev-only tools
  const byId = new Map(runtime.map((n) => [n.id, n]));

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 90, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of runtime) g.setNode(n.id, { width: NODE_W, height: NODE_H });

  const includedEdges = analysis.edges.filter(([a, b]) => byId.has(a) && byId.has(b));
  for (const [a, b] of includedEdges) g.setEdge(a, b);

  dagre.layout(g);

  const nodes: PositionedNode[] = runtime.map((tech) => {
    const { x, y, width, height } = g.node(tech.id);
    return { id: tech.id, x: x - width / 2, y: y - height / 2, width, height, tech };
  });

  const edges: RoutedEdge[] = includedEdges.map(([from, to]) => {
    const e = g.edge(from, to) as { points?: { x: number; y: number }[] } | undefined;
    const a = byId.get(from)!;
    const b = byId.get(to)!;
    const isAsync = (a.kind && ASYNC_KINDS.has(a.kind)) || (b.kind && ASYNC_KINDS.has(b.kind)) || false;
    return { from, to, points: e?.points ?? [], async: !!isAsync };
  });

  const externals = nodes.filter((n) => n.tech.kind === "external");
  const clouds: CloudRegion[] = externals.length ? [boundingCloud(externals)] : [];

  const { width = 0, height = 0 } = g.graph();
  return { nodes, edges, clouds, width, height };
}

function boundingCloud(ns: PositionedNode[]): CloudRegion {
  const minX = Math.min(...ns.map((n) => n.x)) - CLOUD_PAD;
  const minY = Math.min(...ns.map((n) => n.y)) - CLOUD_PAD;
  const maxX = Math.max(...ns.map((n) => n.x + n.width)) + CLOUD_PAD;
  const maxY = Math.max(...ns.map((n) => n.y + n.height)) + CLOUD_PAD;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
