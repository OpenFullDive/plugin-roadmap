"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  ClipboardCheck,
  Code2,
  Compass,
  Download,
  ExternalLink,
  Flag,
  FolderKanban,
  GitFork,
  Layers3,
  List,
  MessageCircle,
  Move,
  Network,
  PauseCircle,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Square,
  SquareCheck,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  masterRoadmap,
  roadmapFieldById,
  roadmapFields,
  slugifyTopic,
  type RoadmapField,
  type RoadmapSection,
  type TopicStatus,
} from "../content/roadmap";
import { getTopicDetails, type TopicDetail, type TopicResource } from "../content/topic-details";
import { StickyRail } from "./StickyRail";
import "./flowchart.css";

export type RoadmapStorage = {
  getState: () => Promise<Record<string, unknown> | null>;
  setState: (key: string, value: unknown) => Promise<{ ok: boolean; error?: string }>;
};

export type RoadmapExplorerProps = {
  slug: string;
  isSignedIn?: boolean;
  storage?: RoadmapStorage;
};

type Tab = "roadmap" | "projects" | "contribute";
type ViewMode = "flowchart" | "linear";
type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type DifficultyFilter = Difficulty | "All";
type DrawerTab = "knowledge" | "resources" | "community";

type SelectedTopic = {
  field: RoadmapField;
  section: RoadmapSection;
  topic: string;
  subtopicFocus?: string;
};

const STATUS_KEY = "ofd-roadmap-status-v1";
const FAVORITES_KEY = "ofd-roadmap-favorites-v1";
const CHECKLIST_KEY = "ofd-roadmap-checklist-v1";
const PROGRESS_STORAGE_KEY = "roadmap:progress";
const FAVORITES_STORAGE_KEY = "roadmap:favorites";
const CHECKLIST_STORAGE_KEY = "roadmap:checklist";

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota limits
  }
}

const MASTER_TIERS = [
  {
    tier: "Tier 1",
    title: "Scientific & Physical Foundations",
    description: "Cellular neuroscience, biological sensory pathways, compute silicon, and spatial simulation engines.",
    ids: ["neuroscience", "hardware-architecture", "virtual-environments"],
  },
  {
    tier: "Tier 2",
    title: "Interfaces & Neural Interaction",
    description: "Signal acquisition, closed-loop decoding, tactile/kinesthetic actuation, and targeted neuromodulation.",
    ids: ["bci", "haptics", "neural-modulation", "sensory-substitution"],
  },
  {
    tier: "Tier 3",
    title: "Systems, Software & Safety",
    description: "Hard real-time operating systems, end-to-end latency budgets, and physiological fail-safes.",
    ids: ["software-frameworks", "system-integration", "ethical-engineering"],
  },
  {
    tier: "Tier 4",
    title: "Frontier Research & Synthesis",
    description: "Synaptic connectomics, high-density recording, and long-term molecular interface horizons.",
    ids: ["advanced-neural-mapping", "future-frontiers"],
  },
];

