import Link from "next/link";
import clsx from "clsx";
import type { RoadmapField, TopicStatus } from "../../content/roadmap";
import type {
  FlowchartData,
  SelectedTopic,
  Difficulty,
  NodeTooltip,
  PanState,
  ZoomMode,
} from "../types";
import type {
  TooltipTargetNode,
  AriaLabelNode,
} from "../hooks/useCanvasTooltip";
import { BADGE_ICON } from "./FlowNode";
import { FlowNode } from "./FlowNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { FLOWCHART_SVG_MARKERS, getEdgeMarkerId } from "./layout/bezier";

export interface FlowchartCanvasProps {
  flowchartData: FlowchartData | null;
  targetField?: RoadmapField;
  isMaster?: boolean;
  statuses: Record<string, TopicStatus>;
  searchQuery?: string;
  flowRef: React.RefObject<HTMLDivElement | null>;
  pan: PanState;
  zoom: ZoomMode;
  appliedScale: number;
  canFit: boolean;
  linkedGroup?: string | null;
  onSetZoom: (mode: ZoomMode) => void;
  onCanvasKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onSwitchToLinear?: () => void;
  onSelectTab?: (tab: "roadmap" | "projects" | "contribute") => void;
  onOpenTopic?: (target: SelectedTopic, tab?: "knowledge" | "resources" | "community") => void;
  onSetStatus?: (target: SelectedTopic, status: TopicStatus | undefined) => void;
  onSelectProjectLevel?: (level: Difficulty) => void;
  openTooltip?: (
    el: HTMLElement,
    next: Omit<NodeTooltip, "x" | "y" | "placement">,
    group?: string,
    instant?: boolean,
  ) => void;
  closeTooltip?: () => void;
  nodeTooltip?: (node: TooltipTargetNode) => Omit<NodeTooltip, "x" | "y" | "placement">;
  nodeAriaLabel?: (node: AriaLabelNode) => string;
}

/**
 * Main Flowchart Canvas container component.
 * Houses the pan hint toolbar, horizontal viewport scroller, SVG edge layer,
 * recommendation legend card, curriculum card, and positioned flow nodes.
 */
