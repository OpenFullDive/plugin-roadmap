/**
 * `@openfulldive/plugin-roadmap` — the Roadmap plugin for OpenFullDive.
 *
 * The root entry is **safe metadata only**: the manifest and the roadmap
 * content. The React component and the search provider are separate entry
 * points so the host never pulls a client component or a provider into the
 * wrong bundle:
 *
 *   - `@openfulldive/plugin-roadmap`        → manifest + content (this file)
 *   - `@openfulldive/plugin-roadmap/ui`     → RoadmapExplorer (a client component)
 *   - `@openfulldive/plugin-roadmap/server` → searchRoadmap (the search provider)
 */
export { roadmapManifest } from "./manifest";
export {
  masterRoadmap,
  roadmapFields,
  roadmapFieldById,
  slugifyTopic,
  legacyTrackAliases,
  type RoadmapField,
  type RoadmapSection,
  type RoadmapCategory,
  type TopicStatus,
} from "./content/roadmap";
