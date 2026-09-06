import Link from "next/link";
import { ArrowRight, Code2, MessageCircle } from "lucide-react";
import type { SelectedTopic } from "../types";

export interface DrawerCommunityTabProps {
  selected: SelectedTopic;
}

/**
 * Drawer Build & Discuss / Community tab.
 *
 * Displays:
 * 1. Suggested Milestone Deliverable: Section project objective with contribution link.
 * 2. Commons Discussion: Community technology feed discussion link.
 */
export function DrawerCommunityTab({ selected }: DrawerCommunityTabProps) {
  return (
    <div className="space-y-4">
      {/* Suggested Deliverable */}
      <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
          Suggested Milestone Deliverable
        </span>
        <h4 className="mt-1 text-xs font-bold text-[var(--text)] m-0">
          {selected.section.project}
        </h4>
        <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed m-0">
          Submit an inspectable code bench, physical measurement dataset, or negative
          reproduction for peer review.
        </p>
        <Link
          href="/contribute"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-bright)] hover:underline text-decoration-none"
        >
          <Code2 size={13} /> Submit evidence to ledger →
        </Link>
      </section>

      {/* Commons Discussion */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dim)] mb-2 m-0">
          Commons Discussion
        </h3>
        <Link
          href="/commons/technology"
          className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors text-decoration-none"
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle size={16} className="text-[var(--accent-bright)]" />
            <div>
              <div className="font-semibold">Technology Commons Feed</div>
              <div className="text-[10px] text-[var(--dim)]">
                Discuss open interface challenges
              </div>
            </div>
          </div>
          <ArrowRight size={13} className="text-[var(--dim)]" />
        </Link>
      </section>
    </div>
  );
}

export default DrawerCommunityTab;
