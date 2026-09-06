import type { TopicStatus } from "../../../content/roadmap";
import type { EdgeItem } from "../../types/flowchart";

/**
 * Calculates a smooth horizontal S-curve SVG cubic bezier path between two coordinates.
 * Commonly used for radiating branches from milestone spines to outer columns.
 */
export function computeHorizontalBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  controlOffset = 35,
): string {
  const dir = endX >= startX ? 1 : -1;
  const cp1X = startX + controlOffset * dir;
  const cp1Y = startY;
  const cp2X = endX - controlOffset * dir;
  const cp2Y = endY;
  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
}

/**
 * Calculates a smooth vertical S-curve SVG cubic bezier path between two coordinates.
 * Commonly used for branching from phase hubs down to discipline headers or converging to gates.
 */
export function computeVerticalBezierPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cp1YOffset = 25,
  cp2YOffset = 25,
): string {
  const cp1X = startX;
  const cp1Y = startY + cp1YOffset;
  const cp2X = endX;
  const cp2Y = endY - cp2YOffset;
  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
}

/**
 * Generates a straight vertical line path for central spines.
 */
export function computeStraightSpinePath(x: number, startY: number, endY: number): string {
  return `M ${x} ${startY} V ${endY}`;
}

/**
 * Generates an orthogonal stepped path (e.g., M x1 y1 H xMid V yMid H x2).
 */
export function computeOrthogonalPath(
  x1: number,
  y1: number,
  xMid: number,
  yMid: number,
  x2: number,
): string {
  return `M ${x1} ${y1} H ${xMid} V ${yMid} H ${x2}`;
}

/**
 * Generates a custom cubic bezier path with explicit control points.
 */
export function computeCubicBezierPath(
  startX: number,
  startY: number,
  cp1X: number,
  cp1Y: number,
  cp2X: number,
  cp2Y: number,
  endX: number,
  endY: number,
): string {
  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
}

/**
 * Returns the SVG arrowhead marker URL for a given edge item.
 * Only central spine edges receive directional arrowheads, colored by topic progress.
 */
export function getEdgeMarkerId(edge: EdgeItem): string | undefined {
  if (edge.type !== "spine") return undefined;
  if (edge.status === "done") return "url(#rm-arrow-done)";
  if (edge.status === "learning") return "url(#rm-arrow-learning)";
  return "url(#rm-arrow)";
}

/**
 * Standard SVG marker definitions used across all flowchart diagrams.
 */
export const FLOWCHART_SVG_MARKERS = [
  {
    id: "rm-arrow",
    fill: "#3f8cff",
  },
  {
    id: "rm-arrow-done",
    fill: "#10b981",
  },
  {
    id: "rm-arrow-learning",
    fill: "#ffd166",
  },
] as const;
