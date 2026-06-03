import type { Analysis } from "@/lib/types";

export interface DemoEntry {
  slug: string;
  label: string;
  repo: string;
  /** Fetch the baked snapshot from /public on demand (static asset; keeps the JS bundle light). */
  load: () => Promise<Analysis>;
}

async function fetchSnapshot(slug: string): Promise<Analysis> {
  const res = await fetch(`/demo/${slug}.json`);
  if (!res.ok) throw new Error(`demo ${slug} not found (${res.status})`);
  return (await res.json()) as Analysis;
}

export const DEMOS: DemoEntry[] = [
  { slug: "mastodon", label: "Mastodon", repo: "mastodon/mastodon", load: () => fetchSnapshot("mastodon") },
];
