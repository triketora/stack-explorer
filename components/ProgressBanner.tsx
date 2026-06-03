interface Props {
  elapsedMs: number;
}

export function ProgressBanner({ elapsedMs }: Props) {
  const secs = Math.floor(elapsedMs / 1000);
  const long = secs >= 60;
  const label = long
    ? "Larger codebase — still working…"
    : "Mapping architecture & data flow… this usually takes 20–40s";

  return (
    <div className="progress-banner" role="status" aria-live="polite">
      <span className="progress-bar"><span className="progress-bar-fill" /></span>
      <span className="progress-label">{label}</span>
      <span className="progress-elapsed mono">{secs}s</span>
    </div>
  );
}
