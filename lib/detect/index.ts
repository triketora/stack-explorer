import { detectFromManifest, type ManifestFile } from "@/lib/detect/manifests";
import { lookup, type TechMeta } from "@/lib/detect/registry";

export interface DetectedTech {
  id: string;
  meta: TechMeta;
  sources: string[];   // manifest paths that proved it
}

export function detect(manifests: ManifestFile[]): DetectedTech[] {
  const byId = new Map<string, DetectedTech>();
  for (const m of manifests) {
    for (const id of detectFromManifest(m)) {
      const meta = lookup(id);
      if (!meta) continue;
      const existing = byId.get(id);
      if (existing) {
        if (!existing.sources.includes(m.path)) existing.sources.push(m.path);
      } else {
        byId.set(id, { id, meta, sources: [m.path] });
      }
    }
  }
  return [...byId.values()];
}

export type { ManifestFile } from "@/lib/detect/manifests";
