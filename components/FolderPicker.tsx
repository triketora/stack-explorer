"use client";

import { useRef, useState } from "react";
import { shouldIgnore, classify, MAX_MANIFEST_BYTES } from "@/client/filter";
import { supportsFsAccess, pickViaFsAccess } from "@/client/pickDirectory";
import type { AnalyzeRequest } from "@/lib/analyze-contract";

interface Props {
  onPicked: (req: AnalyzeRequest, files: Map<string, File>) => void;
  onError: (message: string) => void;
}

export function FolderPicker({ onPicked, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Prefer the File System Access API (no "Upload N files?" modal); fall back to the input.
  async function choose() {
    if (!supportsFsAccess()) { inputRef.current?.click(); return; }
    setBusy(true);
    try {
      const picked = await pickViaFsAccess();
      if (picked) onPicked(picked.req, picked.handles);
    } catch (e) {
      onError(e instanceof Error ? e.message : "could not read folder");
    } finally {
      setBusy(false);
    }
  }

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

      onPicked({ repo, manifests, tree }, handles);
    } catch (e) {
      onError(e instanceof Error ? e.message : "could not read folder");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="drop" onClick={choose}>
      {busy ? <span>reading files…</span> : <span>drop a folder here, or click to choose a directory ↵</span>}
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
