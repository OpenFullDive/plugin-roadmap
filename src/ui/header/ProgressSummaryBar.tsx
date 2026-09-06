export interface ProgressSummaryBarProps {
  doneCount: number;
  totalTopics: number;
  progressPercent: number;
  learningCount?: number;
  disciplineDoneCount?: number;
  disciplineTotalTopics?: number;
  disciplineProgressPercent?: number;
  trackTitle?: string;
  className?: string;
}

/**
 * Progress metrics summary bar displaying overall curriculum completion,
 * active learning status counts, progress bar indicator, and optional
 * discipline-specific progress metrics.
 */
export function ProgressSummaryBar({
  doneCount,
  totalTopics,
  progressPercent,
  learningCount = 0,
  disciplineDoneCount,
  disciplineTotalTopics,
  disciplineProgressPercent,
  trackTitle,
  className,
}: ProgressSummaryBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const hasProgress = doneCount > 0 || learningCount > 0;
  const hasDisciplineMetrics =
    disciplineTotalTopics !== undefined && disciplineTotalTopics > 0;

  return (
    <div
      className={`rm-tab-progress-info${className ? ` ${className}` : ""}`}
      aria-label="Progress summary"
    >
      {hasProgress ? (
        <>
          <span className="rm-progress-text">
            <strong className="text-[var(--text)]">{doneCount}</strong> {`of ${totalTopics} done`}
            {learningCount > 0 && (
              <span className="text-[var(--dim)] text-[11px] ml-1">
                {`(${learningCount} in progress)`}
              </span>
            )}
          </span>

          <div
            className="rm-tab-progress-bar"
            role="progressbar"
            aria-valuenow={clampedPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Roadmap progress: ${clampedPercent} percent`}
          >
            <div
              className="rm-tab-progress-fill"
              style={{ width: `${clampedPercent}%` }}
            />
          </div>

          <span className="rm-progress-pct">{`${clampedPercent}%`}</span>

          {hasDisciplineMetrics && (
            <span
              className="rm-discipline-progress-tag text-[10px] text-[var(--dim)] border-l border-[var(--border)] pl-2 hidden sm:inline"
              title={`${trackTitle ?? "Track"} progress`}
            >
              {trackTitle ? `${trackTitle}: ` : "Track: "}
              <strong className="text-[var(--text)]">{disciplineDoneCount ?? 0}</strong>
              {`/${disciplineTotalTopics} (${Math.round(disciplineProgressPercent ?? 0)}%)`}
            </span>
          )}
        </>
      ) : (
        <span>
          <strong className="text-[var(--text)]">{totalTopics}</strong> topics · none tracked yet
        </span>
      )}
    </div>
  );
}

export default ProgressSummaryBar;
