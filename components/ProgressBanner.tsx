interface Props {
  elapsedMs: number;
  techCount: number;
}

export function ProgressBanner({ elapsedMs, techCount }: Props) {
  const secs = Math.floor(elapsedMs / 1000);
  const detected = techCount > 0 ? `Detected ${techCount} technologies ✓ · ` : "";
  const label = secs >= 60
    ? "Larger codebase — still working…"
    : `${detected}Mapping architecture & data flow…`;

  return (
    <div className="progress-banner" role="status" aria-live="polite">
      <span className="progress-bar"><span className="progress-bar-fill" /></span>
      <span className="progress-label">{label}</span>
      <span className="progress-elapsed mono">{secs}s</span>
    </div>
  );
}