export function FlowchartCanvas({
  flowchartData,
  targetField,
  isMaster = false,
  statuses,
  searchQuery = "",
  flowRef,
  pan,
  zoom,
  appliedScale,
  canFit,
  linkedGroup,
  onSetZoom,
  onCanvasKeyDown,
  onSwitchToLinear,
  onSelectTab,
  onOpenTopic,
  onSetStatus,
  onSelectProjectLevel,
  openTooltip,
  closeTooltip,
  nodeTooltip,
  nodeAriaLabel,
}: FlowchartCanvasProps) {
  if (!flowchartData) return null;

  const isMatched = (label: string): boolean => {
    const q = searchQuery.trim().toLowerCase();
    return q.length > 0 && label.toLowerCase().includes(q);
  };

  return (
    <div className="rm-flow-frame" data-pannable={pan.pannable || appliedScale < 1 ? "true" : "false"}>
      {/* Pan hint toolbar / zoom toggles */}
      <CanvasToolbar
        canFit={canFit}
        zoom={zoom}
        onSetZoom={onSetZoom}
        onSwitchToLinear={onSwitchToLinear}
      />

      {/* Horizontal Viewport Scroller */}
      <div
        ref={flowRef}
        className="roadmap-flow-wrapper"
        {...(pan.pannable
          ? {
              role: "region",
              tabIndex: 0,
              "aria-label": "Interactive learning flowchart, scrollable. Use the left and right arrow keys to pan.",
            }
          : { "aria-label": "Interactive learning flowchart" })}
        data-pannable={pan.pannable ? "true" : "false"}
        data-pan-start={!pan.atStart ? "true" : "false"}
        data-pan-end={!pan.atEnd ? "true" : "false"}
        onKeyDown={onCanvasKeyDown}
        onPointerLeave={closeTooltip}
      >
        {/* Canvas Sizer ensures layout space reflects the applied transform scale */}
        <div
          className="rm-canvas-sizer"
          style={{
            width: flowchartData.canvasWidth * appliedScale,
            height: flowchartData.canvasHeight * appliedScale,
          }}
        >
          <div
            className="roadmap-diagram-canvas"
            data-linked={linkedGroup ? "true" : undefined}
            style={{
              width: flowchartData.canvasWidth,
              height: flowchartData.canvasHeight,
              transform: appliedScale === 1 ? undefined : `scale(${appliedScale})`,
            }}
          >
            {/* SVG Connector & Section Bounding Box Layer */}
            <svg
              className="rm-svg-overlay"
              width={flowchartData.canvasWidth}
              height={flowchartData.canvasHeight}
              viewBox={`0 0 ${flowchartData.canvasWidth} ${flowchartData.canvasHeight}`}
            >
              <defs>
                {FLOWCHART_SVG_MARKERS.map((m) => (
                  <marker
                    key={m.id}
                    id={m.id}
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L6,3 z" fill={m.fill} />
                  </marker>
                ))}
              </defs>

              {/* Section Bounding Boxes */}
              {flowchartData.sectionBoxes.map((sb) => (
                <rect
                  key={sb.id}
                  x={sb.boxX}
                  y={sb.boxY}
                  width={sb.boxW}
                  height={sb.boxH}
                  rx="8"
                  ry="8"
                  className="rm-section-box"
                />
              ))}

              {/* All Connecting Paths */}
              {flowchartData.edges.map((e) => {
                const marker = getEdgeMarkerId(e);
                return (
                  <path
                    key={e.id}
                    d={e.path}
                    className={clsx(
                      e.type === "spine" && "rm-edge-spine",
                      e.type === "radiating" && "rm-edge-branch",
                      e.type === "branch" && "rm-edge-branch",
                      e.type === "solid" && "rm-edge-solid",
                      e.status === "done" && "is-done",
                      e.status === "learning" && "is-learning",
                      linkedGroup && e.group === linkedGroup && "is-linked",
                    )}
                    markerEnd={marker}
                  />
                );
              })}
            </svg>

            {/* Top Left Recommendation Legend Card */}
            {flowchartData.legendCard && (
              <>
                <div
                  className="rm-legend-card"
                  style={{
                    left: flowchartData.legendCard.x,
                    top: flowchartData.legendCard.y,
                    width: flowchartData.legendCard.width,
                  }}
                >
                  <div className="rm-legend-title">Recommendation Legend</div>
                  {(
                    [
                      ["recommended", "Personal Recommendation / Opinion"],
                      ["alternative", "Alternative Option / Pick this or green"],
                      ["elective", "Order not strict / Learn anytime"],
                    ] as const
                  ).map(([kind, text]) => {
                    const BadgeIcon = BADGE_ICON[kind];
                    return (
                      <div key={kind} className="rm-legend-item">
                        <span className={`rm-badge-corner is-${kind}`}>
                          <BadgeIcon size={9} strokeWidth={3} />
                        </span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>

                {onSwitchToLinear && (
                  <button
                    type="button"
                    className="rm-legend-action-btn"
                    style={{
                      left: flowchartData.legendCard.x,
                      top: flowchartData.legendCard.y + flowchartData.legendCard.height + 8,
                      width: flowchartData.legendCard.width,
                    }}
                    onClick={onSwitchToLinear}
                  >
                    Visit Beginner Friendly Version
                  </button>
                )}
              </>
            )}

            {/* Top Right Curriculum Card */}
            {flowchartData.curriculumCard && (
              <div
                className="rm-curriculum-card"
                style={{
                  left: flowchartData.curriculumCard.x,
                  top: flowchartData.curriculumCard.y,
                  width: flowchartData.curriculumCard.width,
                }}
              >
                <p className="curriculum-desc">
                  {isMaster
                    ? "Explore all 12 disciplines, 168 topics, and 72 community implementation projects."
                    : "Find the detailed version of this roadmap along with other similar roadmaps across neurotechnology."}
                </p>
                {isMaster ? (
                  <button
                    type="button"
                    onClick={() => onSelectTab?.("projects")}
                    className="curriculum-btn cursor-pointer"
                  >
                    Browse 72 Projects →
                  </button>
                ) : (
                  <Link href="/roadmap" className="curriculum-btn">
                    openfulldive.org/roadmap →
                  </Link>
                )}
              </div>
            )}

            {/* Centered Track Title Node */}
            {flowchartData.trackTitleNode && (
              <div
                className="rm-track-title-badge"
                style={{
                  left: flowchartData.trackTitleNode.x,
                  top: flowchartData.trackTitleNode.y,
                  width: flowchartData.trackTitleNode.width,
                  height: flowchartData.trackTitleNode.height,
                }}
              >
                {flowchartData.trackTitleNode.label}
              </div>
            )}

            {/* Section Bounding Box Title Labels */}
            {flowchartData.sectionBoxes.map((sb) => (
              <div
                key={`title-${sb.id}`}
                className="rm-group-title"
                style={{ left: sb.labelX, top: sb.labelY }}
              >
                {sb.title}
              </div>
            ))}

            {/* Interactive Flow Nodes */}
            {flowchartData.nodes.map((node) => (
              <FlowNode
                key={node.id}
                node={node}
                targetField={targetField}
                isMatch={isMatched(node.label)}
                isMaster={isMaster}
                statuses={statuses}
                onOpenTopic={onOpenTopic}
                onSetStatus={onSetStatus}
                onSelectProjectLevel={onSelectProjectLevel}
                openTooltip={openTooltip}
                closeTooltip={closeTooltip}
                nodeTooltip={nodeTooltip}
                nodeAriaLabel={nodeAriaLabel}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlowchartCanvas;
