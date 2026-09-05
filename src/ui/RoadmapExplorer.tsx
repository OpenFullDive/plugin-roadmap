"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Boxes,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  CircleDot,
  ClipboardCheck,
  Code2,
  Compass,
  Cpu,
  Download,
  ExternalLink,
  Flag,
  FolderKanban,
  GitFork,
  HelpCircle,
  Link as LinkIcon,
  Layers3,
  List,
  MessageCircle,
  Microscope,
  Network,
  PauseCircle,
  Rocket,
  Search,
  MoveHorizontal,
  Share2,
  ShieldCheck,
  Sparkles,
  Split,
  Star,
  Square,
  SquareCheck,
  Users,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  masterRoadmap,
  roadmapFieldById,
  roadmapFields,
  slugifyTopic,
  type RoadmapCategory,
  type RoadmapField,
  type RoadmapSection,
  type TopicStatus,
} from "../content/roadmap";
import { getTopicDetails, type TopicDetail } from "../content/topic-details";
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
type DrawerTab = "knowledge" | "resources" | "community";

type NodeTooltip = {
  title: string;
  body: string;
  status?: TopicStatus;
  /** Viewport rect of the node the tooltip describes. */
  x: number;
  y: number;
  placement: "above" | "below";
};

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

const DRAWER_TABS = [
  { id: "knowledge" as const, label: "Technical Brief", icon: BookOpen },
  { id: "resources" as const, label: "Resources", icon: ClipboardCheck },
  { id: "community" as const, label: "Build & Discuss", icon: Users },
];

/** What a project of each difficulty produces — stated once, beside the filter
 *  that selects it, rather than repeated verbatim on all twenty-four cards. */
const PROJECT_KIND_BLURB: Record<Difficulty, string> = {
  Beginner: "Each is a sourced explainer separating established results from constraints and open questions.",
  Intermediate: "Each is an inspectable reproduction with explicit methods and stated limitations.",
  Advanced: "Each is an adversarial test suite covering edge cases, latency boundaries, and safety limits.",
};

/**
 * Every corner badge drew the same checkmark and changed only its fill, so the
 * three states were separated by hue alone — which this design system rules
 * out — and all three read as "done". Worse, the roadmap has a real done state
 * that is also green, so a green check on an untouched node contradicted the
 * progress it sits beside. Each state gets its own silhouette; colour now
 * reinforces the glyph instead of carrying the meaning by itself.
 */
/** Below this, scaling to fit trades a cut diagram for an unreadable one. */
const MIN_FIT_SCALE = 0.62;

const BADGE_ICON: Record<"recommended" | "alternative" | "elective", LucideIcon> = {
  recommended: Star,   // "I recommend this one"
  alternative: Split,  // "pick this or the other branch"
  elective: Clock,     // "order is not strict, learn it any time"
};

const BADGE_LABEL: Record<"recommended" | "alternative" | "elective", string> = {
  recommended: "Personal recommendation",
  alternative: "Alternative option",
  elective: "Order not strict, learn anytime",
};

const STATUS_LABEL: Record<NonNullable<TopicStatus>, string> = {
  done: "Done",
  learning: "Learning",
  skipped: "Skipped",
};

function getFieldIcon(fieldId: string) {
  switch (fieldId) {
    case "neuroscience":
      return Brain;
    case "hardware-architecture":
      return Cpu;
    case "virtual-environments":
      return Boxes;
    case "bci":
      return Activity;
    case "haptics":
      return Waves;
    case "neural-modulation":
      return Zap;
    case "sensory-substitution":
      return Layers3;
    case "software-frameworks":
      return Code2;
    case "system-integration":
      return Network;
    case "ethical-engineering":
      return ShieldCheck;
    case "advanced-neural-mapping":
      return Microscope;
    case "future-frontiers":
      return Rocket;
    default:
      return Compass;
  }
}

