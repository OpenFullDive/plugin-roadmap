/**
 * One canonical link for every share surface. Built from the origin and the
 * roadmap's own path rather than `location.href`, so a link shared while a
 * topic drawer is open, or from a URL carrying stray query parameters, still
 * points at the roadmap itself.
 */
export function buildShareUrl(slug: string, isMaster?: boolean): string {
  if (typeof window === "undefined") return "";
  const isMasterView = isMaster ?? (!slug || slug === "master" || slug === "master-curriculum");
  return `${window.location.origin}/roadmap${isMasterView ? "" : `/${slug}`}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Clipboard API needs a secure context; plain HTTP still has to work.
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

/**
 * Intent windows are opened with `noopener,noreferrer`. Without it the
 * opened page receives `window.opener` and can navigate this tab somewhere
 * else while the reader is looking at the share dialog.
 */
export function openShareUrl(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

export const openShareIntent = openShareUrl;
