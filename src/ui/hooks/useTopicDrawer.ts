import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getTopicDetails, type TopicDetail } from "../../content/topic-details";
import type { DrawerTab, SelectedTopic } from "../types";

export interface UseTopicDrawerOptions {
  flatTopics?: SelectedTopic[];
  allTopicKeys?: string[];
  initialTopic?: SelectedTopic | null;
  initialTab?: DrawerTab;
}

export interface UseTopicDrawerReturn {
  selected: SelectedTopic | null;
  setSelected: React.Dispatch<React.SetStateAction<SelectedTopic | null>>;
  drawerTab: DrawerTab;
  setDrawerTab: React.Dispatch<React.SetStateAction<DrawerTab>>;
  activeTopicDetail: TopicDetail | null;
  openTopic: (target: SelectedTopic, triggerEl?: HTMLElement | null, tab?: DrawerTab) => void;
  closeDrawer: () => void;
  currentTopicIndex: number;
  prevTopic: SelectedTopic | null;
  nextTopic: SelectedTopic | null;
  goToPrevTopic: () => void;
  goToNextTopic: () => void;
  drawerRef: React.RefObject<HTMLElement | null>;
  lastTriggerRef: React.MutableRefObject<HTMLElement | null>;
  drawerTitleId: string;
}

export function useTopicDrawer(
  allTopicKeysOrFlatTopicsOrOptions?: string[] | SelectedTopic[] | UseTopicDrawerOptions,
  flatTopicsParam?: SelectedTopic[],
): UseTopicDrawerReturn {
  let flatTopics: SelectedTopic[] | undefined;
  let initialTopic: SelectedTopic | null = null;
  let initialTab: DrawerTab = "knowledge";

  if (allTopicKeysOrFlatTopicsOrOptions && typeof allTopicKeysOrFlatTopicsOrOptions === "object") {
    if (!Array.isArray(allTopicKeysOrFlatTopicsOrOptions)) {
      flatTopics = allTopicKeysOrFlatTopicsOrOptions.flatTopics;
      initialTopic = allTopicKeysOrFlatTopicsOrOptions.initialTopic ?? null;
      initialTab = allTopicKeysOrFlatTopicsOrOptions.initialTab ?? "knowledge";
    } else if (
      allTopicKeysOrFlatTopicsOrOptions.length > 0 &&
      typeof allTopicKeysOrFlatTopicsOrOptions[0] === "object" &&
      allTopicKeysOrFlatTopicsOrOptions[0] !== null &&
      "topic" in (allTopicKeysOrFlatTopicsOrOptions[0] as Record<string, unknown>)
    ) {
      flatTopics = allTopicKeysOrFlatTopicsOrOptions as SelectedTopic[];
    } else {
      flatTopics = flatTopicsParam;
    }
  } else {
    flatTopics = flatTopicsParam;
  }

  const [selected, setSelected] = useState<SelectedTopic | null>(initialTopic);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>(initialTab);

  const drawerRef = useRef<HTMLElement | null>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const reactId = useId();
  const drawerTitleId = `${reactId}-drawer-title`;

  const activeTopicDetail = useMemo(() => {
    if (!selected) return null;
    return getTopicDetails(selected.field.id, selected.topic);
  }, [selected]);

  const currentTopicIndex = useMemo(() => {
    if (!selected || !flatTopics) return -1;
    return flatTopics.findIndex(
      (item) => item.field.id === selected.field.id && item.topic === selected.topic,
    );
  }, [selected, flatTopics]);

  const prevTopic: SelectedTopic | null =
    flatTopics && currentTopicIndex > 0 ? (flatTopics[currentTopicIndex - 1] ?? null) : null;
  const nextTopic: SelectedTopic | null =
    flatTopics && currentTopicIndex >= 0 && currentTopicIndex < flatTopics.length - 1
      ? (flatTopics[currentTopicIndex + 1] ?? null)
      : null;

  const openTopic = useCallback(
    (target: SelectedTopic, triggerEl?: HTMLElement | null, tab: DrawerTab = "knowledge") => {
      if (triggerEl) {
        lastTriggerRef.current = triggerEl;
      } else if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        lastTriggerRef.current = document.activeElement;
      }
      setSelected(target);
      setDrawerTab(tab);
    },
    [],
  );

  const closeDrawer = useCallback(() => {
    setSelected(null);
  }, []);

  const goToPrevTopic = useCallback(() => {
    if (prevTopic) {
      setSelected(prevTopic);
      setDrawerTab("knowledge");
    }
  }, [prevTopic]);

  const goToNextTopic = useCallback(() => {
    if (nextTopic) {
      setSelected(nextTopic);
      setDrawerTab("knowledge");
    }
  }, [nextTopic]);

  useEffect(() => {
    if (!selected) return;
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const previouslyFocused =
      lastTriggerRef.current ?? (document.activeElement as HTMLElement | null);

    const focusable = () =>
      Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    drawer.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setSelected(null);
        return;
      }
      if (e.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;

      if (!active || !drawer.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    const scroller = (document.scrollingElement as HTMLElement | null) ?? document.body;
    const prevOverflow = scroller.style.overflow;
    const prevPadding = scroller.style.paddingRight;
    const prevBodyOverflow = document.body.style.overflow;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    scroller.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (gutter > 0) scroller.style.paddingRight = `${gutter}px`;

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      scroller.style.overflow = prevOverflow;
      scroller.style.paddingRight = prevPadding;
      document.body.style.overflow = prevBodyOverflow;

      const active = document.activeElement;
      if (previouslyFocused && (!active || active === document.body || drawer.contains(active))) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [selected]);

  return {
    selected,
    setSelected,
    drawerTab,
    setDrawerTab,
    activeTopicDetail,
    openTopic,
    closeDrawer,
    currentTopicIndex,
    prevTopic,
    nextTopic,
    goToPrevTopic,
    goToNextTopic,
    drawerRef,
    lastTriggerRef,
    drawerTitleId,
  };
}
