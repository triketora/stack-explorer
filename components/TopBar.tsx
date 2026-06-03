import type { Analysis } from "@/lib/types";
import { Icon } from "@/components/Icon";

type Mode = "arch" | "code";

interface Props {
  analysis: Analysis;
  mode: Mode;
  onMode: (m: Mode) => void;
  onTrace: () => void;
  tracing: boolean;
  onReset: () => void;
}

export function TopBar({ analysis, mode, onMode, onTrace, tracing, onReset }: Props) {
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
      <div className="seg" role="group" aria-label="View mode">
        <button aria-pressed={mode === "arch"} onClick={() => onMode("arch")}><Icon name="layers" /> Architecture</button>
        <button aria-pressed={mode === "code"} onClick={() => onMode("code")}><Icon name="map" /> Codebase map</button>
      </div>
      {mode === "arch" && analysis.trace.length > 0 && (
        <button className="btn-ghost" onClick={onTrace} aria-pressed={tracing}>
          <Icon name="play" /> {tracing ? "Stop trace" : "Trace a request"}
        </button>
      )}
      <button className="btn-ghost" onClick={onReset}><Icon name="folder" /> New directory</button>
    </header>
  );
}