export default function RoadmapExplorer({ slug, isSignedIn = false, storage }: RoadmapExplorerProps) {
  const isMaster = slug === masterRoadmap.id;
  const field = roadmapFieldById(slug);
  const fields = isMaster ? roadmapFields : field ? [field] : [];
  const serverBacked = isSignedIn && !!storage;

  // View & Navigation States
  const [tab, setTab] = useState<Tab>("roadmap");
  const [viewMode, setViewMode] = useState<ViewMode>("flowchart");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [selected, setSelected] = useState<SelectedTopic | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("knowledge");
  const [showOverviewAccordion, setShowOverviewAccordion] = useState<boolean>(false);

  // Persistence States
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [railCopied, setRailCopied] = useState(false);
  /** Stable across server and client render — see the ids derived below. */
  const reactId = useId();
  const overviewPanelId = `${reactId}-overview`;
  const [exported, setExported] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Canvas interaction: which cluster is lit, and whether the canvas can pan.
  const [linkedGroup, setLinkedGroup] = useState<string | null>(null);
  const [pan, setPan] = useState({ pannable: false, atStart: true, atEnd: false });
  /** Measured width of the scroll viewport, for the fit-to-width scale. */
  const [containerWidth, setContainerWidth] = useState(0);
  /**
   * "fit" scales the whole topology into the viewport; "full" is 1:1 and pans.
   * Panning always slices whichever column you scroll past, so a diagram that
   * cannot fit is a diagram you can never see whole — this is the way out.
   */
  const [zoom, setZoom] = useState<"fit" | "full">("fit");
  const [tooltip, setTooltip] = useState<NodeTooltip | null>(null);

  const flowRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const drawerTitleId = `${reactId}-drawer-title`;
  /** The node that opened the drawer, so focus can be handed back on close. */
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * A tooltip should wait before appearing so a cursor crossing the canvas does
   * not strobe. Once one is open the delay has served its purpose, so the next
   * opens instantly — the toolbar feels faster without losing the protection.
   */
  const tooltipWarm = useRef(false);

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

  /**
   * Drawer keyboard contract. Before this the drawer was an `<aside>` that
   * closed on Escape and nothing else: opening it left focus on the node
   * behind the backdrop, and twelve Tab presses walked straight through the
   * flowchart underneath without ever entering the panel. It is a modal
   * dialog, so it behaves like one — focus moves in, cycles inside, and
   * returns to the node that opened it.
   */
  useEffect(() => {
    if (!selected) return;
    const drawer = drawerRef.current;
    if (!drawer) return;

    const previouslyFocused = lastTriggerRef.current ?? (document.activeElement as HTMLElement | null);

    const focusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Move focus to the panel itself rather than its first control, so a
    // screen reader reads the dialog's name and the topic before its actions.
    drawer.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelected(null);
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;

      if (!active || !drawer.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    /**
     * Lock the page behind the drawer.
     *
     * `document.body` alone is not enough: this document scrolls on `<html>`
     * (`document.scrollingElement`), so hiding overflow on the body did
     * nothing — the page kept scrolling under the modal and its scrollbar
     * stayed on screen beside the drawer's own. Lock whichever element
     * actually scrolls, and pad it, not the body, for the reclaimed gutter.
     */
    const scroller = (document.scrollingElement as HTMLElement | null) ?? document.body;
    const prevOverflow = scroller.style.overflow;
    const prevPadding = scroller.style.paddingRight;
    const prevBodyOverflow = document.body.style.overflow;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    scroller.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gutter > 0) scroller.style.paddingRight = `${gutter}px`;

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      scroller.style.overflow = prevOverflow;
      scroller.style.paddingRight = prevPadding;
      document.body.style.overflow = prevBodyOverflow;
      // Return focus only if it is still inside the panel being unmounted;
      // if the user has already clicked elsewhere, leave them where they are.
      const active = document.activeElement;
      if (previouslyFocused && (!active || active === document.body || drawer.contains(active))) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [selected]);

  /**
   * Track how far the canvas can pan. At 390px roughly two thirds of the
   * 1000px topology sits off-screen, and nothing on the screen said so.
   */
  const syncPan = useCallback(() => {
    const el = flowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    /**
     * `clientWidth` includes this element's own padding (16px a side at narrow
     * widths), so scaling against it produced a canvas exactly that much wider
     * than the box it had to sit in — the scaled diagram overflowed by the
     * padding and clipped its last column. Scale against the content box.
     */
    const cs = getComputedStyle(el);
    const inner = el.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
    setContainerWidth(Math.max(0, inner));
    setPan({
      pannable: max > 8,
      atStart: el.scrollLeft <= 4,
      atEnd: max - el.scrollLeft <= 4,
    });
  }, []);

  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    syncPan();
    el.addEventListener("scroll", syncPan, { passive: true });
    const ro = new ResizeObserver(syncPan);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", syncPan);
      ro.disconnect();
    };
  }, [syncPan, tab, viewMode, slug]);

  /** Arrow keys pan the canvas once it has focus; Home and End jump the ends. */
  const onCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = flowRef.current;
    if (!el || e.target !== el) return;
    const step = e.shiftKey ? 320 : 120;
    const moves: Record<string, () => void> = {
      ArrowRight: () => el.scrollBy({ left: step }),
      ArrowLeft: () => el.scrollBy({ left: -step }),
      Home: () => el.scrollTo({ left: 0 }),
      End: () => el.scrollTo({ left: el.scrollWidth }),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    move();
  }, []);

  /** Hovering or focusing a node lights its cluster; leaving clears it. */
  const openTooltip = useCallback(
    (el: HTMLElement, next: Omit<NodeTooltip, "x" | "y" | "placement">, group?: string, instant = false) => {
      setLinkedGroup(group ?? null);
      const show = () => {
        const r = el.getBoundingClientRect();
        // Flip below the node when there is not enough room above it.
        const placement = r.top < 150 ? "below" : "above";
        setTooltip({
          ...next,
          x: r.left + r.width / 2,
          y: placement === "above" ? r.top - 10 : r.bottom + 10,
          placement,
        });
        tooltipWarm.current = true;
      };
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      if (instant || tooltipWarm.current) show();
      else tooltipTimer.current = setTimeout(show, 380);
    },
    [],
  );

  const closeTooltip = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setLinkedGroup(null);
    setTooltip(null);
    // Give the delay back once the pointer has rested away from the canvas.
    tooltipTimer.current = setTimeout(() => {
      tooltipWarm.current = false;
    }, 500);
  }, []);

  useEffect(
    () => () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    },
    [],
  );


  const title = isMaster ? masterRoadmap.title : field?.title ?? "Roadmap not found";
  const description = isMaster ? masterRoadmap.description : field?.description ?? "This roadmap does not exist.";
  const audience = isMaster ? masterRoadmap.audience : field?.audience ?? "";
  const duration = isMaster ? masterRoadmap.duration : field?.duration ?? "";
  const favoriteId = isMaster ? masterRoadmap.id : field?.id ?? slug;
  const saved = favorites.includes(favoriteId);
  /** `["None"]` is how the content marks an entry-point track. */
  const hasPrerequisites =
    !!field && field.prerequisites.length > 0 && !field.prerequisites.every((p) => p.trim().toLowerCase() === "none");

  /**
   * Tooltip copy for a node: the topic's own name, the first sentence of its
   * mechanism, its tracked status, and the shortcut hint. The preview is what
   * makes a 32px pill decidable without opening the drawer for every one.
   */
  const nodeTooltip = useCallback(
    (node: { label: string; topicName: string; subtopicName?: string; field?: RoadmapField; status?: TopicStatus }) => {
      const fieldId = node.field?.id ?? (isMaster ? masterRoadmap.id : slug);
      const overview = getTopicDetails(fieldId, node.topicName).overview;
      const firstSentence = overview.split(/(?<=\.)\s/)[0] ?? overview;
      return {
        title: node.label,
        body: node.subtopicName && node.subtopicName !== node.label ? overview.slice(0, 190) : firstSentence.slice(0, 210),
        status: node.status,
      };
    },
    [isMaster, slug],
  );

  /**
   * A screen reader previously heard only the pill's label — not whether the
   * topic was done, nor that the button opens a detail panel.
   */
  const nodeAriaLabel = useCallback(
    (node: { label: string; status?: TopicStatus; badge?: "recommended" | "alternative" | "elective" }) => {
      const parts = [node.label];
      if (node.status) parts.push(STATUS_LABEL[node.status]);
      if (node.badge) parts.push(BADGE_LABEL[node.badge]);
      parts.push("Open topic details");
      return parts.join(". ");
    },
    [],
  );

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

  /**
   * Project cards used to open with the same seven words — "Map the evidence
   * for ..." — and carry the same 20-word sentence with one noun swapped, so
   * seventy-two cards read as one card printed seventy-two times and the only
   * distinguishing word sat at the end of each. The kind of work is a short tag
   * now, the subject is the heading, and the body states the deliverable rather
   * than restating the section already named in the eyebrow.
   */
  const projects = useMemo(
    () =>
      fields.flatMap((item) =>
        item.sections.flatMap((section) => [
          {
            id: `${item.id}-${section.id}-beginner`,
            difficulty: "Beginner" as const,
            field: item,
            section: section.title,
            kind: "Evidence map",
            title: section.topics[0] ?? section.title,
            description: "A sourced explainer separating established results from constraints and open questions.",
          },
          {
            id: `${item.id}-${section.id}-intermediate`,
            difficulty: "Intermediate" as const,
            field: item,
            section: section.title,
            kind: "Reproduction",
            title: section.project,
            description: "An inspectable community reproduction with explicit methods and stated limitations.",
          },
          {
            id: `${item.id}-${section.id}-advanced`,
            difficulty: "Advanced" as const,
            field: item,
            section: section.title,
            kind: "Verification",
            title: `Verification protocol for ${section.title}`,
            description: "An adversarial test suite covering edge cases, latency boundaries, and safety limits.",
          },
        ]),
      ),
    [fields],
  );

  // Status mutation handlers
  /**
   * Persist a value to `localStorage` and, when signed in, to the host's
   * storage bridge.
   *
   * This must never run inside a `setState` updater. React calls updaters
   * during the render phase — twice under StrictMode — and `storage.setState`
   * is a Server Action, so calling it there updated the Router mid-render and
   * produced "Cannot update a component (`Router`) while rendering a different
   * component (`RoadmapExplorer`)". Updaters stay pure; persistence happens in
   * the event handler that caused it.
   */
  const persist = useCallback(
    (localKey: string, remoteKey: string, value: unknown) => {
      writeLocal(localKey, value);
      if (serverBacked && storage) {
        storage.setState(remoteKey, value).catch(() => {});
      }
    },
    [serverBacked, storage],
  );

  const setStatus = (target: SelectedTopic, next: TopicStatus | undefined) => {
    const key = topicKey(target.field, target.topic);
    const updated = { ...statuses };
    if (next === undefined) delete updated[key];
    else updated[key] = next;
    setStatuses(updated);
    persist(STATUS_KEY, PROGRESS_STORAGE_KEY, updated);
  };

  const toggleFavorite = () => {
    const next = favorites.includes(favoriteId)
      ? favorites.filter((id) => id !== favoriteId)
      : [...favorites, favoriteId];
    setFavorites(next);
    persist(FAVORITES_KEY, FAVORITES_STORAGE_KEY, next);
  };

  const toggleChecklist = (checkKey: string) => {
    const next = { ...checkedChecklist, [checkKey]: !checkedChecklist[checkKey] };
    setCheckedChecklist(next);
    persist(CHECKLIST_KEY, CHECKLIST_STORAGE_KEY, next);
  };

  /**
   * One canonical link for every share surface. Built from the origin and the
   * roadmap's own path rather than `location.href`, so a link shared while a
   * topic drawer is open, or from a URL carrying stray query parameters, still
   * points at the roadmap itself.
   */
  const shareLink = useCallback(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/roadmap${isMaster ? "" : `/${slug}`}`;
  }, [isMaster, slug]);

  /**
   * The share text used to read `field?.title`, which is undefined on the
   * master curriculum — every share from `/roadmap` went out as the generic
   * "OpenFullDive Roadmap" instead of naming the roadmap.
   */
  const shareText = `${title} — an OpenFullDive roadmap`;

  const copyLink = useCallback(async () => {
    if (typeof window === "undefined") return false;
    const url = shareLink();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Clipboard API needs a secure context; plain HTTP still has to work.
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      return true;
    } catch {
      return false;
    }
  }, [shareLink]);

  const share = async () => {
    if (typeof window === "undefined") return;
    /**
     * On a phone the native sheet is where sharing actually happens, and it
     * reaches apps no intent URL can. Fall back to the clipboard everywhere
     * else, and when the sheet is dismissed.
     */
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url: shareLink() });
        return;
      } catch {
        // Dismissed or unsupported for this payload — fall through to copying.
      }
    }
    if (await copyLink()) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Intent windows are opened with `noopener,noreferrer`. Without it the
   * opened page receives `window.opener` and can navigate this tab somewhere
   * else while the reader is looking at the share dialog.
   */
  const openShareIntent = useCallback((url: string) => {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

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

  // --------------------------------------------------------------------------
  // Authentic roadmap.sh Flowchart Layout Engine (Fixed Document Scroll)
  // Pixel-accurate topology with radiating curved dotted lines, 2-column grids,
  // inlined project callout cards, titled section boxes, and corner status dots.
  // --------------------------------------------------------------------------
  const flowchartData = useMemo(() => {
    type NodeItem = {
      id: string;
      type: "milestone-main" | "milestone-sub" | "concept-pill" | "project-card" | "capstone" | "gate" | "discipline";
      topicName: string;
      subtopicName?: string;
      section: RoadmapSection;
      field?: RoadmapField;
      label: string;
      x: number;
      y: number;
      width: number;
      height: number;
      status?: TopicStatus;
      badge?: "recommended" | "alternative" | "elective";
      projectNote?: string;
      projectBtnText?: string;
      projectLevel?: Difficulty;
      href?: string;
      /**
       * Cluster key shared by a node and the edges that reach it. Hovering or
       * focusing a node lights its own cluster and recedes the rest, so the
       * path a topic sits on reads without tracing every line by eye. Optional:
       * the spine and convergence edges belong to no single cluster and stay
       * untagged, which leaves them dimmed with everything else.
       */
      group?: string;
    };

    type EdgeItem = {
      id: string;
      type: "spine" | "branch" | "radiating" | "solid";
      path: string;
      status?: TopicStatus;
      group?: string;
    };

    type SectionBoxItem = {
      id: string;
      title: string;
      boxX: number;
      boxY: number;
      boxW: number;
      boxH: number;
      labelX: number;
      labelY: number;
    };

    const CANVAS_WIDTH = 1000;
    const CENTER_X = 500;

    const nodes: NodeItem[] = [];
    const edges: EdgeItem[] = [];
    const sectionBoxes: SectionBoxItem[] = [];

    // ------------------------------------------------------------------------
    // A. MASTER CURRICULUM FLOWCHART TOPOLOGY (roadmap.sh Authentic Canvas)
    // ------------------------------------------------------------------------
    if (isMaster) {
      const legendCard = {
        x: 15,
        y: 20,
        width: 260,
        height: 120,
      };

      const curriculumCard = {
        x: 725,
        y: 20,
        width: 260,
        height: 120,
      };

      // Top Spine Guide Dotted Line
      edges.push({
        id: "master-top-spine-guide",
        type: "branch",
        path: `M ${CENTER_X} 20 V 160`,
      });

      // Master Track Start Title Node
      const trackTitleNode = {
        id: "master-start-title",
        label: "★ START: FULL-DIVE VR CURRICULUM",
        x: CENTER_X - 175,
        y: 160,
        width: 350,
        height: 44,
      };

      // --- PHASE 01: Scientific & Physical Foundations ---
      sectionBoxes.push({
        id: "sec-box-phase-1",
        title: "PHASE 01: SCIENTIFIC & PHYSICAL FOUNDATIONS",
        boxX: 20,
        boxY: 235,
        boxW: 960,
        boxH: 345,
        labelX: 45,
        labelY: 225,
      });

      edges.push({
        id: "spine-to-p1-hub",
        type: "spine",
        path: `M ${CENTER_X} 204 V 240`,
      });

      const getFirstSection = (f: RoadmapField): RoadmapSection =>
        f.sections[0] ?? {
          id: `${f.id}-default`,
          title: f.title,
          summary: f.description,
          topics: [f.title],
          project: `${f.title} Project`,
        };

      const neuroField = roadmapFieldById("neuroscience")!;
      const hwField = roadmapFieldById("hardware-architecture")!;
      const veField = roadmapFieldById("virtual-environments")!;

      nodes.push({
        id: "p1-hub",
        type: "milestone-sub",
        topicName: neuroField.sections[0]?.topics[0] ?? "Sensory Transduction",
        section: getFirstSection(neuroField),
        field: neuroField,
        label: "Sensory & Physical Substrates",
        x: CENTER_X - 150,
        y: 240,
        width: 300,
        height: 40,
        badge: "recommended",
      });

      // Branching to Phase 01 3 Disciplines
      const p1Disciplines = [
        { field: neuroField, colX: 40, pillX: 50, centerX: 180, topics: ["Sensory Perception & Transduction", "Neural Population Coding", "Cortical Map Topography"] },
        { field: hwField, colX: 360, pillX: 370, centerX: 500, topics: ["Neuromorphic Processing ASICs", "Sub-Millisecond Neural Bus", "Thermal Dissipation (<1°C rise)"] },
        { field: veField, colX: 680, pillX: 690, centerX: 820, topics: ["Spatial Engine Latency (<5ms)", "Perceptual Alignment & VOR", "Dynamic Lighting & Occlusion"] },
      ];

      p1Disciplines.forEach((d) => {
        if (d.centerX === 500) {
          edges.push({ id: `p1-hub-to-${d.field.id}`, type: "spine", path: `M 500 280 V 325`,
            group: `fld-${d.field.id}`,
          });
        } else {
          edges.push({
            id: `p1-hub-to-${d.field.id}`,
            type: "branch",
            path: `M 500 280 C 500 305, ${d.centerX} 300, ${d.centerX} 325`,
            group: `fld-${d.field.id}`,
          });
        }

        const sec = getFirstSection(d.field);
        const t0 = d.topics[0] ?? d.field.title;
        const status = statuses[topicKey(d.field, t0)];

        nodes.push({
          id: `disc-${d.field.id}`,
          type: "discipline",
          topicName: t0,
          section: sec,
          field: d.field,
          label: d.field.title,
          x: d.colX,
          y: 325,
          width: 280,
          height: 48,
          status,
          badge: d.field.level === "Foundation" ? "recommended" : "alternative",
          href: `/roadmap/${d.field.id}`,
          group: `fld-${d.field.id}`,
        });

        d.topics.forEach((t, tidx) => {
          const pillY = 388 + tidx * 40;
          edges.push({
            id: `p1-${d.field.id}-pill-edge-${tidx}`,
            type: "branch",
            path: `M ${d.centerX} ${tidx === 0 ? 373 : pillY - 8} V ${pillY}`,
            group: `fld-${d.field.id}`,
          });

          nodes.push({
            id: `p1-${d.field.id}-pill-${tidx}`,
            type: "concept-pill",
            topicName: t,
            section: sec,
            field: d.field,
            label: t,
            x: d.pillX,
            y: pillY,
            width: 260,
            height: 32,
            badge: tidx < 2 ? "recommended" : "alternative",
            status: statuses[topicKey(d.field, t)],
            group: `fld-${d.field.id}`,
          });
        });
      });

      // Converging to Gate 01
      edges.push({ id: "p1-converge-left", type: "branch", path: `M 180 500 C 180 520, 500 515, 500 535` });
      edges.push({ id: "p1-converge-center", type: "spine", path: `M 500 500 V 535` });
      edges.push({ id: "p1-converge-right", type: "branch", path: `M 820 500 C 820 520, 500 515, 500 535` });

      nodes.push({
        id: "gate-01",
        type: "gate",
        topicName: "Gate 01: Biological & Physical Transduction Validated",
        section: getFirstSection(neuroField),
        field: neuroField,
        label: "Gate 01: Biological & Physical Transduction Validated",
        x: 230,
        y: 535,
        width: 540,
        height: 38,
      });

      // --- PHASE 02: Interfaces & Neural Interaction ---
      sectionBoxes.push({
        id: "sec-box-phase-2",
        title: "PHASE 02: INTERFACES & NEURAL INTERACTION",
        boxX: 20,
        boxY: 605,
        boxW: 960,
        boxH: 450,
        labelX: 45,
        labelY: 595,
      });

      edges.push({ id: "gate-1-to-p2-hub", type: "spine", path: `M ${CENTER_X} 573 V 610` });

      const bciField = roadmapFieldById("bci")!;
      const hapticsField = roadmapFieldById("haptics")!;
      const nmField = roadmapFieldById("neural-modulation")!;
      const ssField = roadmapFieldById("sensory-substitution")!;

      nodes.push({
        id: "p2-hub",
        type: "milestone-sub",
        topicName: bciField.sections[0]?.topics[0] ?? "Neural Signal Acquisition",
        section: getFirstSection(bciField),
        field: bciField,
        label: "Closed-Loop Neural IO & Transduction",
        x: CENTER_X - 170,
        y: 610,
        width: 340,
        height: 40,
        badge: "recommended",
      });

      edges.push({ id: "p2-to-bci", type: "branch", path: `M 500 650 C 500 668, 260 662, 260 680` });
      edges.push({ id: "p2-to-haptics", type: "branch", path: `M 500 650 C 500 668, 740 662, 740 680` });
      edges.push({ id: "p2-spine-mid", type: "spine", path: `M 500 650 V 845` });
      edges.push({ id: "p2-to-nm", type: "branch", path: `M 500 845 C 500 852, 260 848, 260 855` });
      edges.push({ id: "p2-to-ss", type: "branch", path: `M 500 845 C 500 852, 740 848, 740 855` });

      const p2Cards = [
        { field: bciField, colX: 80, pillX: 90, centerX: 260, nodeY: 680, topics: ["Noninvasive EEG & ECoG Arrays", "Real-Time Motor Decoder Pipeline"] },
        { field: hapticsField, colX: 560, pillX: 570, centerX: 740, nodeY: 680, topics: ["Kinesthetic Resistance Actuators", "Electrotactile Stimulation Grids"] },
        { field: nmField, colX: 80, pillX: 90, centerX: 260, nodeY: 855, topics: ["Targeted TMS & Microstimulation", "Charge Density (<30µC/cm²) Watchdogs"] },
        { field: ssField, colX: 560, pillX: 570, centerX: 740, nodeY: 855, topics: ["Auditory-to-Tactile Spatial Mapping", "Cross-Modal Cortical Plasticity"] },
      ];

      p2Cards.forEach((d) => {
        const sec = getFirstSection(d.field);
        const t0 = d.topics[0] ?? d.field.title;
        nodes.push({
          id: `disc-${d.field.id}`,
          type: "discipline",
          topicName: t0,
          section: sec,
          field: d.field,
          label: d.field.title,
          x: d.colX,
          y: d.nodeY,
          width: 360,
          height: 44,
          status: statuses[topicKey(d.field, t0)],
          badge: d.field.level === "Intermediate" ? "alternative" : "recommended",
          href: `/roadmap/${d.field.id}`,
          group: `fld-${d.field.id}`,
        });

        d.topics.forEach((t, tidx) => {
          const pillY = d.nodeY + 54 + tidx * 38;
          edges.push({
            id: `p2-${d.field.id}-pill-edge-${tidx}`,
            type: "branch",
            path: `M ${d.centerX} ${tidx === 0 ? d.nodeY + 44 : pillY - 8} V ${pillY}`,
            group: `fld-${d.field.id}`,
          });

          nodes.push({
            id: `p2-${d.field.id}-pill-${tidx}`,
            type: "concept-pill",
            topicName: t,
            section: sec,
            field: d.field,
            label: t,
            x: d.pillX,
            y: pillY,
            width: 340,
            height: 30,
            badge: tidx === 0 ? "recommended" : "alternative",
            status: statuses[topicKey(d.field, t)],
            group: `fld-${d.field.id}`,
          });
        });
      });

      edges.push({ id: "p2-converge-left", type: "branch", path: `M 260 977 C 260 1005, 500 995, 500 1025` });
      edges.push({ id: "p2-converge-right", type: "branch", path: `M 740 977 C 740 1005, 500 995, 500 1025` });

      nodes.push({
        id: "gate-02",
        type: "gate",
        topicName: "Gate 02: Bi-Directional Closed-Loop Neural IO Synchronized",
        section: getFirstSection(bciField),
        field: bciField,
        label: "Gate 02: Bi-Directional Closed-Loop Neural IO Synchronized",
        x: 210,
        y: 1025,
        width: 580,
        height: 38,
      });

      // --- PHASE 03: Systems, Software & Safety ---
      sectionBoxes.push({
        id: "sec-box-phase-3",
        title: "PHASE 03: SYSTEMS, SOFTWARE & SAFETY",
        boxX: 20,
        boxY: 1095,
        boxW: 960,
        boxH: 340,
        labelX: 45,
        labelY: 1085,
      });

      edges.push({ id: "gate-2-to-p3-hub", type: "spine", path: `M ${CENTER_X} 1063 V 1100` });

      const sfField = roadmapFieldById("software-frameworks")!;
      const siField = roadmapFieldById("system-integration")!;
      const eeField = roadmapFieldById("ethical-engineering")!;

      nodes.push({
        id: "p3-hub",
        type: "milestone-sub",
        topicName: sfField.sections[0]?.topics[0] ?? "Deterministic Runtime Architecture",
        section: getFirstSection(sfField),
        field: sfField,
        label: "Deterministic Runtime & Safety Governance",
        x: CENTER_X - 160,
        y: 1100,
        width: 320,
        height: 40,
        badge: "recommended",
      });

      const p3Disciplines = [
        { field: sfField, colX: 40, pillX: 50, centerX: 180, topics: ["Deterministic RTOS Microkernel", "Asynchronous Telemetry Stream"] },
        { field: siField, colX: 360, pillX: 370, centerX: 500, topics: ["Sensor Fusion & Synchronization", "Subjective Baseline Calibration"] },
        { field: eeField, colX: 680, pillX: 690, centerX: 820, topics: ["Cognitive Privacy Encryption", "Fail-Safe Hardware Watchdogs"] },
      ];

      p3Disciplines.forEach((d) => {
        if (d.centerX === 500) {
          edges.push({ id: `p3-hub-to-${d.field.id}`, type: "spine", path: `M 500 1140 V 1180`,
            group: `fld-${d.field.id}`,
          });
        } else {
          edges.push({ id: `p3-hub-to-${d.field.id}`, type: "branch", path: `M 500 1140 C 500 1165, ${d.centerX} 1160, ${d.centerX} 1180`,
            group: `fld-${d.field.id}`,
          });
        }

        const sec = getFirstSection(d.field);
        const t0 = d.topics[0] ?? d.field.title;
        nodes.push({
          id: `disc-${d.field.id}`,
          type: "discipline",
          topicName: t0,
          section: sec,
          field: d.field,
          label: d.field.title,
          x: d.colX,
          y: 1180,
          width: 280,
          height: 48,
          status: statuses[topicKey(d.field, t0)],
          badge: d.field.level === "Advanced" ? "alternative" : "recommended",
          href: `/roadmap/${d.field.id}`,
          group: `fld-${d.field.id}`,
        });

        d.topics.forEach((t, tidx) => {
          const pillY = 1243 + tidx * 40;
          edges.push({
            id: `p3-${d.field.id}-pill-edge-${tidx}`,
            type: "branch",
            path: `M ${d.centerX} ${tidx === 0 ? 1228 : pillY - 8} V ${pillY}`,
            group: `fld-${d.field.id}`,
          });

          nodes.push({
            id: `p3-${d.field.id}-pill-${tidx}`,
            type: "concept-pill",
            topicName: t,
            section: sec,
            field: d.field,
            label: t,
            x: d.pillX,
            y: pillY,
            width: 260,
            height: 32,
            badge: tidx === 0 ? "recommended" : "alternative",
            status: statuses[topicKey(d.field, t)],
            group: `fld-${d.field.id}`,
          });
        });
      });

      edges.push({ id: "p3-converge-left", type: "branch", path: `M 180 1315 C 180 1340, 500 1335, 500 1360` });
      edges.push({ id: "p3-converge-center", type: "spine", path: `M 500 1315 V 1360` });
      edges.push({ id: "p3-converge-right", type: "branch", path: `M 820 1315 C 820 1340, 500 1335, 500 1360` });

      nodes.push({
        id: "gate-03",
        type: "gate",
        topicName: "Gate 03: Deterministic Runtime & Fail-Safe Watchdogs Verified",
        section: getFirstSection(sfField),
        field: sfField,
        label: "Gate 03: Deterministic Runtime & Fail-Safe Watchdogs Verified",
        x: 210,
        y: 1360,
        width: 580,
        height: 38,
      });

      // --- PHASE 04: Frontier Research & Synthesis ---
      sectionBoxes.push({
        id: "sec-box-phase-4",
        title: "PHASE 04: FRONTIER RESEARCH & SYNTHESIS",
        boxX: 20,
        boxY: 1435,
        boxW: 960,
        boxH: 295,
        labelX: 45,
        labelY: 1425,
      });

      edges.push({ id: "gate-3-to-p4-hub", type: "spine", path: `M ${CENTER_X} 1398 V 1440` });

      const anmField = roadmapFieldById("advanced-neural-mapping")!;
      const ffField = roadmapFieldById("future-frontiers")!;

      nodes.push({
        id: "p4-hub",
        type: "milestone-sub",
        topicName: anmField.sections[0]?.topics[0] ?? "Nanoscale Neural Mapping",
        section: getFirstSection(anmField),
        field: anmField,
        label: "Frontier Explorations & Nano-Bio Interfacing",
        x: CENTER_X - 160,
        y: 1440,
        width: 320,
        height: 40,
        badge: "recommended",
      });

      const p4Disciplines = [
        { field: anmField, colX: 120, pillX: 130, centerX: 290, topics: ["Whole-Brain Connectome Graphs", "Synaptic Plasticity & Memory Traces"] },
        { field: ffField, colX: 540, pillX: 550, centerX: 710, topics: ["Optogenetics & Nanoparticle Interfaces", "Direct Cortical Synthesis Boundaries"] },
      ];

      p4Disciplines.forEach((d) => {
        edges.push({ id: `p4-hub-to-${d.field.id}`, type: "branch", path: `M 500 1480 C 500 1505, ${d.centerX} 1500, ${d.centerX} 1520`,
          group: `fld-${d.field.id}`,
        });

        const sec = getFirstSection(d.field);
        const t0 = d.topics[0] ?? d.field.title;
        nodes.push({
          id: `disc-${d.field.id}`,
          type: "discipline",
          topicName: t0,
          section: sec,
          field: d.field,
          label: d.field.title,
          x: d.colX,
          y: 1520,
          width: 340,
          height: 48,
          status: statuses[topicKey(d.field, t0)],
          badge: "alternative",
          href: `/roadmap/${d.field.id}`,
          group: `fld-${d.field.id}`,
        });

        d.topics.forEach((t, tidx) => {
          const pillY = 1583 + tidx * 40;
          edges.push({
            id: `p4-${d.field.id}-pill-edge-${tidx}`,
            type: "branch",
            path: `M ${d.centerX} ${tidx === 0 ? 1568 : pillY - 8} V ${pillY}`,
            group: `fld-${d.field.id}`,
          });

          nodes.push({
            id: `p4-${d.field.id}-pill-${tidx}`,
            type: "concept-pill",
            topicName: t,
            section: sec,
            field: d.field,
            label: t,
            x: d.pillX,
            y: pillY,
            width: 320,
            height: 32,
            badge: "alternative",
            status: statuses[topicKey(d.field, t)],
            group: `fld-${d.field.id}`,
          });
        });
      });

      edges.push({ id: "p4-converge-left", type: "branch", path: `M 290 1655 C 290 1680, 500 1675, 500 1695` });
      edges.push({ id: "p4-converge-right", type: "branch", path: `M 710 1655 C 710 1680, 500 1675, 500 1695` });

      nodes.push({
        id: "gate-04",
        type: "gate",
        topicName: "Gate 04: Full-Dive Synthetic Architecture Proven",
        section: getFirstSection(anmField),
        field: anmField,
        label: "Gate 04: Full-Dive Synthetic Architecture Proven",
        x: 240,
        y: 1695,
        width: 520,
        height: 38,
      });

      // --- CAPSTONE FINALE ---
      edges.push({ id: "gate-4-to-capstone", type: "spine", path: `M ${CENTER_X} 1733 V 1775` });

      nodes.push({
        id: "capstone-master",
        type: "capstone",
        topicName: "Capstone: Full-Dive Architecture Integration & Synthesis",
        section: getFirstSection(neuroField),
        field: neuroField,
        label: "Capstone: Full-Dive Architecture Integration & Synthesis",
        x: 180,
        y: 1775,
        width: 640,
        height: 65,
        badge: "recommended",
      });

      const totalHeight = 1775 + 65 + 80; // 1920

      return {
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: totalHeight,
        legendCard,
        curriculumCard,
        trackTitleNode,
        sectionBoxes,
        nodes,
        edges,
      };
    }

    // ------------------------------------------------------------------------
    // B. SINGLE DISCIPLINE FLOWCHART TOPOLOGY (roadmap.sh Authentic Canvas)
    // ------------------------------------------------------------------------
    if (!field) return null;

    // Top Legend Card (with 15px inset from left canvas edge)
    const legendCard = {
      x: 15,
      y: 20,
      width: 260,
      height: 120,
    };

    // Top Curriculum Card (with 15px inset from right canvas edge)
    const curriculumCard = {
      x: 725,
      y: 20,
      width: 260,
      height: 120,
    };

    // Top Spine Guide Dotted Line
    edges.push({
      id: "top-spine-guide",
      type: "branch",
      path: `M ${CENTER_X} 20 V 175`,
    });

    // Track Start Title Node
    const trackTitleNode = {
      id: `track-start-${field.id}`,
      label: field.shortTitle,
      x: CENTER_X - 140,
      y: 175,
      width: 280,
      height: 40,
    };

    // Spine into Milestone 1
    edges.push({
      id: "spine-to-m1",
      type: "spine",
      path: `M ${CENTER_X} 215 V 245`,
    });

    // SECTION 1 (Milestone 1)
    const sec1: RoadmapSection = field.sections[0] ?? {
      id: "s1",
      title: "Foundations",
      summary: "",
      topics: [],
      project: "",
    };
    const sec2: RoadmapSection = field.sections[1] ?? sec1;

    const m1Y = 245;
    const m1W = 240;
    const m1H = 44;
    const m1X = CENTER_X - m1W / 2; // 380
    const m1Topic = sec1.topics[0] ?? sec1.title;
    const m1Key = topicKey(field, m1Topic);
    const m1Status = statuses[m1Key];

    // Milestone 1 Node (Yellow #ffe599)
    nodes.push({
      id: `m1-${sec1.id}`,
      type: "milestone-main",
      topicName: m1Topic,
      section: sec1,
      label: sec1.title,
      x: m1X,
      y: m1Y,
      width: m1W,
      height: m1H,
      status: m1Status,
      badge: "recommended",
    });

    // Spine down to Sub-milestones
    const spineW = 220;
    const spineX = CENTER_X - spineW / 2; // 390

    // Section 1 Subtopic 0
    const sub1_0Y = m1Y + m1H + 21; // 310
    edges.push({
      id: "spine-m1-to-sub0",
      type: "spine",
      path: `M ${CENTER_X} ${m1Y + m1H} V ${sub1_0Y}`,
      status: m1Status,
    });

    const t0 = sec1.topics[0] ?? "Foundations";
    const t0Key = topicKey(field, t0);
    nodes.push({
      id: `sub1-0-${slugifyTopic(t0)}`,
      type: "milestone-sub",
      topicName: t0,
      section: sec1,
      label: t0,
      x: spineX,
      y: sub1_0Y,
      width: spineW,
      height: 38,
      status: statuses[t0Key],
      badge: "recommended",
    });

    // Section 1 Subtopic 1
    const sub1_1Y = sub1_0Y + 38 + 18; // 366
    edges.push({
      id: "spine-sub0-to-sub1",
      type: "spine",
      path: `M ${CENTER_X} ${sub1_0Y + 38} V ${sub1_1Y}`,
    });

    const t1 = sec1.topics[1] ?? "Signal Modality A";
    const t1Key = topicKey(field, t1);
    nodes.push({
      id: `sub1-1-${slugifyTopic(t1)}`,
      type: "milestone-sub",
      topicName: t1,
      section: sec1,
      label: t1,
      x: spineX,
      y: sub1_1Y,
      width: spineW,
      height: 38,
      status: statuses[t1Key],
      badge: "recommended",
    });

    // Section 1 Subtopic 2
    const sub1_2Y = sub1_1Y + 38 + 18; // 422
    edges.push({
      id: "spine-sub1-to-sub2",
      type: "spine",
      path: `M ${CENTER_X} ${sub1_1Y + 38} V ${sub1_2Y}`,
    });

    const t2 = sec1.topics[2] ?? "Signal Modality B";
    const t2Key = topicKey(field, t2);
    nodes.push({
      id: `sub1-2-${slugifyTopic(t2)}`,
      type: "milestone-sub",
      topicName: t2,
      section: sec1,
      label: t2,
      x: spineX,
      y: sub1_2Y,
      width: spineW,
      height: 38,
      status: statuses[t2Key],
      badge: "alternative",
    });

    // Section 1 Subtopic 3
    const sub1_3Y = sub1_2Y + 38 + 18; // 478
    edges.push({
      id: "spine-sub2-to-sub3",
      type: "spine",
      path: `M ${CENTER_X} ${sub1_2Y + 38} V ${sub1_3Y}`,
    });

    const t3 = sec1.topics[3] ?? "Sensor Montages";
    const t3Key = topicKey(field, t3);
    nodes.push({
      id: `sub1-3-${slugifyTopic(t3)}`,
      type: "milestone-sub",
      topicName: t3,
      section: sec1,
      label: t3,
      x: spineX,
      y: sub1_3Y,
      width: spineW,
      height: 38,
      status: statuses[t3Key],
      badge: "alternative",
    });

    // RIGHT BRANCH FROM MILESTONE 1 (Radiating Curved Dotted Lines)
    const m1RightX = m1X + m1W; // 380 + 240 = 620
    const m1CenterY = m1Y + m1H / 2; // 267
    const rColX = 710;
    const rColW = 270;
    const rColH = 34;
    const rStartY = 200;
    const rGap = 8;

    const rightTopicsM1 = [
      sec1.topics[4] ?? "Electrocorticography arrays",
      sec1.topics[5] ?? "Optical neural interfacing",
      sec1.topics[6] ?? "Neural dust sensors",
      ...(getTopicDetails(field.id, t0).subtopics.slice(0, 3)),
    ].slice(0, 6);

    rightTopicsM1.forEach((topicName, idx) => {
      const cardY = rStartY + idx * (rColH + rGap);
      const cardCenterY = cardY + rColH / 2;
      const badgeType = idx < 2 ? "recommended" : idx < 4 ? "alternative" : "elective";
      const key = topicKey(field, topicName);

      // Radiating smooth cubic bezier curve
      edges.push({
        id: `curve-m1-r-${idx}`,
        group: `m1r-${idx}`,
        type: "radiating",
        path: `M ${m1RightX} ${m1CenterY} C ${m1RightX + 35} ${m1CenterY}, ${rColX - 35} ${cardCenterY}, ${rColX} ${cardCenterY}`,
      });

      nodes.push({
        id: `concept-m1-r-${idx}`,
        group: `m1r-${idx}`,
        type: "concept-pill",
        topicName: topicName,
        section: sec1,
        label: topicName,
        x: rColX,
        y: cardY,
        width: rColW,
        height: rColH,
        status: statuses[key],
        badge: badgeType,
      });
    });

    // LEFT BRANCH FROM MILESTONE 1 (2-Column Grid + Beginner Project Callout)
    const leftBranchStartY = 267;
    edges.push({
      id: "m1-left-solid",
      group: "m1left",
      type: "solid",
      path: `M ${m1X} ${leftBranchStartY} H 310 V 200 H 275`,
    });

    const lGridX = 15;
    const lGridY = 200;
    const lPillW = 125;
    const lPillH = 34;
    const lGapX = 10;
    const lGapY = 8;

    const platforms = getPlatformsForField(field.id);
    platforms.forEach((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = lGridX + col * (lPillW + lGapX);
      const py = lGridY + row * (lPillH + lGapY);
      const badgeType = idx < 2 ? "recommended" : idx < 6 ? "alternative" : "elective";

      nodes.push({
        id: `plat-${idx}-${slugifyTopic(p)}`,
        group: "m1left",
        type: "concept-pill",
        topicName: m1Topic,
        subtopicName: p,
        section: sec1,
        label: p,
        x: px,
        y: py,
        width: lPillW,
        height: lPillH,
        badge: badgeType,
      });
    });

    // Connector to "Pick Acquisition Platform" milestone
    const gridBottomY = lGridY + 4 * (lPillH + lGapY) - lGapY; // 360
    edges.push({
      id: "l-grid-to-pick",
      type: "solid",
      path: `M 145 ${gridBottomY} V ${gridBottomY + 15}`,
    });

    // Yellow Milestone: Pick Platform
    const pickPlatY = gridBottomY + 15; // 375
    nodes.push({
      id: `pick-plat-${field.id}`,
      type: "milestone-main",
      topicName: m1Topic,
      section: sec1,
      label: getPlatformMilestoneTitle(field.id),
      x: 15,
      y: pickPlatY,
      width: 260,
      height: 38,
      badge: "recommended",
    });

    // Inlined Beginner Project Callout Card
    const proj1Y = pickPlatY + 38 + 17; // 430
    nodes.push({
      id: `proj-card-beginner`,
      type: "project-card",
      topicName: m1Topic,
      section: sec1,
      label: "Beginner Project",
      x: 15,
      y: proj1Y,
      width: 260,
      height: 95,
      projectNote: `Build a small baseline recording and validation pipeline for ${sec1.title} with clear limits.`,
      projectBtnText: "Beginner Project Ideas",
      projectLevel: "Beginner",
    });

    // SECTION 2 (Milestone 2 - Processing & Decoding)
    const m2Y = 560;
    const m2W = 240;
    const m2H = 44;
    const m2X = CENTER_X - m2W / 2; // 380
    const m2Topic = sec2.topics[0] ?? sec2.title;
    const m2Key = topicKey(field, m2Topic);

    // Spine from Section 1 to Section 2
    edges.push({
      id: "spine-m1-to-m2",
      type: "spine",
      path: `M ${CENTER_X} ${sub1_3Y + 38} V ${m2Y}`,
    });

    // Milestone 2 Node (Yellow #ffe599)
    nodes.push({
      id: `m2-${sec2.id}`,
      type: "milestone-main",
      topicName: m2Topic,
      section: sec2,
      label: sec2.title,
      x: m2X,
      y: m2Y,
      width: m2W,
      height: m2H,
      status: statuses[m2Key],
      badge: "recommended",
    });

    // Section 2 Subtopic 0
    const sub2_0Y = m2Y + m2H + 20; // 624
    edges.push({
      id: "spine-m2-to-sub0",
      type: "spine",
      path: `M ${CENTER_X} ${m2Y + m2H} V ${sub2_0Y}`,
    });

    const sec2t0 = sec2.topics[0] ?? "Artifact Removal";
    const sec2t0Key = topicKey(field, sec2t0);
    nodes.push({
      id: `sub2-0-${slugifyTopic(sec2t0)}`,
      type: "milestone-sub",
      topicName: sec2t0,
      section: sec2,
      label: sec2t0,
      x: spineX,
      y: sub2_0Y,
      width: spineW,
      height: 38,
      status: statuses[sec2t0Key],
      badge: "recommended",
    });

    // Section 2 Subtopic 1
    const sub2_1Y = sub2_0Y + 38 + 18; // 680
    edges.push({
      id: "spine-sub2-0-to-1",
      type: "spine",
      path: `M ${CENTER_X} ${sub2_0Y + 38} V ${sub2_1Y}`,
    });

    const sec2t1 = sec2.topics[1] ?? "Neural noise filtering";
    const sec2t1Key = topicKey(field, sec2t1);
    nodes.push({
      id: `sub2-1-${slugifyTopic(sec2t1)}`,
      type: "milestone-sub",
      topicName: sec2t1,
      section: sec2,
      label: sec2t1,
      x: spineX,
      y: sub2_1Y,
      width: spineW,
      height: 38,
      status: statuses[sec2t1Key],
      badge: "recommended",
    });

    // Section 2 Subtopic 2
    const sub2_2Y = sub2_1Y + 38 + 18; // 736
    edges.push({
      id: "spine-sub2-1-to-2",
      type: "spine",
      path: `M ${CENTER_X} ${sub2_1Y + 38} V ${sub2_2Y}`,
    });

    const sec2t2 = sec2.topics[2] ?? "Feature extraction methods";
    const sec2t2Key = topicKey(field, sec2t2);
    nodes.push({
      id: `sub2-2-${slugifyTopic(sec2t2)}`,
      type: "milestone-sub",
      topicName: sec2t2,
      section: sec2,
      label: sec2t2,
      x: spineX,
      y: sub2_2Y,
      width: spineW,
      height: 38,
      status: statuses[sec2t2Key],
      badge: "alternative",
    });

    // Section 2 Subtopic 3
    const sub2_3Y = sub2_2Y + 38 + 18; // 792
    edges.push({
      id: "spine-sub2-2-to-3",
      type: "spine",
      path: `M ${CENTER_X} ${sub2_2Y + 38} V ${sub2_3Y}`,
    });

    const sec2t3 = sec2.topics[3] ?? "Signal amplification circuits";
    const sec2t3Key = topicKey(field, sec2t3);
    nodes.push({
      id: `sub2-3-${slugifyTopic(sec2t3)}`,
      type: "milestone-sub",
      topicName: sec2t3,
      section: sec2,
      label: sec2t3,
      x: spineX,
      y: sub2_3Y,
      width: spineW,
      height: 38,
      status: statuses[sec2t3Key],
      badge: "alternative",
    });

    // LEFT BRANCH FROM MILESTONE 2 (Denoising Grid + Intermediate Project)
    edges.push({
      id: "m2-left-branch",
      group: "m2left",
      type: "radiating",
      path: `M ${m2X} ${m2Y + m2H / 2} C ${m2X - 35} ${m2Y + m2H / 2}, 310 560, 275 560`,
    });

    const denoisingMethods = getDenoisingMethodsForField(field.id);
    denoisingMethods.forEach((m, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = lGridX + col * (lPillW + lGapX);
      const py = 560 + row * (lPillH + lGapY);
      const badgeType = idx < 2 ? "recommended" : idx < 4 ? "alternative" : "elective";

      nodes.push({
        id: `denoise-${idx}`,
        group: "m2left",
        type: "concept-pill",
        topicName: sec2t0,
        subtopicName: m,
        section: sec2,
        label: m,
        x: px,
        y: py,
        width: lPillW,
        height: lPillH,
        badge: badgeType,
      });
    });

    const denoiseBottomY = 560 + 3 * (lPillH + lGapY) - lGapY; // 678
    edges.push({
      id: "denoise-to-strategy",
      type: "solid",
      path: `M 145 ${denoiseBottomY} V ${denoiseBottomY + 17}`,
    });

    const strategyY = denoiseBottomY + 17; // 695
    nodes.push({
      id: `strategy-milestone-${field.id}`,
      type: "milestone-main",
      topicName: sec2t0,
      section: sec2,
      label: "Artifact Removal Strategy",
      x: 15,
      y: strategyY,
      width: 260,
      height: 38,
      badge: "recommended",
    });

    // Intermediate Project Callout Card
    const proj2Y = strategyY + 38 + 17; // 750
    nodes.push({
      id: "proj-card-intermediate",
      type: "project-card",
      topicName: sec2t1,
      section: sec2,
      label: "Intermediate Project",
      x: 15,
      y: proj2Y,
      width: 260,
      height: 95,
      projectNote: `Gain hands-on practice by building and testing real-time ${sec2.title} decoders.`,
      projectBtnText: "Intermediate Project Ideas",
      projectLevel: "Intermediate",
    });

    // RIGHT BRANCH FROM MILESTONE 2 (Titled Section Bounding Boxes)
    // Box 1: FEATURE EXTRACTION
    sectionBoxes.push({
      id: "sec-box-features",
      title: "FEATURE EXTRACTION",
      boxX: 705,
      boxY: 560,
      boxW: 280,
      boxH: 165,
      labelX: 735,
      labelY: 550,
    });

    edges.push({
      id: "m2-to-features-box",
      group: "feat",
      type: "radiating",
      path: `M ${m2X + m2W} ${m2Y + m2H / 2} C ${m2X + m2W + 35} ${m2Y + m2H / 2}, 680 642, 705 642`,
    });

    const sec2FeatTopic = sec2.topics[2] ?? sec2.title;
    const featPills = [
      { label: "Band Power (PSD)", w: 125, x: 715, y: 575, badge: "recommended" },
      { label: "CSP Filtering", w: 125, x: 850, y: 575, badge: "recommended" },
      { label: "Time-Frequency Wavelets", w: 125, x: 715, y: 618, badge: "alternative" },
      { label: "FBCSP Algorithm", w: 125, x: 850, y: 618, badge: "alternative" },
      { label: "Riemannian Geometry Covariance", w: 260, x: 715, y: 661, badge: "recommended" },
    ];
    featPills.forEach((p, idx) => {
      nodes.push({
        id: `feat-${idx}`,
        group: "feat",
        type: "concept-pill",
        topicName: sec2FeatTopic,
        subtopicName: p.label,
        section: sec2,
        label: p.label,
        x: p.x,
        y: p.y,
        width: p.w,
        height: 34,
        badge: p.badge as any,
      });
    });

    // Box 2: REAL-TIME DECODERS & ML
    sectionBoxes.push({
      id: "sec-box-decoders",
      title: "REAL-TIME DECODERS & ML",
      boxX: 705,
      boxY: 755,
      boxW: 280,
      boxH: 215,
      labelX: 735,
      labelY: 745,
    });

    edges.push({
      id: "m2-to-decoders-box",
      group: "dec",
      type: "radiating",
      path: `M ${m2X + m2W} ${m2Y + m2H / 2} C ${m2X + m2W + 35} ${m2Y + m2H / 2}, 680 860, 705 860`,
    });

    const sec2DecTopic = sec2.topics[6] ?? sec2.title;
    const decoderPills = [
      { label: "Linear Discriminant (LDA)", w: 125, x: 715, y: 770, badge: "recommended" },
      { label: "Support Vector (SVM)", w: 125, x: 850, y: 770, badge: "recommended" },
      { label: "Adaptive Kalman Filters", w: 260, x: 715, y: 813, badge: "recommended" },
      { label: "EEGNet / ConvNet Decoders", w: 260, x: 715, y: 856, badge: "recommended" },
      { label: "Transformer Intent Models", w: 260, x: 715, y: 899, badge: "alternative" },
    ];
    decoderPills.forEach((p, idx) => {
      nodes.push({
        id: `dec-${idx}`,
        group: "dec",
        type: "concept-pill",
        topicName: sec2DecTopic,
        subtopicName: p.label,
        section: sec2,
        label: p.label,
        x: p.x,
        y: p.y,
        width: p.w,
        height: 34,
        badge: p.badge as any,
      });
    });

    // SECTION 3 (Milestone 3 - Telemetry & Safety)
    const m3Y = 1000;
    const m3W = 250;
    const m3H = 44;
    const m3X = CENTER_X - m3W / 2; // 375
    const sec2TelemTopic = sec2.topics[5] ?? "Closed-Loop Telemetry";

    edges.push({
      id: "spine-m2-to-m3",
      type: "spine",
      path: `M ${CENTER_X} ${sub2_3Y + 38} V ${m3Y}`,
    });

    nodes.push({
      id: `m3-${field.id}`,
      type: "milestone-main",
      topicName: sec2TelemTopic,
      section: sec2,
      label: "Closed-Loop Telemetry & Safety",
      x: m3X,
      y: m3Y,
      width: m3W,
      height: m3H,
      badge: "recommended",
    });

    // Sub-milestone 3_0
    const sub3_0Y = m3Y + m3H + 20; // 1064
    edges.push({
      id: "spine-m3-to-sub0",
      type: "spine",
      path: `M ${CENTER_X} ${m3Y + m3H} V ${sub3_0Y}`,
    });

    nodes.push({
      id: `sub3-latency-${field.id}`,
      type: "milestone-sub",
      topicName: sec2TelemTopic,
      subtopicName: "Latency Budget (<15ms)",
      section: sec2,
      label: "Latency Budget (<15ms)",
      x: spineX,
      y: sub3_0Y,
      width: spineW,
      height: 38,
      badge: "recommended",
    });

    // Sub-milestone 3_1
    const sub3_1Y = sub3_0Y + 38 + 18; // 1120
    edges.push({
      id: "spine-sub3-to-sub3-1",
      type: "spine",
      path: `M ${CENTER_X} ${sub3_0Y + 38} V ${sub3_1Y}`,
    });

    nodes.push({
      id: `sub3-watchdog-${field.id}`,
      type: "milestone-sub",
      topicName: sec2TelemTopic,
      subtopicName: "Real-Time Safety Watchdog",
      section: sec2,
      label: "Real-Time Safety Watchdog",
      x: spineX,
      y: sub3_1Y,
      width: spineW,
      height: 38,
      badge: "recommended",
    });

    // Left branch from M3: Streaming Protocols & Advanced Project
    edges.push({
      id: "m3-left-branch",
      group: "m3left",
      type: "radiating",
      path: `M ${m3X} ${m3Y + m3H / 2} C ${m3X - 35} ${m3Y + m3H / 2}, 310 1000, 275 1000`,
    });

    const streamProtocols = [
      "UDP Causal Streaming", "Zero-Copy Shared Mem",
      "FPGA Neural Coprocessor", "Lockless Ring Buffers",
    ];
    streamProtocols.forEach((sp, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const px = lGridX + col * (lPillW + lGapX);
      const py = 1000 + row * (lPillH + lGapY);
      nodes.push({
        id: `stream-${idx}`,
        group: "m3left",
        type: "concept-pill",
        topicName: sec2TelemTopic,
        subtopicName: sp,
        section: sec2,
        label: sp,
        x: px,
        y: py,
        width: lPillW,
        height: lPillH,
        badge: idx < 2 ? "recommended" : "alternative",
      });
    });

    const streamBottomY = 1000 + 2 * (lPillH + lGapY) - lGapY; // 1076
    edges.push({
      id: "stream-to-opt",
      type: "solid",
      path: `M 145 ${streamBottomY} V ${streamBottomY + 17}`,
    });

    const optY = streamBottomY + 17; // 1093
    nodes.push({
      id: `stream-opt-milestone`,
      type: "milestone-main",
      topicName: sec2TelemTopic,
      section: sec2,
      label: "Stream Engine Optimization",
      x: 15,
      y: optY,
      width: 260,
      height: 38,
      badge: "recommended",
    });

    // Advanced Project Callout Card
    const proj3Y = optY + 38 + 17; // 1148
    nodes.push({
      id: "proj-card-advanced",
      type: "project-card",
      topicName: sec2TelemTopic,
      section: sec2,
      label: "Advanced Project",
      x: 15,
      y: proj3Y,
      width: 260,
      height: 95,
      projectNote: `Design an adversarial verification suite evaluating edge cases, latency boundaries, and safe shutdown for ${field.shortTitle}.`,
      projectBtnText: "Advanced Project Ideas",
      projectLevel: "Advanced",
    });

    // Right branch from M3: SAFETY STANDARDS & LIMITS BOX
    sectionBoxes.push({
      id: "sec-box-safety",
      title: "SAFETY STANDARDS & LIMITS",
      boxX: 705,
      boxY: 1000,
      boxW: 280,
      boxH: 215,
      labelX: 730,
      labelY: 990,
    });

    edges.push({
      id: "m3-to-safety-box",
      group: "safety",
      type: "radiating",
      path: `M ${m3X + m3W} ${m3Y + m3H / 2} C ${m3X + m3W + 35} ${m3Y + m3H / 2}, 680 1100, 705 1100`,
    });

    const safetyItems = [
      { label: "Charge Density Limits (<30µC/cm²)", badge: "recommended" },
      { label: "Thermal Dissipation (<1°C rise)", badge: "recommended" },
      { label: "Hardware Watchdog Shutdown", badge: "recommended" },
      { label: "Gliosis & Biocompatibility", badge: "alternative" },
    ];
    safetyItems.forEach((si, idx) => {
      nodes.push({
        id: `safety-${idx}`,
        group: "safety",
        type: "concept-pill",
        topicName: sec2DecTopic,
        subtopicName: si.label,
        section: sec2,
        label: si.label,
        x: 715,
        y: 1015 + idx * 43,
        width: 260,
        height: 34,
        badge: si.badge as any,
      });
    });

    // CAPSTONE FINISH MILESTONE
    const capstoneY = 1270;
    edges.push({
      id: "spine-to-capstone",
      type: "spine",
      path: `M ${CENTER_X} ${sub3_1Y + 38} V ${capstoneY}`,
    });

    nodes.push({
      id: `capstone-${field.id}`,
      type: "capstone",
      topicName: sec2DecTopic,
      section: sec2,
      label: `Capstone: ${field.shortTitle} Synthesis & Integration`,
      x: CENTER_X - 190,
      y: capstoneY,
      width: 380,
      height: 48,
      badge: "recommended",
    });

    const totalHeight = capstoneY + 80;

    return {
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: totalHeight,
      legendCard,
      curriculumCard,
      trackTitleNode,
      sectionBoxes,
      nodes,
      edges,
    };
  }, [isMaster, field, statuses]);

  /**
   * The topology is authored at a fixed 1000px, so any window under about
   * 1084px cut it and panning only chose which column to lose. Scaling the
   * whole canvas to the viewport shows it whole instead.
   *
   * Below MIN_FIT_SCALE the labels stop being readable, so fitting is no
   * longer a kindness — there the canvas stays 1:1 and the cue offers the
   * Linear Guide, which is the honest answer at phone widths.
   */
  const fitScale = useMemo(() => {
    if (!flowchartData || !containerWidth) return 1;
    const raw = containerWidth / flowchartData.canvasWidth;
    // Round down so rounding never lands a fraction of a pixel over the edge,
    // and treat "within 2%" as fitting rather than scaling by 0.99 for nothing.
    return raw >= 0.98 ? 1 : Math.floor(raw * 1000) / 1000;
  }, [flowchartData, containerWidth]);

  const canFit = fitScale >= MIN_FIT_SCALE;
  const appliedScale = zoom === "fit" && canFit ? fitScale : 1;


  return (
    <div className="roadmap-explorer-root">
      {/* Floating Social Share Stack (roadmap.sh signature) */}
      <aside className="rm-floating-social-rail" aria-label="Share this roadmap">
        <div className="rm-floating-social">
          {/*
            Copy link leads the rail because it is the one share action that
            works from anywhere — no account, no third party, and the only one
            that is useful before the site is public.
          */}
          <button
            type="button"
            className={clsx("rm-floating-social-btn", railCopied && "is-copied")}
            title="Copy link to this roadmap"
            aria-label={railCopied ? "Link copied" : "Copy link to this roadmap"}
            onClick={async () => {
              if (await copyLink()) {
                setRailCopied(true);
                setTimeout(() => setRailCopied(false), 2000);
              }
            }}
          >
            {railCopied ? <Check size={14} strokeWidth={2.5} /> : <LinkIcon size={14} />}
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on X"
            aria-label="Share on X"
            onClick={() =>
              openShareIntent(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink())}`,
              )
            }
          >
            𝕏
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Facebook"
            aria-label="Share on Facebook"
            onClick={() =>
              openShareIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink())}`)
            }
          >
            f
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Hacker News"
            aria-label="Share on Hacker News"
            onClick={() =>
              openShareIntent(
                `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(shareLink())}&t=${encodeURIComponent(title)}`,
              )
            }
          >
            Y
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Reddit"
            aria-label="Share on Reddit"
            onClick={() =>
              openShareIntent(
                `https://reddit.com/submit?url=${encodeURIComponent(shareLink())}&title=${encodeURIComponent(title)}`,
              )
            }
          >
            <Share2 size={13} />
          </button>
        </div>
      </aside>

      {/* Top Header Card (roadmap.sh Authentic Design) */}
      <header className="rm-header-card">
        {/* Row 1: Breadcrumb (Left) & Actions Bar (Right) */}
        <div className="rm-top-bar">
          <Link href="/roadmap" className="rm-breadcrumb-link">
            <ArrowLeft size={15} />
            <span>All Roadmaps</span>
          </Link>

          <div className="rm-actions-group">
            {/* Discipline Switcher */}
            <TrackPicker
              currentId={isMaster ? "master" : field?.id ?? "bci"}
              currentLabel={isMaster ? "Master Curriculum (All 12 Tracks)" : field?.shortTitle ?? "Select a track"}
            />

            {/* Bookmark Action */}
            <button
              type="button"
              className={clsx("rm-btn-action", saved && "is-active")}
              onClick={toggleFavorite}
              aria-label={saved ? "Saved to favorites" : "Bookmark roadmap"}
              title={saved ? "Saved to favorites" : "Bookmark roadmap"}
            >
              <Bookmark size={16} className={saved ? "fill-[var(--accent-bright)] text-[var(--accent-bright)]" : ""} />
            </button>

            {/* Iconic Yellow Download Button */}
            <button
              type="button"
              className="rm-btn-download"
              onClick={exportProgress}
              aria-label="Download Roadmap Progress"
              title="Download Progress JSON / Curriculum"
            >
              {exported ? <Check size={15} strokeWidth={2.5} /> : <Download size={15} strokeWidth={2.5} />}
              <span>{exported ? "Exported!" : "Download"}</span>
            </button>

            {/* Iconic Yellow Share Button */}
            <button
              type="button"
              className="rm-btn-share"
              onClick={share}
              aria-label="Share Roadmap Link"
              title="Share Roadmap Link"
            >
              {copied ? <Check size={16} strokeWidth={2.5} /> : <Share2 size={16} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        {/* Row 2: Hero Title */}
        <h1 className="rm-hero-title">{title}</h1>

        {/* Row 3: Subtitle */}
        <p className="rm-hero-subtitle">
          {isMaster
            ? "Step by step curriculum connecting all 12 disciplines for full-dive virtual reality in 2026."
            : `Step by step guide to mastering ${title.toLowerCase()} in 2026. ${description}`}
        </p>

        {/* Row 4: Tabs Bar (Roadmap, Projects, Linear Guide, Contribute) */}
        <div className="rm-tabs-bar">
          <nav className="rm-tabs-nav" aria-label="Roadmap views">
            <button
              type="button"
              className={clsx("rm-tab-btn", tab === "roadmap" && viewMode === "flowchart" && "is-active")}
              onClick={() => {
                setTab("roadmap");
                setViewMode("flowchart");
              }}
            >
              <Layers3 size={15} />
              <span>Roadmap</span>
            </button>

            <button
              type="button"
              className={clsx("rm-tab-btn", tab === "projects" && "is-active")}
              onClick={() => setTab("projects")}
            >
              <FolderKanban size={15} />
              <span>Projects</span>
              {projects.length > 0 && (
                <span className="rm-tab-count">{projects.length}</span>
              )}
            </button>

            <button
              type="button"
              className={clsx("rm-tab-btn", tab === "roadmap" && viewMode === "linear" && "is-active")}
              onClick={() => {
                setTab("roadmap");
                setViewMode("linear");
              }}
            >
              <List size={15} />
              <span>Linear Guide</span>
            </button>

            <button
              type="button"
              className={clsx("rm-tab-btn", tab === "contribute" && "is-active")}
              onClick={() => setTab("contribute")}
            >
              <GitFork size={15} />
              <span>Contribute</span>
            </button>
          </nav>

          {/* Search & Progress Info on Right */}
          <div className="flex items-center gap-3">
            <div className="rm-search-input-wrap">
              <Search size={13} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find topic..."
                className="rm-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rm-search-clear"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/*
              A full-width empty trough announcing "0%" is the first thing a new
              reader met, and it measures nothing they have done yet. Before any
              topic is tracked the readout states the size of the curriculum —
              a fact — and the bar appears only once it has something to show.
              The bar was also a bare pair of divs, invisible to assistive tech.
            */}
            <div className="rm-tab-progress-info">
              {doneCount > 0 ? (
                <>
                  <span>
                    <strong className="text-[var(--text)]">{doneCount}</strong> of {allTopicKeys.length} done
                  </span>
                  <div
                    className="rm-tab-progress-bar"
                    role="progressbar"
                    aria-valuenow={progressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Roadmap progress: ${progressPercent} percent`}
                  >
                    <div className="rm-tab-progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <span className="rm-progress-pct">{progressPercent}%</span>
                </>
              ) : (
                <span>
                  <strong className="text-[var(--text)]">{allTopicKeys.length}</strong> topics · none tracked yet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Signature Yellow Tracking Banner */}
        <div className="rm-tracking-banner">
          <div className="rm-tracking-banner-left">
            <Sparkles size={15} className="text-[#ffd166] flex-shrink-0" />
            <span>Mark any topic to start tracking. Click any card to view scientific specifications & formulas.</span>
          </div>
          {/*
            This said "Watch overview", which promises a video. It expands the
            text accordion directly below — so it says so, and is wired to the
            panel it controls rather than being an unexplained arrow.
          */}
          <button
            type="button"
            className="rm-tracking-banner-action"
            aria-expanded={showOverviewAccordion}
            aria-controls={overviewPanelId}
            onClick={() => setShowOverviewAccordion((prev) => !prev)}
          >
            <span>{showOverviewAccordion ? "Hide overview" : "Read overview"}</span>
            <ChevronDown size={14} className={clsx("rm-banner-chevron", showOverviewAccordion && "is-open")} />
          </button>
        </div>

        {/* Row 6: "What is [Discipline]?" Accordion */}
        <div className="rm-accordion-container">
          <button
            type="button"
            className="rm-accordion-header"
            onClick={() => setShowOverviewAccordion((prev) => !prev)}
            aria-expanded={showOverviewAccordion}
            aria-controls={overviewPanelId}
          >
            <div className="flex items-center gap-2">
              <HelpCircle size={15} className="text-[#ffd166]" />
              <span>What is {isMaster ? "Full-Dive VR Development" : field?.title ?? "this track"}?</span>
            </div>
            <ChevronDown size={15} className={clsx("text-[var(--dim)] transition-transform duration-200", showOverviewAccordion && "rotate-180")} />
          </button>

          {showOverviewAccordion && (
            <div className="rm-accordion-body" id={overviewPanelId}>
              <div className="font-bold text-[var(--text)] mb-1">About {field?.title ?? "this curriculum"}</div>
              <p className="m-0 mb-3 leading-relaxed">{field?.description ?? description}</p>
              <div className="flex flex-wrap items-center gap-5 text-[11px] text-[var(--dim)] pt-2.5 border-t border-[var(--border)]">
                <div>Target Audience: <strong className="text-[var(--text)]">{audience}</strong></div>
                <div>Estimated Duration: <strong className="text-[var(--text)]">{duration}</strong></div>
                <div>Level: <strong className="text-[var(--text)]">{field?.level ?? "Multidisciplinary"}</strong></div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Flowchart / Views Area (Full-Width, Fixed Document Scroll, Seamless like roadmap.sh) */}
      <main className="mt-2 w-full min-w-0">
        {/* TAB 1: Roadmap Flowchart / Linear Guide */}
        {tab === "roadmap" && (
          <section className="w-full min-w-0">
            {/* Fixed Roadmap Flow Surface (roadmap.sh document scroll) */}
            {viewMode === "flowchart" && (
              <div className="rm-flow-frame" data-pannable={pan.pannable || appliedScale < 1 ? "true" : "false"}>
              {/*
                Pan affordance, layered over the canvas rather than inside it:
                as a flex child of the scroller its own width counted toward
                scrollWidth and added 212px of phantom pan.

                The canvas is a fixed-width topology, so on a narrow screen a
                large part of it sits past the edge and every node in the first
                column is sliced mid-word while panning. Panning alone cannot
                fix that — but the same curriculum already exists as readable
                rows in the Linear Guide, so the cue offers it rather than only
                telling people to keep swiping.
              */}
              <div className="rm-pan-hint">
                {canFit ? (
                  <>
                    <span className="rm-pan-hint-text">Diagram is wider than the window</span>
                    <span className="rm-zoom-group" role="group" aria-label="Diagram size">
                      <button
                        type="button"
                        className="rm-zoom-btn"
                        aria-pressed={zoom === "fit"}
                        onClick={() => setZoom("fit")}
                      >
                        Fit
                      </button>
                      <button
                        type="button"
                        className="rm-zoom-btn"
                        aria-pressed={zoom === "full"}
                        onClick={() => setZoom("full")}
                      >
                        100%
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    {/* Too narrow to scale and stay readable — the list is the
                        honest answer at this width, not a smaller diagram. */}
                    <MoveHorizontal size={13} aria-hidden="true" />
                    <span className="rm-pan-hint-text">Diagram is wider than the window</span>
                    <button type="button" className="rm-pan-hint-action" onClick={() => setViewMode("linear")}>
                      Read as a list
                    </button>
                  </>
                )}
              </div>
              <div
                ref={flowRef}
                className="roadmap-flow-wrapper"
                /**
                 * Only a region that actually overflows becomes a tab stop and
                 * announces itself; on a wide screen the whole canvas is
                 * visible and an extra stop would be noise.
                 */
                {...(pan.pannable
                  ? {
                      role: "region",
                      tabIndex: 0,
                      "aria-label": "Interactive learning flowchart, scrollable. Use the left and right arrow keys to pan.",
                    }
                  : { "aria-label": "Interactive learning flowchart" })}
                data-pannable={pan.pannable ? "true" : "false"}
                data-pan-start={!pan.atStart ? "true" : "false"}
                data-pan-end={!pan.atEnd ? "true" : "false"}
                onKeyDown={onCanvasKeyDown}
                onPointerLeave={closeTooltip}
              >
                {/* Authentic roadmap.sh Flowchart Canvas (Master Curriculum & Single Disciplines) */}
                {flowchartData && (
                  /*
                    A `transform` does not change layout size, so the scaled
                    canvas would still reserve its full 1000px and leave a dead
                    gap. The sizer carries the scaled footprint; the canvas
                    inside it is scaled from its top-left corner.
                  */
                  <div
                    className="rm-canvas-sizer"
                    style={{
                      width: flowchartData.canvasWidth * appliedScale,
                      height: flowchartData.canvasHeight * appliedScale,
                    }}
                  >
                  <div
                    className="roadmap-diagram-canvas"
                    data-linked={linkedGroup ? "true" : undefined}
                    style={{
                      width: flowchartData.canvasWidth,
                      height: flowchartData.canvasHeight,
                      transform: appliedScale === 1 ? undefined : `scale(${appliedScale})`,
                    }}
                  >
                    {/* SVG Connector Layer */}
                    <svg
                      className="rm-svg-overlay"
                      width={flowchartData.canvasWidth}
                      height={flowchartData.canvasHeight}
                      viewBox={`0 0 ${flowchartData.canvasWidth} ${flowchartData.canvasHeight}`}
                    >
                      <defs>
                        <marker
                          id="rm-arrow"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L0,6 L6,3 z" fill="#3f8cff" />
                        </marker>
                        <marker
                          id="rm-arrow-done"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
                        </marker>
                        <marker
                          id="rm-arrow-learning"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5"
                          refY="3"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M0,0 L0,6 L6,3 z" fill="#ffd166" />
                        </marker>
                      </defs>

                      {/* Section Bounding Boxes */}
                      {flowchartData.sectionBoxes.map((sb) => (
                        <rect
                          key={sb.id}
                          x={sb.boxX}
                          y={sb.boxY}
                          width={sb.boxW}
                          height={sb.boxH}
                          rx="8"
                          ry="8"
                          className="rm-section-box"
                        />
                      ))}

                      {/* All SVG Connecting Paths */}
                      {flowchartData.edges.map((e) => {
                        const marker =
                          e.type === "spine"
                            ? e.status === "done"
                              ? "url(#rm-arrow-done)"
                              : e.status === "learning"
                              ? "url(#rm-arrow-learning)"
                              : "url(#rm-arrow)"
                            : undefined;

                        return (
                          <path
                            key={e.id}
                            d={e.path}
                            className={clsx(
                              e.type === "spine" && "rm-edge-spine",
                              e.type === "radiating" && "rm-edge-branch",
                              e.type === "branch" && "rm-edge-branch",
                              e.type === "solid" && "rm-edge-solid",
                              e.status === "done" && "is-done",
                              e.status === "learning" && "is-learning",
                              linkedGroup && e.group === linkedGroup && "is-linked",
                            )}
                            markerEnd={marker}
                          />
                        );
                      })}
                    </svg>

                    {/* Top Left Legend Card (roadmap.sh signature element) */}
                    <div
                      className="rm-legend-card"
                      style={{
                        left: flowchartData.legendCard.x,
                        top: flowchartData.legendCard.y,
                        width: flowchartData.legendCard.width,
                      }}
                    >
                      <div className="rm-legend-title">Recommendation Legend</div>
                      {/* The legend is what teaches the glyphs, so it has to
                          draw the same ones the nodes do. */}
                      {(
                        [
                          ["recommended", "Personal Recommendation / Opinion"],
                          ["alternative", "Alternative Option / Pick this or green"],
                          ["elective", "Order not strict / Learn anytime"],
                        ] as const
                      ).map(([kind, text]) => {
                        const BadgeIcon = BADGE_ICON[kind];
                        return (
                          <div key={kind} className="rm-legend-item">
                            <span className={`rm-badge-corner is-${kind}`}>
                              <BadgeIcon size={9} strokeWidth={3} />
                            </span>
                            <span>{text}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dark action button directly below legend card matching roadmap.sh */}
                    <button
                      type="button"
                      className="rm-legend-action-btn"
                      style={{
                        left: flowchartData.legendCard.x,
                        top: flowchartData.legendCard.y + flowchartData.legendCard.height + 8,
                        width: flowchartData.legendCard.width,
                      }}
                      onClick={() => setViewMode("linear")}
                    >
                      Visit Beginner Friendly Version
                    </button>

                    {/* Top Right Curriculum Card */}
                    <div
                      className="rm-curriculum-card"
                      style={{
                        left: flowchartData.curriculumCard.x,
                        top: flowchartData.curriculumCard.y,
                        width: flowchartData.curriculumCard.width,
                      }}
                    >
                      <p className="curriculum-desc">
                        {isMaster
                          ? "Explore all 12 disciplines, 168 topics, and 72 community implementation projects."
                          : "Find the detailed version of this roadmap along with other similar roadmaps across neurotechnology."}
                      </p>
                      {isMaster ? (
                        <button
                          type="button"
                          onClick={() => setTab("projects")}
                          className="curriculum-btn cursor-pointer"
                        >
                          Browse 72 Projects →
                        </button>
                      ) : (
                        <Link href="/roadmap" className="curriculum-btn">
                          openfulldive.org/roadmap →
                        </Link>
                      )}
                    </div>

                    {/* Centered Track Title Node */}
                    <div
                      className="rm-track-title-badge"
                      style={{
                        left: flowchartData.trackTitleNode.x,
                        top: flowchartData.trackTitleNode.y,
                        width: flowchartData.trackTitleNode.width,
                        height: flowchartData.trackTitleNode.height,
                      }}
                    >
                      {flowchartData.trackTitleNode.label}
                    </div>

                    {/* Section Bounding Box Title Labels */}
                    {flowchartData.sectionBoxes.map((sb) => (
                      <div
                        key={`title-${sb.id}`}
                        className="rm-group-title"
                        style={{ left: sb.labelX, top: sb.labelY }}
                      >
                        {sb.title}
                      </div>
                    ))}

                    {/* All Flowchart Nodes */}
                    {flowchartData.nodes.map((node) => {
                      const isMatch =
                        searchQuery.trim().length > 0 &&
                        node.label.toLowerCase().includes(searchQuery.toLowerCase().trim());
                      const targetField = node.field ?? field;

                      // Handle Project Callout Cards
                      if (node.type === "project-card") {
                        return (
                          <div
                            key={node.id}
                            className="rm-project-card"
                            style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                          >
                            <p className="project-note">{node.projectNote}</p>
                            <button
                              type="button"
                              className="project-btn cursor-pointer"
                              onClick={() => {
                                if (node.projectLevel) setDifficulty(node.projectLevel);
                                setTab("projects");
                              }}
                            >
                              <FolderKanban size={11} />
                              <span>{node.projectBtnText}</span>
                            </button>
                          </div>
                        );
                      }

                      // Handle Discipline Milestone Nodes (Master Curriculum)
                      if (node.type === "discipline") {
                        const Icon = targetField ? getFieldIcon(targetField.id) : Compass;
                        const statusKey = targetField ? topicKey(targetField, node.topicName) : "";
                        const curStatus = statusKey ? statuses[statusKey] : undefined;

                        return (
                          <div
                            key={node.id}
                            className={clsx(
                              "rm-discipline-node",
                              curStatus === "done" && "rm-node-done",
                              curStatus === "learning" && "rm-node-learning",
                              isMatch && "rm-search-matched",
                            )}
                            style={{
                              left: node.x,
                              top: node.y,
                              width: node.width,
                              height: node.height,
                            }}
                            onPointerEnter={(e) => {
                              if (e.pointerType !== "mouse") return;
                              openTooltip(e.currentTarget, nodeTooltip({ ...node, status: curStatus }), node.group);
                            }}
                            onPointerLeave={closeTooltip}
                          >
                            {/*
                              This card was a <div onClick> wrapping a <Link>:
                              keyboard users could reach the link but never the
                              card's own action, and a screen reader announced
                              no control at all. The label is the button now,
                              and the arrow link stays its own separate target
                              rather than being nested inside it.
                            */}
                            <button
                              type="button"
                              className="rm-discipline-node-content"
                              aria-label={nodeAriaLabel({ ...node, status: curStatus })}
                              onFocus={(e) => openTooltip(e.currentTarget, nodeTooltip({ ...node, status: curStatus }), node.group, true)}
                              onBlur={closeTooltip}
                              onClick={() => {
                                if (targetField) {
                                  setSelected({
                                    field: targetField,
                                    section: node.section,
                                    topic: node.topicName,
                                  });
                                  setDrawerTab("knowledge");
                                }
                              }}
                            >
                              <Icon size={16} className="text-[#0e1113] flex-shrink-0" />
                              <span className="truncate">{node.label}</span>
                            </button>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {node.badge && (
                                <span
                                  className={clsx("rm-badge-corner", `is-${node.badge}`)}
                                  role="img"
                                  aria-label={BADGE_LABEL[node.badge]}
                                >
                                  {(() => {
                                    const BadgeIcon = BADGE_ICON[node.badge];
                                    return <BadgeIcon size={9} strokeWidth={3} />;
                                  })()}
                                </span>
                              )}
                              {node.href && (
                                <Link
                                  href={node.href}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rm-discipline-node-link"
                                  title={`Open ${node.label} roadmap`}
                                >
                                  <ArrowRight size={12} strokeWidth={2.5} />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Handle Verification Gate Nodes
                      if (node.type === "gate") {
                        return (
                          <button
                            key={node.id}
                            type="button"
                            className={clsx(
                              "rm-gate-node cursor-pointer",
                              isMatch && "rm-search-matched",
                            )}
                            style={{
                              left: node.x,
                              top: node.y,
                              width: node.width,
                              height: node.height,
                            }}
                            onClick={() => {
                              if (targetField) {
                                setSelected({
                                  field: targetField,
                                  section: node.section,
                                  topic: node.topicName,
                                });
                                setDrawerTab("knowledge");
                              }
                            }}
                          >
                            <CheckCircle2 size={15} className="text-[#10b981] flex-shrink-0" />
                            <span className="truncate">{node.label}</span>
                          </button>
                        );
                      }

                      // Handle Capstone Milestone Badge
                      if (node.type === "capstone") {
                        return (
                          <button
                            key={node.id}
                            type="button"
                            className={clsx(
                              "rm-capstone-finish-badge cursor-pointer",
                              isMatch && "rm-search-matched",
                            )}
                            style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                            onClick={() => {
                              if (targetField) {
                                setSelected({
                                  field: targetField,
                                  section: node.section,
                                  topic: node.topicName,
                                  subtopicFocus: node.subtopicName,
                                });
                                setDrawerTab("community");
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Flag size={16} className="text-[#34d399]" />
                              <span>{node.label}</span>
                            </div>
                            {isMaster && (
                              <span className="text-[11px] font-normal text-[#a7f3d0]">
                                Click to view integration specifications, verification tests & peer review in Commons
                              </span>
                            )}
                          </button>
                        );
                      }

                      // Standard Nodes (milestone-main, milestone-sub, concept-pill)
                      const nodeClass =
                        node.type === "milestone-main"
                          ? "rm-milestone-main"
                          : node.type === "milestone-sub"
                          ? "rm-milestone-sub"
                          : "rm-concept-pill";

                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={clsx(
                            nodeClass,
                            node.status === "done" && "rm-node-done",
                            node.status === "learning" && "rm-node-learning",
                            node.status === "skipped" && "rm-node-skipped",
                            isMatch && "rm-search-matched",
                          )}
                          style={{
                            left: node.x,
                            top: node.y,
                            width: node.width,
                            height: node.height,
                          }}
                          onClick={(e) => {
                            if (!targetField) return;
                            if (e.shiftKey) {
                              e.preventDefault();
                              const cur = statuses[topicKey(targetField, node.topicName)];
                              setStatus({ field: targetField, section: node.section, topic: node.topicName }, cur === "learning" ? undefined : "learning");
                              return;
                            }
                            if (e.altKey) {
                              e.preventDefault();
                              const cur = statuses[topicKey(targetField, node.topicName)];
                              setStatus({ field: targetField, section: node.section, topic: node.topicName }, cur === "skipped" ? undefined : "skipped");
                              return;
                            }
                            setSelected({
                              field: targetField,
                              section: node.section,
                              topic: node.topicName,
                              subtopicFocus: node.subtopicName,
                            });
                            setDrawerTab("knowledge");
                          }}
                          onContextMenu={(e) => {
                            if (!targetField) return;
                            e.preventDefault();
                            const cur = statuses[topicKey(targetField, node.topicName)];
                            setStatus({ field: targetField, section: node.section, topic: node.topicName }, cur === "done" ? undefined : "done");
                          }}
                          /**
                           * The shift/alt/right-click status shortcuts were
                           * pointer-only, so a keyboard user could not mark a
                           * topic from the canvas at all. D, L and S do the
                           * same three things from the keyboard.
                           */
                          onKeyDown={(e) => {
                            if (!targetField) return;
                            if (e.metaKey || e.ctrlKey || e.altKey) return;
                            const next = { d: "done", l: "learning", s: "skipped" }[e.key.toLowerCase()] as
                              | TopicStatus
                              | undefined;
                            if (!next) return;
                            e.preventDefault();
                            const cur = statuses[topicKey(targetField, node.topicName)];
                            setStatus(
                              { field: targetField, section: node.section, topic: node.topicName },
                              cur === next ? undefined : next,
                            );
                          }}
                          onPointerEnter={(e) => {
                            if (e.pointerType !== "mouse") return;
                            openTooltip(e.currentTarget, nodeTooltip(node), node.group);
                          }}
                          onPointerLeave={closeTooltip}
                          onFocus={(e) => openTooltip(e.currentTarget, nodeTooltip(node), node.group, true)}
                          onBlur={closeTooltip}
                          aria-label={nodeAriaLabel(node)}
                        >
                          <span>{node.label}</span>
                          {node.badge && (
                            <span
                              className={clsx("rm-badge-corner", `is-${node.badge}`)}
                              /**
                               * The badge carried its meaning in hue alone,
                               * which the design system rules out. The label
                               * puts the same distinction in the accessible
                               * name; the legend still carries it visually.
                               */
                              role="img"
                              aria-label={BADGE_LABEL[node.badge]}
                            >
                              {(() => {
                                const BadgeIcon = BADGE_ICON[node.badge];
                                return <BadgeIcon size={9} strokeWidth={3} />;
                              })()}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                )}

                </div>
              </div>
            )}

            {/* Mode C: Linear Guide View */}
            {viewMode === "linear" && (
              <div className="w-full max-w-[840px] mx-auto py-6 px-4 space-y-8">
                {isMaster ? (
                  // Master Curriculum Linear Guide (Structured across 4 Engineering Phases)
                  [
                    {
                      id: "phase-1",
                      phaseNumber: 1,
                      title: "PHASE 01: SCIENTIFIC & PHYSICAL FOUNDATIONS",
                      summary: "Establish cellular biophysics, neuromorphic execution hardware, and spatial engine dynamics.",
                      gateTitle: "Gate 01: Biological & Physical Transduction Validated",
                      disciplineIds: ["neuroscience", "hardware-architecture", "virtual-environments"],
                    },
                    {
                      id: "phase-2",
                      phaseNumber: 2,
                      title: "PHASE 02: INTERFACES & NEURAL INTERACTION",
                      summary: "Build bi-directional neural recording decoders, kinesthetic/tactile haptic feedback, and non-invasive cortical stimulation.",
                      gateTitle: "Gate 02: Bi-Directional Closed-Loop Neural IO Synchronized",
                      disciplineIds: ["bci", "haptics", "neural-modulation", "sensory-substitution"],
                    },
                    {
                      id: "phase-3",
                      phaseNumber: 3,
                      title: "PHASE 03: SYSTEMS, SOFTWARE & SAFETY",
                      summary: "Hard real-time microkernels (<1ms jitter), cross-modal sensor synchronization, cognitive privacy encryption, and hardware watchdogs.",
                      gateTitle: "Gate 03: Deterministic Runtime & Fail-Safe Watchdogs Verified",
                      disciplineIds: ["software-frameworks", "system-integration", "ethical-engineering"],
                    },
                    {
                      id: "phase-4",
                      phaseNumber: 4,
                      title: "PHASE 04: FRONTIER RESEARCH & SYNTHESIS",
                      summary: "Whole-brain connectome simulation graphs, optogenetic molecular interfaces, and end-to-end full-dive architectural synthesis.",
                      gateTitle: "Gate 04: Full-Dive Synthetic Architecture Proven",
                      disciplineIds: ["advanced-neural-mapping", "future-frontiers"],
                    },
                  ].map((phase) => {
                    const query = searchQuery.trim().toLowerCase();
                    const phaseFields = phase.disciplineIds
                      .map((id) => roadmapFieldById(id))
                      .filter((f): f is RoadmapField => f !== undefined);

                    return (
                      <section key={phase.id} className="space-y-4">
                        {/* Phase Header Banner */}
                        <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                              Phase 0{phase.phaseNumber}
                            </span>
                            <span className="text-[11px] text-[var(--dim)] font-medium">
                              {phase.disciplineIds.length} Disciplines
                            </span>
                          </div>
                          <h2 className="mt-1 text-base font-bold text-[var(--text)] m-0">{phase.title}</h2>
                          <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed m-0">{phase.summary}</p>
                        </div>

                        {/* Disciplines within this Phase */}
                        <div className="space-y-4 pl-3 border-l-2 border-[var(--border)]">
                          {phaseFields.map((df) => {
                            const DiscIcon = getFieldIcon(df.id);
                            const matchingSections = df.sections.filter((sec) => {
                              if (!query) return true;
                              return (
                                sec.title.toLowerCase().includes(query) ||
                                sec.topics.some((t) => t.toLowerCase().includes(query))
                              );
                            });

                            if (query && matchingSections.length === 0) return null;

                            return (
                              <div key={df.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex size-7 items-center justify-center rounded bg-[var(--surface-3)] text-[var(--accent-bright)]">
                                      <DiscIcon size={16} />
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-[var(--text)]">{df.title}</div>
                                      <div className="text-[10px] text-[var(--dim)] font-medium">
                                        Level: {df.level} · {df.sections.length} Sections · {df.sections.reduce((acc, s) => acc + s.topics.length, 0)} Topics
                                      </div>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/roadmap/${df.id}`}
                                    className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-bright)] transition-colors no-underline"
                                  >
                                    <span>Explore Track</span>
                                    <ExternalLink size={11} />
                                  </Link>
                                </div>

                                {/* Discipline Sections and Topics */}
                                <div className="rm-linear-sections">
                                  {matchingSections.map((sec, secIdx) => {
                                    const filteredTopics = query
                                      ? sec.topics.filter((t) => t.toLowerCase().includes(query))
                                      : sec.topics;

                                    return (
                                      <div key={sec.id} className="rm-linear-section">
                                        <div className="rm-linear-section-head">
                                          <span className="rm-linear-section-title">
                                            {secIdx + 1}. {sec.title}
                                          </span>
                                          <span className="rm-linear-section-count">
                                            {sec.topics.filter((t) => statuses[topicKey(df, t)] === "done").length}/{sec.topics.length}
                                          </span>
                                        </div>
                                        {/*
                                          One bordered region per section rather
                                          than a border around every row: the
                                          group is the thing to see, and fourteen
                                          equally weighted boxes made none of
                                          them legible.
                                        */}
                                        <div className="rm-linear-rows">
                                          {filteredTopics.map((topic) => {
                                            const key = topicKey(df, topic);
                                            const status = statuses[key];
                                            return (
                                              <button
                                                key={topic}
                                                type="button"
                                                className={clsx(
                                                  "rm-linear-row",
                                                  status === "done" && "is-done",
                                                  status === "learning" && "is-learning",
                                                )}
                                                onClick={() => {
                                                  setSelected({ field: df, section: sec, topic });
                                                  setDrawerTab("knowledge");
                                                }}
                                              >
                                                <div className="flex items-center gap-2.5">
                                                  {status === "done" ? (
                                                    <CheckCircle2 size={15} className="text-[#10b981] flex-shrink-0" />
                                                  ) : status === "learning" ? (
                                                    <CircleDot size={15} className="text-[#ffd166] flex-shrink-0" />
                                                  ) : (
                                                    <Circle size={15} className="text-[var(--dim)] flex-shrink-0" />
                                                  )}
                                                  <span className={clsx("text-xs font-semibold", status === "done" ? "text-[#34d399]" : "text-[var(--text)]")}>
                                                    {topic}
                                                  </span>
                                                </div>
                                                {/*
                                                  "Inspect →" was printed on
                                                  every row — 168 times across
                                                  the curriculum — to say what
                                                  the row already is. The arrow
                                                  appears on hover and focus
                                                  instead, and the button's own
                                                  name carries the action.
                                                */}
                                                <ArrowRight size={14} className="rm-linear-arrow" aria-hidden="true" />
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Phase Gate Verification Bar */}
                        <div className="flex items-center justify-between rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 px-4 py-2.5 text-xs text-[#34d399]">
                          <div className="flex items-center gap-2 font-semibold">
                            <ClipboardCheck size={16} />
                            <span>{phase.gateTitle}</span>
                          </div>
                          <span className="text-[11px] text-[var(--dim)]">Phase Verification Gate</span>
                        </div>
                      </section>
                    );
                  })
                ) : field ? (
                  // Single Discipline Linear Guide
                  field.sections.map((sec, secIdx) => {
                    const query = searchQuery.trim().toLowerCase();
                    const filteredTopics = query
                      ? sec.topics.filter((t) => t.toLowerCase().includes(query))
                      : sec.topics;

                    if (query && filteredTopics.length === 0) return null;

                    return (
                      <div key={sec.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
                        <header className="mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                            Phase {secIdx + 1}
                          </span>
                          <div className="rm-linear-section-head" style={{ marginBottom: 4 }}>
                            <h3 className="mt-1 text-base font-bold text-[var(--text)] m-0">{sec.title}</h3>
                            <span className="rm-linear-section-count">
                              {sec.topics.filter((t) => statuses[topicKey(field, t)] === "done").length}/{sec.topics.length}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted)] m-0">{sec.summary}</p>
                        </header>

                        <div className="rm-linear-rows">
                          {filteredTopics.map((topic) => {
                            const key = topicKey(field, topic);
                            const status = statuses[key];
                            return (
                              <button
                                key={topic}
                                type="button"
                                className={clsx(
                                  "rm-linear-row",
                                  status === "done" && "is-done",
                                  status === "learning" && "is-learning",
                                )}
                                onClick={() => {
                                  setSelected({ field, section: sec, topic });
                                  setDrawerTab("knowledge");
                                }}
                              >
                                <div className="flex items-center gap-2.5">
                                  {status === "done" ? (
                                    <CheckCircle2 size={16} className="text-[#10b981] flex-shrink-0" />
                                  ) : status === "learning" ? (
                                    <CircleDot size={16} className="text-[#ffd166] flex-shrink-0" />
                                  ) : (
                                    <Circle size={16} className="text-[var(--dim)] flex-shrink-0" />
                                  )}
                                  <span className={clsx("text-xs font-semibold", status === "done" ? "text-[#34d399]" : "text-[var(--text)]")}>
                                    {topic}
                                  </span>
                                </div>
                                <ArrowRight size={14} className="rm-linear-arrow" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>

                        {sec.project && (
                          <div className="mt-3 rounded border border-dashed border-[rgba(255,209,102,0.35)] bg-[rgba(255,209,102,0.05)] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FolderKanban size={13} className="text-[#ffd166]" />
                                <span className="text-[11px] font-bold text-[#ffd166] uppercase tracking-wider">Phase Milestone Project</span>
                              </div>
                              <button
                                type="button"
                                className="text-[11px] text-[#ffd166] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                                onClick={() => setTab("projects")}
                              >
                                View in Projects →
                              </button>
                            </div>
                            <div className="mt-1 text-xs text-[var(--text)] font-medium">{sec.project}</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : null}
              </div>
            )}

            {/* Bottom Prerequisites & Related Disciplines Section */}
            {!isMaster && field && (
              /*
                Two equal columns put one line ("None") beside three cards, so
                the left half read as a panel that had failed to load.
                Prerequisites are a short chip row across the top instead, and
                the disciplines get the full width they were already filling.
              */
              <div className="rm-footer-panel">
                <div className="rm-prereq">
                  <span className="rm-footer-label">Prerequisites &amp; Preparation</span>
                  {hasPrerequisites ? (
                    <div className="rm-prereq-chips">
                      {field.prerequisites.map((p) => (
                        <span key={p} className="rm-prereq-chip">
                          <CheckCircle2 size={12} aria-hidden="true" /> {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    /* A green tick beside the word "None" implied a completed
                       requirement. Nothing has been met — there is nothing to
                       meet, which is a different and more useful thing to say. */
                    <p className="rm-prereq-none">
                      No prior track required — this is an entry point into the curriculum.
                    </p>
                  )}
                </div>

                <div>
                  <span className="rm-footer-label">Connecting Disciplines</span>
                  {/* A grid, so three related tracks fill the row instead of
                      stacking as three near-empty full-width bars. */}
                  <div className="rm-related-grid">
                    {field.related.map((id) => {
                      const rel = roadmapFieldById(id);
                      if (!rel) return null;
                      const RelIcon = getFieldIcon(rel.id);
                      return (
                        <Link key={id} href={`/roadmap/${id}`} className="rm-related-card">
                          <RelIcon size={15} aria-hidden="true" className="rm-related-icon" />
                          <span className="rm-related-text">
                            <span className="rm-related-title">{rel.title}</span>
                            <span className="rm-related-cat">{rel.category}</span>
                          </span>
                          <ArrowRight size={14} aria-hidden="true" className="rm-related-arrow" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Projects */}
        {tab === "projects" && (
          <section className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
            <header className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                Learn By Building
              </span>
              <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">
                {isMaster ? "Community Practice Projects" : `${field?.shortTitle} Projects`}
              </h2>
              <p className="mt-1 text-xs text-[var(--muted)] m-0">
                {PROJECT_KIND_BLURB[difficulty]} Every project is bounded to produce inspectable code, measurements, and
                limitations for community peer review.
              </p>
            </header>

            <div className="flex items-center gap-2 mb-6">
              {(["Beginner", "Intermediate", "Advanced"] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={clsx(
                    "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                    difficulty === level
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--dim)] hover:text-[var(--text)]",
                  )}
                  onClick={() => setDifficulty(level)}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
              {projects
                .filter((p) => p.difficulty === difficulty)
                .map((project) => (
                  /*
                    The card is the link. Seventy-two repetitions of "Discuss
                    project in Commons" told the reader nothing the card had not
                    already said; one arrow carries the same affordance, and the
                    accessible name still names the destination.
                  */
                  <Link
                    key={project.id}
                    href="/commons/technology"
                    className="rm-project-tile"
                    aria-label={`${project.title} — ${project.kind} project in ${project.field.shortTitle}. Discuss in Commons`}
                  >
                    <span className="rm-project-eyebrow">
                      {project.field.shortTitle} · {project.section}
                    </span>
                    <span className="rm-project-foot">
                      <h3 className="rm-project-title">{project.title}</h3>
                      <ArrowRight size={15} className="rm-project-arrow" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* TAB 3: Contribution Guide */}
        {tab === "contribute" && (
          <ContributionPanel fieldName={isMaster ? "Full-Dive Development" : field?.title ?? "this field"} />
        )}
      </main>

      {/*
        One tooltip element serves every node, positioned from the node's own
        rect. It previews the topic's mechanism on hover and — unlike a native
        `title` — on keyboard focus too, so the preview is not pointer-only.
      */}
      {tooltip && (
        <div
          className="rm-node-tooltip"
          role="tooltip"
          data-open="true"
          data-instant={tooltipWarm.current ? "true" : "false"}
          style={
            {
              left: tooltip.x,
              top: tooltip.y,
              /*
               * Passed as a custom property rather than `transform`, so the
               * inline placement composes with the scale the stylesheet
               * animates instead of overwriting it.
               */
              "--rm-tooltip-shift":
                tooltip.placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            } as CSSProperties
          }
        >
          <span className="rm-node-tooltip-title">{tooltip.title}</span>
          {tooltip.body}
          {tooltip.status && (
            <span className="rm-node-tooltip-status">{STATUS_LABEL[tooltip.status]}</span>
          )}
          <span className="rm-node-tooltip-hint">Enter to open · D done · L learning · S skip</span>
        </div>
      )}

      {/* Slide-over Topic Detail Drawer */}
      {selected && activeTopicDetail && (
        <>
          {/*
            The backdrop is presentational: Escape and the close button are the
            keyboard routes out, and the trap keeps focus in the panel, so a
            full-viewport button here would only add a stop that reads as
            "Close topic drawer" from nowhere.
          */}
          <div
            className="roadmap-inspector-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm cursor-pointer"
            aria-hidden="true"
            onClick={() => setSelected(null)}
          />

          <aside
            ref={drawerRef}
            /**
             * It behaves as a modal — it traps focus, locks the page behind it
             * and closes on Escape — so it says so. Without `role="dialog"`
             * and `aria-modal` a screen reader announced a plain complementary
             * region and offered no way to understand it had taken over.
             */
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            tabIndex={-1}
            className="roadmap-resource-drawer fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-[var(--surface)] shadow-2xl"
          >
            {/* Header */}
            <header className="rm-drawer-header">
              <div className="min-w-0">
                <span className="rm-drawer-eyebrow">
                  {selected.field.shortTitle} · {selected.section.title}
                </span>
                <h2 id={drawerTitleId} className="rm-drawer-title">
                  {selected.topic}
                </h2>
              </div>
              <button
                type="button"
                className="rm-drawer-close"
                onClick={() => setSelected(null)}
                aria-label="Close topic details"
              >
                <X size={16} />
              </button>
            </header>

            {/* Status Segmented Controls */}
            <div className="rm-drawer-status">
              <span className="rm-drawer-status-label" id={`${drawerTitleId}-status`}>
                Your Learning Status
              </span>
              {/*
                Four mutually exclusive choices, so they are radios. As plain
                buttons the selected one was conveyed by fill alone and a
                screen reader heard four unrelated, unpressed buttons.
              */}
              <div className="rm-drawer-status-grid" role="radiogroup" aria-labelledby={`${drawerTitleId}-status`}>
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
                      role="radio"
                      aria-checked={isActive}
                      className={clsx(
                        "rm-drawer-status-btn",
                        `status-${item.id ?? "todo"}`,
                        isActive && "is-active",
                      )}
                      onClick={() => setStatus(selected, item.id)}
                    >
                      <Icon size={14} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/*
              Drawer sub-tabs. Previously three unrelated buttons: no tablist,
              no selected state in the accessible name, and no arrow-key
              movement between them, so the relationship between a tab and the
              panel below it existed only visually.
            */}
            <div className="rm-drawer-tabbar" role="tablist" aria-label="Topic detail sections">
              {DRAWER_TABS.map(({ id, label, icon: Icon }, i) => {
                const isActive = drawerTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`${drawerTitleId}-tab-${id}`}
                    aria-selected={isActive}
                    aria-controls={`${drawerTitleId}-panel-${id}`}
                    /* Roving tabindex: one stop for the set, arrows move within it. */
                    tabIndex={isActive ? 0 : -1}
                    className={clsx("rm-drawer-tab", isActive && "is-active")}
                    onClick={() => setDrawerTab(id)}
                    onKeyDown={(e) => {
                      const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                      let next = -1;
                      if (delta) next = (i + delta + DRAWER_TABS.length) % DRAWER_TABS.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = DRAWER_TABS.length - 1;
                      if (next < 0) return;
                      e.preventDefault();
                      const target = DRAWER_TABS[next];
                      if (!target) return;
                      setDrawerTab(target.id);
                      document.getElementById(`${drawerTitleId}-tab-${target.id}`)?.focus();
                    }}
                  >
                    <Icon size={14} aria-hidden="true" />
                    {label}
                    {id === "resources" ? ` (${activeTopicDetail.resources.length})` : ""}
                  </button>
                );
              })}
            </div>

            {/* Drawer Content */}
            <div
              className="rm-drawer-body"
              role="tabpanel"
              id={`${drawerTitleId}-panel-${drawerTab}`}
              aria-labelledby={`${drawerTitleId}-tab-${drawerTab}`}
              /* The panel scrolls, so it must be reachable by keyboard. */
              tabIndex={0}
            >
              {drawerTab === "knowledge" && (
                <>
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] m-0">
                        Scientific Mechanism
                      </h3>
                      <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-bright)] uppercase">
                        {activeTopicDetail.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] leading-relaxed m-0">{activeTopicDetail.overview}</p>
                  </section>

                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-2.5 m-0">
                      Subtopic Concepts
                    </h3>
                    <div className="space-y-1.5">
                      {activeTopicDetail.subtopics.map((sub, idx) => {
                        const isFocused = selected.subtopicFocus === sub;
                        return (
                          <div
                            key={sub}
                            className={clsx(
                              "flex items-center gap-2 rounded border p-2 text-xs transition-colors",
                              isFocused
                                ? "border-[var(--accent)] bg-[rgba(63,140,255,0.12)] text-[var(--accent-bright)] font-semibold shadow-sm"
                                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]",
                            )}
                          >
                            <span
                              className={clsx(
                                "grid size-4 place-items-center rounded-full text-[10px] font-mono",
                                isFocused ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-3)] text-[var(--dim)]",
                              )}
                            >
                              {idx + 1}
                            </span>
                            <span>{sub}</span>
                            {isFocused && (
                              <span className="ml-auto text-[9px] uppercase tracking-wider font-bold text-[var(--accent-bright)]">
                                Selected
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <div className="rm-drawer-section-head">
                      <h3 className="rm-drawer-section-title">Verification Competencies</h3>
                      <span className="text-[10px] text-[var(--dim)]">Saved as you check</span>
                    </div>
                    {/*
                      These rows were <li onClick>: no keyboard access, no
                      announced state, and no indication they were controls at
                      all. They are checkboxes now, which is what they are.
                    */}
                    <ul className="rm-drawer-check-list">
                      {activeTopicDetail.checkpoints.map((item, idx) => {
                        const checkKey = `${selected.field.id}:${selected.topic}:chk:${idx}`;
                        const isChecked = checkedChecklist[checkKey] || false;
                        return (
                          <li key={item}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isChecked}
                              className="rm-drawer-check"
                              onClick={() => toggleChecklist(checkKey)}
                            >
                              {isChecked ? (
                                <SquareCheck size={16} aria-hidden="true" className="rm-drawer-check-icon text-[#10b981]" />
                              ) : (
                                <Square size={16} aria-hidden="true" className="rm-drawer-check-icon text-[var(--dim)]" />
                              )}
                              <span className="rm-drawer-check-text">{item}</span>
                            </button>
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
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-bright)] hover:underline text-decoration-none"
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
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors text-decoration-none"
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

            {/* Footer */}
            <footer className="rm-drawer-footer">
              {prevTopic ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] cursor-pointer"
                  onClick={() => {
                    setSelected(prevTopic);
                    setDrawerTab("knowledge");
                  }}
                >
                  <ArrowLeft size={13} /> Previous
                </button>
              ) : (
                <div />
              )}

              {nextTopic && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--accent-hover,#2f6fd6)] cursor-pointer"
                  onClick={() => {
                    setSelected(nextTopic);
                    setDrawerTab("knowledge");
                  }}
                >
                  Next: {nextTopic.topic} <ArrowRight size={13} />
                </button>
              )}
            </footer>
          </aside>
        </>
      )}
    </div>
  );
}

/** Declaration order of the category union — the order the groups appear in. */
const TRACK_CATEGORY_ORDER: RoadmapCategory[] = [
  "Neural Science",
  "Interfaces & Haptics",
  "Virtual Systems",
  "Hardware & Software",
  "Safety & Integration",
  "Frontier Research",
];

/**
 * Track picker.
 *
 * This was a native `<select>`. Its button could be themed, but the dropdown it
 * opens is drawn by the operating system — it rendered as a white sheet with a
 * blue highlight over a dark page, and no amount of CSS reaches inside it.
 * A listbox is the only way to keep the popup in the product's own palette, and
 * it buys two things the native control could not: each discipline can carry
 * its icon (recognition beats recall when twelve names look alike), and the
 * categories become real headings instead of one flat `<optgroup>`.
 *
 * The keyboard contract is the ARIA listbox pattern: Enter/Space/Arrow opens,
 * arrows and Home/End move, typing jumps to a match, Enter commits, Escape and
 * outside clicks cancel, and focus returns to the trigger either way.
 */
function TrackPicker({ currentId, currentLabel }: { currentId: string; currentLabel: string }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef({ query: "", at: 0 });
  const listId = `${useId()}-track-list`;

  /**
   * Flat option list in visual order — arrow keys cross category boundaries.
   * Grouped by category first: `roadmapFields` is authored in curriculum order,
   * which interleaves categories, so heading each option whose category differs
   * from its predecessor printed "Neural Science" and "Virtual Systems" twice
   * apiece. Each category has to be contiguous for a heading to mean anything.
   */
  const options = useMemo(() => {
    const list: { id: string; label: string; hint: string; category: string | null }[] = [
      { id: "master", label: "Master Curriculum", hint: "All 12 tracks", category: null },
    ];
    for (const category of TRACK_CATEGORY_ORDER) {
      for (const f of roadmapFields.filter((x) => x.category === category)) {
        list.push({ id: f.id, label: f.shortTitle, hint: f.level, category });
      }
    }
    return list;
  }, []);

  const currentIndex = Math.max(0, options.findIndex((o) => o.id === currentId));

  const openList = useCallback(
    (startAt = currentIndex) => {
      setActiveIndex(startAt);
      setOpen(true);
    },
    [currentIndex],
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const commit = useCallback((id: string) => {
    if (id === currentId) {
      close();
      return;
    }
    window.location.href = id === "master" ? "/roadmap" : `/roadmap/${id}`;
  }, [currentId, close]);

  // Dismiss on an outside click, and on Escape from anywhere in the popup.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Focus the popup so it owns the keyboard the moment it appears, and keep the
  // active option in view when the arrows walk past the popup edge.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
        return;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        e.preventDefault();
        setActiveIndex(last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(options[activeIndex]?.id ?? currentId);
        return;
      case "Escape":
        e.preventDefault();
        close();
        return;
      case "Tab":
        // Tabbing away is a dismissal, not a selection.
        setOpen(false);
        return;
      default:
        break;
    }
    // Type-ahead: successive letters within a second extend the query.
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    const now = Date.now();
    const t = typeahead.current;
    t.query = now - t.at > 1000 ? e.key : t.query + e.key;
    t.at = now;
    const q = t.query.toLowerCase();
    const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
    if (hit >= 0) setActiveIndex(hit);
  };

  let lastCategory: string | null = null;

  return (
    <div className="rm-track-picker">
      <button
        ref={buttonRef}
        type="button"
        className="rm-track-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Track: ${currentLabel}. Change track`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
      >
        <span className="rm-track-trigger-label">{currentLabel}</span>
        <ChevronDown size={15} aria-hidden="true" className="rm-track-chevron" />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Roadmap tracks"
          aria-activedescendant={`${listId}-opt-${activeIndex}`}
          tabIndex={-1}
          className="rm-track-list"
          onKeyDown={onListKeyDown}
        >
          {options.map((o, i) => {
            const Icon = o.id === "master" ? Compass : getFieldIcon(o.id);
            const heading = o.category && o.category !== lastCategory ? o.category : null;
            lastCategory = o.category;
            return (
              <Fragment key={o.id}>
                {heading && (
                  <div className="rm-track-group" role="presentation">
                    {heading}
                  </div>
                )}
                <div
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={o.id === currentId}
                  data-active={i === activeIndex}
                  className="rm-track-option"
                  onPointerEnter={() => setActiveIndex(i)}
                  onClick={() => commit(o.id)}
                >
                  <Icon size={15} aria-hidden="true" className="rm-track-option-icon" />
                  <span className="rm-track-option-label">{o.label}</span>
                  <span className="rm-track-option-hint">{o.hint}</span>
                  {o.id === currentId && <Check size={14} aria-hidden="true" className="rm-track-option-check" />}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContributionPanel({ fieldName }: { fieldName: string }) {
  return (
    <section className="w-full min-w-0 flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <header>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
          From Learning to Useful Work
        </span>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">Contribute to {fieldName}</h2>
        <p className="mt-1 text-xs text-[var(--muted)] m-0">
          The OpenFullDive project progresses through small, inspectable, and reproducible work—never through unsupported claims.
        </p>
      </header>

      {/*
        These are five ordered steps, but they were five identically bordered
        boxes with the number buried in the heading — a stack, not a sequence.
        An ordered list with numbered markers on a connecting rail says "do
        these in order" before a word is read, and the per-card borders come off
        because space already groups them (a rule is the last resort, not the
        first).
      */}
      <ol className="rm-steps">
        {[
          ["Choose one bounded problem", "Pick a single topic node and define a reproducible deliverable reviewable within weeks."],
          ["Declare scope and safety bounds", "Document hypotheses, non-goals, measurement apparatus, and safe shutdown conditions."],
          ["Build and test in public", "Publish raw datasets, calibration benches, reproduction code, and negative findings."],
          ["Solicit peer challenge", "Request cross-discipline critique from adjacent fields to test system integration assumptions."],
          ["Submit to the evidence ledger", "Publish your findings to the community evidence ledger under editorial review."],
        ].map(([title, body], i) => (
          <li key={title} className="rm-step">
            <span className="rm-step-marker" aria-hidden="true">{i + 1}</span>
            <div className="rm-step-body">
              <h3 className="rm-step-title">{title}</h3>
              <p className="rm-step-text">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="rm-contribute-actions">
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

function getPlatformsForField(fieldId: string): string[] {
  switch (fieldId) {
    case "bci":
      return ["OpenBCI Cyton", "Neuropixels 2.0", "Blackrock Utah", "Neuralink N1", "Intan RHD2000", "Kernel Flow", "g.tec g.USBamp", "BrainVision"];
    case "neuroscience":
      return ["Patch-Clamp Rig", "Two-Photon Laser", "Calcium Imaging", "Optogenetics Rig", "NeuroML Engine", "NEURON Simulator", "BrainGlobe Atlas", "Allen Brain Map"];
    case "haptics":
      return ["Piezoelectric", "Linear Resonators", "Pneumatic Valves", "Peltier Elements", "Ultrasonic MidAir", "Force Exoskeleton", "Cable Servos", "Magnetic Brakes"];
    case "virtual-environments":
      return ["Unreal Engine 5", "OpenXR Runtime", "WebXR Device API", "SteamVR Driver", "Foveated Raster", "HRTF Spatializer", "PhysX Engine", "Vulkan Pipeline"];
    case "hardware-architecture":
      return ["Neuromorphic ASICs", "FPGA Prototyping", "RISC-V Cores", "Ultra-Low Power", "Inductive Link", "Wireless Power", "Thermal Radiator", "Solid-State Cell"];
    case "software-frameworks":
      return ["RTOS Kernel", "Shared Ring-Buffer", "Zero-Copy IPC", "LSL LabStreaming", "Cap'n Proto RPC", "WebSocket Sync", "C++20 Causal", "Rust Concurrency"];
    case "sensory-substitution":
      return ["Tactile Belt Array", "vOICe Optical Audio", "Tongue Display (BrainPort)", "Electro-Tactile Glove", "Bone Conduction Rig", "Spatial Audio Array", "Retinal Prosthesis Lab", "Haptic Vest Matrix"];
    case "neural-decoding":
      return ["Pygatt / Bleak BCI", "TorchEEG Pipeline", "MNE-Python Suite", "Brain-Decode Framework", "TensorRT Engine", "ONNX Runtime BCI", "SpikeInterface", "BioSig Toolbox"];
    case "neural-stimulation":
      return ["tDCS / tACS Current Source", "TMS Transcranial Mag", "Focused Ultrasound (tFUS)", "Epidural Spinal Stim", "Optogenetic Laser Link", "Intracortical Microstim", "Vagus Nerve Stim (tVNS)", "Closed-Loop Stim Rig"];
    case "safety-and-ethics":
      return ["Hardware Interlock Rig", "ISO 14971 Risk Matrix", "SAR Thermal Phantom", "IEC 60601-1 Testbench", "Biocompatibility Lab", "Galvanic Isolation Bench", "Neuro-Rights Ledger", "IEC 62304 Audit Suite"];
    case "clinical-translation":
      return ["FDA IDE Testbed", "ISO 13485 QMS Matrix", "GCP Clinical Protocol", "MDR Class III Bench", "Sterilization Chamber", "Hermetic Sealing Rig", "Accelerated Aging Oven", "Veterinary Pilot Model"];
    case "future-frontiers":
      return ["Molecular Recording Rig", "Carbon Nanotube Arrays", "Synthetic Biology Synapse", "Superconducting Quantum (SQUID)", "Opto-Acoustic Tomography", "Neuromorphic Memristor", "Diamond NV Magnetometer", "Organoid Intelligence Rig"];
    default:
      return ["Standard Platform", "Reference Hardware", "Simulation Testbench", "Emulation Layer", "Telemetry Suite", "Driver Framework", "Bench Apparatus", "Evaluation Board"];
  }
}

function getPlatformMilestoneTitle(fieldId: string): string {
  switch (fieldId) {
    case "bci": return "Pick Acquisition Platform";
    case "neuroscience": return "Pick Laboratory Apparatus";
    case "haptics": return "Select Actuator Architecture";
    case "virtual-environments": return "Select Runtime Engine";
    case "hardware-architecture": return "Select Compute Platform";
    case "software-frameworks": return "Select Core Framework";
    case "sensory-substitution": return "Select Transduction Medium";
    case "neural-decoding": return "Select Decoding Framework";
    case "neural-stimulation": return "Select Stimulation Modality";
    case "safety-and-ethics": return "Select Safety Framework";
    case "clinical-translation": return "Select Regulatory Pathway";
    case "future-frontiers": return "Select Frontier Probe";
    default: return "Select Primary Toolchain";
  }
}

function getDenoisingMethodsForField(fieldId: string): string[] {
  switch (fieldId) {
    case "bci":
      return ["ICA Denoising", "Wavelet Transform", "Common Avg Ref", "Surface Laplacian", "EOG Regression", "Adaptive Filtering"];
    case "neuroscience":
      return ["Spike Sorting", "Drift Correction", "Optical Denoising", "Photobleach Fix", "Poisson Filtering", "Ensemble Averaging"];
    case "haptics":
      return ["Kalman Filtering", "Jitter Damping", "Impedance Control", "Hysteresis Model", "Thermal Limiting", "Back-EMF Sensing"];
    case "virtual-environments":
      return ["Temporal Anti-Alias", "Reprojection Wrap", "Latency Extrapolation", "Jitter Smoothing", "Pose Filtering", "Occlusion Culling"];
    case "sensory-substitution":
      return ["Cross-Modal Remapping", "Spectral Inversion", "Dynamic Range Compression", "Spatial Downsampling", "Edge Enhancement", "Phoneme Encoding"];
    case "neural-decoding":
      return ["Common Spatial Pattern", "Riemannian Tangent Space", "FBCSP Filtering", "Wavelet Packet Decomp", "Empirical Mode Decomp", "Spatial Whitening"];
    case "neural-stimulation":
      return ["Charge Balancing", "Active Charge Recovery", "Stimulation Artifact Rejection", "Pulse Width Shaping", "Thermal Dissipation Check", "Phase-Locked Triggering"];
    case "safety-and-ethics":
      return ["Thermal Budget Modeling", "Charge Injection Limit", "Adversarial Failsafe", "Heartbeat Watchdog", "Emergency Current Clamp", "Electrode Impedance Mon"];
    case "clinical-translation":
      return ["Biocompatibility Assay", "Failure Mode Effects (FMEA)", "Accelerated Degradation", "Leakage Current Test", "In Vitro Cytotoxicity", "Chronic Tissue Response"];
    case "future-frontiers":
      return ["Quantum Phase Estimation", "Super-Resolution Optical", "Nanoscale Drift Tracking", "Multiplexed DNA Barcoding", "Magnetoencephalography SQUID", "High-Throughput Patching"];
    default:
      return ["Linear Filtering", "Adaptive Smoothing", "Noise Cancellation", "Outlier Removal", "Spatial Averaging", "Frequency Notching"];
  }
}
