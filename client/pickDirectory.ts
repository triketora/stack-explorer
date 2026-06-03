import { shouldIgnore, classify, MAX_MANIFEST_BYTES } from "@/client/filter";
import type { AnalyzeRequest } from "@/lib/analyze-contract";

export interface Picked {
  req: AnalyzeRequest;
  handles: Map<string, File>;
}

/** True when the File System Access API is available (Chromium). Avoids the
 *  browser's "Upload N files to this site?" confirmation that webkitdirectory triggers. */
export function supportsFsAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// Minimal structural types (showDirectoryPicker isn't in the default TS lib).
interface DirHandle {
  name: string;
  kind: "directory";
  entries(): AsyncIterableIterator<[string, DirHandle | FileHandle]>;
}
interface FileHandle {
  name: string;
  kind: "file";
  getFile(): Promise<File>;
}

/** Walk a directory via the File System Access API. Returns null if the user cancels. */
export async function pickViaFsAccess(): Promise<Picked | null> {
  let dir: DirHandle;
  try {
    dir = await (window as unknown as { showDirectoryPicker: () => Promise<DirHandle> }).showDirectoryPicker();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;  // user cancelled
    throw e;
  }

  const repo = dir.name || "project";
  const manifests: { path: string; content: string }[] = [];
  const tree: { path: string; size: number }[] = [];
  const handles = new Map<string, File>();

  async function walk(handle: DirHandle, prefix: string): Promise<void> {
    for await (const [name, entry] of handle.entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (shouldIgnore(path)) continue;   // skips ignored dirs (node_modules, dist, …) and files
      if (entry.kind === "directory") {
        await walk(entry, path);
      } else {
        const file = await entry.getFile();
        handles.set(path, file);
        tree.push({ path, size: file.size });
        if (classify(path) === "manifest" && file.size <= MAX_MANIFEST_BYTES) {
          manifests.push({ path, content: await file.text() });
        }
      }
    }
  }

  await walk(dir, "");
  return { req: { repo, manifests, tree }, handles };
}
