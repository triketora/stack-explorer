const PATHS: Record<string, string> = {
  folder: "M3 5.5A1.5 1.5 0 0 1 4.5 4h3l1.5 1.8h6A1.5 1.5 0 0 1 16.5 7.3v8.2A1.5 1.5 0 0 1 15 17H4.5A1.5 1.5 0 0 1 3 15.5z",
  file: "M5 2.5h6l4 4v11A1.5 1.5 0 0 1 13.5 19h-9A1.5 1.5 0 0 1 3 17.5v-13A2 2 0 0 1 5 2.5z M11 2.5v4h4",
  chevron: "M7 4l6 6-6 6",
  layers: "M10 3l7 4-7 4-7-4 7-4z M3 13l7 4 7-4",
  close: "M5 5l10 10 M15 5L5 15",
  map: "M3 5l5-2 4 2 5-2v12l-5 2-4-2-5 2z M8 3v14 M12 5v14",
  code: "M7 6l-4 4 4 4 M13 6l4 4-4 4",
  play: "M6 4l10 6-10 6z",
  graph: "M3 7h5v6H3z M12 7h5v6h-5z M8 10h4",
};

interface IconProps {
  name: keyof typeof PATHS;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, className, style }: IconProps) {
  const p = PATHS[name];
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {p.split(" M").map((seg, i) => <path key={i} d={(i ? "M" : "") + seg} />)}
    </svg>
  );
}
