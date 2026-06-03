"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis, Alternative, Technology } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { buildSkeleton } from "@/client/skeleton";
import type { DemoEntry } from "@/lib/demo";

const DEMO_REPLAY_MS = 3000;

export type Stage = "idle" | "reading" | "mapping" | "ready";
export type DetailState = {
  status: "idle" | "loading" | "ready" | "error";
  rationale: string;
  alts: Alternative[];
};

const EMPTY_DETAIL: DetailState = { status: "idle", rationale: "", alts: [] };
const PREFETCH_CONCURRENCY = 2;

export interface UseAnalysis {
  analysis: Analysis | null;
  stage: Stage;
  elapsedMs: number;
  overviewFailed: boolean;
  fileHandles: Map<string, File>;
  start: (req: AnalyzeRequest, handles: Map<string, File>) => void;
  loadDemo: (demo: DemoEntry) => void;
  reset: () => void;
  detailFor: (id: string) => DetailState;
  ensureDetails: (tech: Technology, force?: boolean) => void;
}

function contextSummary(a: Analysis): string {
  const tiers = a.tiers.map((t) => `${t.name}: ${t.nodes.map((n) => n.name).join(", ")}`).join("; ");
  return `${a.repo} — ${tiers}`;
}

export function useAnalysis(): UseAnalysis {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [overviewFailed, setOverviewFailed] = useState(false);
  const [fileHandles, setFileHandles] = useState<Map<string, File>>(new Map());
  const [detailsById, setDetailsById] = useState<Record<string, DetailState>>({});

  const startedAt = useRef<number>(0);
  const analysisRef = useRef<Analysis | null>(null);
  analysisRef.current = analysis;
  const detailsRef = useRef<Record<string, DetailState>>({});

  const setDetail = useCallback((id: string, s: DetailState) => {
    detailsRef.current = { ...detailsRef.current, [id]: s };
    setDetailsById(detailsRef.current);
  }, []);

  // elapsed timer while mapping
  useEffect(() => {
    if (stage !== "mapping") return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [stage]);

  // core loader returns a promise so the prefetch pool can await it
  const loadDetails = useCallback(async (tech: Technology, force = false): Promise<void> => {
    const cur = detailsRef.current[tech.id] ?? EMPTY_DETAIL;
    if (!force && (cur.status === "ready" || cur.status === "loading")) return;
    setDetail(tech.id, { status: "loading", rationale: tech.rationale ?? "", alts: [] });
    try {
      const a = analysisRef.current;
      const ctx = a ? contextSummary(a) : tech.name;
      const res = await fetch("/api/alternatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tech: { id: tech.id, name: tech.name, cat: tech.cat, role: tech.rationale || tech.cat },
          contextSummary: ctx,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { rationale, alts } = (await res.json()) as { rationale: string; alts: Alternative[] };
      setDetail(tech.id, { status: "ready", rationale: rationale || tech.rationale || "", alts });
    } catch {
      setDetail(tech.id, { status: "error", rationale: tech.rationale ?? "", alts: [] });
    }
  }, [setDetail]);

  const ensureDetails = useCallback((tech: Technology, force = false) => {
    void loadDetails(tech, force);
  }, [loadDetails]);

  const start = useCallback((req: AnalyzeRequest, handles: Map<string, File>) => {
    setFileHandles(handles);
    detailsRef.current = {};
    setDetailsById({});
    setOverviewFailed(false);
    setStage("reading");

    // instant skeleton (no network)
    const skeleton = buildSkeleton(req);
    setAnalysis(skeleton);
    startedAt.current = Date.now();
    setElapsedMs(0);
    setStage("mapping");

    void fetch("/api/overview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const enriched = (await res.json()) as Analysis;
        setAnalysis(enriched);
        setStage("ready");
        prefetchDetails(enriched);
      })
      .catch(() => {
        setOverviewFailed(true);
        setStage("ready"); // keep the skeleton usable
      });

    // background prefetch: a real worker pool of N that awaits each call
    function prefetchDetails(a: Analysis) {
      const queue = a.tiers.flatMap((t) => t.nodes);
      let i = 0;
      const worker = async () => {
        while (i < queue.length) {
          const tech = queue[i++];
          await loadDetails(tech);
        }
      };
      for (let k = 0; k < PREFETCH_CONCURRENCY; k++) void worker();
    }
  }, [loadDetails]);

  // One-click demo: replay a brief loading sequence, then reveal the pre-baked snapshot.
  const loadDemo = useCallback((demo: DemoEntry) => {
    setFileHandles(new Map());
    setOverviewFailed(false);
    setStage("reading");
    void demo.load().then((full) => {
      // pre-fill the details cache so compare panels are instant after the reveal
      const details: Record<string, DetailState> = {};
      for (const tier of full.tiers) {
        for (const n of tier.nodes) {
          details[n.id] = { status: "ready", rationale: n.rationale ?? "", alts: n.alts ?? [] };
        }
      }
      detailsRef.current = details;
      setDetailsById(details);

      // skeleton-ified view (pending nodes, no edges/trace) to play the loading UI
      const skeleton: Analysis = {
        ...full,
        edges: [],
        trace: [],
        tiers: full.tiers.map((t) => ({ ...t, nodes: t.nodes.map((n) => ({ ...n, pending: true })) })),
      };
      setAnalysis(skeleton);
      startedAt.current = Date.now();
      setElapsedMs(0);
      setStage("mapping");

      setTimeout(() => {
        setAnalysis(full);
        setStage("ready");
      }, DEMO_REPLAY_MS);
    }).catch(() => setOverviewFailed(true));
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setStage("idle");
    setOverviewFailed(false);
    detailsRef.current = {};
    setDetailsById({});
    setFileHandles(new Map());
  }, []);

  const detailFor = useCallback((id: string) => detailsById[id] ?? EMPTY_DETAIL, [detailsById]);

  return { analysis, stage, elapsedMs, overviewFailed, fileHandles, start, loadDemo, reset, detailFor, ensureDetails };
}
