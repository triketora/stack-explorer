"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Analysis, Alternative, Technology } from "@/lib/types";
import type { AnalyzeRequest } from "@/lib/analyze-contract";
import { buildSkeleton } from "@/client/skeleton";

export type Stage = "idle" | "reading" | "mapping" | "ready";
export type AltState = { status: "idle" | "loading" | "ready" | "error"; alts: Alternative[] };

const EMPTY_ALT: AltState = { status: "idle", alts: [] };
const PREFETCH_CONCURRENCY = 2;

export interface UseAnalysis {
  analysis: Analysis | null;
  stage: Stage;
  elapsedMs: number;
  overviewFailed: boolean;
  fileHandles: Map<string, File>;
  start: (req: AnalyzeRequest, handles: Map<string, File>) => void;
  reset: () => void;
  altStateFor: (id: string) => AltState;
  ensureAlts: (tech: Technology, force?: boolean) => void;
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
  const [altsById, setAltsById] = useState<Record<string, AltState>>({});

  const startedAt = useRef<number>(0);
  const analysisRef = useRef<Analysis | null>(null);
  analysisRef.current = analysis;
  const altsRef = useRef<Record<string, AltState>>({});

  const setAlt = useCallback((id: string, s: AltState) => {
    altsRef.current = { ...altsRef.current, [id]: s };
    setAltsById(altsRef.current);
  }, []);

  // elapsed timer while mapping
  useEffect(() => {
    if (stage !== "mapping") return;
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [stage]);

  // core loader returns a promise so the prefetch pool can await it
  const loadAlts = useCallback(async (tech: Technology, force = false): Promise<void> => {
    const cur = altsRef.current[tech.id] ?? EMPTY_ALT;
    if (!force && (cur.status === "ready" || cur.status === "loading")) return;
    setAlt(tech.id, { status: "loading", alts: [] });
    try {
      const a = analysisRef.current;
      const ctx = a ? contextSummary(a) : tech.name;
      const res = await fetch("/api/alternatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tech: { id: tech.id, name: tech.name, cat: tech.cat, role: tech.rationale },
          contextSummary: ctx,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { alts } = (await res.json()) as { alts: Alternative[] };
      setAlt(tech.id, { status: "ready", alts });
    } catch {
      setAlt(tech.id, { status: "error", alts: [] });
    }
  }, [setAlt]);

  const ensureAlts = useCallback((tech: Technology, force = false) => {
    void loadAlts(tech, force);
  }, [loadAlts]);

  const start = useCallback((req: AnalyzeRequest, handles: Map<string, File>) => {
    setFileHandles(handles);
    altsRef.current = {};
    setAltsById({});
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
        prefetchAlts(enriched);
      })
      .catch(() => {
        setOverviewFailed(true);
        setStage("ready"); // keep the skeleton usable
      });

    // background prefetch: a real worker pool of N that awaits each call
    function prefetchAlts(a: Analysis) {
      const queue = a.tiers.flatMap((t) => t.nodes);
      let i = 0;
      const worker = async () => {
        while (i < queue.length) {
          const tech = queue[i++];
          await loadAlts(tech);
        }
      };
      for (let k = 0; k < PREFETCH_CONCURRENCY; k++) void worker();
    }
  }, [loadAlts]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setStage("idle");
    setOverviewFailed(false);
    altsRef.current = {};
    setAltsById({});
    setFileHandles(new Map());
  }, []);

  const altStateFor = useCallback((id: string) => altsById[id] ?? EMPTY_ALT, [altsById]);

  return { analysis, stage, elapsedMs, overviewFailed, fileHandles, start, reset, altStateFor, ensureAlts };
}
