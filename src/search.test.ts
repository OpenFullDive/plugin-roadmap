import { describe, expect, it } from "vitest";
import { searchRoadmap } from "./search.js";
import { roadmapFields } from "./content/roadmap.js";

describe("searchRoadmap", () => {
  it("finds a track by an exact title, ranked first, in the roadmap category", () => {
    const field = roadmapFields[0]!;
    const results = searchRoadmap(field.title, 10, 0);
    expect(results[0]?.id).toBe(field.id);
    expect(results.every((r) => r.category === "roadmap")).toBe(true);
  });

  it("matches on a substring across title/category/description", () => {
    const results = searchRoadmap("neural", 10, 0);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns nothing for an empty or unmatched query — never the whole list", () => {
    expect(searchRoadmap("", 10, 0)).toEqual([]);
    expect(searchRoadmap("   ", 10, 0)).toEqual([]);
    expect(searchRoadmap("zzz-nonexistent-zzz", 10, 0)).toEqual([]);
  });

  it("respects the host's limit and offset — cannot exceed the bound", () => {
    const page1 = searchRoadmap("e", 2, 0);
    const page2 = searchRoadmap("e", 2, 2);
    expect(page1.length).toBeLessThanOrEqual(2);
    expect(page2.length).toBeLessThanOrEqual(2);
    if (page1.length && page2.length) expect(page1[0]!.id).not.toBe(page2[0]!.id);
  });

  it("links every result into /roadmap", () => {
    for (const r of searchRoadmap("e", 50, 0)) {
      expect(r.href === "/roadmap" || r.href.startsWith("/roadmap/")).toBe(true);
    }
  });
});
