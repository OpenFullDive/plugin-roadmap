import { useId, useRef } from "react";
import clsx from "clsx";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  CircleDot,
  ClipboardCheck,
  PauseCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { TopicDetail } from "../../content/topic-details";
import type { TopicStatus } from "../../content/roadmap";
import type { DrawerTab, SelectedTopic } from "../types";
import { topicKey } from "../utils/storage";
import { DrawerKnowledgeTab } from "./DrawerKnowledgeTab";
import { DrawerResourcesTab } from "./DrawerResourcesTab";
import { DrawerCommunityTab } from "./DrawerCommunityTab";

export interface DrawerTabItem {
  id: DrawerTab;
  label: string;
  icon: LucideIcon;
}

export const DRAWER_TABS: DrawerTabItem[] = [
  { id: "knowledge", label: "Technical Brief", icon: BookOpen },
  { id: "resources", label: "Resources", icon: ClipboardCheck },
  { id: "community", label: "Build & Discuss", icon: Users },
];

export interface TopicDrawerProps {
  selected: SelectedTopic | null;
  topicDetail: TopicDetail | null;
  drawerTab: DrawerTab;
  setDrawerTab: (tab: DrawerTab) => void;
  onClose: () => void;
  statuses: Record<string, TopicStatus>;
  onSetStatus: (topic: SelectedTopic, status?: TopicStatus) => void;
  checkedChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
  prevTopic?: SelectedTopic | null;
  nextTopic?: SelectedTopic | null;
  onSelectTopic?: (topic: SelectedTopic) => void;
  drawerRef?: React.RefObject<HTMLElement | null>;
  drawerTitleId?: string;
}

/**
 * Slide-over topic detail drawer modal dialog.
 *
 * Implements:
 * - WAI-ARIA modal dialog semantics (role="dialog", aria-modal="true")
 * - Focus trapping and restoration
 * - Backdrop overlay dismiss
 * - Status segmented controls (Todo, Learning, Done, Skip)
 * - Roving tabindex keyboard navigation between sub-tabs
 * - Previous / Next sequential topic navigation footer
 */
export function TopicDrawer({
  selected,
  topicDetail,
  drawerTab,
  setDrawerTab,
  onClose,
  statuses,
  onSetStatus,
  checkedChecklist = {},
  onToggleChecklist,
  prevTopic,
  nextTopic,
  onSelectTopic,
  drawerRef,
  drawerTitleId,
}: TopicDrawerProps) {
  const fallbackId = useId();
  const fallbackRef = useRef<HTMLElement | null>(null);

  if (!selected || !topicDetail) {
    return null;
  }

  const resolvedTitleId = drawerTitleId ?? `${fallbackId}-topic-drawer-title`;
  const resolvedRef = drawerRef ?? fallbackRef;

  const currentTopicKey = topicKey(selected.field, selected.topic);
  const currentStatus = statuses[currentTopicKey];

  const statusItems = [
    { id: undefined, label: "Todo", icon: Circle },
    { id: "learning" as const, label: "Learning", icon: CircleDot },
    { id: "done" as const, label: "Done", icon: CheckCircle2 },
    { id: "skipped" as const, label: "Skip", icon: PauseCircle },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="roadmap-inspector-backdrop fixed inset-0 z-40 bg-[rgba(0,0,0,0.65)] backdrop-blur-sm cursor-pointer"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <aside
        ref={resolvedRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        tabIndex={-1}
        className="roadmap-resource-drawer fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-[var(--surface)] shadow-2xl"
      >
        {/* Header */}
        <header className="rm-drawer-header">
          <div className="min-w-0">
            <span className="rm-drawer-eyebrow">
              {selected.field.shortTitle} · {selected.section.title}
            </span>
            <h2 id={resolvedTitleId} className="rm-drawer-title">
              {selected.topic}
            </h2>
          </div>
          <button
            type="button"
            className="rm-drawer-close"
            onClick={onClose}
            aria-label="Close topic details"
          >
            <X size={16} />
          </button>
        </header>

        {/* Status Segmented Controls */}
        <div className="rm-drawer-status">
          <span className="rm-drawer-status-label" id={`${resolvedTitleId}-status`}>
            Your Learning Status
          </span>
          <div
            className="rm-drawer-status-grid"
            role="radiogroup"
            aria-labelledby={`${resolvedTitleId}-status`}
          >
            {statusItems.map((item) => {
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
                  onClick={() => onSetStatus(selected, item.id)}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-tabs bar with roving tabindex */}
        <div
          className="rm-drawer-tabbar"
          role="tablist"
          aria-label="Topic detail sections"
        >
          {DRAWER_TABS.map(({ id, label, icon: Icon }, i) => {
            const isActive = drawerTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${resolvedTitleId}-tab-${id}`}
                aria-selected={isActive}
                aria-controls={`${resolvedTitleId}-panel-${id}`}
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
                  document.getElementById(`${resolvedTitleId}-tab-${target.id}`)?.focus();
                }}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
                {id === "resources" ? ` (${topicDetail.resources.length})` : ""}
              </button>
            );
          })}
        </div>

        {/* Drawer Body Panel */}
        <div
          className="rm-drawer-body"
          role="tabpanel"
          id={`${resolvedTitleId}-panel-${drawerTab}`}
          aria-labelledby={`${resolvedTitleId}-tab-${drawerTab}`}
          tabIndex={0}
        >
          {drawerTab === "knowledge" && (
            <DrawerKnowledgeTab
              selected={selected}
              topicDetail={topicDetail}
              checkedChecklist={checkedChecklist}
              onToggleChecklist={onToggleChecklist}
            />
          )}

          {drawerTab === "resources" && (
            <DrawerResourcesTab topicDetail={topicDetail} />
          )}

          {drawerTab === "community" && (
            <DrawerCommunityTab selected={selected} />
          )}
        </div>

        {/* Footer Navigation */}
        <footer className="rm-drawer-footer">
          {prevTopic ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)] cursor-pointer"
              onClick={() => {
                onSelectTopic?.(prevTopic);
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
                onSelectTopic?.(nextTopic);
                setDrawerTab("knowledge");
              }}
            >
              {`Next: ${nextTopic.topic}`} <ArrowRight size={13} />
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}

export default TopicDrawer;
