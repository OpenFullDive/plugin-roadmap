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
  Compass,
  Download,
  ExternalLink,
  Flag,
  FolderKanban,
  GitFork,
  HelpCircle,
  Layers3,
  List,
  MessageCircle,
  Network,
  PauseCircle,
  Search,
  Share2,
  Sparkles,
  Square,
  SquareCheck,
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
  const [exported, setExported] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Close topic drawer on Escape key
  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

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

  const projects = useMemo(
    () =>
      fields.flatMap((item) =>
        item.sections.flatMap((section) => [
          {
            id: `${item.id}-${section.id}-beginner`,
            difficulty: "Beginner" as const,
            field: item,
            title: `Map the evidence for ${section.topics[0] ?? section.title}`,
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
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
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

  // --------------------------------------------------------------------------
  // Authentic roadmap.sh Flowchart Layout Engine (Fixed Document Scroll)
  // Pixel-accurate topology with radiating curved dotted lines, 2-column grids,
  // inlined project callout cards, titled section boxes, and corner status dots.
  // --------------------------------------------------------------------------
  const flowchartData = useMemo(() => {
    if (isMaster || !field) return null;

    type NodeItem = {
      id: string;
      type: "milestone-main" | "milestone-sub" | "concept-pill" | "project-card" | "capstone";
      topicName: string;
      subtopicName?: string;
      section: RoadmapSection;
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
    };

    type EdgeItem = {
      id: string;
      type: "spine" | "branch" | "radiating" | "solid";
      path: string;
      status?: TopicStatus;
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

    // Top Legend Card (flush with left boundary of 1000px container)
    const legendCard = {
      x: 0,
      y: 20,
      width: 260,
      height: 120,
    };

    // Top Curriculum Card (flush with right boundary: 1000 - 290 = 710)
    const curriculumCard = {
      x: 710,
      y: 20,
      width: 290,
      height: 115,
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
    const rColW = 290;
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
        type: "radiating",
        path: `M ${m1RightX} ${m1CenterY} C ${m1RightX + 35} ${m1CenterY}, ${rColX - 35} ${cardCenterY}, ${rColX} ${cardCenterY}`,
      });

      nodes.push({
        id: `concept-m1-r-${idx}`,
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
      type: "solid",
      path: `M ${m1X} ${leftBranchStartY} H 300 V 200 H 260`,
    });

    const lGridX = 0;
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
      path: `M 130 ${gridBottomY} V ${gridBottomY + 15}`,
    });

    // Yellow Milestone: Pick Platform
    const pickPlatY = gridBottomY + 15; // 375
    nodes.push({
      id: `pick-plat-${field.id}`,
      type: "milestone-main",
      topicName: m1Topic,
      section: sec1,
      label: getPlatformMilestoneTitle(field.id),
      x: 0,
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
      x: 0,
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
      type: "radiating",
      path: `M ${m2X} ${m2Y + m2H / 2} C ${m2X - 35} ${m2Y + m2H / 2}, 300 560, 260 560`,
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
      path: `M 130 ${denoiseBottomY} V ${denoiseBottomY + 17}`,
    });

    const strategyY = denoiseBottomY + 17; // 695
    nodes.push({
      id: `strategy-milestone-${field.id}`,
      type: "milestone-main",
      topicName: sec2t0,
      section: sec2,
      label: "Artifact Removal Strategy",
      x: 0,
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
      x: 0,
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
      boxX: 710,
      boxY: 560,
      boxW: 290,
      boxH: 165,
      labelX: 745,
      labelY: 550,
    });

    edges.push({
      id: "m2-to-features-box",
      type: "radiating",
      path: `M ${m2X + m2W} ${m2Y + m2H / 2} C ${m2X + m2W + 35} ${m2Y + m2H / 2}, 680 642, 710 642`,
    });

    const sec2FeatTopic = sec2.topics[2] ?? sec2.title;
    const featPills = [
      { label: "Band Power (PSD)", w: 130, x: 720, y: 575, badge: "recommended" },
      { label: "CSP Filtering", w: 130, x: 860, y: 575, badge: "recommended" },
      { label: "Time-Frequency Wavelets", w: 130, x: 720, y: 618, badge: "alternative" },
      { label: "FBCSP Algorithm", w: 130, x: 860, y: 618, badge: "alternative" },
      { label: "Riemannian Geometry Covariance", w: 270, x: 720, y: 661, badge: "recommended" },
    ];
    featPills.forEach((p, idx) => {
      nodes.push({
        id: `feat-${idx}`,
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
      boxX: 710,
      boxY: 755,
      boxW: 290,
      boxH: 215,
      labelX: 740,
      labelY: 745,
    });

    edges.push({
      id: "m2-to-decoders-box",
      type: "radiating",
      path: `M ${m2X + m2W} ${m2Y + m2H / 2} C ${m2X + m2W + 35} ${m2Y + m2H / 2}, 680 860, 710 860`,
    });

    const sec2DecTopic = sec2.topics[6] ?? sec2.title;
    const decoderPills = [
      { label: "Linear Discriminant (LDA)", w: 130, x: 720, y: 770, badge: "recommended" },
      { label: "Support Vector (SVM)", w: 130, x: 860, y: 770, badge: "recommended" },
      { label: "Adaptive Kalman Filters", w: 270, x: 720, y: 813, badge: "recommended" },
      { label: "EEGNet / ConvNet Decoders", w: 270, x: 720, y: 856, badge: "recommended" },
      { label: "Transformer Intent Models", w: 270, x: 720, y: 899, badge: "alternative" },
    ];
    decoderPills.forEach((p, idx) => {
      nodes.push({
        id: `dec-${idx}`,
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
      type: "radiating",
      path: `M ${m3X} ${m3Y + m3H / 2} C ${m3X - 35} ${m3Y + m3H / 2}, 300 1000, 260 1000`,
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
      path: `M 130 ${streamBottomY} V ${streamBottomY + 17}`,
    });

    const optY = streamBottomY + 17; // 1093
    nodes.push({
      id: `stream-opt-milestone`,
      type: "milestone-main",
      topicName: sec2TelemTopic,
      section: sec2,
      label: "Stream Engine Optimization",
      x: 0,
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
      x: 0,
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
      boxX: 710,
      boxY: 1000,
      boxW: 290,
      boxH: 215,
      labelX: 735,
      labelY: 990,
    });

    edges.push({
      id: "m3-to-safety-box",
      type: "radiating",
      path: `M ${m3X + m3W} ${m3Y + m3H / 2} C ${m3X + m3W + 35} ${m3Y + m3H / 2}, 680 1100, 710 1100`,
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
        type: "concept-pill",
        topicName: sec2DecTopic,
        subtopicName: si.label,
        section: sec2,
        label: si.label,
        x: 720,
        y: 1015 + idx * 43,
        width: 270,
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

  return (
    <div className="roadmap-explorer-root">
      {/* Floating Social Share Stack (roadmap.sh signature) */}
      <aside className="rm-floating-social-rail" aria-label="Social share options">
        <div className="rm-floating-social">
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on X"
            aria-label="Share on X"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out the ${field?.title ?? "OpenFullDive"} Roadmap`)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
              }
            }}
          >
            𝕏
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Facebook"
            aria-label="Share on Facebook"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, "_blank");
              }
            }}
          >
            f
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Hacker News"
            aria-label="Share on Hacker News"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(`https://news.ycombinator.com/submitlink?u=${encodeURIComponent(window.location.href)}&t=${encodeURIComponent(field?.title ?? "OpenFullDive Roadmap")}`, "_blank");
              }
            }}
          >
            Y
          </button>
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share on Reddit"
            aria-label="Share on Reddit"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.open(`https://reddit.com/submit?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(field?.title ?? "OpenFullDive Roadmap")}`, "_blank");
              }
            }}
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
            <select
              value={isMaster ? "master" : field?.id ?? "bci"}
              onChange={(e) => {
                const val = e.target.value;
                window.location.href = val === "master" ? "/roadmap" : `/roadmap/${val}`;
              }}
              className="rm-select-discipline"
              aria-label="Select discipline track"
            >
              <option value="master">Master Curriculum (All 12 Tracks)</option>
              <optgroup label="12 Open Disciplines">
                {roadmapFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.shortTitle} ({f.category})
                  </option>
                ))}
              </optgroup>
            </select>

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

            {/* Favorite / Star Action */}
            <button
              type="button"
              className="rm-btn-action"
              onClick={exportProgress}
              aria-label="Star this roadmap"
              title="Star this roadmap"
            >
              <Sparkles size={16} />
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
                <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--dim)]">
                  {projects.length}
                </span>
              )}
            </button>

            {!isMaster && (
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
            )}

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

            <div className="rm-tab-progress-info">
              <span>
                Progress: <strong className="text-[var(--text)]">{progressPercent}%</strong> ({doneCount}/{allTopicKeys.length})
              </span>
              <div className="rm-tab-progress-bar">
                <div className="rm-tab-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 5: Signature Yellow Tracking Banner */}
        <div className="rm-tracking-banner">
          <div className="rm-tracking-banner-left">
            <Sparkles size={15} className="text-[#ffd166] flex-shrink-0" />
            <span>Mark any topic to start tracking. Click any card to view scientific specifications & formulas.</span>
          </div>
          <button
            type="button"
            className="rm-tracking-banner-action"
            onClick={() => setShowOverviewAccordion((prev) => !prev)}
          >
            <span>{showOverviewAccordion ? "Hide overview" : "Watch overview"}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Row 6: "What is [Discipline]?" Accordion */}
        <div className="rm-accordion-container">
          <button
            type="button"
            className="rm-accordion-header"
            onClick={() => setShowOverviewAccordion((prev) => !prev)}
            aria-expanded={showOverviewAccordion}
          >
            <div className="flex items-center gap-2">
              <HelpCircle size={15} className="text-[#ffd166]" />
              <span>What is {isMaster ? "Full-Dive VR Development" : field?.title ?? "this track"}?</span>
            </div>
            <ChevronDown size={15} className={clsx("text-[var(--dim)] transition-transform duration-200", showOverviewAccordion && "rotate-180")} />
          </button>

          {showOverviewAccordion && (
            <div className="rm-accordion-body">
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
              <div className="roadmap-flow-wrapper" aria-label="Interactive learning flowchart">
                {/* Mode A: Master System Map Flowchart */}
                {isMaster && (
                  <div
                    className="roadmap-diagram-canvas"
                    style={{
                      width: 1000,
                      height: 820,
                    }}
                  >
                    {/* SVG Connector Layer */}
                    <svg
                      className="rm-svg-overlay"
                      width={1000}
                      height={820}
                      viewBox="0 0 1000 820"
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
                      </defs>

                      {/* Tier Bounding Boxes */}
                      <rect x="40" y="105" width="920" height="98" rx="8" className="rm-section-box" />
                      <rect x="15" y="255" width="970" height="98" rx="8" className="rm-section-box" />
                      <rect x="40" y="405" width="920" height="98" rx="8" className="rm-section-box" />
                      <rect x="180" y="555" width="640" height="98" rx="8" className="rm-section-box" />

                      {/* Center Spine Lines */}
                      <path d="M 500 62 V 90" className="rm-edge-spine" markerEnd="url(#rm-arrow)" />
                      <path d="M 500 203 V 238" className="rm-edge-spine" markerEnd="url(#rm-arrow)" />
                      <path d="M 500 353 V 388" className="rm-edge-spine" markerEnd="url(#rm-arrow)" />
                      <path d="M 500 503 V 538" className="rm-edge-spine" markerEnd="url(#rm-arrow)" />
                      <path d="M 500 653 V 688" className="rm-edge-spine" markerEnd="url(#rm-arrow)" />
                    </svg>

                    {/* Start Node */}
                    <div
                      className="rm-track-title-badge"
                      style={{ left: 500 - 140, top: 26, width: 280 }}
                    >
                      <Sparkles size={14} className="text-[var(--accent-bright)]" />
                      Start: Full-Dive Curriculum
                    </div>

                    {/* Tier 1: Scientific Foundations */}
                    <div className="rm-group-title" style={{ left: 500 - 150, top: 92 }}>
                      01. Scientific & Physical Foundations
                    </div>
                    {[
                      { id: "neuroscience", x: 60, y: 135, w: 270, h: 56 },
                      { id: "hardware-architecture", x: 365, y: 135, w: 270, h: 56 },
                      { id: "virtual-environments", x: 670, y: 135, w: 270, h: 56 },
                    ].map((item) => {
                      const f = roadmapFieldById(item.id);
                      if (!f) return null;
                      const keys = f.sections.flatMap((s) => s.topics.map((t) => topicKey(f, t)));
                      const itemDone = keys.filter((k) => statuses[k] === "done").length;
                      return (
                        <Link
                          key={item.id}
                          href={`/roadmap/${item.id}`}
                          className="rm-master-discipline text-decoration-none"
                          style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                        >
                          <span className="disc-title">{f.title}</span>
                          <div className="disc-meta">
                            <span>{f.category}</span>
                            <span className="font-mono">{itemDone}/{keys.length} done</span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Tier 2: Interfaces */}
                    <div className="rm-group-title" style={{ left: 500 - 140, top: 242 }}>
                      02. Interfaces & Neural Interaction
                    </div>
                    {[
                      { id: "bci", x: 30, y: 285, w: 225, h: 56 },
                      { id: "haptics", x: 270, y: 285, w: 225, h: 56 },
                      { id: "neural-modulation", x: 510, y: 285, w: 225, h: 56 },
                      { id: "sensory-substitution", x: 750, y: 285, w: 225, h: 56 },
                    ].map((item) => {
                      const f = roadmapFieldById(item.id);
                      if (!f) return null;
                      const keys = f.sections.flatMap((s) => s.topics.map((t) => topicKey(f, t)));
                      const itemDone = keys.filter((k) => statuses[k] === "done").length;
                      return (
                        <Link
                          key={item.id}
                          href={`/roadmap/${item.id}`}
                          className="rm-master-discipline text-decoration-none"
                          style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                        >
                          <span className="disc-title">{f.title}</span>
                          <div className="disc-meta">
                            <span>{f.category}</span>
                            <span className="font-mono">{itemDone}/{keys.length} done</span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Tier 3: Systems & Safety */}
                    <div className="rm-group-title" style={{ left: 500 - 140, top: 392 }}>
                      03. Systems, Software & Safety
                    </div>
                    {[
                      { id: "software-frameworks", x: 60, y: 435, w: 270, h: 56 },
                      { id: "system-integration", x: 365, y: 435, w: 270, h: 56 },
                      { id: "ethical-engineering", x: 670, y: 435, w: 270, h: 56 },
                    ].map((item) => {
                      const f = roadmapFieldById(item.id);
                      if (!f) return null;
                      const keys = f.sections.flatMap((s) => s.topics.map((t) => topicKey(f, t)));
                      const itemDone = keys.filter((k) => statuses[k] === "done").length;
                      return (
                        <Link
                          key={item.id}
                          href={`/roadmap/${item.id}`}
                          className="rm-master-discipline text-decoration-none"
                          style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                        >
                          <span className="disc-title">{f.title}</span>
                          <div className="disc-meta">
                            <span>{f.category}</span>
                            <span className="font-mono">{itemDone}/{keys.length} done</span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Tier 4: Frontier Research */}
                    <div className="rm-group-title" style={{ left: 500 - 140, top: 542 }}>
                      04. Frontier Research & Synthesis
                    </div>
                    {[
                      { id: "advanced-neural-mapping", x: 200, y: 585, w: 280, h: 56 },
                      { id: "future-frontiers", x: 520, y: 585, w: 280, h: 56 },
                    ].map((item) => {
                      const f = roadmapFieldById(item.id);
                      if (!f) return null;
                      const keys = f.sections.flatMap((s) => s.topics.map((t) => topicKey(f, t)));
                      const itemDone = keys.filter((k) => statuses[k] === "done").length;
                      return (
                        <Link
                          key={item.id}
                          href={`/roadmap/${item.id}`}
                          className="rm-master-discipline text-decoration-none"
                          style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                        >
                          <span className="disc-title">{f.title}</span>
                          <div className="disc-meta">
                            <span>{f.category}</span>
                            <span className="font-mono">{itemDone}/{keys.length} done</span>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Finish Capstone */}
                    <div
                      className="rm-capstone-finish-badge"
                      style={{ left: 500 - 190, top: 695, width: 380 }}
                    >
                      <Flag size={16} className="text-[#34d399]" />
                      Capstone: Full-Dive Architecture Integration & Synthesis
                    </div>
                  </div>
                )}

                {/* Mode B: Discipline Flowchart (Authentic roadmap.sh fixed document layout) */}
                {!isMaster && field && flowchartData && (
                  <div
                    className="roadmap-diagram-canvas"
                    style={{
                      width: flowchartData.canvasWidth,
                      height: flowchartData.canvasHeight,
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
                      <div className="rm-legend-item">
                        <span className="rm-badge-corner is-recommended"><Check size={8} /></span>
                        <span>Personal Recommendation / Opinion</span>
                      </div>
                      <div className="rm-legend-item">
                        <span className="rm-badge-corner is-alternative"><Check size={8} /></span>
                        <span>Alternative Option / Pick this or green</span>
                      </div>
                      <div className="rm-legend-item">
                        <span className="rm-badge-corner is-elective"><Check size={8} /></span>
                        <span>Order not strict / Learn anytime</span>
                      </div>
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
                        Find the detailed version of this roadmap along with other similar roadmaps across neurotechnology.
                      </p>
                      <Link href="/roadmap" className="curriculum-btn">
                        openfulldive.org/roadmap →
                      </Link>
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
                              setSelected({
                                field,
                                section: node.section,
                                topic: node.topicName,
                                subtopicFocus: node.subtopicName,
                              });
                              setDrawerTab("community");
                            }}
                          >
                            <Flag size={16} className="text-[#34d399]" />
                            <span>{node.label}</span>
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
                            if (e.shiftKey) {
                              e.preventDefault();
                              const cur = statuses[topicKey(field, node.topicName)];
                              setStatus({ field, section: node.section, topic: node.topicName }, cur === "learning" ? undefined : "learning");
                              return;
                            }
                            if (e.altKey) {
                              e.preventDefault();
                              const cur = statuses[topicKey(field, node.topicName)];
                              setStatus({ field, section: node.section, topic: node.topicName }, cur === "skipped" ? undefined : "skipped");
                              return;
                            }
                            setSelected({
                              field,
                              section: node.section,
                              topic: node.topicName,
                              subtopicFocus: node.subtopicName,
                            });
                            setDrawerTab("knowledge");
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            const cur = statuses[topicKey(field, node.topicName)];
                            setStatus({ field, section: node.section, topic: node.topicName }, cur === "done" ? undefined : "done");
                          }}
                        >
                          <span>{node.label}</span>
                          {node.badge && (
                            <span className={clsx("rm-badge-corner", `is-${node.badge}`)}>
                              <Check size={8} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Floating AI Tutor Pill (roadmap.sh signature) */}
                <button
                  type="button"
                  className="rm-floating-ai-tutor"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>(".rm-search-input");
                    if (input) {
                      input.focus();
                    }
                  }}
                >
                  <span className="ai-tag">
                    <Sparkles size={14} /> AI Tutor
                  </span>
                  <span>Have a question? Type here</span>
                </button>
              </div>
            )}

            {/* Mode C: Linear Guide View */}
            {viewMode === "linear" && !isMaster && field && (
              <div className="w-full max-w-[800px] mx-auto py-6 px-4 space-y-6">
                {field.sections.map((sec, secIdx) => {
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
                        <h3 className="mt-1 text-base font-bold text-[var(--text)] m-0">{sec.title}</h3>
                        <p className="mt-1 text-xs text-[var(--muted)] m-0">{sec.summary}</p>
                      </header>

                      <div className="space-y-2">
                        {filteredTopics.map((topic) => {
                          const key = topicKey(field, topic);
                          const status = statuses[key];
                          return (
                            <button
                              key={topic}
                              type="button"
                              className={clsx(
                                "w-full flex items-center justify-between gap-3 rounded border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left transition-colors cursor-pointer hover:border-[var(--accent)]",
                                status === "done" && "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.04)]",
                                status === "learning" && "border-[rgba(255,209,102,0.3)] bg-[rgba(255,209,102,0.04)]",
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
                              <span className="text-[11px] text-[var(--dim)] font-medium">Inspect →</span>
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
                })}
              </div>
            )}

            {/* Bottom Prerequisites & Related Disciplines Section */}
            {!isMaster && field && (
              <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 max-[768px]:grid-cols-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                    Prerequisites & Preparation
                  </span>
                  <div className="mt-2.5 space-y-2">
                    {field.prerequisites.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                        <CheckCircle2 size={13} className="text-[#10b981]" />
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
                    Connecting Disciplines
                  </span>
                  <div className="mt-2.5 space-y-2">
                    {field.related.map((id) => {
                      const rel = roadmapFieldById(id);
                      if (!rel) return null;
                      return (
                        <Link
                          key={id}
                          href={`/roadmap/${id}`}
                          className="flex items-center justify-between rounded border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] transition-colors text-decoration-none"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[var(--text)]">{rel.title}</span>
                            <span className="text-[10px] text-[var(--dim)]">({rel.category})</span>
                          </div>
                          <ArrowRight size={13} className="text-[var(--dim)]" />
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
                Every project is bounded to produce inspectable code, measurements, and limitations for community peer review.
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
                  <article
                    key={project.id}
                    className="flex flex-col justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4"
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-[var(--dim)] uppercase">
                        {project.field.shortTitle} · {project.difficulty}
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-[var(--text)] m-0">{project.title}</h3>
                      <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed m-0">{project.description}</p>
                    </div>
                    <Link
                      href="/commons/technology"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-bright)] hover:underline text-decoration-none"
                    >
                      Discuss project in Commons <ArrowRight size={13} />
                    </Link>
                  </article>
                ))}
            </div>
          </section>
        )}

        {/* TAB 3: Contribution Guide */}
        {tab === "contribute" && (
          <ContributionPanel fieldName={isMaster ? "Full-Dive Development" : field?.title ?? "this field"} />
        )}
      </main>

      {/* Slide-over Topic Detail Drawer */}
      {selected && activeTopicDetail && (
        <>
          <button
            type="button"
            className="roadmap-inspector-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm border-0 cursor-pointer"
            aria-label="Close topic drawer"
            onClick={() => setSelected(null)}
          />

          <aside
            className="roadmap-resource-drawer fixed top-0 right-0 bottom-0 z-50 flex w-[min(480px,94vw)] flex-col border-l border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
            aria-label={`${selected.topic} topic sheet`}
          >
            {/* Header */}
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
            <div className="border-b border-[var(--border)] bg-[var(--surface-2)] p-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--dim)] mb-2">
                Your Learning Status
              </span>
              <div className="rm-drawer-status-grid">
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
                      className={clsx("rm-drawer-status-btn", isActive && "is-active")}
                      onClick={() => setStatus(selected, item.id)}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
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
                            className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-colors"
                            onClick={() => toggleChecklist(checkKey)}
                          >
                            {isChecked ? (
                              <SquareCheck size={16} className="text-[#10b981] flex-shrink-0 mt-0.5" />
                            ) : (
                              <Square size={16} className="text-[var(--dim)] flex-shrink-0 mt-0.5" />
                            )}
                            <span className={clsx(isChecked && "line-through text-[var(--dim)]", "leading-relaxed")}>
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
            <footer className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-2)] p-4">
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

      <div className="flex flex-col gap-3">
        {[
          ["1. Choose one bounded problem", "Pick a single topic node and define a reproducible deliverable reviewable within weeks."],
          ["2. Declare scope and safety bounds", "Document hypotheses, non-goals, measurement apparatus, and safe shutdown conditions."],
          ["3. Build and test in public", "Publish raw datasets, calibration benches, reproduction code, and negative findings."],
          ["4. Solicit peer challenge", "Request cross-discipline critique from adjacent fields to test system integration assumptions."],
          ["5. Submit to the evidence ledger", "Publish your findings to the community evidence ledger under editorial review."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <h3 className="text-xs font-bold text-[var(--text)] m-0">{title}</h3>
            <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed m-0">{body}</p>
          </article>
        ))}
      </div>

      <footer className="flex items-center gap-3 pt-2">
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
