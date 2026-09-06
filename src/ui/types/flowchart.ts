import type { RoadmapField, RoadmapSection, TopicStatus } from "../../content/roadmap";
import type { Difficulty } from "./navigation";

export type NodeItem = {
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

export type EdgeItem = {
  id: string;
  type: "spine" | "branch" | "radiating" | "solid";
  path: string;
  status?: TopicStatus;
  group?: string;
};

export type SectionBoxItem = {
  id: string;
  title: string;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  labelX: number;
  labelY: number;
};

export type LegendCardItem = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CurriculumCardItem = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TrackTitleNodeItem = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FlowchartData = {
  canvasWidth: number;
  canvasHeight: number;
  legendCard?: LegendCardItem;
  curriculumCard?: CurriculumCardItem;
  trackTitleNode?: TrackTitleNodeItem;
  sectionBoxes: SectionBoxItem[];
  nodes: NodeItem[];
  edges: EdgeItem[];
};
