import { useRef } from "react";
import { Search, X } from "lucide-react";

export interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  matchCount?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Pill-shaped search bar with keyboard shortcut indicator ('/'),
 * clear button, and real-time results match count badge.
 */
export function SearchBar({
  searchQuery,
  onSearchChange,
  onClear,
  inputRef,
  matchCount,
  placeholder = "Find topic...",
  className,
}: SearchBarProps) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const resolvedRef = inputRef ?? internalRef;

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onSearchChange("");
    }
    resolvedRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
      resolvedRef.current?.blur();
    }
  };

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div
      className={`rm-search-input-wrap${className ? ` ${className}` : ""}`}
      onClick={() => resolvedRef.current?.focus()}
      role="search"
    >
      <Search size={13} className="shrink-0 text-[var(--dim)]" aria-hidden="true" />
      <input
        ref={resolvedRef}
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="rm-search-input"
        aria-label="Find topic in roadmap"
      />

      {hasQuery && matchCount !== undefined && (
        <span
          className="rm-search-match-count text-[10px] font-semibold text-[var(--accent)] bg-[rgba(63,140,255,0.12)] px-1.5 py-0.5 rounded-full select-none"
          aria-live="polite"
          title={`${matchCount} matching topics`}
        >
          {matchCount}
        </span>
      )}

      {hasQuery ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          className="rm-search-clear"
          title="Clear search"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      ) : (
        <kbd className="rm-search-kbd" title="Press / to search">
          /
        </kbd>
      )}
    </div>
  );
}

export default SearchBar;
