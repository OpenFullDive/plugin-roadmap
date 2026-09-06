import clsx from "clsx";
import { Square, SquareCheck } from "lucide-react";
import type { TopicDetail } from "../../content/topic-details";
import type { SelectedTopic } from "../types";

export interface DrawerKnowledgeTabProps {
  selected: SelectedTopic;
  topicDetail: TopicDetail;
  checkedChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

/**
 * Drawer Technical Brief / Knowledge tab.
 *
 * Displays:
 * 1. Scientific Mechanism: overview narrative and classification badge.
 * 2. Subtopic Concepts: numbered concepts list with active focus highlight.
 * 3. Verification Competencies: accessible checkbox list with persisted state.
 */
export function DrawerKnowledgeTab({
  selected,
  topicDetail,
  checkedChecklist = {},
  onToggleChecklist,
}: DrawerKnowledgeTabProps) {
  return (
    <>
      {/* Scientific Mechanism Section */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] m-0">
            Scientific Mechanism
          </h3>
          <span className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-bright)] uppercase">
            {topicDetail.badge}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] leading-relaxed m-0">{topicDetail.overview}</p>
      </section>

      {/* Subtopic Concepts Section */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-2.5 m-0">
          Subtopic Concepts
        </h3>
        <div className="space-y-1.5">
          {topicDetail.subtopics.map((sub, idx) => {
            const isFocused = selected.subtopicFocus === sub;
            return (
              <div
                key={sub}
                className={clsx(
                  "flex items-center gap-2 rounded border p-2 text-xs transition-colors",
                  isFocused
                    ? "border-[var(--accent)] bg-[rgba(63,140,255,0.12)] text-[var(--accent-bright)] font-semibold shadow-sm"
                    : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]",
                )}
              >
                <span
                  className={clsx(
                    "grid size-4 place-items-center rounded-full text-[10px] font-mono",
                    isFocused ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-3)] text-[var(--dim)]",
                  )}
                >
                  {idx + 1}
                </span>
                <span>{sub}</span>
                {isFocused && (
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-bold text-[var(--accent-bright)]">
                    Selected
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Verification Competencies (Checklist) Section */}
      <section>
        <div className="rm-drawer-section-head">
          <h3 className="rm-drawer-section-title">Verification Competencies</h3>
          <span className="text-[10px] text-[var(--dim)]">Saved as you check</span>
        </div>
        <ul className="rm-drawer-check-list">
          {topicDetail.checkpoints.map((item, idx) => {
            const checkKey = `${selected.field.id}:${selected.topic}:chk:${idx}`;
            const isChecked = checkedChecklist[checkKey] || false;
            return (
              <li key={item}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  className="rm-drawer-check"
                  onClick={() => onToggleChecklist?.(checkKey)}
                >
                  {isChecked ? (
                    <SquareCheck
                      size={16}
                      aria-hidden="true"
                      className="rm-drawer-check-icon text-[#10b981]"
                    />
                  ) : (
                    <Square
                      size={16}
                      aria-hidden="true"
                      className="rm-drawer-check-icon text-[var(--dim)]"
                    />
                  )}
                  <span className="rm-drawer-check-text">{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export default DrawerKnowledgeTab;
