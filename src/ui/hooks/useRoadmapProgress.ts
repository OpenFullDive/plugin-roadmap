import { useCallback, useMemo, useState } from "react";
import type { RoadmapField, TopicStatus } from "../../content/roadmap";
import type { ExportedProgressData, ProgressSummary, SelectedTopic } from "../types";
import { topicKey } from "../utils/storage";

export interface UseRoadmapProgressOptions {
  fields: RoadmapField[];
  currentField?: RoadmapField | null;
  statuses: Record<string, TopicStatus>;
  checkedChecklist?: Record<string, boolean>;
  favorites?: string[];
  slug?: string;
  selected?: SelectedTopic | null;
}

export interface UseRoadmapProgressReturn {
  doneCount: number;
  learningCount: number;
  progressPercent: number;
  flatTopics: SelectedTopic[];
  allTopicKeys: string[];
  currentTopicIndex: number;
  prevTopic: SelectedTopic | null;
  nextTopic: SelectedTopic | null;
  disciplineDoneCount: number;
  disciplineProgressPercent: number;
  checkedCount: number;
  summary: ProgressSummary;
  exportProgress: (exportSlugOrEvent?: string | unknown) => void;
  exported: boolean;
}

export function useRoadmapProgress(
  fieldsOrOptions: RoadmapField[] | UseRoadmapProgressOptions,
  currentFieldParam?: RoadmapField | null,
  statusesParam: Record<string, TopicStatus> = {},
  checkedChecklistParam: Record<string, boolean> = {},
  favoritesParam: string[] = [],
  slugParam?: string,
  selectedParam?: SelectedTopic | null,
): UseRoadmapProgressReturn {
  const isOptions = !Array.isArray(fieldsOrOptions);
  const fields = isOptions ? fieldsOrOptions.fields : fieldsOrOptions;
  const currentField = isOptions ? fieldsOrOptions.currentField : currentFieldParam;
  const statuses = isOptions ? fieldsOrOptions.statuses : statusesParam;
  const checkedChecklist = (isOptions ? fieldsOrOptions.checkedChecklist : checkedChecklistParam) ?? {};
  const favorites = (isOptions ? fieldsOrOptions.favorites : favoritesParam) ?? [];
  const slug = (isOptions ? fieldsOrOptions.slug : slugParam) ?? "";
  const selected = isOptions ? fieldsOrOptions.selected : selectedParam;

  const [exported, setExported] = useState(false);

  // Flattened topic list for sequential next/prev navigation
  const flatTopics = useMemo(() => {
    const list: SelectedTopic[] = [];
    for (const f of fields) {
      for (const s of f.sections) {
        for (const t of s.topics) {
          list.push({ field: f, section: s, topic: t });
        }
      }
    }
    return list;
  }, [fields]);

  const allTopicKeys = useMemo(
    () =>
      fields.flatMap((item) =>
        item.sections.flatMap((section) =>
          section.topics.map((topic) => topicKey(item, topic)),
        ),
      ),
    [fields],
  );

  const doneCount = useMemo(
    () => allTopicKeys.filter((key) => statuses[key] === "done").length,
    [allTopicKeys, statuses],
  );

  const learningCount = useMemo(
    () => allTopicKeys.filter((key) => statuses[key] === "learning").length,
    [allTopicKeys, statuses],
  );

  const progressPercent = useMemo(
    () => (allTopicKeys.length ? Math.round((doneCount / allTopicKeys.length) * 100) : 0),
    [allTopicKeys.length, doneCount],
  );

  // Discipline-specific progress for single field views
  const disciplineTopicKeys = useMemo(() => {
    if (!currentField) return [];
    return currentField.sections.flatMap((section) =>
      section.topics.map((topic) => topicKey(currentField, topic)),
    );
  }, [currentField]);

  const disciplineDoneCount = useMemo(
    () => disciplineTopicKeys.filter((key) => statuses[key] === "done").length,
    [disciplineTopicKeys, statuses],
  );

  const disciplineProgressPercent = useMemo(
    () =>
      disciplineTopicKeys.length
        ? Math.round((disciplineDoneCount / disciplineTopicKeys.length) * 100)
        : 0,
    [disciplineTopicKeys.length, disciplineDoneCount],
  );

  const checkedCount = useMemo(
    () => Object.values(checkedChecklist).filter(Boolean).length,
    [checkedChecklist],
  );

  const currentTopicIndex = useMemo(() => {
    if (!selected) return -1;
    return flatTopics.findIndex(
      (item) => item.field.id === selected.field.id && item.topic === selected.topic,
    );
  }, [selected, flatTopics]);

  const prevTopic: SelectedTopic | null =
    currentTopicIndex > 0 ? (flatTopics[currentTopicIndex - 1] ?? null) : null;
  const nextTopic: SelectedTopic | null =
    currentTopicIndex >= 0 && currentTopicIndex < flatTopics.length - 1
      ? (flatTopics[currentTopicIndex + 1] ?? null)
      : null;

  const summary: ProgressSummary = useMemo(
    () => ({
      total: allTopicKeys.length,
      done: doneCount,
      learning: learningCount,
      progressPercent,
    }),
    [allTopicKeys.length, doneCount, learningCount, progressPercent],
  );

  const exportProgress = useCallback(
    (exportSlugOrEvent?: string | unknown) => {
      if (typeof window === "undefined") return;
      const targetSlug =
        typeof exportSlugOrEvent === "string" && exportSlugOrEvent
          ? exportSlugOrEvent
          : slug || "roadmap";
      const data: ExportedProgressData = {
        roadmapSlug: targetSlug,
        exportedAt: new Date().toISOString(),
        summary,
        statuses,
        favorites,
        checklists: checkedChecklist,
      };

      try {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `openfulldive-roadmap-${targetSlug}-progress.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExported(true);
        setTimeout(() => setExported(false), 2000);
      } catch {
        // Blob / download failure safeguard
      }
    },
    [checkedChecklist, favorites, slug, statuses, summary],
  );

  return {
    doneCount,
    learningCount,
    progressPercent,
    flatTopics,
    allTopicKeys,
    currentTopicIndex,
    prevTopic,
    nextTopic,
    disciplineDoneCount,
    disciplineProgressPercent,
    checkedCount,
    summary,
    exportProgress,
    exported,
  };
}
