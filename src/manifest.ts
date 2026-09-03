import type { PluginManifest } from "@openfulldive/plugin-api";

/**
 * The Roadmap plugin's manifest — serializable metadata the host validates and
 * installs. The host owns the routes (`/roadmap`, `/roadmap/[slug]`) and renders
 * them as thin adapters over this plugin's UI; the plugin owns the content, the
 * component, and the search provider.
 */
export const roadmapManifest: PluginManifest = {
  id: "roadmap",
  name: "Roadmap",
  version: "0.1.0-alpha.0",
  apiVersion: "0.1",
  description: "Contributor roadmaps toward the eight full-dive capabilities.",
  navigation: [
    { id: "roadmap.navigation.main", label: "Roadmap", href: "/roadmap", icon: "map", order: 20 },
  ],
  routes: [
    { id: "index", path: "/roadmap" },
    { id: "detail", path: "/roadmap/[slug]" },
  ],
  requires: ["navigation.contribute", "search.contribute", "user.storage"],
  storage: { namespace: "roadmap.storage", keys: ["progress:v1", "favorites:v1"] },
  search: [{ id: "roadmap", label: "Roadmap", order: 80 }],
};
