import { describe, expect, it } from "vitest";
import {
  legacyTrackAliases,
  masterRoadmap,
  roadmapFieldById,
  roadmapFields,
  slugifyTopic,
} from "./roadmap.js";

const CATEGORIES = new Set([
  "Neural Science",
  "Interfaces & Haptics",
  "Virtual Systems",
  "Hardware & Software",
  "Safety & Integration",
  "Frontier Research",
]);
const LEVELS = new Set(["Foundation", "Intermediate", "Advanced"]);

describe("roadmap content integrity", () => {
  it("has at least one field and a master roadmap", () => {
    expect(roadmapFields.length).toBeGreaterThan(0);
    expect(masterRoadmap.id).toBeTruthy();
    expect(masterRoadmap.title).toBeTruthy();
  });

  it("gives every field a unique id", () => {
    const ids = roadmapFields.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every field a valid category and level and a non-empty title", () => {
    for (const f of roadmapFields) {
      expect(CATEGORIES.has(f.category), `${f.id}: category ${f.category}`).toBe(true);
      expect(LEVELS.has(f.level), `${f.id}: level ${f.level}`).toBe(true);
      expect(f.title.trim().length, f.id).toBeGreaterThan(0);
      expect(f.shortTitle.trim().length, f.id).toBeGreaterThan(0);
    }
  });

  it("resolves every `related` id to a real field (prerequisites are free-text, not ids)", () => {
    const ids = new Set(roadmapFields.map((f) => f.id));
    for (const f of roadmapFields) {
      for (const r of f.related) expect(ids.has(r), `${f.id} → related ${r}`).toBe(true);
      for (const p of f.prerequisites) expect(p.trim().length, `${f.id} → prerequisite`).toBeGreaterThan(0);
    }
  });

  it("produces stable, non-empty topic keys and non-empty section/topic content", () => {
    for (const f of roadmapFields) {
      expect(f.sections.length, f.id).toBeGreaterThan(0);
      for (const s of f.sections) {
        expect(s.title.trim().length).toBeGreaterThan(0);
        expect(s.topics.length).toBeGreaterThan(0);
        for (const t of s.topics) {
          expect(t.trim().length).toBeGreaterThan(0);
          const key = slugifyTopic(t);
          expect(key.length, `${t} → key`).toBeGreaterThan(0);
          expect(key).toBe(slugifyTopic(t)); // deterministic
          expect(key).toMatch(/^[a-z0-9-]+$/);
        }
      }
    }
  });

  it("resolves every legacy track alias to a real field id", () => {
    for (const [alias, target] of Object.entries(legacyTrackAliases)) {
      expect(roadmapFieldById(target), `alias ${alias} → ${target}`).toBeDefined();
    }
  });

  it("roadmapFieldById returns undefined for an unknown id", () => {
    expect(roadmapFieldById("nonexistent-field")).toBeUndefined();
  });
});
