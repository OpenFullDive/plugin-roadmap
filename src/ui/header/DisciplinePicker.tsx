import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Compass } from "lucide-react";
import { roadmapFields } from "../../content/roadmap";
import { TRACK_CATEGORY_ORDER } from "../types";
import { getFieldIcon } from "../utils/field-icons";

export interface DisciplinePickerOption {
  id: string;
  label: string;
  hint: string;
  category: string | null;
}

export interface DisciplinePickerProps {
  currentId: string;
  currentLabel: string;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Accessible track picker combobox/listbox selector.
 *
 * Replaces native <select> with a theme-aware WAI-ARIA listbox supporting:
 * - Keyboard navigation (ArrowDown, ArrowUp, Home, End, Enter, Space, Escape, Tab)
 * - Rapid type-ahead prefix search with 1000ms expiration buffer
 * - Category groupings organized by TRACK_CATEGORY_ORDER
 * - Outside click dismiss via document pointerdown event listener
 * - Return of focus to trigger button upon close
 */
export function DisciplinePicker({
  currentId,
  currentLabel,
  onSelect,
  className,
}: DisciplinePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const typeahead = useRef({ query: "", at: 0 });
  const listId = `${useId()}-track-list`;

  /**
   * Flat option list in visual order — arrow keys cross category boundaries.
   * Grouped by category first to ensure contiguous grouping under TRACK_CATEGORY_ORDER.
   */
  const options = useMemo(() => {
    const list: DisciplinePickerOption[] = [
      { id: "master", label: "Master Curriculum", hint: "All 12 tracks", category: null },
    ];
    for (const category of TRACK_CATEGORY_ORDER) {
      for (const f of roadmapFields.filter((x) => x.category === category)) {
        list.push({ id: f.id, label: f.shortTitle, hint: f.level, category });
      }
    }
    return list;
  }, []);

  const currentIndex = Math.max(0, options.findIndex((o) => o.id === currentId));

  const openList = useCallback(
    (startAt = currentIndex) => {
      setActiveIndex(startAt);
      setOpen(true);
    },
    [currentIndex],
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const commit = useCallback(
    (id: string) => {
      if (id === currentId) {
        close();
        return;
      }
      if (onSelect) {
        onSelect(id);
        close();
      } else if (typeof window !== "undefined") {
        window.location.href = id === "master" ? "/roadmap" : `/roadmap/${id}`;
      }
    },
    [currentId, close, onSelect],
  );

  // Dismiss on an outside click, and on Escape from anywhere in the popup
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (listRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Focus the popup so it owns the keyboard the moment it appears
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Keep active option in view when arrow keys navigate
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
        return;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        e.preventDefault();
        setActiveIndex(last);
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(options[activeIndex]?.id ?? currentId);
        return;
      case "Escape":
        e.preventDefault();
        close();
        return;
      case "Tab":
        // Tabbing away is a dismissal, not a selection
        setOpen(false);
        return;
      default:
        break;
    }

    // Type-ahead: successive letters within 1000ms extend search query
    if (e.key.length !== 1 || e.metaKey || e.ctrlKey || e.altKey) return;
    const now = Date.now();
    const t = typeahead.current;
    t.query = now - t.at > 1000 ? e.key : t.query + e.key;
    t.at = now;
    const q = t.query.toLowerCase();
    const hit = options.findIndex((o) => o.label.toLowerCase().startsWith(q));
    if (hit >= 0) setActiveIndex(hit);
  };

  let lastCategory: string | null = null;

  return (
    <div className={`rm-track-picker${className ? ` ${className}` : ""}`}>
      <button
        ref={buttonRef}
        type="button"
        className="rm-track-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`Track: ${currentLabel}. Change track`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
      >
        <span className="rm-track-trigger-label">{currentLabel}</span>
        <ChevronDown size={15} aria-hidden="true" className="rm-track-chevron" />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Roadmap tracks"
          aria-activedescendant={`${listId}-opt-${activeIndex}`}
          tabIndex={-1}
          className="rm-track-list"
          onKeyDown={onListKeyDown}
        >
          {options.map((o, i) => {
            const Icon = o.id === "master" ? Compass : getFieldIcon(o.id);
            const heading = o.category && o.category !== lastCategory ? o.category : null;
            lastCategory = o.category;
            return (
              <Fragment key={o.id}>
                {heading && (
                  <div className="rm-track-group" role="presentation">
                    {heading}
                  </div>
                )}
                <div
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={o.id === currentId}
                  data-active={i === activeIndex}
                  className="rm-track-option"
                  onPointerEnter={() => setActiveIndex(i)}
                  onClick={() => commit(o.id)}
                >
                  <Icon size={15} aria-hidden="true" className="rm-track-option-icon" />
                  <span className="rm-track-option-label">{o.label}</span>
                  <span className="rm-track-option-hint">{o.hint}</span>
                  {o.id === currentId && (
                    <Check size={14} aria-hidden="true" className="rm-track-option-check" />
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DisciplinePicker;
