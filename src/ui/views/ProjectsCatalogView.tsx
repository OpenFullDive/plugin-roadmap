import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import type { RoadmapField } from "../../content/roadmap";
import type { Difficulty, ProjectItem } from "../types";

export interface ProjectsCatalogViewProps {
  isMaster: boolean;
  field?: RoadmapField | null;
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  projects: ProjectItem[];
}

export const PROJECT_KIND_BLURB: Record<Difficulty, string> = {
  Beginner:
    "Each is a sourced explainer separating established results from constraints and open questions.",
  Intermediate:
    "Each is an inspectable reproduction with explicit methods and stated limitations.",
  Advanced:
    "Each is an adversarial test suite covering edge cases, latency boundaries, and safety limits.",
};

const DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

/**
 * Projects Catalog view.
 *
 * Displays hands-on practice deliverables grouped by difficulty tier
 * (Beginner, Intermediate, Advanced) with direct links to discussion in Commons.
 */
export function ProjectsCatalogView({
  isMaster,
  field,
  difficulty,
  onDifficultyChange,
  projects,
}: ProjectsCatalogViewProps) {
  const filteredProjects = projects.filter((p) => p.difficulty === difficulty);

  return (
    <section className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <header className="mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
          Learn By Building
        </span>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">
          {isMaster ? "Community Practice Projects" : `${field?.shortTitle} Projects`}
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)] m-0">
          {PROJECT_KIND_BLURB[difficulty]} Every project is bounded to produce inspectable code,
          measurements, and limitations for community peer review.
        </p>
      </header>

      {/* Difficulty Filter Pills */}
      <div className="flex items-center gap-2 mb-6">
        {DIFFICULTIES.map((level) => (
          <button
            key={level}
            type="button"
            className={clsx(
              "rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
              difficulty === level
                ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--dim)] hover:text-[var(--text)]",
            )}
            onClick={() => onDifficultyChange(level)}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
        {filteredProjects.map((project) => (
          <Link
            key={project.id}
            href="/commons/technology"
            className="rm-project-tile"
            aria-label={`${project.title} — ${project.kind} project in ${project.field.shortTitle}. Discuss in Commons`}
          >
            <span className="rm-project-eyebrow">
              {project.field.shortTitle} · {project.section}
            </span>
            <span className="rm-project-foot">
              <h3 className="rm-project-title">{project.title}</h3>
              <ArrowRight size={15} className="rm-project-arrow" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default ProjectsCatalogView;
