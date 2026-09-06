import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Flag,
  FolderKanban,
  Star,
  Split,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { RoadmapField, TopicStatus } from "../../content/roadmap";
import type { NodeItem, SelectedTopic, Difficulty, NodeTooltip } from "../types";
import { topicKey } from "../utils/storage";
import { getFieldIcon } from "../utils/field-icons";
import {
  BADGE_LABEL,
  type TooltipTargetNode,
  type AriaLabelNode,
} from "../hooks/useCanvasTooltip";

export const BADGE_ICON: Record<"recommended" | "alternative" | "elective", LucideIcon> = {
  recommended: Star,
  alternative: Split,
  elective: Clock,
};

export interface FlowNodeProps {
  node: NodeItem;
  targetField?: RoadmapField;
  isMatch?: boolean;
  isMaster?: boolean;
  statuses: Record<string, TopicStatus>;
  onOpenTopic?: (target: SelectedTopic, tab?: "knowledge" | "resources" | "community") => void;
  onSetStatus?: (target: SelectedTopic, status: TopicStatus | undefined) => void;
  onSelectProjectLevel?: (level: Difficulty) => void;
  openTooltip?: (
    el: HTMLElement,
    next: Omit<NodeTooltip, "x" | "y" | "placement">,
    group?: string,
    instant?: boolean,
  ) => void;
  closeTooltip?: () => void;
  nodeTooltip?: (node: TooltipTargetNode) => Omit<NodeTooltip, "x" | "y" | "placement">;
  nodeAriaLabel?: (node: AriaLabelNode) => string;
}

/**
 * Renders an individual flowchart topic card, discipline hub, verification gate,
 * project callout, or capstone finish node with accessible keyboards shortcuts and state badges.
 */
export function FlowNode({
  node,
  targetField,
  isMatch = false,
  isMaster = false,
  statuses,
  onOpenTopic,
  onSetStatus,
  onSelectProjectLevel,
  openTooltip,
  closeTooltip,
  nodeTooltip,
  nodeAriaLabel,
}: FlowNodeProps) {
  const field = node.field ?? targetField;

  // 1. Hands-on Project Callout Card
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
            if (node.projectLevel) onSelectProjectLevel?.(node.projectLevel);
          }}
        >
          <FolderKanban size={11} />
          <span>{node.projectBtnText}</span>
        </button>
      </div>
    );
  }

  // 2. Discipline Header Milestone (Master Curriculum View)
  if (node.type === "discipline") {
    const Icon = field ? getFieldIcon(field.id) : Compass;
    const statusKey = field ? topicKey(field, node.topicName) : "";
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
          if (e.pointerType !== "mouse" || !openTooltip || !nodeTooltip) return;
          openTooltip(e.currentTarget, nodeTooltip({ ...node, status: curStatus }), node.group);
        }}
        onPointerLeave={closeTooltip}
      >
        <button
          type="button"
          className="rm-discipline-node-content"
          aria-label={nodeAriaLabel ? nodeAriaLabel({ ...node, status: curStatus }) : node.label}
          onFocus={(e) => {
            if (!openTooltip || !nodeTooltip) return;
            openTooltip(e.currentTarget, nodeTooltip({ ...node, status: curStatus }), node.group, true);
          }}
          onBlur={closeTooltip}
          onClick={() => {
            if (field) {
              onOpenTopic?.({
                field,
                section: node.section,
                topic: node.topicName,
              }, "knowledge");
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

  // 3. Verification Gate Node
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
          if (field) {
            onOpenTopic?.({
              field,
              section: node.section,
              topic: node.topicName,
            }, "knowledge");
          }
        }}
      >
        <CheckCircle2 size={15} className="text-[#10b981] flex-shrink-0" />
        <span className="truncate">{node.label}</span>
      </button>
    );
  }

  // 4. Capstone Finish Milestone Badge
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
          if (field) {
            onOpenTopic?.({
              field,
              section: node.section,
              topic: node.topicName,
              subtopicFocus: node.subtopicName,
            }, "community");
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

  // 5. Standard Topics (milestone-main, milestone-sub, concept-pill)
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
        if (!field) return;
        if (e.shiftKey) {
          e.preventDefault();
          const cur = statuses[topicKey(field, node.topicName)];
          onSetStatus?.(
            { field, section: node.section, topic: node.topicName },
            cur === "learning" ? undefined : "learning",
          );
          return;
        }
        if (e.altKey) {
          e.preventDefault();
          const cur = statuses[topicKey(field, node.topicName)];
          onSetStatus?.(
            { field, section: node.section, topic: node.topicName },
            cur === "skipped" ? undefined : "skipped",
          );
          return;
        }
        onOpenTopic?.({
          field,
          section: node.section,
          topic: node.topicName,
          subtopicFocus: node.subtopicName,
        }, "knowledge");
      }}
      onContextMenu={(e) => {
        if (!field) return;
        e.preventDefault();
        const cur = statuses[topicKey(field, node.topicName)];
        onSetStatus?.(
          { field, section: node.section, topic: node.topicName },
          cur === "done" ? undefined : "done",
        );
      }}
      onKeyDown={(e) => {
        if (!field || e.metaKey || e.ctrlKey || e.altKey) return;
        const next = { d: "done", l: "learning", s: "skipped" }[e.key.toLowerCase()] as
          | TopicStatus
          | undefined;
        if (!next) return;
        e.preventDefault();
        const cur = statuses[topicKey(field, node.topicName)];
        onSetStatus?.(
          { field, section: node.section, topic: node.topicName },
          cur === next ? undefined : next,
        );
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse" || !openTooltip || !nodeTooltip) return;
        openTooltip(e.currentTarget, nodeTooltip(node), node.group);
      }}
      onPointerLeave={closeTooltip}
      onFocus={(e) => {
        if (!openTooltip || !nodeTooltip) return;
        openTooltip(e.currentTarget, nodeTooltip(node), node.group, true);
      }}
      onBlur={closeTooltip}
      aria-label={nodeAriaLabel ? nodeAriaLabel(node) : node.label}
    >
      <span>{node.label}</span>
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
    </button>
  );
}

export default FlowNode;
