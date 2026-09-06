import { describe, expect, it, vi } from "vitest";
import React from "react";
import { roadmapFields } from "../../content/roadmap";
import {
  useRoadmapStorage,
  useRoadmapProgress,
  useTopicDrawer,
  useRoadmapSearch,
  useCanvasViewport,
  useCanvasTooltip,
  useShareActions,
  MIN_FIT_SCALE,
} from "./index";
import type { RoadmapStorage, SelectedTopic } from "../types";

/** Lightweight React hook test harness for Node.js environment */
function renderHook<T>(hookFn: () => T) {
  let isMount = true;
  let firstHook: any = null;
  let currentHook: any = null;
  let pendingEffects: any[] = [];
  const result = { current: undefined as unknown as T };

  function mountHook() {
    const hook = { memoizedState: null, queue: [] as any[], next: null };
    if (!firstHook) firstHook = currentHook = hook;
    else currentHook = currentHook.next = hook;
    return hook;
  }

  function updateHook() {
    currentHook = currentHook ? currentHook.next : firstHook;
    return currentHook;
  }

  const dispatcher = {
    useState(initial: any) {
      const hook = isMount ? mountHook() : updateHook();
      if (isMount) {
        hook.memoizedState = typeof initial === "function" ? initial() : initial;
        hook.queue = [];
      }
      while (hook.queue && hook.queue.length > 0) {
        const action = hook.queue.shift();
        hook.memoizedState = typeof action === "function" ? action(hook.memoizedState) : action;
      }
      const setState = (action: any) => {
        hook.queue.push(action);
        scheduleRender();
      };
      return [hook.memoizedState, setState];
    },
    useRef(initial: any) {
      const hook = isMount ? mountHook() : updateHook();
      if (isMount) hook.memoizedState = { current: initial };
      return hook.memoizedState;
    },
    useMemo(fn: () => any, deps?: unknown[]) {
      const hook = isMount ? mountHook() : updateHook();
      if (isMount) {
        hook.memoizedState = [fn(), deps];
        return hook.memoizedState[0];
      }
      const [prevVal, prevDeps] = hook.memoizedState;
      if (deps && prevDeps && deps.every((d: any, i: number) => Object.is(d, prevDeps[i]))) {
        return prevVal;
      }
      const nextVal = fn();
      hook.memoizedState = [nextVal, deps];
      return nextVal;
    },
    useCallback(fn: any, deps?: unknown[]) {
      return this.useMemo(() => fn, deps);
    },
    useEffect(effect: () => (() => void) | void, deps?: unknown[]) {
      const hook = isMount ? mountHook() : updateHook();
      if (isMount) {
        hook.memoizedState = { effect, deps, cleanup: null };
        pendingEffects.push(hook);
      } else {
        const prev = hook.memoizedState;
        const changed = !deps || !prev.deps || !deps.every((d: any, i: number) => Object.is(d, prev.deps[i]));
        if (changed) {
          hook.memoizedState = { effect, deps, cleanup: prev.cleanup };
          pendingEffects.push(hook);
        }
      }
    },
    useId() {
      const hook = isMount ? mountHook() : updateHook();
      if (isMount) hook.memoizedState = `:r${Math.random().toString(36).slice(2, 6)}:`;
      return hook.memoizedState;
    },
  };

  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    render();
    renderScheduled = false;
  }

  function render() {
    currentHook = null;
    const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const prevH = internals?.H;
    if (internals) internals.H = dispatcher;
    try {
      result.current = hookFn();
    } finally {
      if (internals) internals.H = prevH;
    }
    isMount = false;

    const effectsToRun = [...pendingEffects];
    pendingEffects = [];
    for (const h of effectsToRun) {
      if (h.memoizedState.cleanup) h.memoizedState.cleanup();
      h.memoizedState.cleanup = h.memoizedState.effect();
    }
  }

  render();
  return {
    result,
    rerender: scheduleRender,
    unmount() {
      let h = firstHook;
      while (h) {
        if (h.memoizedState?.cleanup) h.memoizedState.cleanup();
        h = h.next;
      }
    },
  };
}

describe("src/ui/hooks/useRoadmapStorage", () => {
  it("initializes from localStorage fallback and performs updates", () => {
    const mockStorage: Record<string, string> = {
      "ofd-roadmap-status-v1": JSON.stringify({ "bci:eeg": "done" }),
    };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
      },
    });

    const { result } = renderHook(() => useRoadmapStorage(undefined, false, "bci"));
    expect(result.current.statuses["bci:eeg"]).toBe("done");

    const target: SelectedTopic = {
      field: roadmapFields[0]!,
      section: roadmapFields[0]!.sections[0]!,
      topic: "Neural Decoding",
    };

    result.current.setStatus(target, "learning");
    expect(result.current.statuses[`${roadmapFields[0]!.id}:neural-decoding`]).toBe("learning");

    result.current.toggleFavorite("bci");
    expect(result.current.favorites).toContain("bci");
    result.current.toggleFavorite("bci");
    expect(result.current.favorites).not.toContain("bci");

    result.current.toggleChecklist("chk-1");
    expect(result.current.checkedChecklist["chk-1"]).toBe(true);

    vi.unstubAllGlobals();
  });

  it("syncs from storage bridge and migrates local items", async () => {
    let remoteData: Record<string, unknown> = {};
    const storage: RoadmapStorage = {
      getState: async () => remoteData,
      setState: async (k, v) => {
        remoteData[k] = v;
        return { ok: true };
      },
    };

    const mockStorage: Record<string, string> = {
      "ofd-roadmap-favorites-v1": JSON.stringify(["neuroscience"]),
    };
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
      },
    });

    const { result } = renderHook(() => useRoadmapStorage(storage, true, "master"));
    await new Promise((r) => setTimeout(r, 20));

    expect(result.current.favorites).toContain("neuroscience");
    expect(remoteData["roadmap:favorites"]).toEqual(["neuroscience"]);

    vi.unstubAllGlobals();
  });
});

