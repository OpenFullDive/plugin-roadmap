import { useId, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  Download,
  FolderKanban,
  GitFork,
  HelpCircle,
  Layers3,
  List,
  Share2,
  Sparkles,
} from "lucide-react";
import type { RoadmapField } from "../../content/roadmap";
import type { Tab, ViewMode } from "../types";
import { DisciplinePicker } from "./DisciplinePicker";
import { SearchBar } from "./SearchBar";
import { ProgressSummaryBar } from "./ProgressSummaryBar";

export interface RoadmapHeaderProps {
  slug: string;
  isMaster: boolean;
  title: string;
  description: string;
  subtitle?: string;
  audience?: string;
  duration?: string;
  level?: string;
  field?: RoadmapField | null;
  // Tabs & Navigation
  tab: Tab;
  viewMode: ViewMode;
  onSelectTab: (tab: Tab, mode?: ViewMode) => void;
  projectsCount?: number;
  // Discipline selector
  onSelectDiscipline?: (id: string) => void;
  // Actions
  saved?: boolean;
  onToggleFavorite?: () => void;
  exported?: boolean;
  onExportProgress?: () => void;
  copied?: boolean;
  onShare?: () => void;
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  matchCount?: number;
  // Progress
  doneCount: number;
  totalTopics: number;
  progressPercent: number;
  learningCount?: number;
  disciplineDoneCount?: number;
  disciplineTotalTopics?: number;
  disciplineProgressPercent?: number;
  // Overview state
  showOverview?: boolean;
  onToggleOverview?: () => void;
  className?: string;
}

/**
 * Top roadmap header card containing:
 * - Breadcrumb navigation and action buttons (track selector, bookmark, export, share)
 * - Hero title and descriptive summary
 * - View mode tabs (Roadmap flowchart, Projects catalog, Linear guide, Contribute)
 * - Search bar with '/' shortcut and progress metrics summary
 * - Interactive tracking banner and expandable curriculum overview accordion
 */
