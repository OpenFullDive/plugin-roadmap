import { useCallback, useEffect, useRef, useState } from "react";

export interface MatchableNode {
  label: string;
  topicName?: string;
  subtopicName?: string;
}

export interface UseRoadmapSearchReturn {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isNodeMatched: (node: MatchableNode | string, query?: string) => boolean;
  clearSearch: () => void;
  focusSearch: () => void;
}

export function useRoadmapSearch(initialQuery = ""): UseRoadmapSearchReturn {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.blur();
  }, []);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const isNodeMatched = useCallback(
    (node: MatchableNode | string, query?: string): boolean => {
      const q = (query ?? searchQuery).trim().toLowerCase();
      if (!q) return false;

      if (typeof node === "string") {
        return node.toLowerCase().includes(q);
      }

      const label = node.label.toLowerCase();
      const topic = (node.topicName ?? "").toLowerCase();
      const subtopic = (node.subtopicName ?? "").toLowerCase();

      return label.includes(q) || topic.includes(q) || subtopic.includes(q);
    },
    [searchQuery],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(targetTag) &&
        !isEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    isNodeMatched,
    clearSearch,
    focusSearch,
  };
}
