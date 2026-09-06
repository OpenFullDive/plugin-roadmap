import { slugifyTopic, type RoadmapField } from "../../content/roadmap";

export const STATUS_KEY = "ofd-roadmap-status-v1";
export const FAVORITES_KEY = "ofd-roadmap-favorites-v1";
export const CHECKLIST_KEY = "ofd-roadmap-checklist-v1";
export const PROGRESS_STORAGE_KEY = "roadmap:progress";
export const FAVORITES_STORAGE_KEY = "roadmap:favorites";
export const CHECKLIST_STORAGE_KEY = "roadmap:checklist";

export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota limits
  }
}

export function topicKey(field: RoadmapField, topic: string): string {
  return `${field.id}:${slugifyTopic(topic)}`;
}
