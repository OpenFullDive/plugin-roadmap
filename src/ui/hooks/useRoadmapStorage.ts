import { useCallback, useEffect, useState } from "react";
import type { TopicStatus } from "../../content/roadmap";
import type { RoadmapStorage, SelectedTopic } from "../types";
import {
  CHECKLIST_KEY,
  CHECKLIST_STORAGE_KEY,
  FAVORITES_KEY,
  FAVORITES_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  STATUS_KEY,
  readLocal,
  topicKey,
  writeLocal,
} from "../utils/storage";

export interface UseRoadmapStorageReturn {
  statuses: Record<string, TopicStatus>;
  setStatuses: React.Dispatch<React.SetStateAction<Record<string, TopicStatus>>>;
  favorites: string[];
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
  checkedChecklist: Record<string, boolean>;
  setCheckedChecklist: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setStatus: (target: SelectedTopic, next: TopicStatus | undefined) => void;
  toggleFavorite: (id?: string) => void;
  toggleChecklist: (checkKey: string) => void;
  persist: (localKey: string, remoteKey: string, value: unknown) => void;
}

export function useRoadmapStorage(
  storage?: RoadmapStorage,
  isSignedIn = false,
  defaultFavoriteId?: string,
): UseRoadmapStorageReturn {
  const serverBacked = Boolean(isSignedIn && storage);

  const [statuses, setStatuses] = useState<Record<string, TopicStatus>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [checkedChecklist, setCheckedChecklist] = useState<Record<string, boolean>>({});

  const persist = useCallback(
    (localKey: string, remoteKey: string, value: unknown) => {
      writeLocal(localKey, value);
      if (serverBacked && storage) {
        storage.setState(remoteKey, value).catch(() => {});
      }
    },
    [serverBacked, storage],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!serverBacked || !storage) {
        setStatuses(readLocal(STATUS_KEY, {}));
        setFavorites(readLocal(FAVORITES_KEY, []));
        setCheckedChecklist(readLocal(CHECKLIST_KEY, {}));
        return;
      }

      const remote = await storage.getState().catch(() => null);
      if (cancelled) return;

      let progress = remote?.[PROGRESS_STORAGE_KEY] as Record<string, TopicStatus> | undefined;
      let favs = remote?.[FAVORITES_STORAGE_KEY] as string[] | undefined;
      let checklist = remote?.[CHECKLIST_STORAGE_KEY] as Record<string, boolean> | undefined;

      if (progress === undefined) {
        const local = readLocal<Record<string, TopicStatus> | null>(STATUS_KEY, null);
        if (local && Object.keys(local).length > 0) {
          const result = await storage.setState(PROGRESS_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) progress = local;
        }
      }
      if (favs === undefined) {
        const local = readLocal<string[] | null>(FAVORITES_KEY, null);
        if (local && local.length > 0) {
          const result = await storage.setState(FAVORITES_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) favs = local;
        }
      }
      if (checklist === undefined) {
        const local = readLocal<Record<string, boolean> | null>(CHECKLIST_KEY, null);
        if (local && Object.keys(local).length > 0) {
          const result = await storage.setState(CHECKLIST_STORAGE_KEY, local).catch(() => null);
          if (result?.ok) checklist = local;
        }
      }

      if (cancelled) return;
      setStatuses(progress ?? {});
      setFavorites(favs ?? []);
      setCheckedChecklist(checklist ?? {});
    })();

    return () => {
      cancelled = true;
    };
  }, [serverBacked, storage]);

  const setStatus = useCallback(
    (target: SelectedTopic, next: TopicStatus | undefined) => {
      const key = topicKey(target.field, target.topic);
      setStatuses((prev) => {
        const updated = { ...prev };
        if (next === undefined) {
          delete updated[key];
        } else {
          updated[key] = next;
        }
        persist(STATUS_KEY, PROGRESS_STORAGE_KEY, updated);
        return updated;
      });
    },
    [persist],
  );

  const toggleFavorite = useCallback(
    (id?: string) => {
      const targetId = id ?? defaultFavoriteId;
      if (!targetId) return;

      setFavorites((prev) => {
        const next = prev.includes(targetId)
          ? prev.filter((item) => item !== targetId)
          : [...prev, targetId];
        persist(FAVORITES_KEY, FAVORITES_STORAGE_KEY, next);
        return next;
      });
    },
    [defaultFavoriteId, persist],
  );

  const toggleChecklist = useCallback(
    (checkKey: string) => {
      setCheckedChecklist((prev) => {
        const next = { ...prev, [checkKey]: !prev[checkKey] };
        persist(CHECKLIST_KEY, CHECKLIST_STORAGE_KEY, next);
        return next;
      });
    },
    [persist],
  );

  return {
    statuses,
    setStatuses,
    favorites,
    setFavorites,
    checkedChecklist,
    setCheckedChecklist,
    setStatus,
    toggleFavorite,
    toggleChecklist,
    persist,
  };
}