export default function RoadmapExplorer({ slug, isSignedIn = false, storage }: RoadmapExplorerProps) {
  const isMaster = slug === masterRoadmap.id;
  const field = roadmapFieldById(slug);
  const fields = isMaster ? roadmapFields : field ? [field] : [];
  const serverBacked = isSignedIn && !!storage;

  // View & Navigation States
  const [tab, setTab] = useState<Tab>("roadmap");
  const [viewMode, setViewMode] = useState<ViewMode>("flowchart");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("Beginner");
  const [selected, setSelected] = useState<SelectedTopic | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("knowledge");

  // Flowchart Canvas Pan & Zoom States
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Persistence States
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackQuery, setTrackQuery] = useState("");

  const canvasViewportRef = useRef<HTMLDivElement>(null);

  // Sync state between storage bridge and localStorage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serverBacked || !storage) {
        setStatuses(readLocal(STATUS_KEY, {}));
        setFavorites(readLocal(FAVORITES_KEY, []));
        setCheckedChecklist(readLocal(CHECKLIST_KEY, {}));
        return;
      }

      const remote = await storage.getState().catch(() => null);
      if (cancelled) return;

      let progress = remote?.[PROGRESS_STORAGE_KEY] as Record<string, TopicStatus> | undefined;
      let favs = remote?.[FAVORITES_STORAGE_KEY] as string[] | undefined;
      let checklist = remote?.[CHECKLIST_STORAGE_KEY] as Record<string, boolean> | undefined;

      if (progress === undefined) {
        const local = readLocal<Record<string, TopicStatus> | null>(STATUS_KEY, null);
        if (local && Object.keys(local).length > 0) {
          const result = await storage.setState(PROGRESS_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) progress = local;
        }
      }
      if (favs === undefined) {
        const local = readLocal<string[] | null>(FAVORITES_KEY, null);
        if (local && local.length > 0) {
          const result = await storage.setState(FAVORITES_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) favs = local;
        }
      }
      if (checklist === undefined) {
        const local = readLocal<Record<string, boolean> | null>(CHECKLIST_KEY, null);
        if (local && Object.keys(local).length > 0) {
          const result = await storage.setState(CHECKLIST_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) checklist = local;
        }
      }

      if (cancelled) return;
      setStatuses(progress ?? {});
      setFavorites(favs ?? []);
      setCheckedChecklist(checklist ?? {});
    })();
    return () => {
      cancelled = true;
    };
  }, [serverBacked, storage]);

  const title = isMaster ? masterRoadmap.title : field?.title ?? "Roadmap not found";
  const description = isMaster ? masterRoadmap.description : field?.description ?? "This roadmap does not exist.";
  const audience = isMaster ? masterRoadmap.audience : field?.audience ?? "";
  const duration = isMaster ? masterRoadmap.duration : field?.duration ?? "";
  const favoriteId = isMaster ? masterRoadmap.id : field?.id ?? slug;
  const saved = favorites.includes(favoriteId);

  // Flattened topic list for sequential next/prev navigation
  const flatTopics = useMemo(() => {
    const list: SelectedTopic[] = [];
    for (const f of fields) {
      for (const s of f.sections) {
        for (const t of s.topics) {
          list.push({ field: f, section: s, topic: t });
        }
      }
    }
    return list;
  }, [fields]);

  const allTopicKeys = useMemo(
    () => fields.flatMap((item) => item.sections.flatMap((section) => section.topics.map((topic) => topicKey(item, topic)))),
    [fields],
  );
  const doneCount = allTopicKeys.filter((key) => statuses[key] === "done").length;
  const learningCount = allTopicKeys.filter((key) => statuses[key] === "learning").length;
  const progressPercent = allTopicKeys.length ? Math.round((doneCount / allTopicKeys.length) * 100) : 0;

  // Find first incomplete topic for "Continue" button
  const firstIncomplete = useMemo(() => {
    for (const item of flatTopics) {
      const key = topicKey(item.field, item.topic);
      if (statuses[key] !== "done" && statuses[key] !== "skipped") {
        return item;
      }
    }
    return null;
  }, [flatTopics, statuses]);

  // Active topic index in flattened list
  const currentTopicIndex = useMemo(() => {
    if (!selected) return -1;
    return flatTopics.findIndex(
      (item) => item.field.id === selected.field.id && item.topic === selected.topic,
    );
  }, [selected, flatTopics]);

  const prevTopic = currentTopicIndex > 0 ? flatTopics[currentTopicIndex - 1] : null;
  const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < flatTopics.length - 1 ? flatTopics[currentTopicIndex + 1] : null;

  // Detail for the currently selected topic
  const activeTopicDetail: TopicDetail | null = useMemo(() => {
    if (!selected) return null;
    return getTopicDetails(selected.field.id, selected.topic);
  }, [selected]);

  const visibleTracks = useMemo(() => {
    const query = trackQuery.trim().toLowerCase();
    if (!query) return roadmapFields;
    return roadmapFields.filter((item) =>
      [item.title, item.shortTitle, item.category, item.description].join(" ").toLowerCase().includes(query),
    );
  }, [trackQuery]);

  const projects = useMemo(
    () =>
      fields.flatMap((item) =>
        item.sections.flatMap((section) => [
          {
            id: `${item.id}-${section.id}-beginner`,
            difficulty: "Beginner" as const,
            field: item,
            title: `Map the evidence for ${section.topics[0]}`,
            description: `Build a short, sourced explainer separating established results, constraints, and open questions in ${section.title}.`,
          },
          {
            id: `${item.id}-${section.id}-intermediate`,
            difficulty: "Intermediate" as const,
            field: item,
            title: section.project,
            description: `Turn the ${section.title} milestone into an inspectable community reproduction with explicit methods and limitations.`,
          },
          {
            id: `${item.id}-${section.id}-advanced`,
            difficulty: "Advanced" as const,
            field: item,
            title: `Verification protocol for ${section.title}`,
            description: `Design an adversarial test suite evaluating edge cases, latency boundaries, and safety limits for ${section.title}.`,
          },
        ]),
      ),
    [fields],
  );

  // Status mutation handlers
  const setStatus = (target: SelectedTopic, next: TopicStatus | undefined) => {
    const key = topicKey(target.field, target.topic);
    setStatuses((prev) => {
      const updated = { ...prev };
      if (next === undefined) delete updated[key];
      else updated[key] = next;

      writeLocal(STATUS_KEY, updated);
      if (serverBacked && storage) {
        storage.setState(PROGRESS_STORAGE_KEY, updated).catch(() => {});
      }
      return updated;
    });
  };

  const cycleStatus = (e: React.MouseEvent, target: SelectedTopic) => {
    e.stopPropagation();
    const key = topicKey(target.field, target.topic);
    const current = statuses[key];
    const order: Array<TopicStatus | undefined> = [undefined, "learning", "done", "skipped"];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    setStatus(target, order[nextIdx]);
  };

  const toggleFavorite = () => {
    setFavorites((prev) => {
      const next = prev.includes(favoriteId) ? prev.filter((id) => id !== favoriteId) : [...prev, favoriteId];
      writeLocal(FAVORITES_KEY, next);
      if (serverBacked && storage) {
        storage.setState(FAVORITES_STORAGE_KEY, next).catch(() => {});
      }
      return next;
    });
  };

  const toggleChecklist = (checkKey: string) => {
    setCheckedChecklist((prev) => {
      const next = { ...prev, [checkKey]: !prev[checkKey] };
      writeLocal(CHECKLIST_KEY, next);
      if (serverBacked && storage) {
        storage.setState(CHECKLIST_STORAGE_KEY, next).catch(() => {});
      }
      return next;
    });
  };

  const share = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const exportProgress = () => {
    const data = {
      roadmapSlug: slug,
      exportedAt: new Date().toISOString(),
      summary: {
        total: allTopicKeys.length,
        done: doneCount,
        learning: learningCount,
        progressPercent,
      },
      statuses,
      favorites,
      checklists: checkedChecklist,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openfulldive-roadmap-${slug}-progress.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  // Canvas Pan & Zoom Handlers
  const handleZoomIn = () => setZoom((z) => Math.min(1.5, Math.round((z + 0.15) * 100) / 100));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    // Don't drag if clicking a button or link
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input")) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(1.5, Math.max(0.5, Math.round((z + delta) * 100) / 100)));
    }
  };

  return (
    <div className="min-w-0">
      {/* Top Header & Overview Bar */}
      <header className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-[var(--dim)] uppercase">
              <Compass size={14} className="text-[var(--accent)] flex-shrink-0" />
              <span>OpenFullDive Roadmap</span>
              <span>·</span>
              <span className="text-[var(--accent-bright)]">{isMaster ? "Complete Curriculum" : field?.category}</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)] m-0">{title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {firstIncomplete && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[rgba(63,140,255,0.12)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-bright)] hover:bg-[var(--accent)] hover:text-white transition-all cursor-pointer max-w-[200px] sm:max-w-[280px]"
                onClick={() => {
                  setSelected(firstIncomplete);
                  setDrawerTab("knowledge");
                }}
                title={`Continue with: ${firstIncomplete.topic}`}
              >
                <span className="truncate">Continue: {firstIncomplete.topic}</span>
                <ArrowRight size={13} className="flex-shrink-0" />
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <button
                className="inline-flex size-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors cursor-pointer"
                onClick={exportProgress}
                aria-label="Export Progress JSON"
                title="Export Progress JSON"
              >
                {exported ? <Check size={15} /> : <Download size={15} />}
              </button>

              <button
                className={clsx(
                  "inline-flex size-[34px] items-center justify-center rounded-lg border bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors cursor-pointer",
                  saved ? "border-[var(--accent-bright)] text-[var(--accent-bright)] bg-[rgba(63,140,255,0.1)]" : "border-[var(--border)]",
                )}
                onClick={toggleFavorite}
                aria-label={saved ? "Saved" : "Save roadmap"}
                title={saved ? "Saved" : "Save roadmap"}
              >
                {saved ? <Check size={15} /> : <Bookmark size={15} />}
              </button>

              <button
                className="inline-flex size-[34px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors cursor-pointer"
                onClick={share}
                aria-label="Share roadmap"
                title="Share roadmap link"
              >
                {copied ? <Check size={15} /> : <Share2 size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Description & Progress Summary Bar */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-[var(--border)] pt-4">
          <p className="max-w-[72ch] text-xs text-[var(--muted)] leading-relaxed m-0">{description}</p>
          <div className="flex w-full md:w-auto min-w-[240px] md:max-w-[440px] flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--dim)] font-mono">
              <span className="flex items-center gap-1.5">
                Progress: <strong className="text-[var(--text)]">{progressPercent}%</strong>
              </span>
              <span>
                {doneCount} of {allTopicKeys.length} topics done
              </span>
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-bright)] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <nav className="mt-4 flex items-center gap-2 border-b border-[var(--border)] text-xs font-semibold overflow-x-auto no-scrollbar -mb-[1px]" aria-label="Roadmap views">
          <button
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 py-2.5 px-3.5 transition-colors cursor-pointer bg-transparent border-0 font-medium whitespace-nowrap text-xs",
              tab === "roadmap"
                ? "border-[var(--accent-bright)] text-[var(--text)] font-bold"
                : "border-transparent text-[var(--dim)] hover:text-[var(--muted)] hover:border-[var(--border)]",
            )}
            onClick={() => setTab("roadmap")}
          >
            <Layers3 size={15} /> Learning Flowchart
          </button>
          <button
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 py-2.5 px-3.5 transition-colors cursor-pointer bg-transparent border-0 font-medium whitespace-nowrap text-xs",
              tab === "projects"
                ? "border-[var(--accent-bright)] text-[var(--text)] font-bold"
                : "border-transparent text-[var(--dim)] hover:text-[var(--muted)] hover:border-[var(--border)]",
            )}
            onClick={() => setTab("projects")}
          >
            <FolderKanban size={15} /> Projects ({projects.length})
          </button>
          <button
            className={clsx(
              "inline-flex items-center gap-2 border-b-2 py-2.5 px-3.5 transition-colors cursor-pointer bg-transparent border-0 font-medium whitespace-nowrap text-xs",
              tab === "contribute"
                ? "border-[var(--accent-bright)] text-[var(--text)] font-bold"
                : "border-transparent text-[var(--dim)] hover:text-[var(--muted)] hover:border-[var(--border)]",
            )}
            onClick={() => setTab("contribute")}
          >
            <GitFork size={15} /> How to Contribute
          </button>
        </nav>
      </header>

      {/* Workspace Grid: Flowchart Canvas + Track Rail */}
      <div className="roadmap-workspace-grid grid grid-cols-[minmax(0,1fr)_290px] items-start gap-6 pt-5 max-[1150px]:grid-cols-1">
        {/* Track Navigator Rail */}
        <StickyRail className="col-start-2 row-start-1 sticky top-[calc(var(--header-h,62px)+16px)] rounded-lg border border-[var(--border)] bg-[var(--surface)] max-[1150px]:!static max-[1150px]:col-start-1 max-[1150px]:row-start-2">
          <header className="flex items-center justify-between border-b border-[var(--border)] p-3.5">
            <div>
              <h2 className="text-xs font-bold text-[var(--text)] m-0 uppercase tracking-wider">All Disciplines</h2>
              <p className="text-[11px] text-[var(--dim)] m-0">12 Full-Dive tracks</p>
            </div>
            <span className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)] font-mono">
              {roadmapFields.length}
            </span>
          </header>

          <div className="p-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-[var(--dim)] focus-within:border-[var(--accent)]">
              <Search size={13} className="flex-shrink-0" />
              <input
                className="w-full border-0 bg-transparent p-0 text-[11px] text-[var(--text)] outline-none placeholder:text-[var(--dim)]"
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                placeholder="Filter roadmaps..."
              />
              {trackQuery && (
                <button
                  type="button"
                  onClick={() => setTrackQuery("")}
                  className="text-[var(--dim)] hover:text-[var(--text)] cursor-pointer bg-transparent border-0 p-0"
                  aria-label="Clear filter"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 p-2 max-h-[460px] overflow-y-auto">
            <Link
              href="/roadmap"
              className={clsx(
                "flex items-center justify-between rounded p-2 text-xs transition-colors hover:bg-[var(--surface-2)]",
                isMaster
                  ? "bg-[rgba(63,140,255,0.08)] font-bold text-[var(--text)] border-l-[3px] border-[var(--accent)]"
                  : "text-[var(--muted)]",
              )}
            >
              <span className="flex items-center gap-2">
                <Network size={14} className={isMaster ? "text-[var(--accent-bright)]" : "text-[var(--accent)]"} />
                <span>Master System Tree</span>
              </span>
              <span className="text-[10px] text-[var(--dim)] font-mono">
                {doneCount}/{allTopicKeys.length}
              </span>
            </Link>

            {visibleTracks.map((item) => {
              const keys = item.sections.flatMap((s) => s.topics.map((t) => topicKey(item, t)));
              const itemDone = keys.filter((k) => statuses[k] === "done").length;
              const trackPct = keys.length ? Math.round((itemDone / keys.length) * 100) : 0;
              const active = !isMaster && item.id === field?.id;
              const isComplete = keys.length > 0 && itemDone === keys.length;
              return (
                <Link
                  key={item.id}
                  href={`/roadmap/${item.id}`}
                  className={clsx(
                    "flex items-center justify-between rounded p-2 text-xs transition-colors hover:bg-[var(--surface-2)] group",
                    active
                      ? "bg-[rgba(63,140,255,0.08)] font-bold text-[var(--text)] border-l-[3px] border-[var(--accent)]"
                      : "text-[var(--muted)]",
                  )}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <div className="truncate font-medium group-hover:text-[var(--text)]">{item.shortTitle}</div>
                    <div className="text-[10px] text-[var(--dim)] truncate">{item.category}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-[var(--dim)] font-mono flex items-center gap-1">
                      {isComplete ? <Check size={11} className="text-[#10b981]" /> : null}
                      <span>{itemDone}/{keys.length}</span>
                    </span>
                    {keys.length > 0 && (
                      <div className="w-12 h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-200"
                          style={{ width: `${trackPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="p-3 border-t border-[var(--border)] text-[11px] text-[var(--dim)] space-y-1.5">
            <div className="flex items-center gap-2">
              <Users size={12} /> {audience}
            </div>
            <div className="flex items-center gap-2">
              <Flag size={12} /> {duration}
            </div>
          </div>
        </StickyRail>

        {/* Tab 1: Flowchart Learning Canvas */}
        {tab === "roadmap" && (
          <section className="col-start-1 row-start-1 min-w-0">
            {/* The Unified Roadmap Canvas & Curriculum Container */}
            <div className="roadmap-canvas-wrapper" aria-label="Interactive learning roadmap">
              {/* Consolidated Top Toolbar (Integrated into the Canvas Card) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                {/* Status Legend */}
                <div className="flex items-center gap-3 text-xs text-[var(--dim)]">
                  <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[11px]">
                    {isMaster ? "System Tree" : field?.title}
                  </span>
                  <span>·</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)]" />
                      Todo
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[var(--accent)] animate-pulse" />
                      Learning
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#10b981]" />
                      Done
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[var(--dim)] opacity-40" />
                      Skip
                    </span>
                  </div>
                </div>

                {/* View Switcher, Search, and Docked Zoom Controls */}
                <div className="flex items-center gap-2.5">
                  {/* View Mode Toggle: Flowchart vs Linear */}
                  {!isMaster && (
                    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
                      <button
                        type="button"
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-0",
                          viewMode === "flowchart"
                            ? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-bold"
                            : "bg-transparent text-[var(--dim)] hover:text-[var(--text)]",
                        )}
                        onClick={() => setViewMode("flowchart")}
                        title="Interactive Flowchart Diagram"
                      >
                        <Network size={12} /> Flowchart
                      </button>
                      <button
                        type="button"
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border-0",
                          viewMode === "linear"
                            ? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-bold"
                            : "bg-transparent text-[var(--dim)] hover:text-[var(--text)]",
                        )}
                        onClick={() => setViewMode("linear")}
                        title="Linear Step-by-Step Curriculum"
                      >
                        <List size={12} /> Linear Guide
                      </button>
                    </div>
                  )}

                  {/* Topic Search Input */}
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-xs text-[var(--dim)]">
                    <Search size={13} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Find topic..."
                      className="w-[140px] border-0 bg-transparent text-xs text-[var(--text)] outline-none placeholder:text-[var(--dim)]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-[var(--dim)] hover:text-[var(--text)]">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* DOCKED ZOOM CONTROLS (Only visible in Flowchart mode) */}
                  {viewMode === "flowchart" && (
                    <div className="flex items-center gap-1 pl-2 border-l border-[var(--border)]">
                      <button
                        type="button"
                        className="roadmap-control-btn"
                        onClick={handleZoomIn}
                        title="Zoom In (Ctrl + Scroll Up)"
                        aria-label="Zoom In"
                      >
                        <ZoomIn size={14} />
                      </button>
                      <span className="roadmap-zoom-label">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        type="button"
                        className="roadmap-control-btn"
                        onClick={handleZoomOut}
                        title="Zoom Out (Ctrl + Scroll Down)"
                        aria-label="Zoom Out"
                      >
                        <ZoomOut size={14} />
                      </button>
                      <button
                        type="button"
                        className="roadmap-control-btn"
                        onClick={handleResetView}
                        title="Reset Canvas Position and Zoom"
                        aria-label="Reset View"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Viewport Content: Flowchart Canvas OR Native Linear Guide */}
              {!isMaster && field && viewMode === "linear" ? (
                <div className="roadmap-linear-viewport p-6 sm:p-8 flex justify-center">
                  <div className="w-full max-w-[840px] space-y-6">
                    {field.sections.map((sec, secIdx) => {
                      const secKeys = sec.topics.map((t) => topicKey(field, t));
                      const secDone = secKeys.filter((k) => statuses[k] === "done").length;
                      const secPct = secKeys.length ? Math.round((secDone / secKeys.length) * 100) : 0;
                      return (
                        <div key={sec.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
                          <header className="mb-4">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                                Phase {secIdx + 1}
                              </span>
                              <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-mono text-[var(--dim)] border border-[var(--border)]">
                                {secDone}/{sec.topics.length} Done ({secPct}%)
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[var(--text)] m-0">{sec.title}</h3>
                            <p className="mt-1 text-xs text-[var(--muted)] m-0 leading-relaxed">{sec.summary}</p>
                            <div className="mt-3 h-1 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                              <div
                                className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                                style={{ width: `${secPct}%` }}
                              />
                            </div>
                          </header>

                          <div className="space-y-3">
                            {sec.topics.map((topic, topicIdx) => {
                              const key = topicKey(field, topic);
                              const status = statuses[key];
                              const details = getTopicDetails(field.id, topic);
                              return (
                                <div
                                  key={topic}
                                  className={clsx(
                                    "flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-lg border p-4 transition-all",
                                    status === "done"
                                      ? "border-[#10b981]/35 bg-[rgba(16,185,129,0.03)]"
                                      : status === "learning"
                                      ? "border-[var(--accent)]/45 bg-[rgba(63,140,255,0.03)]"
                                      : status === "skipped"
                                      ? "border-[var(--border)] bg-[var(--surface-2)] opacity-60"
                                      : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]",
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-mono text-[var(--dim)]">
                                        {secIdx + 1}.{topicIdx + 1}
                                      </span>
                                      <h4 className="text-sm font-bold text-[var(--text)] m-0">{topic}</h4>
                                      {details.badge && (
                                        <span
                                          className={clsx(
                                            "flowchart-main-node-badge",
                                            details.badge === "Core Milestone" && "is-core",
                                            details.badge === "Recommended" && "is-recommended",
                                            details.badge === "Advanced" && "is-frontier",
                                            details.badge === "Foundational" && "is-foundational",
                                          )}
                                        >
                                          {details.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-1.5 text-xs text-[var(--muted)] line-clamp-2 m-0 leading-relaxed">
                                      {details.overview}
                                    </p>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                      {details.subtopics.map((sub) => (
                                        <span
                                          key={sub}
                                          className="rounded bg-[var(--surface-3)] px-2 py-0.5 text-[10px] text-[var(--dim)]"
                                        >
                                          {sub}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      className={clsx(
                                        "flowchart-status-pill",
                                        status === "done" && "is-done",
                                        status === "learning" && "is-learning",
                                        status === "skipped" && "is-skipped",
                                        !status && "is-todo",
                                      )}
                                      onClick={(e) => cycleStatus(e, { field, section: sec, topic })}
                                      title="Click to cycle status: Todo -> Learning -> Done -> Skip"
                                    >
                                      {status === "done" && <CheckCircle2 size={11} />}
                                      {status === "learning" && <CircleDot size={11} />}
                                      {status === "skipped" && <PauseCircle size={11} />}
                                      {!status && <Circle size={11} />}
                                      <span>
                                        {status === "done"
                                          ? "Done"
                                          : status === "learning"
                                          ? "Learning"
                                          : status === "skipped"
                                          ? "Skip"
                                          : "Todo"}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-bright)] transition-colors cursor-pointer"
                                      onClick={() => {
                                        setSelected({ field, section: sec, topic });
                                        setDrawerTab("knowledge");
                                      }}
                                    >
                                      <span>Inspect</span>
                                      <ArrowRight size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  ref={canvasViewportRef}
                  className={clsx("roadmap-canvas-viewport", isDragging && "is-dragging")}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                >
                  {/* Transformed Flowchart Layer */}
                  <div
                    className="roadmap-canvas-transform"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    }}
                  >
                    {/* Mode A: Master System Map (4-Tier Tree) */}
                    {isMaster && (
                      <div className="master-tree-container">
                        {/* Start Node */}
                        <div className="flex justify-center mb-2 relative z-10">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-2 text-xs font-bold text-[var(--text)] shadow-lg">
                            <Sparkles size={16} className="text-[var(--accent-bright)]" />
                            Start: Foundations of Full-Dive VR
                          </div>
                        </div>

                        {MASTER_TIERS.map((tierGroup, tierIdx) => (
                          <div key={tierGroup.tier} className="master-tier-card">
                            <header className="master-tier-header">
                              <div>
                                <span className="master-tier-badge">{tierGroup.tier}</span>
                                <h3 className="master-tier-title">{tierGroup.title}</h3>
                              </div>
                              <p className="text-xs text-[var(--dim)] m-0 max-w-[440px] text-right max-[768px]:hidden">
                                {tierGroup.description}
                              </p>
                            </header>

                            <div className="master-fields-grid">
                              {tierGroup.ids.map((id) => {
                                const f = roadmapFieldById(id);
                                if (!f) return null;
                                const keys = f.sections.flatMap((s) => s.topics.map((t) => topicKey(f, t)));
                                const completed = keys.filter((k) => statuses[k] === "done").length;
                                const pct = keys.length ? Math.round((completed / keys.length) * 100) : 0;
                                return (
                                  <Link key={f.id} href={`/roadmap/${f.id}`} className="master-discipline-card group">
                                    <div>
                                      <div className="flex items-center justify-between text-[11px] text-[var(--dim)] mb-1.5">
                                        <span className="font-semibold">{f.category}</span>
                                        <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                                          {f.level}
                                        </span>
                                      </div>
                                      <h4 className="text-sm font-bold text-[var(--text)] group-hover:text-[var(--accent-bright)] transition-colors m-0 mb-1">
                                        {f.title}
                                      </h4>
                                      <p className="text-xs text-[var(--muted)] line-clamp-2 m-0 leading-relaxed">
                                        {f.description}
                                      </p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                                      <div className="flex items-center justify-between text-[11px] text-[var(--dim)] mb-1">
                                        <span>{completed}/{keys.length} completed</span>
                                        <span className="font-mono font-bold text-[var(--text)]">{pct}%</span>
                                      </div>
                                      <div className="h-1 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                                        <div
                                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-[var(--accent-bright)] group-hover:underline">
                                      <span>Explore Roadmap</span>
                                      <ChevronRight size={14} />
                                    </div>
                                  </Link>
                                );
                              })}
                            </div>

                            {tierIdx < MASTER_TIERS.length - 1 && (
                              <div className="master-tier-connector">
                                <div className="master-connector-line" />
                                <ChevronDown size={18} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mode B: Detailed Track Flowchart (Interactive Nodes) */}
                    {!isMaster && field && (
                      <div className="flowchart-track-container">
                        {/* Start Node */}
                        <div className="flex justify-center mb-6 relative z-10">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-2 text-xs font-bold text-[var(--text)] shadow-md">
                            <Sparkles size={15} className="text-[var(--accent-bright)]" />
                            Start: {field.title}
                          </div>
                        </div>

                        <div className="flowchart-vertical-connector">
                          <div className="flowchart-vertical-line" />
                          <ChevronDown size={16} />
                        </div>

                        {/* Interactive Stages / Sections */}
                        {field.sections.map((sec, secIdx) => {
                          const secKeys = sec.topics.map((t) => topicKey(field, t));
                          const secDone = secKeys.filter((k) => statuses[k] === "done").length;
                          return (
                            <div key={sec.id} className="flowchart-stage-block">
                              {/* Step Stage Marker Header */}
                              <div className="flowchart-stage-header">
                                <span className="flowchart-stage-pill">
                                  <span className="size-4 rounded-full bg-[var(--accent)] text-[10px] text-white flex items-center justify-center font-bold">
                                    {secIdx + 1}
                                  </span>
                                  <span>{sec.title}</span>
                                  <span className="opacity-60 text-[10px]">({secDone}/{sec.topics.length})</span>
                                </span>
                                <p className="flowchart-stage-desc">{sec.summary}</p>
                              </div>

                              {/* Stage Topic Nodes Column */}
                              <div className="flowchart-spine-flow">
                                {sec.topics.map((topic, topicIdx) => {
                                  const key = topicKey(field, topic);
                                  const status = statuses[key];
                                  const details = getTopicDetails(field.id, topic);
                                  const isSelected = selected?.topic === topic;
                                  const subtopicsLeft = details.subtopics.slice(0, 2);
                                  const subtopicsRight = details.subtopics.slice(2, 4);

                                  return (
                                    <div key={topic} className="flowchart-node-row">
                                      {/* Subtopics Left Wing */}
                                      <div className="flowchart-branch-container flowchart-branch-left">
                                        {subtopicsLeft.map((sub) => (
                                          <button
                                            key={sub}
                                            type="button"
                                            className="flowchart-subtopic-pill"
                                            onClick={() => {
                                              setSelected({ field, section: sec, topic, subtopicFocus: sub });
                                              setDrawerTab("knowledge");
                                            }}
                                            title={`Explore ${sub}`}
                                          >
                                            {sub}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Main Topic Node Card */}
                                      <button
                                        type="button"
                                        className={clsx(
                                          "flowchart-main-node",
                                          isSelected && "is-selected",
                                          status === "done" && "is-done",
                                          status === "learning" && "is-learning",
                                          status === "skipped" && "is-skipped",
                                        )}
                                        onClick={() => {
                                          setSelected({ field, section: sec, topic });
                                          setDrawerTab("knowledge");
                                        }}
                                      >
                                        <div className="flowchart-main-node-top">
                                          <span className="flowchart-main-node-title">{topic}</span>
                                          {details.badge && (
                                            <span
                                              className={clsx(
                                                "flowchart-main-node-badge",
                                                details.badge === "Core Milestone" && "is-core",
                                                details.badge === "Recommended" && "is-recommended",
                                                details.badge === "Advanced" && "is-frontier",
                                                details.badge === "Foundational" && "is-foundational",
                                              )}
                                            >
                                              {details.badge}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flowchart-main-node-footer">
                                          <span className="text-[var(--dim)] font-mono text-[10px]">
                                            Step {secIdx + 1}.{topicIdx + 1}
                                          </span>
                                          <span
                                            className={clsx(
                                              "flowchart-status-pill",
                                              status === "done" && "is-done",
                                              status === "learning" && "is-learning",
                                              status === "skipped" && "is-skipped",
                                              !status && "is-todo",
                                            )}
                                            onClick={(e) => cycleStatus(e, { field, section: sec, topic })}
                                            title="Click to cycle status: Todo -> Learning -> Done -> Skip"
                                          >
                                            {status === "done" && <CheckCircle2 size={11} />}
                                            {status === "learning" && <CircleDot size={11} />}
                                            {status === "skipped" && <PauseCircle size={11} />}
                                            {!status && <Circle size={11} />}
                                            <span>
                                              {status === "done"
                                                ? "Done"
                                                : status === "learning"
                                                ? "Learning"
                                                : status === "skipped"
                                                ? "Skip"
                                                : "Todo"}
                                            </span>
                                          </span>
                                        </div>
                                      </button>

                                      {/* Subtopics Right Wing */}
                                      <div className="flowchart-branch-container flowchart-branch-right">
                                        {subtopicsRight.map((sub) => (
                                          <button
                                            key={sub}
                                            type="button"
                                            className="flowchart-subtopic-pill"
                                            onClick={() => {
                                              setSelected({ field, section: sec, topic, subtopicFocus: sub });
                                              setDrawerTab("knowledge");
                                            }}
                                            title={`Explore ${sub}`}
                                          >
                                            {sub}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {secIdx < field.sections.length - 1 && (
                                <div className="flowchart-vertical-connector">
                                  <div className="flowchart-vertical-line" />
                                  <ChevronDown size={16} />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="flowchart-vertical-connector">
                          <div className="flowchart-vertical-line" />
                          <ChevronDown size={16} />
                        </div>

                        <div className="flex justify-center relative z-10">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-2.5 text-xs font-bold text-[var(--text)] shadow-md">
                            <Flag size={15} className="text-[var(--accent-bright)]" />
                            Field Milestone Complete: Ready to Build & Submit Evidence
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prerequisites & Related Disciplines Box */}
            {!isMaster && field && (
              <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 max-[768px]:grid-cols-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                    Prerequisites & Preparation
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {field.prerequisites.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <CheckCircle2 size={13} className="text-[var(--strong,#34d399)]" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                    Connecting Disciplines
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {field.related.map((id) => {
                      const rel = roadmapFieldById(id);
                      if (!rel) return null;
                      return (
                        <Link
                          key={id}
                          href={`/roadmap/${id}`}
                          className="flex items-center justify-between rounded border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors"
                        >
                          <span>{rel.title}</span>
                          <ArrowRight size={12} className="text-[var(--dim)]" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Projects */}
        {tab === "projects" && (
          <section className="col-start-1 row-start-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <header className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                Learn By Building
              </span>
              <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">
                {isMaster ? "Community Practice Projects" : `${field?.shortTitle} Projects`}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)] m-0">
                Every project is bounded to produce inspectable code, measurements, and limitations for community peer review.
              </p>
            </header>

            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {(["All", "Beginner", "Intermediate", "Advanced"] as DifficultyFilter[]).map((level) => {
                const count = level === "All" ? projects.length : projects.filter((p) => p.difficulty === level).length;
                return (
                  <button
                    key={level}
                    type="button"
                    className={clsx(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5",
                      difficulty === level
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-xs"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--dim)] hover:text-[var(--text)]",
                    )}
                    onClick={() => setDifficulty(level)}
                  >
                    <span>{level === "All" ? "All Levels" : level}</span>
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                        difficulty === level ? "bg-white/20 text-white" : "bg-[var(--surface-3)] text-[var(--dim)]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
              {projects
                .filter((p) => difficulty === "All" || p.difficulty === difficulty)
                .map((project) => (
                  <article
                    key={project.id}
                    className="flex flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 hover:border-[var(--border-strong)] transition-all hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--dim)] uppercase mb-1">
                        <span>{project.field.shortTitle}</span>
                        <span
                          className={clsx(
                            "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                            project.difficulty === "Beginner" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                            project.difficulty === "Intermediate" && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                            project.difficulty === "Advanced" && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                          )}
                        >
                          {project.difficulty}
                        </span>
                      </div>
                      <h3 className="mt-1 text-sm font-bold text-[var(--text)] m-0">{project.title}</h3>
                      <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed m-0">{project.description}</p>
                    </div>
                    <Link
                      href="/commons/technology"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-bright)] hover:underline"
                    >
                      <MessageCircle size={13} />
                      <span>Discuss project in Commons</span>
                      <ArrowRight size={12} />
                    </Link>
                  </article>
                ))}
            </div>
          </section>
        )}

        {/* Tab 3: Contribution Guide */}
        {tab === "contribute" && (
          <ContributionPanel fieldName={isMaster ? "Full-Dive Development" : field?.title ?? "this field"} />
        )}
      </div>

      {/* Slide-over Topic Detail Drawer */}
      {selected && activeTopicDetail && (
        <>
          <button
            type="button"
            className="roadmap-inspector-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm border-0 cursor-pointer"
            aria-label="Close topic drawer"
            onClick={() => setSelected(null)}
          />

          <aside
            className="roadmap-resource-drawer fixed top-0 right-0 bottom-0 z-50 flex w-[min(480px,94vw)] flex-col border-l border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
            aria-label={`${selected.topic} topic sheet`}
          >
            {/* Drawer Header */}
            <header className="flex items-start justify-between border-b border-[var(--border)] p-5">
              <div className="min-w-0 pr-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                  {selected.field.shortTitle} · {selected.section.title}
                </span>
                <h2 className="mt-1 text-lg font-bold text-[var(--text)] leading-snug m-0">{selected.topic}</h2>
              </div>
              <button
                type="button"
                className="grid size-8 flex-shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </header>

            {/* Status Segmented Controls */}
            <div className="border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                  Your Learning Status
                </span>
                {(() => {
                  const currentStatus = statuses[topicKey(selected.field, selected.topic)];
                  return (
                    <span className="text-[10px] text-[var(--dim)] font-mono">
                      {currentStatus ? `State: ${currentStatus.toUpperCase()}` : "State: TODO"}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 gap-1">
                {[
                  { id: undefined, label: "Todo", icon: Circle },
                  { id: "learning" as const, label: "Learning", icon: CircleDot },
                  { id: "done" as const, label: "Done", icon: CheckCircle2 },
                  { id: "skipped" as const, label: "Skip", icon: PauseCircle },
                ].map((item) => {
                  const currentStatus = statuses[topicKey(selected.field, selected.topic)];
                  const isActive = currentStatus === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={clsx(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all cursor-pointer border-0",
                        isActive
                          ? item.id === "done"
                            ? "bg-[#10b981] text-white shadow-sm font-bold"
                            : item.id === "learning"
                            ? "bg-[var(--accent)] text-white shadow-sm font-bold"
                            : item.id === "skipped"
                            ? "bg-[var(--dim)] text-white shadow-sm font-bold"
                            : "bg-[var(--surface-3)] text-[var(--text)] shadow-sm font-bold"
                          : "bg-transparent text-[var(--dim)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
                      )}
                      onClick={() => setStatus(selected, item.id)}
                    >
                      <Icon size={13} className="flex-shrink-0" />
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Sub-tabs */}
            <div className="flex border-b border-[var(--border)] px-5">
              <button
                type="button"
                className={clsx(
                  "flex-1 border-b-2 py-3 text-xs font-bold transition-colors cursor-pointer bg-transparent border-0 inline-flex items-center justify-center gap-1.5",
                  drawerTab === "knowledge"
                    ? "border-[var(--accent-bright)] text-[var(--text)]"
                    : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]",
                )}
                onClick={() => setDrawerTab("knowledge")}
              >
                <BookOpen size={14} /> Technical Brief
              </button>
              <button
                type="button"
                className={clsx(
                  "flex-1 border-b-2 py-3 text-xs font-bold transition-colors cursor-pointer bg-transparent border-0 inline-flex items-center justify-center gap-1.5",
                  drawerTab === "resources"
                    ? "border-[var(--accent-bright)] text-[var(--text)]"
                    : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]",
                )}
                onClick={() => setDrawerTab("resources")}
              >
                <ClipboardCheck size={14} /> Resources ({activeTopicDetail.resources.length})
              </button>
              <button
                type="button"
                className={clsx(
                  "flex-1 border-b-2 py-3 text-xs font-bold transition-colors cursor-pointer bg-transparent border-0 inline-flex items-center justify-center gap-1.5",
                  drawerTab === "community"
                    ? "border-[var(--accent-bright)] text-[var(--text)]"
                    : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]",
                )}
                onClick={() => setDrawerTab("community")}
              >
                <Users size={14} /> Build & Discuss
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {drawerTab === "knowledge" && (
                <>
                  {/* Detailed Technical Overview */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] m-0">
                        Scientific & Engineering Mechanism
                      </h3>
                      <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-bright)] uppercase">
                        {activeTopicDetail.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] leading-relaxed m-0">{activeTopicDetail.overview}</p>
                  </section>

                  {/* Branching Subtopics */}
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-2.5 m-0">
                      Core Concepts & Branching Nodes
                    </h3>
                    <div className="space-y-1.5">
                      {activeTopicDetail.subtopics.map((sub, idx) => (
                        <div
                          key={sub}
                          className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface-2)] p-2 text-xs text-[var(--text)]"
                        >
                          <span className="grid size-4 place-items-center rounded-full bg-[var(--surface-3)] text-[10px] font-mono text-[var(--dim)]">
                            {idx + 1}
                          </span>
                          <span>{sub}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Topic-Specific Checkpoint Competencies */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] m-0">
                        Verification Competencies
                      </h3>
                      <span className="text-[10px] text-[var(--dim)]">Click to save check</span>
                    </div>
                    <ul className="space-y-2 text-xs text-[var(--muted)] m-0 p-0 list-none">
                      {activeTopicDetail.checkpoints.map((item, idx) => {
                        const checkKey = `${selected.field.id}:${selected.topic}:chk:${idx}`;
                        const isChecked = checkedChecklist[checkKey] || false;
                        return (
                          <li
                            key={item}
                            role="checkbox"
                            aria-checked={isChecked}
                            tabIndex={0}
                            className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                            onClick={() => toggleChecklist(checkKey)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleChecklist(checkKey);
                              }
                            }}
                          >
                            {isChecked ? (
                              <SquareCheck size={16} className="text-[#10b981] flex-shrink-0 mt-0.5" />
                            ) : (
                              <Square size={16} className="text-[var(--dim)] flex-shrink-0 mt-0.5" />
                            )}
                            <span className={clsx(isChecked && "line-through text-[var(--dim)]", "leading-relaxed select-none")}>
                              {item}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </>
              )}

              {drawerTab === "resources" && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                    Curated Scientific & Technical Literature
                  </span>

                  {activeTopicDetail.resources.map((res) => (
                    <a
                      key={res.title}
                      href={res.url}
                      target={res.url.startsWith("http") ? "_blank" : undefined}
                      rel={res.url.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-start justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors text-decoration-none group"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={clsx("resource-chip-badge", `type-${res.type}`)}>{res.badge}</span>
                          {res.author && <span className="text-[10px] text-[var(--dim)] truncate">{res.author}</span>}
                        </div>
                        <div className="font-semibold group-hover:text-[var(--accent-bright)] transition-colors leading-snug">
                          {res.title}
                        </div>
                      </div>
                      <ExternalLink size={14} className="text-[var(--dim)] flex-shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              )}

              {drawerTab === "community" && (
                <div className="space-y-4">
                  <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                      Suggested Milestone Deliverable
                    </span>
                    <h4 className="mt-1 text-xs font-bold text-[var(--text)] m-0">{selected.section.project}</h4>
                    <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed m-0">
                      Submit an inspectable code bench, physical measurement dataset, or negative reproduction for peer review.
                    </p>
                    <Link
                      href="/contribute"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-bright)] hover:underline"
                    >
                      <Code2 size={13} /> Submit evidence to ledger →
                    </Link>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-2 m-0">
                      Commons Discussion
                    </h3>
                    <Link
                      href="/commons/technology"
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageCircle size={16} className="text-[var(--accent-bright)]" />
                        <div>
                          <div className="font-semibold">Technology Commons Feed</div>
                          <div className="text-[10px] text-[var(--dim)]">Discuss open interface challenges</div>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-[var(--dim)]" />
                    </Link>
                  </section>
                </div>
              )}
            </div>

            {/* Drawer Footer with Sequential Navigation */}
            <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)] p-4 gap-2">
              {prevTopic ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors cursor-pointer max-w-[180px]"
                  onClick={() => {
                    setSelected(prevTopic);
                    setDrawerTab("knowledge");
                  }}
                  title={`Previous: ${prevTopic.topic}`}
                >
                  <ArrowLeft size={13} className="flex-shrink-0" />
                  <span className="truncate">Previous</span>
                </button>
              ) : (
                <div />
              )}

              {nextTopic && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover,#2f6fd6)] transition-all cursor-pointer max-w-[220px]"
                  onClick={() => {
                    setSelected(nextTopic);
                    setDrawerTab("knowledge");
                  }}
                  title={`Next: ${nextTopic.topic}`}
                >
                  <span className="truncate">Next: {nextTopic.topic}</span>
                  <ArrowRight size={13} className="flex-shrink-0" />
                </button>
              )}
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}

function ContributionPanel({ fieldName }: { fieldName: string }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(0);

  const steps = [
    {
      title: "1. Choose one bounded problem",
      summary: "Pick a single topic node and define a reproducible deliverable reviewable within weeks.",
      detail: "Avoid broad architecture rewrites. Focus on a single verification checkpoint (e.g., verifying 128-channel spike sorter latency bounds or calibrating tactile stimulation array current).",
    },
    {
      title: "2. Declare scope and safety bounds",
      summary: "Document hypotheses, non-goals, measurement apparatus, and safe shutdown conditions.",
      detail: "Safety boundaries are strictly enforced. All biological or neural interface testing must specify isolation transformers, optical coupling, current limiting, and hardware emergency stop triggers.",
    },
    {
      title: "3. Build and test in public",
      summary: "Publish raw datasets, calibration benches, reproduction code, and negative findings.",
      detail: "Negative findings are as valuable as breakthroughs. Share failed iterations, measurement noise artifacts, and unexpected thermal or latency spikes in public repositories.",
    },
    {
      title: "4. Solicit peer challenge",
      summary: "Request cross-discipline critique from adjacent fields to test system integration assumptions.",
      detail: "Post draft RFCs in the Technology Commons feed. Software engineers must consult with neurobiology reviewers before assuming signal fidelity.",
    },
    {
      title: "5. Submit to the evidence ledger",
      summary: "Publish your findings to the community evidence ledger under editorial review.",
      detail: "Accepted evidence entries receive an immutable cryptographic digest, permanent archival citation, and integration into the master curriculum graph.",
    },
  ];

  return (
    <section className="col-start-1 row-start-1 min-w-0 flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
      <header>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
          From Learning to Useful Work
        </span>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">Contribute to {fieldName}</h2>
        <p className="mt-1 text-xs text-[var(--muted)] m-0 leading-relaxed max-w-[70ch]">
          The OpenFullDive project progresses through small, inspectable, and reproducible work—never through unsupported claims.
        </p>
      </header>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, idx) => {
          const isExpanded = expandedStep === idx;
          return (
            <article
              key={step.title}
              className={clsx(
                "rounded-lg border transition-all cursor-pointer overflow-hidden",
                isExpanded
                  ? "border-[var(--accent)] bg-[var(--surface-2)] shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]",
              )}
              onClick={() => setExpandedStep(isExpanded ? null : idx)}
            >
              <div className="flex items-center justify-between p-4">
                <div className="min-w-0 pr-3">
                  <h3 className="text-xs font-bold text-[var(--text)] m-0">{step.title}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed m-0">{step.summary}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={clsx(
                    "text-[var(--dim)] flex-shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180 text-[var(--accent-bright)]",
                  )}
                />
              </div>
              {isExpanded && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-3)]/40 px-4 py-3 text-xs text-[var(--dim)] leading-relaxed">
                  {step.detail}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center gap-3 pt-2">
        <Link className="primary btn inline-flex items-center gap-2" href="/commons/technology">
          <MessageCircle size={15} /> Start a project discussion
        </Link>
        <Link className="btn inline-flex items-center gap-2" href="/contribute">
          <ClipboardCheck size={15} /> Submit evidence
        </Link>
      </footer>
    </section>
  );
}

function topicKey(field: RoadmapField, topic: string) {
  return `${field.id}:${slugifyTopic(topic)}`;
}
