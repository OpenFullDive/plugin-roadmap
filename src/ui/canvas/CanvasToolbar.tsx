import { MoveHorizontal } from "lucide-react";
import type { ZoomMode } from "../types";

export interface CanvasToolbarProps {
  canFit: boolean;
  zoom: ZoomMode;
  onSetZoom: (mode: ZoomMode) => void;
  onSwitchToLinear?: () => void;
}

/**
 * Pan hint and zoom toggle toolbar positioned above the flowchart canvas scroller.
 * On viewports that can scale down legibly (canFit = true), displays "Fit" vs "100%" buttons.
 * On viewports narrower than MIN_FIT_SCALE (e.g. mobile), presents a direct "Read as a list" action.
 */
export function CanvasToolbar({
  canFit,
  zoom,
  onSetZoom,
  onSwitchToLinear,
}: CanvasToolbarProps) {
  return (
    <div className="rm-pan-hint">
      {canFit ? (
        <>
          <span className="rm-pan-hint-text">Diagram is wider than the window</span>
          <span className="rm-zoom-group" role="group" aria-label="Diagram size">
            <button
              type="button"
              className="rm-zoom-btn"
              aria-pressed={zoom === "fit"}
              onClick={() => onSetZoom("fit")}
            >
              Fit
            </button>
            <button
              type="button"
              className="rm-zoom-btn"
              aria-pressed={zoom === "full"}
              onClick={() => onSetZoom("full")}
            >
              100%
            </button>
          </span>
        </>
      ) : (
        <>
          <MoveHorizontal size={13} aria-hidden="true" />
          <span className="rm-pan-hint-text">Diagram is wider than the window</span>
          {onSwitchToLinear && (
            <button
              type="button"
              className="rm-pan-hint-action"
              onClick={onSwitchToLinear}
            >
              Read as a list
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default CanvasToolbar;
