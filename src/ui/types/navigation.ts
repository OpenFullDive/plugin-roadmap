import type { RoadmapCategory } from "../../content/roadmap";

export type Tab = "roadmap" | "projects" | "contribute";
export type ViewMode = "flowchart" | "linear";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type DrawerTab = "knowledge" | "resources" | "community";

export type TrackPickerOption = {
  id: string;
  label: string;
  hint: string;
  category: RoadmapCategory | string | null;
};

/** Declaration order of the category union — the order the groups appear in. */
export const TRACK_CATEGORY_ORDER: RoadmapCategory[] = [
  "Neural Science",
  "Interfaces & Haptics",
  "Virtual Systems",
  "Hardware & Software",
  "Safety & Integration",
  "Frontier Research",
];