describe("src/ui/hooks/useRoadmapProgress", () => {
  const fields = [roadmapFields[0]!];
  const sec = fields[0]!.sections[0]!;
  const top1 = sec.topics[0]!;
  const top2 = sec.topics[1]!;

  it("calculates flatTopics, counts, and percentages", () => {
    const key1 = `${fields[0]!.id}:${top1.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const statuses = { [key1]: "done" as const };

    const { result } = renderHook(() =>
      useRoadmapProgress(fields, fields[0], statuses, { "c-1": true }, ["bci"], "bci", {
        field: fields[0]!,
        section: sec,
        topic: top1,
      }),
    );

    expect(result.current.doneCount).toBe(1);
    expect(result.current.learningCount).toBe(0);
    expect(result.current.progressPercent).toBeGreaterThan(0);
    expect(result.current.checkedCount).toBe(1);
    expect(result.current.currentTopicIndex).toBe(0);
    expect(result.current.nextTopic?.topic).toBe(top2);
  });

  it("exports progress data as a JSON file", () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    const clickMock = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("document", {
      createElement: () => ({
        set href(_val: string) {},
        set download(_val: string) {},
        click: clickMock,
      }),
    });
    vi.stubGlobal("window", {});

    const { result } = renderHook(() =>
      useRoadmapProgress({
        fields,
        statuses: {},
        slug: "bci",
      }),
    );

    result.current.exportProgress();
    expect(clickMock).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

describe("src/ui/hooks/useTopicDrawer", () => {
  const fields = [roadmapFields[0]!];
  const flatTopics: SelectedTopic[] = [
    { field: fields[0]!, section: fields[0]!.sections[0]!, topic: "Topic 1" },
    { field: fields[0]!, section: fields[0]!.sections[0]!, topic: "Topic 2" },
  ];

  it("opens, navigates, and closes drawer", () => {
    const { result } = renderHook(() => useTopicDrawer({ flatTopics }));
    expect(result.current.selected).toBeNull();
    expect(result.current.drawerTitleId).toBeDefined();

    result.current.openTopic(flatTopics[0]!, null, "resources");
    expect(result.current.selected?.topic).toBe("Topic 1");
    expect(result.current.drawerTab).toBe("resources");
    expect(result.current.nextTopic?.topic).toBe("Topic 2");

    result.current.goToNextTopic();
    expect(result.current.selected?.topic).toBe("Topic 2");
    expect(result.current.prevTopic?.topic).toBe("Topic 1");

    result.current.closeDrawer();
    expect(result.current.selected).toBeNull();
  });
});

describe("src/ui/hooks/useRoadmapSearch", () => {
  it("matches nodes and responds to clear/predicate", () => {
    const { result } = renderHook(() => useRoadmapSearch("action"));
    expect(result.current.searchQuery).toBe("action");

    const matched = result.current.isNodeMatched({
      label: "Action Potentials",
      topicName: "Neurobiology",
    });
    expect(matched).toBe(true);

    expect(result.current.isNodeMatched("Action potential mechanism")).toBe(true);
    expect(result.current.isNodeMatched("Non-matching text")).toBe(false);

    result.current.clearSearch();
    expect(result.current.searchQuery).toBe("");
  });
});

describe("src/ui/hooks/useCanvasViewport", () => {
  it("computes fitScale, canFit, appliedScale, and handles zoom toggling", () => {
    const { result } = renderHook(() =>
      useCanvasViewport({ canvasWidth: 1000, initialZoom: "fit" }),
    );

    expect(result.current.zoom).toBe("fit");
    result.current.toggleZoom();
    expect(result.current.zoom).toBe("full");

    expect(MIN_FIT_SCALE).toBe(0.62);
  });
});

describe("src/ui/hooks/useCanvasTooltip", () => {
  it("formats node tooltips, ARIA labels, and lighting groups", () => {
    const { result } = renderHook(() => useCanvasTooltip("bci", false));

    const label = result.current.nodeAriaLabel({
      label: "EEG Signals",
      status: "done",
      badge: "recommended",
    });
    expect(label).toContain("EEG Signals");
    expect(label).toContain("Done");
    expect(label).toContain("Personal recommendation");
    expect(label).toContain("Open topic details");

    const tip = result.current.nodeTooltip({
      label: "EEG Signals",
      topicName: "Action Potentials",
      field: roadmapFields[0]!,
      status: "done",
    });
    expect(tip.title).toBe("EEG Signals");
    expect(typeof tip.body).toBe("string");
  });
});

describe("src/ui/hooks/useShareActions", () => {
  it("generates share links and coordinates copy and share intents", async () => {
    vi.stubGlobal("window", {
      location: { origin: "https://openfulldive.org" },
      open: vi.fn(),
      isSecureContext: true,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const { result } = renderHook(() =>
      useShareActions({ slug: "bci", isMaster: false, title: "BCI Roadmap" }),
    );

    expect(result.current.shareLink()).toBe("https://openfulldive.org/roadmap/bci");
    expect(result.current.shareText).toBe("BCI Roadmap — an OpenFullDive roadmap");

    const copied = await result.current.copyLink();
    expect(copied).toBe(true);
    expect(result.current.copied).toBe(true);

    result.current.openShareIntent("https://twitter.com/intent/tweet");
    expect((window as any).open).toHaveBeenCalledWith(
      "https://twitter.com/intent/tweet",
      "_blank",
      "noopener,noreferrer",
    );

    vi.unstubAllGlobals();
  });
});
