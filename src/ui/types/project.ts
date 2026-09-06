import type { RoadmapField } from "../../content/roadmap";
import type { Difficulty } from "./navigation";

export type ProjectItem = {
  id: string;
  difficulty: Difficulty;
  field: RoadmapField;
  section: string;
  kind: string;
  title: string;
  description: string;
};
