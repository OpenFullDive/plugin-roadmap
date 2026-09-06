import { useCallback, useEffect, useRef, useState } from "react";
import { masterRoadmap, type RoadmapField, type TopicStatus } from "../../content/roadmap";
import { getTopicDetails } from "../../content/topic-details";
import type { NodeTooltip } from "../types";

export const BADGE_LABEL: Record<"recommended" | "alternative" | "elective", string> = {
  recommended: "Personal recommendation",
  alternative: "Alternative option",
  elective: "Order not strict, learn anytime",
};

export const STATUS_LABEL: Record<NonNullable<TopicStatus>, string> = {
  done: "Done",
  learning: "Learning",
  skipped: "Skipped",
};

export interface TooltipTargetNode {
  label: string;
  topicName: string;
  subtopicName?: string;
  field?: RoadmapField;
  status?: TopicStatus;
}

export interface AriaLabelNode {
  label: string;
  status?: TopicStatus;
  badge?: "recommended" | "alternative" | "elective";
}

export interface UseCanvasTooltipReturn {
  tooltip: NodeTooltip | null;
  setTooltip: React.Dispatch<React.SetStateAction<NodeTooltip | null>>;
  linkedGroup: string | null;
  setLinkedGroup: React.Dispatch<React.SetStateAction<string | null>>;
  openTooltip: (
    el: HTMLElement,
    next: Omit<NodeTooltip, "x" | "y" | "placement">,
    group?: string,
    instant?: boolean,
  ) => void;
  closeTooltip: () => void;
  nodeTooltip: (node: TooltipTargetNode) => Omit<NodeTooltip, "x" | "y" | "placement">;
  nodeAriaLabel: (node: AriaLabelNode) => string;
  tooltipWarm: React.MutableRefObject<boolean>;
}

export function useCanvasTooltip(
  slug = "master",
  isMaster = slug === masterRoadmap.id,
): UseCanvasTooltipReturn {
  const [tooltip, setTooltip] = useState<NodeTooltip | null>(null);
  const [linkedGroup, setLinkedGroup] = useState<string | null>(null);

  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipWarm = useRef(false);

  const openTooltip = useCallback(
    (
      el: HTMLElement,
      next: Omit<NodeTooltip, "x" | "y" | "placement">,
      group?: string,
      instant = false,
    ) => {
      setLinkedGroup(group ?? null);

      const show = () => {
        const r = el.getBoundingClientRect();
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

      if (instant || tooltipWarm.current) {
        show();
      } else {
        tooltipTimer.current = setTimeout(show, 380);
      }
    },
    [],
  );

  const closeTooltip = useCallback(() => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setLinkedGroup(null);
    setTooltip(null);
    tooltipTimer.current = setTimeout(() => {
      tooltipWarm.current = false;
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const nodeTooltip = useCallback(
    (node: TooltipTargetNode) => {
      const fieldId = node.field?.id ?? (isMaster ? masterRoadmap.id : slug);
      const overview = getTopicDetails(fieldId, node.topicName).overview;
      const firstSentence = overview.split(/(?<=\.)\s/)[0] ?? overview;
      return {
        title: node.label,
        body:
          node.subtopicName && node.subtopicName !== node.label
            ? overview.slice(0, 190)
            : firstSentence.slice(0, 210),
        status: node.status,
      };
    },
    [isMaster, slug],
  );

  const nodeAriaLabel = useCallback((node: AriaLabelNode) => {
    const parts = [node.label];
    if (node.status) parts.push(STATUS_LABEL[node.status]);
    if (node.badge) parts.push(BADGE_LABEL[node.badge]);
    parts.push("Open topic details");
    return parts.join(". ");
  }, []);

  return {
    tooltip,
    setTooltip,
    linkedGroup,
    setLinkedGroup,
    openTooltip,
    closeTooltip,
    nodeTooltip,
    nodeAriaLabel,
    tooltipWarm,
  };
}
