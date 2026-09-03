"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  ClipboardCheck,
  Code2,
  ExternalLink,
  Flag,
  FolderKanban,
  GitFork,
  Info,
  Layers3,
  MessageCircle,
  PauseCircle,
  Play,
  Search,
  Share2,
  Sparkles,
  Users,
  X,
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
import { StickyRail } from "./StickyRail";

/**
 * The host's per-user storage bridge — the callable the host passes down so
 * this package never imports a Server Action, the database, or any host
 * internal. Signed in, the host makes server state authoritative; signed out,
 * this component falls back to `localStorage` on its own.
 */
export type RoadmapStorage = {
  /** Every stored key for the signed-in viewer; `null` when signed out or unavailable. */
  getState: () => Promise<Record<string, unknown> | null>;
  /** Persist one declared key for the signed-in viewer. */
  setState: (key: string, value: unknown) => Promise<{ ok: boolean; error?: string }>;
};

export type RoadmapExplorerProps = {
  slug: string;
  /** Host-resolved: is there a signed-in session? Signed out falls back to `localStorage`. */
  isSignedIn?: boolean;
  /** The host's storage bridge; when present and signed in, server state is authoritative. */
  storage?: RoadmapStorage;
};

type Tab = "roadmap" | "projects" | "contribute";
type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type SelectedTopic = { field: RoadmapField; section: RoadmapSection; topic: string };

