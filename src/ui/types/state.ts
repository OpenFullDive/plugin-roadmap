import type { RoadmapField, RoadmapSection, TopicStatus } from "../../content/roadmap";

export type SelectedTopic = {
  field: RoadmapField;
  section: RoadmapSection;
  topic: string;
  subtopicFocus?: string;
};

export type PanState = {
  pannable: boolean;
  atStart: boolean;
  atEnd: boolean;
};

export type ZoomMode = "fit" | "full";

export type ProgressSummary = {
  total: number;
  done: number;
  learning: number;
  progressPercent: number;
};

export type ExportedProgressData = {
  roadmapSlug: string;
  exportedAt: string;
  summary: ProgressSummary;
  statuses: Record<string, TopicStatus>;
  favorites: string[];
  checklists: Record<string, boolean>;
};
