import { describe, expect, it } from "vitest";
import { validateInstall, validateManifest } from "@openfulldive/plugin-api";
import { roadmapManifest } from "./manifest.js";

describe("roadmap manifest", () => {
  it("passes the SDK's own manifest validation", () => {
    expect(() => validateManifest(roadmapManifest)).not.toThrow();
  });

  it("installs cleanly when granted exactly what it requires", () => {
    expect(() =>
      validateInstall(roadmapManifest, {
        trust: "official",
        enabled: true,
        grants: ["navigation.contribute", "search.contribute", "user.storage"],
      }),
    ).not.toThrow();
  });

  it("declares only the storage keys the UI actually uses", () => {
    expect(roadmapManifest.storage?.keys).toEqual(["progress:v1", "favorites:v1"]);
  });

  it("owns /roadmap and /roadmap/[slug], and one search category", () => {
    expect(roadmapManifest.routes?.map((r) => r.path)).toEqual(["/roadmap", "/roadmap/[slug]"]);
    expect(roadmapManifest.search?.map((s) => s.id)).toEqual(["roadmap"]);
  });
});
