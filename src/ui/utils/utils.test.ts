import { describe, expect, it, vi } from "vitest";
import { roadmapFields } from "../../content/roadmap";
import {
  STATUS_KEY,
  FAVORITES_KEY,
  CHECKLIST_KEY,
  PROGRESS_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  CHECKLIST_STORAGE_KEY,
  readLocal,
  writeLocal,
  topicKey,
} from "./storage";
import { buildShareUrl, copyToClipboard, openShareUrl } from "./share";
import {
  getPlatformsForField,
  getPlatformMilestoneTitle,
  getDenoisingMethodsForField,
} from "./platform-helpers";
import { getFieldIcon, fieldIcon } from "./field-icons";
import { TRACK_CATEGORY_ORDER } from "../types";

describe("src/ui/utils/storage", () => {
  it("exports correct storage keys", () => {
    expect(STATUS_KEY).toBe("ofd-roadmap-status-v1");
    expect(FAVORITES_KEY).toBe("ofd-roadmap-favorites-v1");
    expect(CHECKLIST_KEY).toBe("ofd-roadmap-checklist-v1");
    expect(PROGRESS_STORAGE_KEY).toBe("roadmap:progress");
    expect(FAVORITES_STORAGE_KEY).toBe("roadmap:favorites");
    expect(CHECKLIST_STORAGE_KEY).toBe("roadmap:checklist");
  });

  it("handles readLocal and writeLocal with localStorage", () => {
    const mockStorage: Record<string, string> = {};
    const getItem = vi.fn((k: string) => mockStorage[k] ?? null);
    const setItem = vi.fn((k: string, v: string) => {
      mockStorage[k] = v;
    });

    vi.stubGlobal("window", {
      localStorage: {
        getItem,
        setItem,
      },
    });

    expect(readLocal("missing-key", { test: 123 })).toEqual({ test: 123 });

    writeLocal("test-key", { saved: true });
    expect(setItem).toHaveBeenCalledWith("test-key", JSON.stringify({ saved: true }));
    mockStorage["test-key"] = JSON.stringify({ saved: true });

    expect(readLocal("test-key", { saved: false })).toEqual({ saved: true });

    vi.unstubAllGlobals();
  });

  it("formats topicKey correctly using field and topic name", () => {
    const field = roadmapFields[0]!;
    const key = topicKey(field, "Action Potentials & Synapses");
    expect(key).toBe(`${field.id}:action-potentials-synapses`);
  });
});

describe("src/ui/utils/share", () => {
  it("builds correct share URLs for master and discipline roadmaps", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://openfulldive.org" },
    });

    expect(buildShareUrl("master", true)).toBe("https://openfulldive.org/roadmap");
    expect(buildShareUrl("bci", false)).toBe("https://openfulldive.org/roadmap/bci");
    expect(buildShareUrl("master-curriculum")).toBe("https://openfulldive.org/roadmap");

    vi.unstubAllGlobals();
  });

  it("copies to clipboard using navigator.clipboard when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const ok = await copyToClipboard("https://openfulldive.org/roadmap");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://openfulldive.org/roadmap");

    vi.unstubAllGlobals();
  });

  it("opens share url with noopener,noreferrer", () => {
    const openMock = vi.fn();
    vi.stubGlobal("window", { open: openMock });

    openShareUrl("https://twitter.com/intent/tweet");
    expect(openMock).toHaveBeenCalledWith("https://twitter.com/intent/tweet", "_blank", "noopener,noreferrer");

    vi.unstubAllGlobals();
  });
});

describe("src/ui/utils/platform-helpers", () => {
  it("returns platforms for fields", () => {
    const bciPlatforms = getPlatformsForField("bci");
    expect(bciPlatforms).toContain("OpenBCI Cyton");
    expect(bciPlatforms.length).toBeGreaterThan(0);

    const fallbackPlatforms = getPlatformsForField("unknown-discipline");
    expect(fallbackPlatforms).toContain("Standard Platform");
  });

  it("returns platform milestone titles", () => {
    expect(getPlatformMilestoneTitle("bci")).toBe("Pick Acquisition Platform");
    expect(getPlatformMilestoneTitle("neuroscience")).toBe("Pick Laboratory Apparatus");
    expect(getPlatformMilestoneTitle("unknown")).toBe("Select Primary Toolchain");
  });

  it("returns denoising methods for fields", () => {
    const bciDenoising = getDenoisingMethodsForField("bci");
    expect(bciDenoising).toContain("ICA Denoising");

    const fallback = getDenoisingMethodsForField("unknown");
    expect(fallback).toContain("Linear Filtering");
  });
});

describe("src/ui/utils/field-icons", () => {
  it("returns appropriate lucide icons for disciplines", () => {
    const bciIcon = getFieldIcon("bci");
    expect(bciIcon).toBeDefined();
    expect(fieldIcon("neuroscience")).toBeDefined();
    expect(getFieldIcon("unknown-field")).toBeDefined();
  });
});

describe("src/ui/types navigation constants", () => {
  it("provides 6 categories in order", () => {
    expect(TRACK_CATEGORY_ORDER).toHaveLength(6);
    expect(TRACK_CATEGORY_ORDER[0]).toBe("Neural Science");
  });
});