const FAVORITES_KEY = "ofd-roadmap-favorites-v1";
const STATUS_KEY = "ofd-roadmap-status-v1";
/** The versioned storage keys this plugin's manifest declares; the host persists them per user. */
const PROGRESS_STORAGE_KEY = "progress:v1";
const FAVORITES_STORAGE_KEY = "favorites:v1";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function RoadmapExplorer({ slug, isSignedIn = false, storage }: RoadmapExplorerProps) {
  const isMaster = slug === masterRoadmap.id;
  const field = roadmapFieldById(slug);
  const fields = isMaster ? roadmapFields : field ? [field] : [];
  /** Server-backed only when the host says signed-in AND handed us a storage bridge. */
  const serverBacked = isSignedIn && !!storage;
  const [tab, setTab] = useState<Tab>("roadmap");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [selected, setSelected] = useState<SelectedTopic | null>(null);
  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [resourceTab, setResourceTab] = useState<"resources" | "community">("resources");
  const [trackQuery, setTrackQuery] = useState("");

  /**
   * Anonymous stays useful; signed in, server state is authoritative. Signed
   * out reads `localStorage` exactly as before. Signed in, this loads the
   * viewer's server state through the host's storage bridge and — only when the
   * server has nothing yet for a key and local storage holds something valid —
   * imports it once. That guard is what makes it a bounded migration rather
   * than a permanent two-master sync: it never runs again once the server has a
   * value, so it can never clobber real progress with stale local data from a
   * second device or a later sign-in.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serverBacked || !storage) {
        setStatuses(readLocal(STATUS_KEY, {}));
        setFavorites(readLocal(FAVORITES_KEY, []));
        return;
      }

      const remote = await storage.getState().catch(() => null);
      if (cancelled) return;

      let progress = remote?.[PROGRESS_STORAGE_KEY] as Record<string, TopicStatus> | undefined;
      let favs = remote?.[FAVORITES_STORAGE_KEY] as string[] | undefined;

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

      if (cancelled) return;
      setStatuses(progress ?? {});
      setFavorites(favs ?? []);
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

  const allTopicKeys = useMemo(
    () => fields.flatMap((item) => item.sections.flatMap((section) => section.topics.map((topic) => topicKey(item, topic)))),
    [fields],
  );
  const doneCount = allTopicKeys.filter((key) => statuses[key] === "done").length;
  const learningCount = allTopicKeys.filter((key) => statuses[key] === "learning").length;
  const progress = allTopicKeys.length ? Math.round((doneCount / allTopicKeys.length) * 100) : 0;
  const firstIncomplete = useMemo(() => {
    for (const item of fields) {
      for (const roadmapSection of item.sections) {
        const topic = roadmapSection.topics.find((name) => statuses[topicKey(item, name)] !== "done" && statuses[topicKey(item, name)] !== "skipped");
        if (topic) return { field: item, section: roadmapSection, topic };
      }
    }
    return null;
  }, [fields, statuses]);
  const visibleTracks = useMemo(() => {
    const query = trackQuery.trim().toLowerCase();
    if (!query) return roadmapFields;
    return roadmapFields.filter((item) => [item.title, item.shortTitle, item.category, item.description].join(" ").toLowerCase().includes(query));
  }, [trackQuery]);

  const projects = useMemo(() => fields.flatMap((item) => item.sections.flatMap((section) => [
    {
      id: `${item.id}-${section.id}-beginner`, difficulty: "Beginner" as const, field: item,
      title: `Map the evidence for ${section.topics[0]}`,
      description: `Build a short, sourced explainer that separates established results, constraints, and open questions in ${section.title}.`,
    },
    {
      id: `${item.id}-${section.id}-intermediate`, difficulty: "Intermediate" as const, field: item,
      title: section.project,
      description: `Turn the ${section.title} section into a reproducible community artifact with methods, tests, and limitations.`,
    },
    {
      id: `${item.id}-${section.id}-advanced`, difficulty: "Advanced" as const, field: item,
      title: `Integrate and challenge the ${section.title} assumptions`,
      description: `Connect this module to an adjacent field, define interfaces and failure states, then request cross-discipline review.`,
    },
  ])), [fields]);

  if (!isMaster && !field) {
    return (
      <div className="roadmap-missing flex flex-col items-center justify-center p-[var(--s8)] text-center">
        <Layers3 size={30} className="text-[var(--dim)]" />
        <h1 className="my-[var(--s3)] text-[var(--fs-2xl)] font-bold text-[var(--text)]">Roadmap not found</h1>
        <p className="mb-[var(--s4)] text-[var(--muted)] text-[var(--fs-sm)]">The requested learning path may have moved.</p>
        <Link className="primary btn inline-flex items-center gap-1" href="/roadmap"><ArrowLeft size={15} /> Browse all roadmaps</Link>
      </div>
    );
  }

  const setStatus = (topic: SelectedTopic, status?: TopicStatus) => {
    const key = topicKey(topic.field, topic.topic);
    setStatuses((current) => {
      const next = { ...current };
      if (status) next[key] = status;
      else delete next[key];
      if (serverBacked && storage) {
        // Fire-and-forget, matching this component's "never block the roadmap"
        // philosophy for storage failures — the UI already updated
        // optimistically; a save failure is logged, not surfaced as a blocking
        // error over a low-stakes, easily-redone action.
        void storage.setState(PROGRESS_STORAGE_KEY, next).then((result) => {
          if (!result.ok) console.error("[roadmap] progress save failed:", result.error);
        });
      } else {
        localStorage.setItem(STATUS_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const toggleFavorite = () => {
    setFavorites((current) => {
      const next = current.includes(favoriteId) ? current.filter((item) => item !== favoriteId) : [...current, favoriteId];
      if (serverBacked && storage) {
        void storage.setState(FAVORITES_STORAGE_KEY, next).then((result) => {
          if (!result.ok) console.error("[roadmap] favorites save failed:", result.error);
        });
      } else {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const share = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  const openNextTopic = () => {
    if (!firstIncomplete) return;
    setSelected(firstIncomplete);
    setResourceTab("resources");
  };

  return (
    <div className={clsx("roadmap-explorer-page mx-auto w-[min(100%,1380px)] pb-[var(--s12)] max-[680px]:px-[var(--s3)]", isMaster && "is-master")}>
      <header className="roadmap-explorer-header overflow-visible border-b border-[var(--border)] bg-transparent pt-[var(--s5)]">
        <div className="roadmap-workspace-topbar flex min-h-[52px] items-start justify-between gap-[var(--s4)] max-[680px]:min-h-[62px]">
          <div className="roadmap-workspace-identity flex min-w-0 items-center gap-[var(--s3)]">
            {!isMaster && (
              <Link className="grid size-[34px] flex-none place-items-center rounded-[var(--r-ctrl)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]" href="/roadmap" aria-label="Back to Roadmap">
                <ArrowLeft size={17} />
              </Link>
            )}
            <div className="grid min-w-0 items-start gap-[2px] max-[680px]:gap-0">
              <span className="text-[var(--dim)] text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap max-[680px]:text-[9px]">{isMaster ? "Full-Dive development" : `${field?.category} path`}</span>
              <h1 className="m-0 truncate text-[clamp(26px,2.7vw,32px)] font-bold text-[var(--text)] leading-[1.15]">{isMaster ? "Roadmap" : title}</h1>
            </div>
            {!isMaster && <span className="roadmap-level-chip inline-flex items-center rounded-full border border-[var(--border)] px-[8px] py-[2px] text-[var(--dim)] text-[var(--fs-2xs)] uppercase tracking-[0.05em]">{field?.level}</span>}
          </div>
          <div className="roadmap-workspace-actions flex flex-none items-center gap-[var(--s2)]">
            {firstIncomplete && (
              <button className="roadmap-continue-button inline-flex h-[36px] items-center justify-center gap-[7px] rounded-[var(--r-ctrl)] border border-[var(--accent)] bg-[var(--accent)] px-[var(--s3)] text-[var(--fs-xs)] font-[720] text-white hover:bg-[var(--accent-hover)]" onClick={openNextTopic}>
                <Play size={14} fill="currentColor" /> Continue
              </button>
            )}
            <button
              className={clsx(
                "inline-flex size-[36px] items-center justify-center rounded-[var(--r-ctrl)] border bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]",
                saved && "is-active border-[var(--border-strong)] text-[var(--text)]"
              )}
              onClick={toggleFavorite}
              aria-label={saved ? "Remove saved roadmap" : "Save roadmap"}
            >
              {saved ? <Check size={16} /> : <Bookmark size={16} />}
            </button>
            <button
              className="inline-flex size-[36px] items-center justify-center rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              onClick={share}
              aria-label="Copy roadmap link"
            >
              {copied ? <Check size={16} /> : <Share2 size={16} />}
            </button>
          </div>
        </div>

        <div className="roadmap-workspace-summary grid min-h-[52px] grid-cols-[minmax(0,1fr)_minmax(360px,520px)] items-center gap-[var(--s8)] py-[var(--s2)] pb-[var(--s4)] max-[1350px]:grid-cols-1 max-[1350px]:gap-[var(--s3)]">
          <p className="m-0 line-clamp-2 max-w-[66ch] text-[var(--muted)] text-[var(--fs-xs)] leading-[1.45]">{description}</p>
          <div className="roadmap-workspace-progress grid w-full grid-cols-[max-content_minmax(90px,1fr)_max-content] items-center gap-[var(--s2)] text-[var(--muted)] text-[var(--fs-2xs)] max-[1350px]:w-[min(100%,520px)]">
            <span><strong className="text-[var(--text)]">{progress}%</strong> complete</span>
            <div className="h-[5px] overflow-hidden rounded-full bg-[var(--surface-3)]"><i className="block h-full bg-[var(--accent)] transition-[width] duration-200" style={{ width: `${progress}%` }} /></div>
            <small className="whitespace-nowrap text-[var(--dim)]">{learningCount} learning · {doneCount} done · {allTopicKeys.length} topics</small>
          </div>
        </div>

        <nav className="roadmap-explorer-tabs flex gap-[var(--s5)] p-[0_0_var(--s2)] max-[1350px]:gap-[var(--s4)] max-[1350px]:overflow-x-auto" aria-label="Roadmap views">
          <button className={clsx("inline-flex min-h-[38px] items-center gap-[7px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-[var(--fs-xs)] transition-[color,border-color] active:transform-none hover:border-transparent hover:bg-transparent focus-visible:bg-transparent", tab === "roadmap" ? "border-[var(--accent-bright)] font-[750] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]")} aria-current={tab === "roadmap" ? "page" : undefined} onClick={() => setTab("roadmap")}><Layers3 size={15} /> Roadmap</button>
          <button className={clsx("inline-flex min-h-[38px] items-center gap-[7px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-[var(--fs-xs)] transition-[color,border-color] active:transform-none hover:border-transparent hover:bg-transparent focus-visible:bg-transparent", tab === "projects" ? "border-[var(--accent-bright)] font-[750] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]")} aria-current={tab === "projects" ? "page" : undefined} onClick={() => setTab("projects")}><FolderKanban size={15} /> Projects</button>
          <button className={clsx("inline-flex min-h-[38px] items-center gap-[7px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-[var(--fs-xs)] transition-[color,border-color] active:transform-none hover:border-transparent hover:bg-transparent focus-visible:bg-transparent", tab === "contribute" ? "border-[var(--accent-bright)] font-[750] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]")} aria-current={tab === "contribute" ? "page" : undefined} onClick={() => setTab("contribute")}><GitFork size={15} /> Contribute</button>
        </nav>
      </header>

      <div className={clsx("roadmap-workspace-grid grid grid-cols-[minmax(0,1fr)_minmax(270px,300px)] items-start gap-[var(--s6)] pt-[var(--s4)] max-[1350px]:grid-cols-1", `is-${tab}`)}>
        <StickyRail className="roadmap-track-rail col-start-2 row-start-1 sticky top-[calc(var(--header-h)+var(--s3))] min-w-0 border border-[var(--border)] bg-[var(--bg)] max-[1350px]:!static max-[1350px]:!max-h-none max-[1350px]:!overflow-visible max-[1350px]:col-start-1 max-[1350px]:row-start-1 max-[1350px]:grid max-[1350px]:grid-cols-[minmax(180px,240px)_minmax(0,1fr)] max-[1350px]:items-start max-[1350px]:gap-[var(--s3)] max-[1350px]:border-0 max-[1350px]:border-b max-[1350px]:border-[var(--border)] max-[1350px]:p-[0_0_var(--s3)]" aria-label="Learning paths">
          <header className="roadmap-track-rail-header flex min-h-[76px] items-start justify-between gap-[var(--s3)] border-b border-[var(--border)] p-[var(--s4)] max-[1350px]:hidden">
            <div><h2 className="m-[0_0_3px] text-[var(--fs-md)] font-bold text-[var(--text)]">Learning paths</h2><p className="m-0 text-[var(--dim)] text-[var(--fs-xs)] leading-[1.4]">Choose a field or jump through the system map.</p></div>
            <span className="grid size-[25px] place-items-center border border-[var(--border)] text-[var(--muted)] text-[var(--fs-2xs)] font-bold">{roadmapFields.length}</span>
          </header>
          <div className="roadmap-track-search m-[var(--s3)] grid min-h-[38px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[7px] border border-[var(--border)] bg-[var(--surface)] px-[var(--s2)] text-[var(--dim)] focus-within:border-[var(--focus-ring)] max-[1350px]:m-0">
            <Search size={15} />
            <input className="min-h-[36px] w-full border-0 bg-transparent p-0 text-[var(--text)] text-[var(--fs-xs)] outline-none" value={trackQuery} onChange={(event) => setTrackQuery(event.target.value)} placeholder="Find a path" aria-label="Find a roadmap path" />
          </div>
          <div className="roadmap-track-list grid gap-[2px] px-[var(--s3)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1350px]:m-0 max-[1350px]:flex max-[1350px]:overflow-x-auto max-[1350px]:overflow-y-hidden max-[1350px]:gap-[3px] max-[1350px]:p-[0_0_4px]">
            {visibleTracks.map((item) => {
              const keys = item.sections.flatMap((section) => section.topics.map((topic) => topicKey(item, topic)));
              const completed = keys.filter((key) => statuses[key] === "done").length;
              const active = !isMaster && item.id === field?.id;
              const linkClasses = clsx(
                "grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-[var(--s2)] p-[6px_var(--s2)] text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] max-[1350px]:min-w-[170px] max-[1350px]:border max-[1350px]:border-[var(--border)]",
                active && "is-active bg-[var(--surface)] text-[var(--text)]"
              );
              return isMaster ? (
                <a key={item.id} className={linkClasses} href={`#${item.id}`} onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  window.history.replaceState(null, "", `#${item.id}`);
                }}>
                  <span className="truncate text-[var(--fs-xs)] font-[650]">{item.shortTitle}<small className="mt-[2px] block text-[var(--dim)] text-[10px] font-medium">{item.category}</small></span>
                  <b className="text-[var(--dim)] text-[10px] font-[650]">{completed}/{keys.length}</b>
                </a>
              ) : (
                <Link key={item.id} className={linkClasses} href={`/roadmap/${item.id}`}>
                  <span className="truncate text-[var(--fs-xs)] font-[650]">{item.shortTitle}<small className="mt-[2px] block text-[var(--dim)] text-[10px] font-medium">{item.category}</small></span>
                  <b className="text-[var(--dim)] text-[10px] font-[650]">{completed}/{keys.length}</b>
                </Link>
              );
            })}
            {visibleTracks.length === 0 && <p className="p-[var(--s3)_var(--s2)] text-[var(--dim)] text-[var(--fs-xs)]">No matching paths.</p>}
          </div>
          <details className="roadmap-rail-guide group m-[var(--s3)_var(--s3)_0] border-t border-[var(--border)] max-[1350px]:hidden">
            <summary className="flex min-h-[42px] cursor-pointer items-center justify-between text-[var(--muted)] text-[var(--fs-xs)] list-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-[6px]"><Info size={14} /> How this works</span>
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <p className="m-[0_0_var(--s3)] text-[var(--dim)] text-[var(--fs-2xs)] leading-[1.55]">Select a topic for its brief and resources, then mark it Learning, Done, or Skip. The sequence is a practical dependency guide—not a promise that research progresses in a straight line.</p>
            <div className="grid gap-[5px] text-[var(--dim)] text-[10px]">
              <span className="flex items-start gap-[6px]"><Users size={13} /> {audience}</span>
              <span className="flex items-start gap-[6px]"><Flag size={13} /> {duration}</span>
            </div>
          </details>
        </StickyRail>

        {tab === "roadmap" && (
          <section className="roadmap-graph-workspace col-start-1 row-start-1 min-w-0 max-[1350px]:col-start-1 max-[1350px]:row-start-2">
            <header className="roadmap-graph-toolbar flex min-h-[54px] items-center justify-between gap-[var(--s4)] border border-b-0 border-[var(--border)] bg-[var(--bg-elev)] px-[var(--s3)]">
              <div className="grid">
                <span className="text-[var(--dim)] text-[10px] font-bold uppercase tracking-[0.08em]">{isMaster ? "System map" : "Current path"}</span>
                <strong className="text-[var(--fs-xs)] text-[var(--text)]">{isMaster ? masterRoadmap.title : field?.shortTitle}</strong>
              </div>
              <div className="roadmap-status-legend flex flex-wrap items-center gap-[var(--s3)] p-0 text-[var(--dim)] text-[10px]" aria-label="Topic status legend">
                <span className="inline-flex items-center gap-1"><i className="size-[7px] rounded-full bg-[var(--border-strong)]" /> Not started</span>
                <span className="inline-flex items-center gap-1"><i className="learning size-[7px] rounded-full bg-[var(--mid)]" /> Learning</span>
                <span className="inline-flex items-center gap-1"><i className="done size-[7px] rounded-full bg-[var(--strong)]" /> Done</span>
                <span className="inline-flex items-center gap-1"><i className="skipped size-[7px] rounded-full bg-[var(--dim)]" /> Skipped</span>
              </div>
            </header>
            <main className="course-roadmap-canvas flex flex-col gap-[var(--s6)] border border-[var(--border)] bg-[#0d1114] bg-[radial-gradient(rgba(137,153,166,0.13)_0.7px,transparent_0.7px)] bg-[size:18px_18px] p-[var(--s5)]" aria-label={`${title} topic map`}>
              <div className="course-roadmap-start self-center inline-flex items-center gap-[6px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-[var(--s3)] py-[6px] text-[var(--dim)] text-[var(--fs-xs)] font-medium"><Sparkles size={15} /> {isMaster ? "Full-Dive development" : "Start this path"}</div>
              {fields.map((item, index) => (
                <FieldMapBlock
                  key={item.id}
                  field={item}
                  index={index}
                  compact={!isMaster}
                  statuses={statuses}
                  onSelect={(section, topic) => { setSelected({ field: item, section, topic }); setResourceTab("resources"); }}
                />
              ))}
              <div className="course-roadmap-finish self-center inline-flex items-center gap-[6px] rounded-full border border-[var(--border)] bg-[var(--surface)] px-[var(--s3)] py-[6px] text-[var(--dim)] text-[var(--fs-xs)] font-medium"><Flag size={15} /> Build, publish, and request review</div>
            </main>
            {!isMaster && <RoadmapRelations field={field} isMaster={false} />}
          </section>
        )}

        {tab === "projects" && (
          <section className="course-projects col-start-1 row-start-1 flex min-w-0 flex-col gap-[var(--s5)] rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s5)] max-[1350px]:col-start-1 max-[1350px]:row-start-2">
            <header>
              <p className="eyebrow mb-[var(--s1)] text-[var(--dim)] text-[var(--fs-2xs)] uppercase tracking-[0.08em] font-bold">Learn by building</p>
              <h2 className="my-[var(--s1)] text-[var(--fs-xl)] font-bold text-[var(--text)]">{isMaster ? "Community project library" : `${field?.shortTitle} projects`}</h2>
              <p className="m-0 text-[var(--muted)] text-[var(--fs-sm)]">Projects are intentionally bounded. Publish the method, result, limitations, and what would disprove the conclusion.</p>
            </header>
            <div className="course-project-filters flex items-center gap-[6px]" aria-label="Project difficulty">
              {(["Beginner", "Intermediate", "Advanced"] as Difficulty[]).map((item) => (
                <button
                  key={item}
                  className={clsx(
                    "min-h-[32px] rounded-full border px-[11px] py-[5px] text-[var(--fs-xs)] font-medium transition-colors",
                    difficulty === item
                      ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)]"
                      : "border-[var(--border)] bg-transparent text-[var(--dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                  )}
                  aria-current={difficulty === item ? "true" : undefined}
                  onClick={() => setDifficulty(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="course-project-grid grid grid-cols-2 gap-[var(--s4)] max-[760px]:grid-cols-1">
              {projects.filter((item) => item.difficulty === difficulty).map((project) => (
                <article key={project.id} className="flex flex-col justify-between rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--surface-2)] p-[var(--s4)]">
                  <div>
                    <span className="text-[var(--dim)] text-[10px] uppercase tracking-[0.05em]">{project.field.shortTitle} · {project.difficulty}</span>
                    <h3 className="my-[var(--s2)] text-[var(--fs-sm)] font-semibold text-[var(--text)]">{project.title}</h3>
                    <p className="m-0 text-[var(--muted)] text-[var(--fs-xs)] leading-[1.45]">{project.description}</p>
                  </div>
                  <Link className="mt-[var(--s3)] inline-flex items-center gap-1 text-[var(--accent-bright)] text-[var(--fs-xs)] font-medium hover:underline" href="/commons/technology">Discuss project <ArrowRight size={14} /></Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "contribute" && <ContributionPanel fieldName={isMaster ? "full-dive development" : field?.shortTitle ?? "this field"} />}
      </div>

      {selected && (
        <>
          <button className="roadmap-inspector-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm" aria-label="Close topic" onClick={() => setSelected(null)} />
          <aside className="roadmap-resource-drawer fixed top-[var(--header-h)] right-0 bottom-0 z-[45] w-[min(430px,94vw)] overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--bg-elev)] shadow-[-18px_0_48px_rgba(0,0,0,0.48)] animate-[roadmap-inspector-in_0.22s_var(--ease)]" aria-label={`${selected.topic} learning resources`}>
            <header className="flex items-start justify-between gap-[var(--s3)] border-b border-[var(--border)] p-[var(--s5)]">
              <div>
                <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">{selected.field.shortTitle} · {selected.section.title}</span>
                <h2 className="my-[5px] text-[var(--fs-xl)] font-bold text-[var(--text)]">{selected.topic}</h2>
              </div>
              <button className="grid size-[32px] place-items-center rounded-[7px] border-0 bg-transparent text-[var(--muted)] hover:bg-[var(--surface-2)]" onClick={() => setSelected(null)} aria-label="Close topic"><X size={18} /></button>
            </header>

            <div className="roadmap-topic-status flex items-center gap-[var(--s2)] border-b border-[var(--border)] p-[var(--s4)_var(--s5)]" aria-label="Topic status">
              <button
                className={clsx(
                  "inline-flex min-h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[var(--r-ctrl)] border text-[var(--fs-xs)] font-medium transition-colors",
                  statuses[topicKey(selected.field, selected.topic)] === "learning"
                    ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                )}
                aria-current={statuses[topicKey(selected.field, selected.topic)] === "learning" ? "true" : undefined}
                onClick={() => setStatus(selected, statuses[topicKey(selected.field, selected.topic)] === "learning" ? undefined : "learning")}
              >
                <CircleDot size={15} /> Learning
              </button>
              <button
                className={clsx(
                  "inline-flex min-h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[var(--r-ctrl)] border text-[var(--fs-xs)] font-medium transition-colors",
                  statuses[topicKey(selected.field, selected.topic)] === "done"
                    ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                )}
                aria-current={statuses[topicKey(selected.field, selected.topic)] === "done" ? "true" : undefined}
                onClick={() => setStatus(selected, statuses[topicKey(selected.field, selected.topic)] === "done" ? undefined : "done")}
              >
                <CheckCircle2 size={15} /> Done
              </button>
              <button
                className={clsx(
                  "inline-flex min-h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[var(--r-ctrl)] border text-[var(--fs-xs)] font-medium transition-colors",
                  statuses[topicKey(selected.field, selected.topic)] === "skipped"
                    ? "border-[var(--border-strong)] bg-[var(--surface-2)] text-[var(--text)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--dim)] hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                )}
                aria-current={statuses[topicKey(selected.field, selected.topic)] === "skipped" ? "true" : undefined}
                onClick={() => setStatus(selected, statuses[topicKey(selected.field, selected.topic)] === "skipped" ? undefined : "skipped")}
              >
                <PauseCircle size={15} /> Skip
              </button>
            </div>

            <div className="roadmap-drawer-tabs flex border-b border-[var(--border)] px-[var(--s5)]">
              <button
                className={clsx(
                  "inline-flex min-h-[40px] flex-1 items-center justify-center gap-[6px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-[var(--fs-xs)] font-medium transition-[color,border-color] active:transform-none hover:bg-transparent hover:border-transparent focus-visible:bg-transparent",
                  resourceTab === "resources" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]"
                )}
                aria-current={resourceTab === "resources" ? "page" : undefined}
                onClick={() => setResourceTab("resources")}
              >
                <BookOpen size={14} /> Resources
              </button>
              <button
                className={clsx(
                  "inline-flex min-h-[40px] flex-1 items-center justify-center gap-[6px] rounded-none border-0 border-b-2 bg-transparent px-0 py-0 text-[var(--fs-xs)] font-medium transition-[color,border-color] active:transform-none hover:bg-transparent hover:border-transparent focus-visible:bg-transparent",
                  resourceTab === "community" ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--dim)] hover:text-[var(--muted)]"
                )}
                aria-current={resourceTab === "community" ? "page" : undefined}
                onClick={() => setResourceTab("community")}
              >
                <Users size={14} /> Community
              </button>
            </div>

            {resourceTab === "resources" ? (
              <div className="roadmap-drawer-content flex flex-col gap-[var(--s5)] p-[var(--s5)]">
                <section className="flex flex-col gap-[var(--s2)]">
                  <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">Learning brief</span>
                  <p className="m-0 text-[var(--muted)] text-[var(--fs-xs)] leading-[1.6]">Study {selected.topic.toLowerCase()} as part of {selected.section.title.toLowerCase()}. Focus on its measurable mechanism, current evidence, engineering constraints, and failure modes.</p>
                </section>
                <section className="flex flex-col gap-[var(--s2)]">
                  <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">What good understanding looks like</span>
                  <ul className="grid gap-[var(--s2)]">
                    <li className="flex items-start gap-[6px] text-[var(--muted)] text-[var(--fs-xs)]"><CheckCircle2 size={14} className="flex-none text-[var(--strong)]" /> Explain the mechanism without overstating current capability.</li>
                    <li className="flex items-start gap-[6px] text-[var(--muted)] text-[var(--fs-xs)]"><CheckCircle2 size={14} className="flex-none text-[var(--strong)]" /> Identify the best measurement and its major confounders.</li>
                    <li className="flex items-start gap-[6px] text-[var(--muted)] text-[var(--fs-xs)]"><CheckCircle2 size={14} className="flex-none text-[var(--strong)]" /> Connect it to at least one neighboring full-dive subsystem.</li>
                  </ul>
                </section>
                <section className="flex flex-col gap-[var(--s2)]">
                  <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">OpenFullDive resources</span>
                  <Link className="grid grid-cols-[18px_minmax(0,1fr)_14px] items-center gap-[var(--s2)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s2)_var(--s3)] hover:border-[var(--border-strong)]" href="/outlook#evidence">
                    <ClipboardCheck size={15} className="text-[var(--dim)]" />
                    <div>
                      <strong className="block text-[var(--text)] text-[var(--fs-xs)]">Evidence ledger</strong>
                      <small className="block text-[var(--dim)] text-[10px]">Find reviewed sources and capability assessments.</small>
                    </div>
                    <ExternalLink size={13} className="text-[var(--dim)]" />
                  </Link>
                  <Link className="grid grid-cols-[18px_minmax(0,1fr)_14px] items-center gap-[var(--s2)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s2)_var(--s3)] hover:border-[var(--border-strong)]" href={`/roadmap/${selected.field.id}`}>
                    <BookOpen size={15} className="text-[var(--dim)]" />
                    <div>
                      <strong className="block text-[var(--text)] text-[var(--fs-xs)]">{selected.field.title} course</strong>
                      <small className="block text-[var(--dim)] text-[10px]">See this topic in its complete learning path.</small>
                    </div>
                    <ArrowRight size={13} className="text-[var(--dim)]" />
                  </Link>
                  <Link className="grid grid-cols-[18px_minmax(0,1fr)_14px] items-center gap-[var(--s2)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s2)_var(--s3)] hover:border-[var(--border-strong)]" href="/contribute">
                    <Code2 size={15} className="text-[var(--dim)]" />
                    <div>
                      <strong className="block text-[var(--text)] text-[var(--fs-xs)]">Submit a resource</strong>
                      <small className="block text-[var(--dim)] text-[10px]">Add a paper, dataset, tutorial, or reproduction.</small>
                    </div>
                    <ArrowRight size={13} className="text-[var(--dim)]" />
                  </Link>
                </section>
                <div className="roadmap-resource-note flex items-start gap-[var(--s2)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface-2)] p-[var(--s3)] text-[var(--dim)] text-[10px] leading-[1.45]">
                  <Info size={15} className="flex-none" /> Course links are community-curated mock content for this prototype. Evidence claims remain separate in the reviewed ledger.
                </div>
              </div>
            ) : (
              <div className="roadmap-drawer-content flex flex-col gap-[var(--s5)] p-[var(--s5)]">
                <section className="flex flex-col gap-[var(--s2)]">
                  <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">Discuss and build</span>
                  <p className="m-0 text-[var(--muted)] text-[var(--fs-xs)] leading-[1.6]">Ask questions, compare sources, or propose a small project around {selected.topic.toLowerCase()}.</p>
                  <Link className="grid grid-cols-[18px_minmax(0,1fr)_14px] items-center gap-[var(--s2)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s2)_var(--s3)] hover:border-[var(--border-strong)]" href="/commons/technology">
                    <MessageCircle size={15} className="text-[var(--dim)]" />
                    <div>
                      <strong className="block text-[var(--text)] text-[var(--fs-xs)]">Technology community</strong>
                      <small className="block text-[var(--dim)] text-[10px]">Open a discussion with other contributors.</small>
                    </div>
                    <ArrowRight size={13} className="text-[var(--dim)]" />
                  </Link>
                </section>
                <section className="flex flex-col gap-[var(--s2)]">
                  <span className="text-[var(--dim)] text-[8px] font-bold uppercase tracking-[0.08em]">Suggested build</span>
                  <p className="m-0 text-[var(--muted)] text-[var(--fs-xs)] leading-[1.6]">{selected.section.project}</p>
                </section>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function FieldMapBlock({ field, index, compact, statuses, onSelect }: {
  field: RoadmapField;
  index: number;
  compact: boolean;
  statuses: Record<string, TopicStatus>;
  onSelect: (section: RoadmapSection, topic: string) => void;
}) {
  const done = field.sections.flatMap((section) => section.topics).filter((topic) => statuses[topicKey(field, topic)] === "done").length;
  return (
    <section className={clsx("field-map-block flex flex-col gap-[var(--s4)] scroll-mt-[calc(var(--header-h)+var(--s4))]", compact && "is-course")} id={field.id}>
      <header className="field-map-heading flex items-center gap-[var(--s3)] rounded-[var(--r-ctrl)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s3)_var(--s4)] shadow-[0_8px_20px_rgba(0,0,0,0.22)] max-[680px]:grid max-[680px]:grid-cols-[28px_minmax(0,1fr)] max-[680px]:items-start max-[680px]:gap-x-[var(--s3)] max-[680px]:gap-y-[var(--s2)]">
        <span className="grid size-[28px] place-items-center rounded-full border border-[var(--border-strong)] text-[var(--dim)] text-[11px] font-bold">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[var(--dim)] text-[10px] font-bold uppercase tracking-[0.08em]">{field.category}</p>
          <h2 className="my-[2px] text-[var(--fs-md)] font-bold text-[var(--text)]">{field.title}</h2>
          <small className="text-[var(--dim)] text-[10px]">{done}/14 topics done</small>
        </div>
        {!compact && <Link className="inline-flex items-center justify-end gap-1 text-[var(--accent-bright)] text-[var(--fs-xs)] font-medium hover:underline max-[680px]:col-start-2 max-[680px]:w-full" href={`/roadmap/${field.id}`}>Open course <ArrowRight size={14} /></Link>}
      </header>
      <div className="field-map-sections flex flex-col gap-[var(--s6)]">
        {field.sections.map((section) => {
          const midpoint = Math.ceil(section.topics.length / 2);
          return (
            <article className="field-section-row grid grid-cols-[1fr_auto_1fr] items-center gap-[58px] max-[1100px]:grid-cols-1 max-[1100px]:gap-[var(--s3)]" key={section.id} id={section.id}>
              <div className="field-topic-branch is-left relative flex flex-col gap-[var(--s2)] after:absolute after:top-[18px] after:bottom-[18px] after:-right-[29px] after:border-r-2 after:border-dotted after:border-[rgba(92,159,255,0.78)] max-[1100px]:after:hidden">
                {section.topics.slice(0, midpoint).map((topic) => <TopicNode key={topic} field={field} section={section} topic={topic} status={statuses[topicKey(field, topic)]} onClick={() => onSelect(section, topic)} />)}
              </div>
              <div className="field-section-core relative flex min-w-[140px] flex-col items-center justify-center rounded-[var(--r-card)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-[var(--s3)_var(--s4)] text-center before:absolute before:top-1/2 before:-left-[30px] before:w-[30px] before:border-t-2 before:border-dotted before:border-[rgba(92,159,255,0.82)] after:absolute after:top-1/2 after:-right-[30px] after:w-[30px] after:border-t-2 after:border-dotted after:border-[rgba(92,159,255,0.82)] max-[1100px]:before:hidden max-[1100px]:after:hidden">
                <strong className="text-[var(--text)] text-[var(--fs-sm)] font-semibold">{section.title}</strong>
                <span className="text-[var(--dim)] text-[10px]">{section.topics.length} topics</span>
              </div>
              <div className="field-topic-branch is-right relative flex flex-col gap-[var(--s2)] after:absolute after:top-[18px] after:bottom-[18px] after:-left-[29px] after:border-r-2 after:border-dotted after:border-[rgba(92,159,255,0.78)] max-[1100px]:after:hidden">
                {section.topics.slice(midpoint).map((topic) => <TopicNode key={topic} field={field} section={section} topic={topic} status={statuses[topicKey(field, topic)]} onClick={() => onSelect(section, topic)} />)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TopicNode({ topic, status, onClick }: { field: RoadmapField; section: RoadmapSection; topic: string; status?: TopicStatus; onClick: () => void }) {
  return (
    <button
      className={clsx(
        "field-topic-node relative flex items-center gap-[var(--s2)] rounded-[var(--r-ctrl)] border p-[8px_var(--s3)] text-left text-[var(--fs-xs)] text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]",
        status === "done" && "is-done border-[rgba(92,159,255,.65)] bg-[rgba(63,140,255,.08)]",
        status === "learning" && "is-learning border-[rgba(63,140,255,.8)] bg-[rgba(63,140,255,.1)]",
        status === "skipped" && "is-skipped border-[var(--dim)] opacity-60",
        !status && "border-[var(--border)] bg-[var(--surface)]"
      )}
      onClick={onClick}
    >
      <span className={clsx("field-topic-status flex-none", status === "done" && "text-[var(--strong)]", status === "learning" && "text-[var(--mid)]", !status && "text-[var(--dim)]")}>
        {status === "done" ? <Check size={12} /> : status === "learning" ? <CircleDot size={12} /> : status === "skipped" ? <PauseCircle size={12} /> : <Circle size={10} />}
      </span>
      <span className="field-topic-label min-w-0 truncate">{topic}</span>
    </button>
  );
}

function RoadmapRelations({ field, isMaster }: { field?: RoadmapField; isMaster: boolean }) {
  const related = isMaster ? roadmapFields.slice(0, 4) : (field?.related.map((id) => roadmapFieldById(id)).filter(Boolean) as RoadmapField[] ?? []);
  return (
    <div className="roadmap-relations mt-[var(--s5)] grid grid-cols-2 gap-[var(--s4)] rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s4)] max-[760px]:grid-cols-1">
      <article className="flex flex-col gap-[var(--s2)]">
        <span className="text-[var(--dim)] text-[10px] font-bold uppercase tracking-[0.08em]">{isMaster ? "Good starting fields" : "Recommended preparation"}</span>
        <div className="flex flex-col gap-[6px]">{isMaster
          ? <><Link className="inline-flex items-center justify-between rounded-[var(--r-ctrl)] border border-[var(--border)] p-[var(--s2)] text-[var(--muted)] text-[var(--fs-xs)] hover:border-[var(--border-strong)] hover:text-[var(--text)]" href="/roadmap/neuroscience">Neuroscience</Link><Link className="inline-flex items-center justify-between rounded-[var(--r-ctrl)] border border-[var(--border)] p-[var(--s2)] text-[var(--muted)] text-[var(--fs-xs)] hover:border-[var(--border-strong)] hover:text-[var(--text)]" href="/roadmap/ethical-engineering">Ethical engineering</Link><Link className="inline-flex items-center justify-between rounded-[var(--r-ctrl)] border border-[var(--border)] p-[var(--s2)] text-[var(--muted)] text-[var(--fs-xs)] hover:border-[var(--border-strong)] hover:text-[var(--text)]" href="/roadmap/virtual-environments">Virtual environments</Link></>
          : field?.prerequisites.map((item) => <small key={item} className="flex items-center gap-[6px] text-[var(--dim)] text-[var(--fs-xs)]"><CheckCircle2 size={13} /> {item}</small>)
        }</div>
      </article>
      <article className="flex flex-col gap-[var(--s2)]">
        <span className="text-[var(--dim)] text-[10px] font-bold uppercase tracking-[0.08em]">Related roadmaps</span>
        <div className="flex flex-col gap-[6px]">{related.map((item) => <Link key={item.id} className="inline-flex items-center justify-between rounded-[var(--r-ctrl)] border border-[var(--border)] p-[var(--s2)] text-[var(--muted)] text-[var(--fs-xs)] hover:border-[var(--border-strong)] hover:text-[var(--text)]" href={`/roadmap/${item.id}`}>{item.shortTitle} <ArrowRight size={12} /></Link>)}</div>
      </article>
    </div>
  );
}

function ContributionPanel({ fieldName }: { fieldName: string }) {
  return (
    <section className="course-contribution-panel col-start-1 row-start-1 flex min-w-0 flex-col gap-[var(--s5)] rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--surface)] p-[var(--s5)] max-[1350px]:col-start-1 max-[1350px]:row-start-2">
      <header>
        <p className="eyebrow mb-[var(--s1)] text-[var(--dim)] text-[var(--fs-2xs)] uppercase tracking-[0.08em] font-bold">From learning to useful work</p>
        <h2 className="my-[var(--s1)] text-[var(--fs-xl)] font-bold text-[var(--text)]">Contribute to {fieldName}</h2>
        <p className="m-0 text-[var(--muted)] text-[var(--fs-sm)]">The community advances through small, inspectable work—not unsupported full-dive claims.</p>
      </header>
      <div className="flex flex-col gap-[var(--s3)]">
        {[
          ["Choose one bounded problem", "Pick one roadmap topic and define a result that can be reviewed in weeks."],
          ["Declare scope and safety", "Write the goal, non-goals, evidence standard, data provenance, and stop conditions."],
          ["Build in public", "Share source, tests, failed attempts, decisions, and reproducible instructions."],
          ["Request cross-field review", "Ask a contributor from a neighboring roadmap to challenge interfaces and assumptions."],
          ["Publish what was learned", "Submit the result to the evidence ledger or document it as an open project update."],
        ].map(([title, body], index) => (
          <article key={title} className="flex items-start gap-[var(--s3)] rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--surface-2)] p-[var(--s3)_var(--s4)]">
            <span className="grid size-[24px] place-items-center rounded-full border border-[var(--border-strong)] text-[var(--dim)] text-[10px] font-bold">{index + 1}</span>
            <div>
              <h3 className="m-0 text-[var(--fs-sm)] font-semibold text-[var(--text)]">{title}</h3>
              <p className="m-[2px_0_0] text-[var(--muted)] text-[var(--fs-xs)]">{body}</p>
            </div>
          </article>
        ))}
      </div>
      <footer className="flex items-center gap-[var(--s2)]">
        <Link className="primary btn inline-flex items-center gap-[6px]" href="/commons/technology"><MessageCircle size={15} /> Start a project discussion</Link>
        <Link className="btn inline-flex items-center gap-[6px]" href="/contribute"><ClipboardCheck size={15} /> Submit evidence</Link>
      </footer>
    </section>
  );
}

function topicKey(field: RoadmapField, topic: string) {
  return `${field.id}:${slugifyTopic(topic)}`;
}
