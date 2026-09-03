/**
 * Roadmap's search provider — searches its own versioned in-package content
 * (`./content/roadmap`). Pure and in-memory: no database, no host internal.
 * The host registers this as the `roadmap` search category's provider and runs
 * it with an already-bounded `limit`/`offset`, re-clamping the result, so a
 * provider can never request unlimited results.
 */
import { masterRoadmap, roadmapFields } from "./content/roadmap";

/**
 * The shape a search provider returns, mirroring the host's search-result
 * contract. Declared here for now; a future `@openfulldive/plugin-api` version
 * should own this type so the host and every plugin share one definition. It is
 * structurally what the host expects, so it stays assignable in the meantime.
 */
export type SearchResult = {
  category: string;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  href: string;
  metadata?: Record<string, string | number | boolean | null>;
};

/** Strip newlines, collapse whitespace, and truncate — a local copy of the host's snippet helper. */
function formatSnippet(text: string | null | undefined, maxLength = 180): string {
  if (!text) return "";
  const cleaned = text.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength - 1).trimEnd() + "…";
}

type SearchableRoadmap = {
  id: string;
  title: string;
  href: string;
  subtitle: string;
  description: string;
  searchText: string;
};

/** Every searchable entry: the master overview plus each individual track. */
function searchableRoadmaps(): SearchableRoadmap[] {
  const master: SearchableRoadmap = {
    id: masterRoadmap.id,
    title: masterRoadmap.title,
    href: "/roadmap",
    subtitle: masterRoadmap.audience,
    description: masterRoadmap.description,
    searchText: [masterRoadmap.title, masterRoadmap.description, masterRoadmap.audience].join(" ").toLowerCase(),
  };
  const tracks: SearchableRoadmap[] = roadmapFields.map((field) => ({
    id: field.id,
    title: field.title,
    href: `/roadmap/${field.id}`,
    subtitle: `${field.category} · ${field.level}`,
    description: field.description,
    searchText: [field.title, field.shortTitle, field.category, field.description, field.audience].join(" ").toLowerCase(),
  }));
  return [master, ...tracks];
}

function rank(entry: SearchableRoadmap, needle: string): number | null {
  const title = entry.title.toLowerCase();
  if (title === needle) return 1;
  if (title.startsWith(needle)) return 2;
  if (entry.searchText.includes(needle)) return 3;
  return null;
}

/**
 * `limit`/`offset` are the host's, already bounded — this never returns beyond
 * what it was asked for, so a plugin cannot request unlimited results.
 */
export function searchRoadmap(query: string, limit: number, offset: number): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const ranked = searchableRoadmaps()
    .map((entry) => ({ entry, rank: rank(entry, needle) }))
    .filter((r): r is { entry: SearchableRoadmap; rank: number } => r.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.entry.title.localeCompare(b.entry.title));

  return ranked.slice(offset, offset + limit).map(({ entry }) => ({
    category: "roadmap",
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle,
    snippet: formatSnippet(entry.description, 180),
    href: entry.href,
  }));
}
