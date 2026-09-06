import { useState } from "react";
import clsx from "clsx";
import { Check, GitFork, Link as LinkIcon, Share2 } from "lucide-react";
import { copyToClipboard, openShareUrl } from "../utils/share";

export interface SocialRailProps {
  shareLink: string | (() => string);
  shareText?: string;
  title?: string;
  repoUrl?: string;
  copied?: boolean;
  onCopy?: () => Promise<boolean> | boolean;
  onOpenShareIntent?: (url: string) => void;
  onOpenShareModal?: () => void;
  className?: string;
}

/**
 * Floating quick action social rail pinned to the left margin.
 * Features:
 * - Copy link button with temporary 2-second checkmark confirmation
 * - Twitter / X share intent opener
 * - GitHub repository shortcut link
 * - Optional share modal / native sheet opener
 * - Community platform sharing (Hacker News, Reddit, Facebook)
 */
export function SocialRail({
  shareLink,
  shareText = "OpenFullDive Roadmap — Open-source curriculum toward full-dive VR",
  title = "OpenFullDive Roadmap",
  repoUrl = "https://github.com/openfulldive/openfulldive",
  copied,
  onCopy,
  onOpenShareIntent,
  onOpenShareModal,
  className,
}: SocialRailProps) {
  const [internalCopied, setInternalCopied] = useState(false);
  const isCopied = copied !== undefined ? copied : internalCopied;

  const resolveUrl = () => {
    return typeof shareLink === "function" ? shareLink() : shareLink;
  };

  const handleCopy = async () => {
    let success = false;
    if (onCopy) {
      success = await onCopy();
    } else {
      success = await copyToClipboard(resolveUrl());
    }

    if (success) {
      setInternalCopied(true);
      setTimeout(() => setInternalCopied(false), 2000);
    }
  };

  const handleIntent = (url: string) => {
    if (onOpenShareIntent) {
      onOpenShareIntent(url);
    } else {
      openShareUrl(url);
    }
  };

  const currentUrl = resolveUrl();

  return (
    <aside
      className={`rm-floating-social-rail${className ? ` ${className}` : ""}`}
      aria-label="Share this roadmap"
    >
      <div className="rm-floating-social">
        {/* Copy Link Button with checkmark confirmation */}
        <button
          type="button"
          className={clsx("rm-floating-social-btn", isCopied && "is-copied")}
          title="Copy link to this roadmap"
          aria-label={isCopied ? "Link copied" : "Copy link to this roadmap"}
          onClick={handleCopy}
        >
          {isCopied ? (
            <Check size={14} strokeWidth={2.5} />
          ) : (
            <LinkIcon size={14} />
          )}
        </button>

        {/* Twitter / X Intent */}
        <button
          type="button"
          className="rm-floating-social-btn"
          title="Share on X"
          aria-label="Share on X"
          onClick={() =>
            handleIntent(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                shareText,
              )}&url=${encodeURIComponent(currentUrl)}`,
            )
          }
        >
          𝕏
        </button>

        {/* GitHub Repository Link */}
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rm-floating-social-btn"
            title="View on GitHub"
            aria-label="View on GitHub"
          >
            <GitFork size={13} />
          </a>
        )}

        {/* Optional Native Share / Modal Trigger */}
        {onOpenShareModal && (
          <button
            type="button"
            className="rm-floating-social-btn"
            title="Share options"
            aria-label="Share options"
            onClick={onOpenShareModal}
          >
            <Share2 size={13} />
          </button>
        )}

        {/* Facebook Intent */}
        <button
          type="button"
          className="rm-floating-social-btn"
          title="Share on Facebook"
          aria-label="Share on Facebook"
          onClick={() =>
            handleIntent(
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                currentUrl,
              )}`,
            )
          }
        >
          f
        </button>

        {/* Hacker News Intent */}
        <button
          type="button"
          className="rm-floating-social-btn"
          title="Share on Hacker News"
          aria-label="Share on Hacker News"
          onClick={() =>
            handleIntent(
              `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(
                currentUrl,
              )}&t=${encodeURIComponent(title)}`,
            )
          }
        >
          Y
        </button>

        {/* Reddit Intent */}
        <button
          type="button"
          className="rm-floating-social-btn"
          title="Share on Reddit"
          aria-label="Share on Reddit"
          onClick={() =>
            handleIntent(
              `https://reddit.com/submit?url=${encodeURIComponent(
                currentUrl,
              )}&title=${encodeURIComponent(title)}`,
            )
          }
        >
          <Share2 size={13} />
        </button>
      </div>
    </aside>
  );
}

export default SocialRail;
