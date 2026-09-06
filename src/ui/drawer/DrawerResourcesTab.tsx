import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import type { TopicDetail } from "../../content/topic-details";

export interface DrawerResourcesTabProps {
  topicDetail: TopicDetail;
}

/**
 * Drawer Curated Resources tab.
 *
 * Displays curated scientific papers, textbooks, benchmark repos, and tools
 * with badge classification, author citations, and external links.
 */
export function DrawerResourcesTab({ topicDetail }: DrawerResourcesTabProps) {
  return (
    <div className="space-y-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--dim)]">
        Curated Scientific & Technical Literature
      </span>

      {topicDetail.resources.map((res) => (
        <a
          key={res.title}
          href={res.url}
          target={res.url.startsWith("http") ? "_blank" : undefined}
          rel={res.url.startsWith("http") ? "noopener noreferrer" : undefined}
          className="flex items-start justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)] hover:border-[var(--accent)] transition-colors text-decoration-none group"
        >
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx("resource-chip-badge", `type-${res.type}`)}>
                {res.badge}
              </span>
              {res.author && (
                <span className="text-[10px] text-[var(--dim)] truncate">
                  {res.author}
                </span>
              )}
            </div>
            <div className="font-semibold group-hover:text-[var(--accent-bright)] transition-colors leading-snug">
              {res.title}
            </div>
          </div>
          <ExternalLink size={14} className="text-[var(--dim)] flex-shrink-0 mt-1" />
        </a>
      ))}
    </div>
  );
}

export default DrawerResourcesTab;
