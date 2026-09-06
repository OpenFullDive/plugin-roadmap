import { useCallback, useRef, useState } from "react";
import { buildShareUrl, copyToClipboard, openShareUrl } from "../utils/share";

export interface UseShareActionsOptions {
  slug: string;
  isMaster?: boolean;
  title?: string;
}

export interface UseShareActionsReturn {
  shareLink: () => string;
  shareUrl: string;
  shareText: string;
  copyLink: () => Promise<boolean>;
  copied: boolean;
  setCopied: React.Dispatch<React.SetStateAction<boolean>>;
  railCopied: boolean;
  setRailCopied: React.Dispatch<React.SetStateAction<boolean>>;
  copyRailLink: () => Promise<boolean>;
  share: () => Promise<void>;
  openShareIntent: (url: string) => void;
}

export function useShareActions(
  slugOrOptions: string | UseShareActionsOptions,
  isMasterParam = false,
  titleParam = "OpenFullDive Roadmap",
): UseShareActionsReturn {
  const isOptions = typeof slugOrOptions === "object" && slugOrOptions !== null;
  const slug = isOptions ? slugOrOptions.slug : slugOrOptions;
  const isMaster = isOptions ? Boolean(slugOrOptions.isMaster) : isMasterParam;
  const title = isOptions ? slugOrOptions.title ?? "OpenFullDive Roadmap" : titleParam;

  const [copied, setCopied] = useState(false);
  const [railCopied, setRailCopied] = useState(false);

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareLink = useCallback(() => {
    return buildShareUrl(slug, isMaster);
  }, [isMaster, slug]);

  const shareUrl = buildShareUrl(slug, isMaster);
  const shareText = `${title} — an OpenFullDive roadmap`;

  const copyLink = useCallback(async (): Promise<boolean> => {
    const url = shareLink();
    const success = await copyToClipboard(url);
    if (success) {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      setCopied(true);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    }
    return success;
  }, [shareLink]);

  const copyRailLink = useCallback(async (): Promise<boolean> => {
    const url = shareLink();
    const success = await copyToClipboard(url);
    if (success) {
      if (railCopiedTimer.current) clearTimeout(railCopiedTimer.current);
      setRailCopied(true);
      railCopiedTimer.current = setTimeout(() => setRailCopied(false), 2000);
    }
    return success;
  }, [shareLink]);

  const share = useCallback(async (): Promise<void> => {
    if (typeof window === "undefined") return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url: shareLink() });
        return;
      } catch {
        // Dismissed or unsupported — fall through to copy
      }
    }

    await copyLink();
  }, [copyLink, shareLink, shareText, title]);

  const openShareIntent = useCallback((url: string) => {
    openShareUrl(url);
  }, []);

  return {
    shareLink,
    shareUrl,
    shareText,
    copyLink,
    copied,
    setCopied,
    railCopied,
    setRailCopied,
    copyRailLink,
    share,
    openShareIntent,
  };
}