export function RoadmapHeader({
  slug,
  isMaster,
  title,
  description,
  subtitle,
  audience = "",
  duration = "",
  level,
  field,
  tab,
  viewMode,
  onSelectTab,
  projectsCount,
  onSelectDiscipline,
  saved = false,
  onToggleFavorite,
  exported = false,
  onExportProgress,
  copied = false,
  onShare,
  searchQuery,
  onSearchChange,
  onClearSearch,
  searchInputRef,
  matchCount,
  doneCount,
  totalTopics,
  progressPercent,
  learningCount = 0,
  disciplineDoneCount,
  disciplineTotalTopics,
  disciplineProgressPercent,
  showOverview,
  onToggleOverview,
  className,
}: RoadmapHeaderProps) {
  const reactId = useId();
  const overviewPanelId = `${reactId}-overview`;
  const [internalShowOverview, setInternalShowOverview] = useState(false);

  const isOpenOverview = showOverview !== undefined ? showOverview : internalShowOverview;
  const toggleOverview = () => {
    if (onToggleOverview) {
      onToggleOverview();
    } else {
      setInternalShowOverview((prev) => !prev);
    }
  };

  const defaultSubtitle = isMaster
    ? "Step by step curriculum connecting all 12 disciplines for full-dive virtual reality in 2026."
    : `Step by step guide to mastering ${title.toLowerCase()} in 2026. ${description}`;

  return (
    <header className={`rm-header-card${className ? ` ${className}` : ""}`}>
      {/* Row 1: Breadcrumb (Left) & Actions Bar (Right) */}
      <div className="rm-top-bar">
        <Link href="/roadmap" className="rm-breadcrumb-link">
          <ArrowLeft size={15} />
          <span>All Roadmaps</span>
        </Link>

        <div className="rm-actions-group">
          {/* Discipline Switcher */}
          <DisciplinePicker
            currentId={isMaster ? "master" : field?.id ?? slug ?? "bci"}
            currentLabel={
              isMaster
                ? "Master Curriculum (All 12 Tracks)"
                : field?.shortTitle ?? title ?? "Select a track"
            }
            onSelect={onSelectDiscipline}
          />

          {/* Bookmark Action */}
          {onToggleFavorite && (
            <button
              type="button"
              className={clsx("rm-btn-action", saved && "is-active")}
              onClick={onToggleFavorite}
              aria-label={saved ? "Saved to favorites" : "Bookmark roadmap"}
              title={saved ? "Saved to favorites" : "Bookmark roadmap"}
            >
              <Bookmark
                size={16}
                className={saved ? "fill-[var(--accent-bright)] text-[var(--accent-bright)]" : ""}
              />
            </button>
          )}

          {/* Download Button */}
          {onExportProgress && (
            <button
              type="button"
              className="rm-btn-download"
              onClick={onExportProgress}
              aria-label="Download Roadmap Progress"
              title="Download Progress JSON / Curriculum"
            >
              {exported ? (
                <Check size={15} strokeWidth={2.5} />
              ) : (
                <Download size={15} strokeWidth={2.5} />
              )}
              <span>{exported ? "Exported!" : "Download"}</span>
            </button>
          )}

          {/* Share Button */}
          {onShare && (
            <button
              type="button"
              className="rm-btn-share"
              onClick={onShare}
              aria-label="Share Roadmap Link"
              title="Share Roadmap Link"
            >
              {copied ? (
                <Check size={16} strokeWidth={2.5} />
              ) : (
                <Share2 size={16} strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Hero Title */}
      <h1 className="rm-hero-title">{title}</h1>

      {/* Row 3: Subtitle */}
      <p className="rm-hero-subtitle">{subtitle ?? defaultSubtitle}</p>

      {/* Row 4: Tabs Bar (Roadmap, Projects, Linear Guide, Contribute) */}
      <div className="rm-tabs-bar">
        <nav className="rm-tabs-nav" aria-label="Roadmap views">
          <button
            type="button"
            className={clsx("rm-tab-btn", tab === "roadmap" && viewMode === "flowchart" && "is-active")}
            onClick={() => onSelectTab("roadmap", "flowchart")}
          >
            <Layers3 size={15} />
            <span>Roadmap</span>
          </button>

          <button
            type="button"
            className={clsx("rm-tab-btn", tab === "projects" && "is-active")}
            onClick={() => onSelectTab("projects")}
          >
            <FolderKanban size={15} />
            <span>Projects</span>
            {projectsCount !== undefined && projectsCount > 0 && (
              <span className="rm-tab-count">{projectsCount}</span>
            )}
          </button>

          <button
            type="button"
            className={clsx("rm-tab-btn", tab === "roadmap" && viewMode === "linear" && "is-active")}
            onClick={() => onSelectTab("roadmap", "linear")}
          >
            <List size={15} />
            <span>Linear Guide</span>
          </button>

          <button
            type="button"
            className={clsx("rm-tab-btn", tab === "contribute" && "is-active")}
            onClick={() => onSelectTab("contribute")}
          >
            <GitFork size={15} />
            <span>Contribute</span>
          </button>
        </nav>

        {/* Search & Progress Info on Right */}
        <div className="rm-tabs-actions">
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onClear={onClearSearch}
            inputRef={searchInputRef}
            matchCount={matchCount}
          />
          <ProgressSummaryBar
            doneCount={doneCount}
            totalTopics={totalTopics}
            progressPercent={progressPercent}
            learningCount={learningCount}
            disciplineDoneCount={disciplineDoneCount}
            disciplineTotalTopics={disciplineTotalTopics}
            disciplineProgressPercent={disciplineProgressPercent}
            trackTitle={field?.shortTitle}
          />
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
          aria-expanded={isOpenOverview}
          aria-controls={overviewPanelId}
          onClick={toggleOverview}
        >
          <span>{isOpenOverview ? "Hide overview" : "Read overview"}</span>
          <ChevronDown size={14} className={clsx("rm-banner-chevron", isOpenOverview && "is-open")} />
        </button>
      </div>

      {/* Row 6: "What is [Discipline]?" Accordion */}
      <div className="rm-accordion-container">
        <button
          type="button"
          className="rm-accordion-header"
          onClick={toggleOverview}
          aria-expanded={isOpenOverview}
          aria-controls={overviewPanelId}
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={15} className="text-[#ffd166]" />
            <span>{`What is ${isMaster ? "Full-Dive VR Development" : field?.title ?? title}?`}</span>
          </div>
          <ChevronDown
            size={15}
            className={clsx(
              "text-[var(--dim)] transition-transform duration-200",
              isOpenOverview && "rotate-180",
            )}
          />
        </button>

        {isOpenOverview && (
          <div className="rm-accordion-body" id={overviewPanelId}>
            <div className="font-bold text-[var(--text)] mb-1">
              {`About ${field?.title ?? title}`}
            </div>
            <p className="m-0 mb-3 leading-relaxed">{field?.description ?? description}</p>
            <div className="flex flex-wrap items-center gap-5 text-[11px] text-[var(--dim)] pt-2.5 border-t border-[var(--border)]">
              <div>
                Target Audience: <strong className="text-[var(--text)]">{audience}</strong>
              </div>
              <div>
                Estimated Duration: <strong className="text-[var(--text)]">{duration}</strong>
              </div>
              <div>
                Level: <strong className="text-[var(--text)]">{field?.level ?? level ?? "Multidisciplinary"}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default RoadmapHeader;
