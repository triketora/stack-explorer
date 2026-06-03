"use client";

import { useRef, useState } from "react";
import { shouldIgnore, classify, MAX_MANIFEST_BYTES } from "@/client/filter";
import type { Analysis } from "@/lib/types";

interface Props {
  onAnalyzed: (analysis: Analysis, files: Map<string, File>) => void;
  onError: (message: string) => void;
}

export function FolderPicker({ onAnalyzed, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList: FileList) {
    setBusy(true);
    try {
      const all = Array.from(fileList);
      const kept = all.filter((f) => !shouldIgnore(relPath(f)));
      const repo = relPath(all[0]).split("/")[0] || "project";

      const manifests: { path: string; content: string }[] = [];
      const tree: { path: string; size: number }[] = [];
      const handles = new Map<string, File>();

      for (const f of kept) {
        const path = stripRoot(relPath(f));
        handles.set(path, f);
        tree.push({ path, size: f.size });
        if (classify(path) === "manifest" && f.size <= MAX_MANIFEST_BYTES) {
          manifests.push({ path, content: await f.text() });
        }
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repo, manifests, tree }),
      });
      if (!res.ok) throw new Error(`analyze failed (${res.status})`);
      const analysis: Analysis = await res.json();
      onAnalyzed(analysis, handles);
    } catch (e) {
      onError(e instanceof Error ? e.message : "analysis failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drop" onClick={() => inputRef.current?.click()}>
      {busy ? <span>analyzing…</span> : <span>drop a folder here, or click to choose a directory ↵</span>}
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error non-standard directory attributes
        webkitdirectory="" directory=""
        multiple
        hidden
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  );
}

function relPath(f: File): string {
  // webkitRelativePath looks like "repo/server/app.py"
  return (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
}
function stripRoot(p: string): string {
  const i = p.indexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}
