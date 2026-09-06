"use client";

import { useCallback, useMemo, useState } from "react";
import "./flowchart.css";
import { masterRoadmap, roadmapFieldById, roadmapFields } from "../content/roadmap";
import type { Difficulty, RoadmapExplorerProps, RoadmapStorage, Tab, ViewMode } from "./types";
import {
  useCanvasTooltip,
  useCanvasViewport,
  useRoadmapProgress,
  useRoadmapSearch,
  useRoadmapStorage,
  useShareActions,
  useTopicDrawer,
} from "./hooks";
import { generateRoadmapProjects } from "./utils/projects";
import { generateDisciplineTopology, generateMasterTopology } from "./canvas/layout";
import { FlowchartCanvas } from "./canvas/FlowchartCanvas";
import { NodeTooltipOverlay } from "./canvas/NodeTooltipOverlay";
import { RoadmapHeader } from "./header/RoadmapHeader";
import { SocialRail } from "./floating/SocialRail";
import { TopicDrawer } from "./drawer/TopicDrawer";
import { ContributionView, LinearGuideView, ProjectsCatalogView } from "./views";

export type { RoadmapExplorerProps, RoadmapStorage };

/**
 * Top-level Roadmap Explorer Orchestrator component.
 * Coordinates roadmap layout topology generation, responsive viewports,
 * custom state synchronization hooks, topic detail drawers, and alternative
 * curriculum view modes following AGENTS.md §6 presentation boundaries.
 */
