"use client";

import { useEffect, useMemo, useState } from "react";
import type { Analysis } from "@/lib/types";
import { detectionLog, blurbFor } from "@/lib/loading";

interface Props {
  analysis: Analysis;
  elapsedMs: number;
}

const LOG_CAP = 8;

function trim(s: string, n = 160): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "…" : s;
}

export function LoadingPanel({ analysis, elapsedMs }: Props) {
  const log = useMemo(() => detectionLog(analysis), [analysis]);
  const blurbs = useMemo(
    () => log
      .map((e) => ({ name: e.name, blurb: blurbFor(e.id) ?? trim(e.rationale) }))
      .filter((e): e is { name: string; blurb: string } => !!e.blurb),
    [log],
  );

  const [bi, setBi] = useState(0);
  useEffect(() => {
    if (blurbs.length <= 1) return;
    const t = setInterval(() => setBi((i) => (i + 1) % blurbs.length), 3000);
    return () => clearInterval(t);
  }, [blurbs.length]);

  const secs = Math.floor(elapsedMs / 1000);
  const shown = log.slice(0, LOG_CAP);
  const current = blurbs.length ? blurbs[bi % blurbs.length] : null;

  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <div className="lp-section">
        <div className="lp-head mono">scanning · {analysis.files.toLocaleString()} files</div>
        <div className="lp-log">
          {shown.map((e, i) => (
            <div key={e.id} className="lp-line" style={{ animationDelay: `${i * 90}ms` }}>
              <span className="lp-ok">✓ {e.name}</span>
              {e.source && <span className="lp-src"> · {e.source}</span>}
            </div>
          ))}
          <div className="lp-line lp-mapping" style={{ animationDelay: `${shown.length * 90}ms` }}>
            ↳ {secs >= 60 ? "larger codebase — still working…" : "mapping architecture & data flow…"}
            <span className="lp-elapsed mono"> {secs}s</span>
          </div>
        </div>
        <div className="lp-bar"><i /></div>
      </div>

      {current && (
        <div className="lp-section lp-blurb">
          <div className="lp-head mono">while you wait</div>
          <div key={bi} className="lp-blurb-text" style={{ animation: "lp-fadeup .3s both" }}><strong>{current.name}</strong> — {current.blurb}</div>
        </div>
      )}
    </div>
  );
}
