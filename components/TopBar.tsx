import type { Analysis } from "@/lib/types";
import { Icon } from "@/components/Icon";

export type View = "stack" | "system" | "code";

interface Props {
  analysis: Analysis;
  view: View;
  onView: (v: View) => void;
  onTrace: () => void;
  tracing: boolean;
  onReset: () => void;
}

export function TopBar({ analysis, view, onView, onTrace, tracing, onReset }: Props) {
  return (
    <header className="topbar">
      <div className="brand"><span className="mark" /> Stack Explorer</div>
      <div className="repo-chip">
        <span className="dot" /><b>{analysis.repo}</b>
        <span style={{ opacity: 0.6 }}>
          {analysis.branch ? ` · ${analysis.branch}` : ""} · {analysis.files} files
        </span>
      </div>
      <div className="spacer" />
      <div className="seg" role="group" aria-label="View">
        <button aria-pressed={view === "stack"} onClick={() => onView("stack")}><Icon name="layers" /> Stack</button>
        <button aria-pressed={view === "system"} onClick={() => onView("system")}><Icon name="graph" /> System</button>
        <button aria-pressed={view === "code"} onClick={() => onView("code")}><Icon name="map" /> Code</button>
      </div>
      {view === "stack" && analysis.trace.length > 0 && (
        <button className="btn-ghost" onClick={onTrace} aria-pressed={tracing}>
          <Icon name="play" /> {tracing ? "Stop trace" : "Trace a request"}
        </button>
      )}
      <button className="btn-ghost" onClick={onReset}><Icon name="folder" /> New directory</button>
    </header>
  );
}
