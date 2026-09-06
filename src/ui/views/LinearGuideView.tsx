import Link from "next/link";
import clsx from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
  FolderKanban,
} from "lucide-react";
import { roadmapFieldById, type RoadmapField, type TopicStatus } from "../../content/roadmap";
import type { SelectedTopic } from "../types";
import { topicKey } from "../utils/storage";
import { getFieldIcon } from "../utils/field-icons";

import { MASTER_ENGINEERING_PHASES } from "./phases";
export { MASTER_ENGINEERING_PHASES } from "./phases";
export type { EngineeringPhase } from "./phases";

export interface LinearGuideViewProps {
  isMaster: boolean;
  field?: RoadmapField | null;
  searchQuery?: string;
  statuses: Record<string, TopicStatus>;
  onSelectTopic: (topic: SelectedTopic) => void;
  onViewInProjects?: () => void;
}

/**
 * Linear Guide view.
 *
 * Provides a sequential curriculum format across the 4 Engineering Phases
 * (master overview) or discipline-specific phases, with real-time topic status
 * indicators, phase gate verification bars, and connecting discipline networks.
 */
export function LinearGuideView({
  isMaster,
  field,
  searchQuery = "",
  statuses,
  onSelectTopic,
  onViewInProjects,
}: LinearGuideViewProps) {
  const query = searchQuery.trim().toLowerCase();
  const hasPrerequisites =
    !!field &&
    field.prerequisites.length > 0 &&
    !field.prerequisites.every((p) => p.trim().toLowerCase() === "none");

  return (
    <section className="w-full min-w-0 space-y-6">
      {/* Phases and Sections Container */}
      <div className="space-y-6">
        {isMaster ? (
          // Master Curriculum Linear Guide (Structured across 4 Engineering Phases)
          MASTER_ENGINEERING_PHASES.map((phase) => {
            const phaseFields = phase.disciplineIds
              .map((id) => roadmapFieldById(id))
              .filter((f): f is RoadmapField => f !== undefined);

            return (
              <section key={phase.id} className="space-y-4">
                {/* Phase Header Banner */}
                <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                      Phase 0{phase.phaseNumber}
                    </span>
                    <span className="text-[11px] text-[var(--dim)] font-medium">
                      {phase.disciplineIds.length} Disciplines
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-[var(--text)] m-0">{phase.title}</h2>
                  <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed m-0">
                    {phase.summary}
                  </p>
                </div>

                {/* Disciplines within this Phase */}
                <div className="space-y-4 pl-3 border-l-2 border-[var(--border)]">
                  {phaseFields.map((df) => {
                    const DiscIcon = getFieldIcon(df.id);
                    const matchingSections = df.sections.filter((sec) => {
                      if (!query) return true;
                      return (
                        sec.title.toLowerCase().includes(query) ||
                        sec.topics.some((t) => t.toLowerCase().includes(query))
                      );
                    });

                    if (query && matchingSections.length === 0) return null;

                    return (
                      <div
                        key={df.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border)]">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded bg-[var(--surface-3)] text-[var(--accent-bright)]">
                              <DiscIcon size={16} />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[var(--text)]">{df.title}</div>
                              <div className="text-[10px] text-[var(--dim)] font-medium">
                                Level: {df.level} · {df.sections.length} Sections ·{" "}
                                {df.sections.reduce((acc, s) => acc + s.topics.length, 0)} Topics
                              </div>
                            </div>
                          </div>
                          <Link
                            href={`/roadmap/${df.id}`}
                            className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent-bright)] transition-colors no-underline"
                          >
                            <span>Explore Track</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>

                        {/* Discipline Sections and Topics */}
                        <div className="rm-linear-sections">
                          {matchingSections.map((sec, secIdx) => {
                            const filteredTopics = query
                              ? sec.topics.filter((t) => t.toLowerCase().includes(query))
                              : sec.topics;

                            return (
                              <div key={sec.id} className="rm-linear-section">
                                <div className="rm-linear-section-head">
                                  <span className="rm-linear-section-title">
                                    {secIdx + 1}. {sec.title}
                                  </span>
                                  <span className="rm-linear-section-count">
                                    {
                                      sec.topics.filter(
                                        (t) => statuses[topicKey(df, t)] === "done",
                                      ).length
                                    }
                                    /{sec.topics.length}
                                  </span>
                                </div>
                                <div className="rm-linear-rows">
                                  {filteredTopics.map((topic) => {
                                    const key = topicKey(df, topic);
                                    const status = statuses[key];
                                    return (
                                      <button
                                        key={topic}
                                        type="button"
                                        className={clsx(
                                          "rm-linear-row",
                                          status === "done" && "is-done",
                                          status === "learning" && "is-learning",
                                        )}
                                        onClick={() =>
                                          onSelectTopic({ field: df, section: sec, topic })
                                        }
                                      >
                                        <div className="flex items-center gap-2.5">
                                          {status === "done" ? (
                                            <CheckCircle2
                                              size={15}
                                              className="text-[#10b981] flex-shrink-0"
                                            />
                                          ) : status === "learning" ? (
                                            <CircleDot
                                              size={15}
                                              className="text-[#ffd166] flex-shrink-0"
                                            />
                                          ) : (
                                            <Circle
                                              size={15}
                                              className="text-[var(--dim)] flex-shrink-0"
                                            />
                                          )}
                                          <span
                                            className={clsx(
                                              "text-xs font-semibold",
                                              status === "done"
                                                ? "text-[#34d399]"
                                                : "text-[var(--text)]",
                                            )}
                                          >
                                            {topic}
                                          </span>
                                        </div>
                                        <ArrowRight
                                          size={14}
                                          className="rm-linear-arrow"
                                          aria-hidden="true"
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Phase Gate Verification Bar */}
                <div className="flex items-center justify-between rounded-lg border border-[#10b981]/40 bg-[#10b981]/10 px-4 py-2.5 text-xs text-[#34d399]">
                  <div className="flex items-center gap-2 font-semibold">
                    <ClipboardCheck size={16} />
                    <span>{phase.gateTitle}</span>
                  </div>
                  <span className="text-[11px] text-[var(--dim)]">Phase Verification Gate</span>
                </div>
              </section>
            );
          })
        ) : field ? (
          // Single Discipline Linear Guide
          field.sections.map((sec, secIdx) => {
            const filteredTopics = query
              ? sec.topics.filter((t) => t.toLowerCase().includes(query))
              : sec.topics;

            if (query && filteredTopics.length === 0) return null;

            return (
              <div
                key={sec.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <header className="mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
                    Phase {secIdx + 1}
                  </span>
                  <div className="rm-linear-section-head" style={{ marginBottom: 4 }}>
                    <h3 className="mt-1 text-base font-bold text-[var(--text)] m-0">{sec.title}</h3>
                    <span className="rm-linear-section-count">
                      {
                        sec.topics.filter((t) => statuses[topicKey(field, t)] === "done")
                          .length
                      }
                      /{sec.topics.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)] m-0">{sec.summary}</p>
                </header>

                <div className="rm-linear-rows">
                  {filteredTopics.map((topic) => {
                    const key = topicKey(field, topic);
                    const status = statuses[key];
                    return (
                      <button
                        key={topic}
                        type="button"
                        className={clsx(
                          "rm-linear-row",
                          status === "done" && "is-done",
                          status === "learning" && "is-learning",
                        )}
                        onClick={() =>
                          onSelectTopic({ field, section: sec, topic })
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          {status === "done" ? (
                            <CheckCircle2 size={16} className="text-[#10b981] flex-shrink-0" />
                          ) : status === "learning" ? (
                            <CircleDot size={16} className="text-[#ffd166] flex-shrink-0" />
                          ) : (
                            <Circle size={16} className="text-[var(--dim)] flex-shrink-0" />
                          )}
                          <span
                            className={clsx(
                              "text-xs font-semibold",
                              status === "done" ? "text-[#34d399]" : "text-[var(--text)]",
                            )}
                          >
                            {topic}
                          </span>
                        </div>
                        <ArrowRight size={14} className="rm-linear-arrow" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                {sec.project && (
                  <div className="mt-3 rounded border border-dashed border-[rgba(255,209,102,0.35)] bg-[rgba(255,209,102,0.05)] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FolderKanban size={13} className="text-[#ffd166]" />
                        <span className="text-[11px] font-bold text-[#ffd166] uppercase tracking-wider">
                          Phase Milestone Project
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-[11px] text-[#ffd166] hover:underline cursor-pointer bg-transparent border-0 p-0 font-medium"
                        onClick={onViewInProjects}
                      >
                        View in Projects →
                      </button>
                    </div>
                    <div className="mt-1 text-xs text-[var(--text)] font-medium">
                      {sec.project}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : null}
      </div>

      {/* Bottom Prerequisites & Related Disciplines Section */}
      {!isMaster && field && (
        <div className="rm-footer-panel">
          <div className="rm-prereq">
            <span className="rm-footer-label">Prerequisites &amp; Preparation</span>
            {hasPrerequisites ? (
              <div className="rm-prereq-chips">
                {field.prerequisites.map((p) => (
                  <span key={p} className="rm-prereq-chip">
                    <CheckCircle2 size={12} aria-hidden="true" /> {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="rm-prereq-none">
                No prior track required — this is an entry point into the curriculum.
              </p>
            )}
          </div>

          <div>
            <span className="rm-footer-label">Connecting Disciplines</span>
            <div className="rm-related-grid">
              {field.related.map((id) => {
                const rel = roadmapFieldById(id);
                if (!rel) return null;
                const RelIcon = getFieldIcon(rel.id);
                return (
                  <Link key={id} href={`/roadmap/${id}`} className="rm-related-card">
                    <RelIcon size={15} aria-hidden="true" className="rm-related-icon" />
                    <span className="rm-related-text">
                      <span className="rm-related-title">{rel.title}</span>
                      <span className="rm-related-cat">{rel.category}</span>
                    </span>
                    <ArrowRight size={14} aria-hidden="true" className="rm-related-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default LinearGuideView;
