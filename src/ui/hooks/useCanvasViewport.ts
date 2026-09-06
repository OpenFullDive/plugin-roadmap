import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanState, ZoomMode } from "../types";

export const MIN_FIT_SCALE = 0.62;

export interface UseCanvasViewportOptions {
  canvasWidth?: number;
  initialZoom?: ZoomMode;
  deps?: unknown[];
}

export interface UseCanvasViewportReturn {
  flowRef: React.RefObject<HTMLDivElement | null>;
  containerWidth: number;
  zoom: ZoomMode;
  setZoom: React.Dispatch<React.SetStateAction<ZoomMode>>;
  pan: PanState;
  setPan: React.Dispatch<React.SetStateAction<PanState>>;
  syncPan: () => void;
  fitScale: number;
  canFit: boolean;
  appliedScale: number;
  onCanvasKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  toggleZoom: () => void;
}

export function useCanvasViewport(
  canvasWidthOrOptions?: number | UseCanvasViewportOptions,
  depsParam: unknown[] = [],
): UseCanvasViewportReturn {
  const isOptions = typeof canvasWidthOrOptions === "object" && canvasWidthOrOptions !== null;
  const canvasWidth = isOptions ? canvasWidthOrOptions.canvasWidth : canvasWidthOrOptions;
  const initialZoom = isOptions && canvasWidthOrOptions.initialZoom ? canvasWidthOrOptions.initialZoom : "fit";
  const deps = isOptions && canvasWidthOrOptions.deps ? canvasWidthOrOptions.deps : depsParam;

  const flowRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState<ZoomMode>(initialZoom);
  const [pan, setPan] = useState<PanState>({ pannable: false, atStart: true, atEnd: false });

  const syncPan = useCallback(() => {
    const el = flowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const cs = getComputedStyle(el);
    const inner =
      el.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0");
    setContainerWidth(Math.max(0, inner));
    setPan({
      pannable: max > 8,
      atStart: el.scrollLeft <= 4,
      atEnd: max - el.scrollLeft <= 4,
    });
  }, []);

  useEffect(() => {
    const el = flowRef.current;
    if (!el) return;
    syncPan();
    el.addEventListener("scroll", syncPan, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(syncPan);
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }

    return () => {
      el.removeEventListener("scroll", syncPan);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncPan, ...deps]);

  const onCanvasKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = flowRef.current;
    if (!el || e.target !== el) return;
    const step = e.shiftKey ? 320 : 120;
    const moves: Record<string, () => void> = {
      ArrowRight: () => el.scrollBy({ left: step }),
      ArrowLeft: () => el.scrollBy({ left: -step }),
      Home: () => el.scrollTo({ left: 0 }),
      End: () => el.scrollTo({ left: el.scrollWidth }),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    move();
  }, []);

  const fitScale = useMemo(() => {
    if (!canvasWidth || !containerWidth) return 1;
    const raw = containerWidth / canvasWidth;
    return raw >= 0.98 ? 1 : Math.floor(raw * 1000) / 1000;
  }, [canvasWidth, containerWidth]);

  const canFit = fitScale >= MIN_FIT_SCALE;
  const appliedScale = zoom === "fit" && canFit ? fitScale : 1;

  const toggleZoom = useCallback(() => {
    setZoom((prev) => (prev === "fit" ? "full" : "fit"));
  }, []);

  return {
    flowRef,
    containerWidth,
    zoom,
    setZoom,
    pan,
    setPan,
    syncPan,
    fitScale,
    canFit,
    appliedScale,
    onCanvasKeyDown,
    toggleZoom,
  };
}
