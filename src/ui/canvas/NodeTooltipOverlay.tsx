import type { CSSProperties } from "react";
import { STATUS_LABEL } from "../hooks/useCanvasTooltip";
import type { NodeTooltip } from "../types";

export interface NodeTooltipOverlayProps {
  tooltip: NodeTooltip | null;
  tooltipWarm?: boolean;
}

/**
 * Floating delayed node tooltip overlay.
 * Single portal-like element anchored to the active node rect.
 * Composes smooth CSS transitions with --rm-tooltip-shift placement.
 */
export function NodeTooltipOverlay({
  tooltip,
  tooltipWarm = false,
}: NodeTooltipOverlayProps) {
  if (!tooltip) return null;

  return (
    <div
      className="rm-node-tooltip"
      role="tooltip"
      data-open="true"
      data-instant={tooltipWarm ? "true" : "false"}
      style={
        {
          left: tooltip.x,
          top: tooltip.y,
          "--rm-tooltip-shift":
            tooltip.placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        } as CSSProperties
      }
    >
      <span className="rm-node-tooltip-title">{tooltip.title}</span>
      {tooltip.body}
      {tooltip.status && (
        <span className="rm-node-tooltip-status">{STATUS_LABEL[tooltip.status]}</span>
      )}
      <span className="rm-node-tooltip-hint">Enter to open · D done · L learning · S skip</span>
    </div>
  );
}

export default NodeTooltipOverlay;
