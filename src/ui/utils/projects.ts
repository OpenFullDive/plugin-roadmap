import type { RoadmapField } from "../../content/roadmap";
import type { ProjectItem } from "../types";

/**
 * Derives beginner, intermediate, and advanced hands-on community projects
 * from the active roadmap fields and sections.
 */
export function generateRoadmapProjects(fields: RoadmapField[]): ProjectItem[] {
  return fields.flatMap((item) =>
    item.sections.flatMap((section) => [
      {
        id: `${item.id}-${section.id}-beginner`,
        difficulty: "Beginner" as const,
        field: item,
        section: section.title,
        kind: "Evidence map",
        title: section.topics[0] ?? section.title,
        description:
          "A sourced explainer separating established results from constraints and open questions.",
      },
      {
        id: `${item.id}-${section.id}-intermediate`,
        difficulty: "Intermediate" as const,
        field: item,
        section: section.title,
        kind: "Reproduction",
        title: section.project,
        description:
          "An inspectable community reproduction with explicit methods and stated limitations.",
      },
      {
        id: `${item.id}-${section.id}-advanced`,
        difficulty: "Advanced" as const,
        field: item,
        section: section.title,
        kind: "Verification",
        title: `Verification protocol for ${section.title}`,
        description:
          "An adversarial test suite covering edge cases, latency boundaries, and safety limits.",
      },
    ]),
  );
}
