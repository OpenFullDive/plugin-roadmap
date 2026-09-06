import type { TopicStatus } from "../../content/roadmap";

export type NodeTooltip = {
  title: string;
  body: string;
  status?: TopicStatus;
  /** Viewport rect of the node the tooltip describes. */
  x: number;
  y: number;
  placement: "above" | "below";
};
