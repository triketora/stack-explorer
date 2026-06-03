"use client";

import { useState } from "react";
import { FolderPicker } from "@/components/FolderPicker";
import type { Analysis } from "@/lib/types";

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!analysis) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Stack Explorer</h1>
        <p>Point at a codebase to map its architecture.</p>
        <FolderPicker onAnalyzed={(a) => { setError(null); setAnalysis(a); }} onError={setError} />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: "system-ui" }}>
      <button onClick={() => setAnalysis(null)}>← New directory</button>
      <h1>{analysis.repo} · {analysis.files} files</h1>
      {analysis.tiers.map((t) => (
        <section key={t.id}>
          <h2>{t.idx} {t.name}</h2>
          <ul>{t.nodes.map((n) => <li key={n.id}>{n.name} — {n.cat} ({n.alts.length} alts, {n.files.length} files)</li>)}</ul>
        </section>
      ))}
    </main>
  );
}
