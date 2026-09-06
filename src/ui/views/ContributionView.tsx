import Link from "next/link";
import { ClipboardCheck, MessageCircle } from "lucide-react";

export interface ContributionViewProps {
  fieldName: string;
}

const CONTRIBUTION_STEPS = [
  [
    "Choose one bounded problem",
    "Pick a single topic node and define a reproducible deliverable reviewable within weeks.",
  ],
  [
    "Declare scope and safety bounds",
    "Document hypotheses, non-goals, measurement apparatus, and safe shutdown conditions.",
  ],
  [
    "Build and test in public",
    "Publish raw datasets, calibration benches, reproduction code, and negative findings.",
  ],
  [
    "Solicit peer challenge",
    "Request cross-discipline critique from adjacent fields to test system integration assumptions.",
  ],
  [
    "Submit to the evidence ledger",
    "Publish your findings to the community evidence ledger under editorial review.",
  ],
] as const;

/**
 * Contribution Guide panel for the active discipline or master curriculum.
 *
 * Details the 5-step peer-reviewed reproduction pipeline from problem selection
 * to evidence ledger publication, with links to start discussions or submit evidence.
 */
export function ContributionView({ fieldName }: ContributionViewProps) {
  return (
    <section className="w-full min-w-0 flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <header>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-bright)]">
          From Learning to Useful Work
        </span>
        <h2 className="mt-1 text-xl font-bold text-[var(--text)] m-0">
          {`Contribute to ${fieldName}`}
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)] m-0">
          The OpenFullDive project progresses through small, inspectable, and reproducible work—never
          through unsupported claims.
        </p>
      </header>

      <ol className="rm-steps">
        {CONTRIBUTION_STEPS.map(([title, body], i) => (
          <li key={title} className="rm-step">
            <span className="rm-step-marker" aria-hidden="true">
              {i + 1}
            </span>
            <div className="rm-step-body">
              <h3 className="rm-step-title">{title}</h3>
              <p className="rm-step-text">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="rm-contribute-actions">
        <Link className="primary btn inline-flex items-center gap-2" href="/commons/technology">
          <MessageCircle size={15} /> Start a project discussion
        </Link>
        <Link className="btn inline-flex items-center gap-2" href="/contribute">
          <ClipboardCheck size={15} /> Submit evidence
        </Link>
      </footer>
    </section>
  );
}

export default ContributionView;
