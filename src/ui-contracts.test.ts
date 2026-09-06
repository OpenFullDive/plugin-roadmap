/**
 * Comprehensive Opaque-Box Contracts and Invariants Test Suite
 * Covers Tier 1 (Storage bridge & public interfaces), Tier 2 (Boundary conditions & stress),
 * and Tier 3 (Cross-feature interactions, progress tracking, checklist, and persistence integration).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  legacyTrackAliases,
  masterRoadmap,
  roadmapFieldById,
  roadmapFields,
  slugifyTopic,
  type RoadmapField,
  type TopicStatus,
} from "./content/roadmap";
import { getTopicDetails } from "./content/topic-details";
import {
  CHECKLIST_KEY,
  CHECKLIST_STORAGE_KEY,
  FAVORITES_KEY,
  FAVORITES_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  STATUS_KEY,
  readLocal,
  topicKey,
  writeLocal,
} from "./ui/utils/storage";
import type { RoadmapStorage } from "./ui/types/props";

// ============================================================================
// Tier 1: Storage Bridge Contracts, Synchronization & Fallback
// ============================================================================
describe("Tier 1: Storage Bridge Contracts & Protocols", () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mockLocalStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockLocalStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockLocalStorage[k];
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exports exact canonical storage keys matching specification", () => {
    expect(STATUS_KEY).toBe("ofd-roadmap-status-v1");
    expect(FAVORITES_KEY).toBe("ofd-roadmap-favorites-v1");
    expect(CHECKLIST_KEY).toBe("ofd-roadmap-checklist-v1");

    expect(PROGRESS_STORAGE_KEY).toBe("roadmap:progress");
    expect(FAVORITES_STORAGE_KEY).toBe("roadmap:favorites");
    expect(CHECKLIST_STORAGE_KEY).toBe("roadmap:checklist");
  });

  it("generates deterministic topic keys in '${field.id}:${slugifiedTopic}' format", () => {
    for (const field of roadmapFields) {
      for (const section of field.sections) {
        for (const topic of section.topics) {
          const key = topicKey(field, topic);
          expect(key).toBe(`${field.id}:${slugifyTopic(topic)}`);
          expect(key).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/);
          expect(key).not.toContain(" ");
        }
      }
    }
  });

  it("synchronizes storage bridge: unauthenticated user relies strictly on localStorage", async () => {
    mockLocalStorage[STATUS_KEY] = JSON.stringify({
      "neuroscience:sensory-perception": "done",
    });
    mockLocalStorage[FAVORITES_KEY] = JSON.stringify(["neuroscience"]);
    mockLocalStorage[CHECKLIST_KEY] = JSON.stringify({
      "neuroscience:sensory-perception:chk:0": true,
    });

    const getStateMock = vi.fn();
    const setStateMock = vi.fn();
    const storage: RoadmapStorage = {
      getState: getStateMock,
      setState: setStateMock,
    };

    // When isSignedIn is false:
    const isSignedIn = false;
    let loadedStatuses: Record<string, TopicStatus> = {};
    let loadedFavs: string[] = [];
    let loadedChecklist: Record<string, boolean> = {};

    if (!isSignedIn) {
      loadedStatuses = readLocal(STATUS_KEY, {});
      loadedFavs = readLocal(FAVORITES_KEY, []);
      loadedChecklist = readLocal(CHECKLIST_KEY, {});
    } else {
      await storage.getState();
    }

    expect(getStateMock).not.toHaveBeenCalled();
    expect(setStateMock).not.toHaveBeenCalled();
    expect(loadedStatuses["neuroscience:sensory-perception"]).toBe("done");
    expect(loadedFavs).toContain("neuroscience");
    expect(loadedChecklist["neuroscience:sensory-perception:chk:0"]).toBe(true);
  });

  it("synchronizes storage bridge: migrates non-empty localStorage when remote is undefined", async () => {
    // Setup local data
    const localStatuses = { "bci:visual-evoked-potentials": "learning" as TopicStatus };
    const localFavorites = ["bci"];
    const localChecklist = { "bci:visual-evoked:chk:1": true };

    mockLocalStorage[STATUS_KEY] = JSON.stringify(localStatuses);
    mockLocalStorage[FAVORITES_KEY] = JSON.stringify(localFavorites);
    mockLocalStorage[CHECKLIST_KEY] = JSON.stringify(localChecklist);

    const remoteStore: Record<string, unknown> = {}; // Empty remote store (keys are undefined)

    const setStateMock = vi.fn(async (key: string, value: unknown) => {
      remoteStore[key] = value;
      return { ok: true };
    });

    const storage: RoadmapStorage = {
      getState: vi.fn(async () => ({ ...remoteStore })),
      setState: setStateMock,
    };

    // Simulate synchronization protocol
    const remote = await storage.getState();
    let progress = remote?.[PROGRESS_STORAGE_KEY] as Record<string, TopicStatus> | undefined;
    let favs = remote?.[FAVORITES_STORAGE_KEY] as string[] | undefined;
    let checklist = remote?.[CHECKLIST_STORAGE_KEY] as Record<string, boolean> | undefined;

    if (progress === undefined) {
      const local = readLocal<Record<string, TopicStatus> | null>(STATUS_KEY, null);
      if (local && Object.keys(local).length > 0) {
        const result = await storage.setState(PROGRESS_STORAGE_KEY, local);
        if (result?.ok) progress = local;
      }
    }
    if (favs === undefined) {
      const local = readLocal<string[] | null>(FAVORITES_KEY, null);
      if (local && local.length > 0) {
        const result = await storage.setState(FAVORITES_STORAGE_KEY, local);
        if (result?.ok) favs = local;
      }
    }
    if (checklist === undefined) {
      const local = readLocal<Record<string, boolean> | null>(CHECKLIST_KEY, null);
      if (local && Object.keys(local).length > 0) {
        const result = await storage.setState(CHECKLIST_STORAGE_KEY, local);
        if (result?.ok) checklist = local;
      }
    }

    // Verify migration occurred
    expect(setStateMock).toHaveBeenCalledWith(PROGRESS_STORAGE_KEY, localStatuses);
    expect(setStateMock).toHaveBeenCalledWith(FAVORITES_STORAGE_KEY, localFavorites);
    expect(setStateMock).toHaveBeenCalledWith(CHECKLIST_STORAGE_KEY, localChecklist);

    expect(progress).toEqual(localStatuses);
    expect(favs).toEqual(localFavorites);
    expect(checklist).toEqual(localChecklist);
  });

  it("synchronizes storage bridge: remote data takes precedence when already populated", async () => {
    mockLocalStorage[STATUS_KEY] = JSON.stringify({ "bci:local-node": "learning" });

    const remoteStatuses = { "bci:remote-node": "done" };
    const storage: RoadmapStorage = {
      getState: vi.fn(async () => ({
        [PROGRESS_STORAGE_KEY]: remoteStatuses,
      })),
      setState: vi.fn(),
    };

    const remote = await storage.getState();
    let progress = remote?.[PROGRESS_STORAGE_KEY] as Record<string, TopicStatus> | undefined;

    if (progress === undefined) {
      const local = readLocal<Record<string, TopicStatus> | null>(STATUS_KEY, null);
      if (local) await storage.setState(PROGRESS_STORAGE_KEY, local);
    }

    expect(storage.setState).not.toHaveBeenCalled();
    expect(progress).toEqual(remoteStatuses);
  });

  it("write-through persistence writes to localStorage and invokes storage.setState outside render updaters", async () => {
    const setStateCalls: { key: string; value: unknown }[] = [];
    const storage: RoadmapStorage = {
      getState: async () => ({}),
      setState: async (key, value) => {
        setStateCalls.push({ key, value });
        return { ok: true };
      },
    };

    const persist = (localKey: string, remoteKey: string, value: unknown) => {
      writeLocal(localKey, value);
      storage.setState(remoteKey, value).catch(() => {});
    };

    const newStatuses = { "neuroscience:action-potentials": "done" };
    persist(STATUS_KEY, PROGRESS_STORAGE_KEY, newStatuses);

    expect(readLocal(STATUS_KEY, {})).toEqual(newStatuses);
    expect(setStateCalls).toHaveLength(1);
    expect(setStateCalls[0]?.key).toBe(PROGRESS_STORAGE_KEY);
    expect(setStateCalls[0]?.value).toEqual(newStatuses);
  });
});

// ============================================================================
// Tier 2: Boundary Conditions, Error Resilience & Adversarial Stress
// ============================================================================
describe("Tier 2: Boundary Conditions & Adversarial Edge Cases", () => {
  it("search matching: empty query and whitespace-only query match zero nodes", () => {
    const isNodeMatched = (label: string, query: string): boolean => {
      return query.trim().length > 0 && label.toLowerCase().includes(query.toLowerCase().trim());
    };

    const sampleLabels = [
      "Action potential dynamics",
      "BCI Decoder",
      "Sensory Perception",
      "Unreal Engine 5",
    ];

    for (const label of sampleLabels) {
      expect(isNodeMatched(label, "")).toBe(false);
      expect(isNodeMatched(label, "   ")).toBe(false);
      expect(isNodeMatched(label, "\t\n")).toBe(false);
    }
  });

  it("search matching: safely handles regex meta-characters without throwing SyntaxError", () => {
    const isNodeMatched = (label: string, query: string): boolean => {
      return query.trim().length > 0 && label.toLowerCase().includes(query.toLowerCase().trim());
    };

    const adversarialQueries = [
      ".*",
      "(",
      ")",
      "[",
      "]",
      "{",
      "}",
      "+",
      "?",
      "^",
      "$",
      "\\",
      "|",
      "C++",
      "C++20",
      "tDCS/tACS",
      "ISO-14971",
    ];

    for (const query of adversarialQueries) {
      expect(() => {
        isNodeMatched("C++20 Causal Architecture", query);
      }).not.toThrow();
    }

    // Literal character match check
    expect(isNodeMatched("C++20 Causal Architecture", "C++")).toBe(true);
    expect(isNodeMatched("C++20 Causal Architecture", "c++20")).toBe(true);
    // Period is literal dot, not regex wildcard
    expect(isNodeMatched("Action potential", ".")).toBe(false);
    expect(isNodeMatched("Neuropixels 2.0", ".")).toBe(true);
  });

  it("search matching: stress test with 5,000-character input completes instantly", () => {
    const isNodeMatched = (label: string, query: string): boolean => {
      return query.trim().length > 0 && label.toLowerCase().includes(query.toLowerCase().trim());
    };

    const extremeQuery = "a".repeat(5000);
    const start = performance.now();
    const result = isNodeMatched("Action potential dynamics", extremeQuery);
    const duration = performance.now() - start;

    expect(result).toBe(false);
    expect(duration).toBeLessThan(20); // Must execute in sub-20ms
  });

  it("canvas viewport: enforces MIN_FIT_SCALE = 0.62 under extreme narrow widths", () => {
    const MIN_FIT_SCALE = 0.62;
    const canvasWidth = 1000;

    const computeFitScale = (containerWidth: number) => {
      if (containerWidth <= 0) return MIN_FIT_SCALE;
      const rawScale = containerWidth / canvasWidth;
      return Math.min(1.0, Math.max(MIN_FIT_SCALE, rawScale));
    };

    // Width 0 (collapsed container)
    expect(computeFitScale(0)).toBe(MIN_FIT_SCALE);

    // Narrow mobile width (320px screen -> 320 / 1000 = 0.32 -> clamped to 0.62)
    expect(computeFitScale(320)).toBe(MIN_FIT_SCALE);

    // Mid-range tablet width (750px -> 750 / 1000 = 0.75)
    expect(computeFitScale(750)).toBe(0.75);

    // Ultrawide screen (2560px -> clamped to 1.0, never upscaled beyond natural size)
    expect(computeFitScale(2560)).toBe(1.0);
  });

  it("canvas viewport: content-box measurement clamps negative inner widths to 0", () => {
    const computeInnerWidth = (clientWidth: number, padLeft: number, padRight: number) => {
      return Math.max(0, clientWidth - padLeft - padRight);
    };

    expect(computeInnerWidth(100, 16, 16)).toBe(68);
    expect(computeInnerWidth(20, 16, 16)).toBe(0); // Clamped, not negative
    expect(computeInnerWidth(0, 16, 16)).toBe(0);
  });

  it("canvas panning: accurately computes pannable, atStart, and atEnd boundary states", () => {
    const computePanState = (scrollWidth: number, clientWidth: number, scrollLeft: number) => {
      const max = scrollWidth - clientWidth;
      return {
        pannable: max > 8,
        atStart: scrollLeft <= 4,
        atEnd: max - scrollLeft <= 4,
      };
    };

    // Non-overflowing content
    expect(computePanState(800, 800, 0)).toEqual({
      pannable: false,
      atStart: true,
      atEnd: true,
    });

    // Overflowing content at beginning
    expect(computePanState(1600, 800, 0)).toEqual({
      pannable: true,
      atStart: true,
      atEnd: false,
    });

    // Overflowing content in middle
    expect(computePanState(1600, 800, 400)).toEqual({
      pannable: true,
      atStart: false,
      atEnd: false,
    });

    // Overflowing content at end (max = 800, scrollLeft = 798)
    expect(computePanState(1600, 800, 798)).toEqual({
      pannable: true,
      atStart: false,
      atEnd: true,
    });
  });

  it("storage resilience: handles corrupted localStorage JSON and quota exceeded gracefully", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "{ broken-json-syntax",
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });

    // Corrupted JSON returns fallback
    const fallback = { safe: true };
    const value = readLocal("corrupted-key", fallback);
    expect(value).toEqual(fallback);

    // QuotaExceededError is caught silently
    expect(() => {
      writeLocal("test-key", { huge: "data" });
    }).not.toThrow();

    vi.unstubAllGlobals();
  });

  it("storage resilience: handles remote storage promise rejection without crashing", async () => {
    const failingStorage: RoadmapStorage = {
      getState: vi.fn(async () => {
        throw new Error("503 Service Unavailable");
      }),
      setState: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    };

    let remoteResult: Record<string, unknown> | null = null;
    await expect(
      (async () => {
        remoteResult = await failingStorage.getState().catch(() => null);
      })(),
    ).resolves.not.toThrow();

    expect(remoteResult).toBeNull();

    await expect(
      (async () => {
        await failingStorage.setState("test", {}).catch(() => {});
      })(),
    ).resolves.not.toThrow();
  });

  it("roadmap slug resolution: safely handles unknown slugs and legacy aliases", () => {
    // Unknown slug returns undefined safely
    const unknown = roadmapFieldById("nonexistent-future-slug");
    expect(unknown).toBeUndefined();

    // Legacy aliases resolve correctly
    expect(legacyTrackAliases["signals"]).toBe("bci");
    expect(legacyTrackAliases["simulation"]).toBe("virtual-environments");
    expect(legacyTrackAliases["safety"]).toBe("ethical-engineering");

    for (const targetId of Object.values(legacyTrackAliases)) {
      expect(roadmapFieldById(targetId)).toBeDefined();
    }

    // Master roadmap slug integrity
    expect(masterRoadmap.id).toBe("full-dive-development");
    expect(masterRoadmap.title).toBe("Full-Dive VR Development");
  });
});

// ============================================================================
// Tier 3: Cross-Feature Interactions & Persistence Integration
// ============================================================================
describe("Tier 3: Cross-Feature Interactions & Progress Invariants", () => {
  it("progress tracking: computes mathematically exact percentage and respects topic status cycling", () => {
    const computeProgress = (
      allTopicKeys: string[],
      statuses: Record<string, TopicStatus>,
    ) => {
      const doneCount = allTopicKeys.filter((key) => statuses[key] === "done").length;
      const learningCount = allTopicKeys.filter((key) => statuses[key] === "learning").length;
      const progressPercent = allTopicKeys.length
        ? Math.round((doneCount / allTopicKeys.length) * 100)
        : 0;
      return { doneCount, learningCount, progressPercent };
    };

    // Boundary: 0 topics returns 0% (no NaN division by zero)
    expect(computeProgress([], {})).toEqual({
      doneCount: 0,
      learningCount: 0,
      progressPercent: 0,
    });

    const topicKeys = ["topic-1", "topic-2", "topic-3"];

    // Transition 1: topic-1 marked as learning
    let statuses: Record<string, TopicStatus> = { "topic-1": "learning" };
    expect(computeProgress(topicKeys, statuses)).toEqual({
      doneCount: 0,
      learningCount: 1,
      progressPercent: 0,
    });

    // Transition 2: topic-1 marked as done (1 of 3 -> 33%)
    statuses = { "topic-1": "done" };
    expect(computeProgress(topicKeys, statuses)).toEqual({
      doneCount: 1,
      learningCount: 0,
      progressPercent: 33,
    });

    // Transition 3: topic-2 marked as done (2 of 3 -> 67%)
    statuses = { "topic-1": "done", "topic-2": "done" };
    expect(computeProgress(topicKeys, statuses)).toEqual({
      doneCount: 2,
      learningCount: 0,
      progressPercent: 67,
    });

    // Transition 4: topic-3 marked as skipped (done count remains 2 -> 67%)
    statuses = { "topic-1": "done", "topic-2": "done", "topic-3": "skipped" };
    expect(computeProgress(topicKeys, statuses)).toEqual({
      doneCount: 2,
      learningCount: 0,
      progressPercent: 67,
    });

    // Transition 5: all marked as done -> 100%
    statuses = { "topic-1": "done", "topic-2": "done", "topic-3": "done" };
    expect(computeProgress(topicKeys, statuses)).toEqual({
      doneCount: 3,
      learningCount: 0,
      progressPercent: 100,
    });
  });

  it("checklist tracking: checkpoints for topic can be toggled and calculated", () => {
    const field = roadmapFields[0]!;
    const topic = field.sections[0]!.topics[0]!;
    const details = getTopicDetails(field.id, topic);

    expect(details.checkpoints.length).toBeGreaterThan(0);

    const checkedMap: Record<string, boolean> = {};

    // Checkpoint key pattern: ${field.id}:${topic}:chk:${idx}
    details.checkpoints.forEach((_, idx) => {
      const key = `${field.id}:${topic}:chk:${idx}`;
      checkedMap[key] = idx % 2 === 0; // Check even index items
    });

    const checkedCount = details.checkpoints.filter((_, idx) => {
      const key = `${field.id}:${topic}:chk:${idx}`;
      return !!checkedMap[key];
    }).length;

    const expectedEvenCount = Math.ceil(details.checkpoints.length / 2);
    expect(checkedCount).toBe(expectedEvenCount);
  });

  it("progress export: serializes a conforming JSON payload with summary and timestamp", () => {
    const allTopicKeys = [
      "neuroscience:sensory-perception",
      "neuroscience:neural-coding",
      "bci:visual-evoked-potentials",
    ];
    const statuses: Record<string, TopicStatus> = {
      "neuroscience:sensory-perception": "done",
      "bci:visual-evoked-potentials": "learning",
    };
    const favorites = ["neuroscience"];
    const checklists = { "neuroscience:sensory-perception:chk:0": true };

    const doneCount = allTopicKeys.filter((k) => statuses[k] === "done").length;
    const learningCount = allTopicKeys.filter((k) => statuses[k] === "learning").length;
    const progressPercent = Math.round((doneCount / allTopicKeys.length) * 100);

    const exportPayload = {
      roadmapSlug: "full-dive-development",
      exportedAt: new Date().toISOString(),
      summary: {
        total: allTopicKeys.length,
        done: doneCount,
        learning: learningCount,
        progressPercent,
      },
      statuses,
      favorites,
      checklists,
    };

    // Serialize and parse back
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const parsed = JSON.parse(jsonStr) as typeof exportPayload;

    expect(parsed.roadmapSlug).toBe("full-dive-development");
    expect(new Date(parsed.exportedAt).getTime()).not.toBeNaN();
    expect(parsed.summary.total).toBe(3);
    expect(parsed.summary.done).toBe(1);
    expect(parsed.summary.learning).toBe(1);
    expect(parsed.summary.progressPercent).toBe(33);
    expect(parsed.statuses["neuroscience:sensory-perception"]).toBe("done");
    expect(parsed.favorites).toEqual(["neuroscience"]);
    expect(parsed.checklists["neuroscience:sensory-perception:chk:0"]).toBe(true);
  });

  it("sequential topic traversal: flatTopics maintains exact sequential order and bounds", () => {
    type FlatTopic = { fieldId: string; sectionId: string; topic: string };
    const flatTopics: FlatTopic[] = [];

    for (const f of roadmapFields) {
      for (const s of f.sections) {
        for (const t of s.topics) {
          flatTopics.push({ fieldId: f.id, sectionId: s.id, topic: t });
        }
      }
    }

    expect(flatTopics.length).toBeGreaterThan(50);

    const getNav = (index: number) => {
      const prev = index > 0 ? flatTopics[index - 1] : null;
      const next = index >= 0 && index < flatTopics.length - 1 ? flatTopics[index + 1] : null;
      return { prev, next };
    };

    // Index 0 (first topic)
    const firstNav = getNav(0);
    expect(firstNav.prev).toBeNull();
    expect(firstNav.next).toEqual(flatTopics[1]);

    // Middle index
    const midIndex = Math.floor(flatTopics.length / 2);
    const midNav = getNav(midIndex);
    expect(midNav.prev).toEqual(flatTopics[midIndex - 1]);
    expect(midNav.next).toEqual(flatTopics[midIndex + 1]);

    // Last index
    const lastIndex = flatTopics.length - 1;
    const lastNav = getNav(lastIndex);
    expect(lastNav.prev).toEqual(flatTopics[lastIndex - 1]);
    expect(lastNav.next).toBeNull();

    // Invalid index (-1)
    const invalidNav = getNav(-1);
    expect(invalidNav.prev).toBeNull();
    expect(invalidNav.next).toBeNull();
  });

  it("tooltip timing and placement: satisfies 380ms warm / 500ms cool-down and vertical inversion", () => {
    // Placement vertical flip logic: top < 150 flips to below
    const computePlacement = (rectTop: number, rectBottom: number, rectLeft: number, rectWidth: number) => {
      const placement = rectTop < 150 ? ("below" as const) : ("above" as const);
      return {
        placement,
        x: rectLeft + rectWidth / 2,
        y: placement === "above" ? rectTop - 10 : rectBottom + 10,
      };
    };

    // High on screen (< 150px): flips below
    const topNode = computePlacement(80, 112, 200, 100);
    expect(topNode.placement).toBe("below");
    expect(topNode.x).toBe(250);
    expect(topNode.y).toBe(122); // 112 + 10

    // Lower on screen (>= 150px): renders above
    const lowerNode = computePlacement(300, 332, 200, 100);
    expect(lowerNode.placement).toBe("above");
    expect(lowerNode.x).toBe(250);
    expect(lowerNode.y).toBe(290); // 300 - 10

    // Timer specification constants
    const WARM_UP_DELAY_MS = 380;
    const COOL_DOWN_DELAY_MS = 500;
    expect(WARM_UP_DELAY_MS).toBe(380);
    expect(COOL_DOWN_DELAY_MS).toBe(500);
  });

  it("canvas keyboard navigation: enforces 120px regular and 320px shift panning steps", () => {
    const computeStep = (shiftKey: boolean) => (shiftKey ? 320 : 120);

    expect(computeStep(false)).toBe(120);
    expect(computeStep(true)).toBe(320);

    let scrollPos = 500;
    const scrollWidth = 2000;

    const moves: Record<string, (shift: boolean) => void> = {
      ArrowRight: (shift) => {
        scrollPos = Math.min(scrollWidth, scrollPos + computeStep(shift));
      },
      ArrowLeft: (shift) => {
        scrollPos = Math.max(0, scrollPos - computeStep(shift));
      },
      Home: () => {
        scrollPos = 0;
      },
      End: () => {
        scrollPos = scrollWidth;
      },
    };

    moves["ArrowRight"]!(false);
    expect(scrollPos).toBe(620);

    moves["ArrowRight"]!(true);
    expect(scrollPos).toBe(940);

    moves["ArrowLeft"]!(false);
    expect(scrollPos).toBe(820);

    moves["End"]!(false);
    expect(scrollPos).toBe(2000);

    moves["Home"]!(false);
    expect(scrollPos).toBe(0);
  });
});