export default function RoadmapExplorer({
  slug,
  isSignedIn = false,
  storage,
}: RoadmapExplorerProps) {
  const isMaster = slug === masterRoadmap.id;
  const field = roadmapFieldById(slug);
  const fields = useMemo(() => (isMaster ? roadmapFields : field ? [field] : []), [isMaster, field]);
  const title = isMaster ? masterRoadmap.title : field?.title ?? "Roadmap not found";
  const description = isMaster ? masterRoadmap.description : field?.description ?? "This roadmap does not exist.";
  const audience = isMaster ? masterRoadmap.audience : field?.audience ?? "";
  const duration = isMaster ? masterRoadmap.duration : field?.duration ?? "";
  const favoriteId = isMaster ? masterRoadmap.id : field?.id ?? slug;

  // View & Navigation States (Local Component State)
  const [tab, setTab] = useState<Tab>("roadmap");
  const [viewMode, setViewMode] = useState<ViewMode>("flowchart");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");

  // Hook 1: Storage Bridge Sync & Persistence
  const {
    statuses,
    favorites,
    checkedChecklist,
    setStatus,
    toggleFavorite: toggleFav,
    toggleChecklist,
  } = useRoadmapStorage(storage, isSignedIn, favoriteId);

  const toggleFavorite = useCallback(() => {
    toggleFav(favoriteId);
  }, [favoriteId, toggleFav]);

  const saved = favorites.includes(favoriteId);

  // Hook 2: Roadmap Search & Keyboard Shortcuts
  const {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    clearSearch,
  } = useRoadmapSearch();

  // Hook 3: Roadmap Progress & Completion Tracking
  const {
    doneCount,
    learningCount,
    progressPercent,
    flatTopics,
    allTopicKeys,
    exportProgress,
    exported,
  } = useRoadmapProgress({
    fields,
    currentField: field,
    statuses,
    checkedChecklist,
    favorites,
    slug,
  });

  // Hook 4: Topic Detail Drawer State & Modal Accessibility
  const {
    selected,
    drawerTab,
    setDrawerTab,
    activeTopicDetail,
    openTopic,
    closeDrawer,
    prevTopic,
    nextTopic,
    drawerRef,
    drawerTitleId,
  } = useTopicDrawer({
    flatTopics,
  });

  // Layout Engine: Dual Topology (Master 4-Tier vs Discipline 2-Column Grid)
  const flowchartData = useMemo(() => {
    if (isMaster) return generateMasterTopology(roadmapFields, statuses);
    if (field) return generateDisciplineTopology(field, statuses);
    return null;
  }, [isMaster, field, statuses]);

  // Hook 5: Canvas Viewport, ResizeObserver & Arrow Key Pan Navigation
  const {
    flowRef,
    zoom,
    setZoom,
    pan,
    fitScale,
    canFit,
    appliedScale,
    onCanvasKeyDown,
  } = useCanvasViewport({
    canvasWidth: flowchartData?.canvasWidth,
    deps: [tab, viewMode, slug],
  });

  // Hook 6: Canvas Delayed Tooltip & Lighting Groups
  const {
    tooltip,
    linkedGroup,
    openTooltip,
    closeTooltip,
    nodeTooltip,
    nodeAriaLabel,
    tooltipWarm,
  } = useCanvasTooltip(slug, isMaster);

  // Hook 7: Share URLs, Clipboard & Social Intents
  const {
    shareLink,
    shareText,
    copyLink,
    copied,
    railCopied,
    share,
    openShareIntent,
  } = useShareActions({
    slug,
    isMaster,
    title,
  });

  // Project deliverables catalog for practice tab
  const projects = useMemo(() => generateRoadmapProjects(fields), [fields]);

  return (
    <div className="roadmap-explorer-root">
      {/* Floating Social Share Stack */}
      <SocialRail
        shareLink={shareLink}
        shareText={shareText}
        title={title}
        copied={railCopied}
        onCopy={copyLink}
        onOpenShareIntent={openShareIntent}
      />

      {/* Top Header Card */}
      <RoadmapHeader
        slug={slug}
        isMaster={isMaster}
        title={title}
        description={description}
        audience={audience}
        duration={duration}
        level={field?.level}
        field={field}
        tab={tab}
        viewMode={viewMode}
        onSelectTab={(newTab, newMode) => {
          setTab(newTab);
          if (newMode) setViewMode(newMode);
        }}
        projectsCount={projects.length}
        saved={saved}
        onToggleFavorite={toggleFavorite}
        exported={exported}
        onExportProgress={exportProgress}
        copied={copied}
        onShare={share}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={clearSearch}
        searchInputRef={searchInputRef}
        doneCount={doneCount}
        totalTopics={allTopicKeys.length}
        progressPercent={progressPercent}
        learningCount={learningCount}
      />

      {/* Main View Display */}
      <main className="rm-main-content">
        {/* TAB 1: Flowchart Diagram View */}
        {tab === "roadmap" && viewMode === "flowchart" && (
          <FlowchartCanvas
            flowchartData={flowchartData}
            targetField={field}
            isMaster={isMaster}
            statuses={statuses}
            searchQuery={searchQuery}
            flowRef={flowRef}
            pan={pan}
            zoom={zoom}
            appliedScale={appliedScale}
            canFit={canFit}
            linkedGroup={linkedGroup}
            onSetZoom={setZoom}
            onCanvasKeyDown={onCanvasKeyDown}
            onSwitchToLinear={() => setViewMode("linear")}
            onSelectTab={setTab}
            onOpenTopic={(target, t) => openTopic(target, undefined, t)}
            onSetStatus={setStatus}
            onSelectProjectLevel={setDifficulty}
            openTooltip={openTooltip}
            closeTooltip={closeTooltip}
            nodeTooltip={nodeTooltip}
            nodeAriaLabel={nodeAriaLabel}
          />
        )}

        {/* TAB 1 (alt): Linear Guide Curriculum View */}
        {tab === "roadmap" && viewMode === "linear" && (
          <LinearGuideView
            isMaster={isMaster}
            field={field}
            searchQuery={searchQuery}
            statuses={statuses}
            onSelectTopic={(target) => openTopic(target, undefined, "knowledge")}
            onViewInProjects={() => setTab("projects")}
          />
        )}

        {/* TAB 2: Hands-On Projects Catalog */}
        {tab === "projects" && (
          <ProjectsCatalogView
            isMaster={isMaster}
            field={field}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
            projects={projects}
          />
        )}

        {/* TAB 3: Contribution Guide & Peer Review Ledger */}
        {tab === "contribute" && (
          <ContributionView
            fieldName={isMaster ? "Full-Dive VR Development" : field?.title ?? "this track"}
          />
        )}
      </main>

      {/* Floating Delayed Node Tooltip Overlay */}
      <NodeTooltipOverlay tooltip={tooltip} tooltipWarm={tooltipWarm.current} />

      {/* Slide-out Topic Detail Drawer */}
      <TopicDrawer
        selected={selected}
        topicDetail={activeTopicDetail}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        onClose={closeDrawer}
        statuses={statuses}
        onSetStatus={setStatus}
        checkedChecklist={checkedChecklist}
        onToggleChecklist={toggleChecklist}
        prevTopic={prevTopic}
        nextTopic={nextTopic}
        onSelectTopic={(target) => openTopic(target, undefined, "knowledge")}
        drawerRef={drawerRef}
        drawerTitleId={drawerTitleId}
      />
    </div>
  );
}
