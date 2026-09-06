import { describe, expect, it } from "vitest";
import { roadmapFields, roadmapFieldById, type TopicStatus } from "../../content/roadmap";
import {
  computeCubicBezierPath,
  computeHorizontalBezierPath,
  computeOrthogonalPath,
  computeStraightSpinePath,
  computeVerticalBezierPath,
  getEdgeMarkerId,
  FLOWCHART_SVG_MARKERS,
} from "./layout/bezier";
import { generateMasterTopology } from "./layout/master-flowchart";
import { generateDisciplineTopology } from "./layout/discipline-flowchart";
import { FlowNode, BADGE_ICON } from "./FlowNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { NodeTooltipOverlay } from "./NodeTooltipOverlay";
import { FlowchartCanvas } from "./FlowchartCanvas";
import type { EdgeItem } from "../types";

describe("Canvas Bezier Math & Layout Engine", () => {
  describe("bezier.ts", () => {
    it("computes horizontal S-curve bezier paths with control offsets", () => {
      const pathRight = computeHorizontalBezierPath(100, 200, 300, 400, 35);
      expect(pathRight).toBe("M 100 200 C 135 200, 265 400, 300 400");

      const pathLeft = computeHorizontalBezierPath(400, 200, 100, 300, 35);
      expect(pathLeft).toBe("M 400 200 C 365 200, 135 300, 100 300");
    });

    it("computes vertical S-curve bezier paths", () => {
      const path = computeVerticalBezierPath(500, 100, 600, 300, 25, 25);
      expect(path).toBe("M 500 100 C 500 125, 600 275, 600 300");
    });

    it("computes straight spine and orthogonal connectors", () => {
      const spine = computeStraightSpinePath(500, 20, 160);
      expect(spine).toBe("M 500 20 V 160");

      const ortho = computeOrthogonalPath(380, 267, 310, 200, 275);
      expect(ortho).toBe("M 380 267 H 310 V 200 H 275");

      const custom = computeCubicBezierPath(0, 0, 10, 20, 30, 40, 50, 60);
      expect(custom).toBe("M 0 0 C 10 20, 30 40, 50 60");
    });

    it("returns correct edge marker URLs based on edge type and status", () => {
      const nonSpine: EdgeItem = { id: "e1", type: "branch", path: "M 0 0 V 10" };
      expect(getEdgeMarkerId(nonSpine)).toBeUndefined();

      const spineDefault: EdgeItem = { id: "e2", type: "spine", path: "M 0 0 V 10" };
      expect(getEdgeMarkerId(spineDefault)).toBe("url(#rm-arrow)");

      const spineDone: EdgeItem = { id: "e3", type: "spine", path: "M 0 0 V 10", status: "done" };
      expect(getEdgeMarkerId(spineDone)).toBe("url(#rm-arrow-done)");

      const spineLearning: EdgeItem = { id: "e4", type: "spine", path: "M 0 0 V 10", status: "learning" };
      expect(getEdgeMarkerId(spineLearning)).toBe("url(#rm-arrow-learning)");

      expect(FLOWCHART_SVG_MARKERS.length).toBe(3);
    });
  });

  describe("master-flowchart.ts", () => {
    it("generates complete master topology with 4 phases, gates, and capstone", () => {
      const master = generateMasterTopology(roadmapFields, {});
      expect(master.canvasWidth).toBe(1000);
      expect(master.canvasHeight).toBe(1920);
      expect(master.legendCard).toBeDefined();
      expect(master.curriculumCard).toBeDefined();
      expect(master.trackTitleNode?.label).toContain("START: FULL-DIVE VR CURRICULUM");

      expect(master.sectionBoxes.map((s) => s.id)).toEqual([
        "sec-box-phase-1",
        "sec-box-phase-2",
        "sec-box-phase-3",
        "sec-box-phase-4",
      ]);

      const gateIds = master.nodes.filter((n) => n.type === "gate").map((n) => n.id);
      expect(gateIds).toEqual(["gate-01", "gate-02", "gate-03", "gate-04"]);

      const capstone = master.nodes.find((n) => n.type === "capstone");
      expect(capstone?.id).toBe("capstone-master");
      expect(capstone?.x).toBe(180);
      expect(capstone?.width).toBe(640);

      // Verify all nodes are positioned inside canvas bounds
      for (const node of master.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(master.canvasWidth);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y + node.height).toBeLessThanOrEqual(master.canvasHeight);
      }
    });

    it("propagates topic statuses onto master flowchart nodes", () => {
      const neuro = roadmapFieldById("neuroscience")!;
      const hw = roadmapFieldById("hardware-architecture")!;
      const statuses: Record<string, TopicStatus> = {
        [`${neuro.id}:sensory-perception-transduction`]: "done",
        [`${hw.id}:neuromorphic-processing-asics`]: "learning",
      };
      const master = generateMasterTopology(roadmapFields, statuses);
      const doneNode = master.nodes.find((n) => n.label === "Sensory Perception & Transduction");
      expect(doneNode?.status).toBe("done");

      const learningNode = master.nodes.find((n) => n.label === "Neuromorphic Processing ASICs");
      expect(learningNode?.status).toBe("learning");
    });
  });

  describe("discipline-flowchart.ts", () => {
    it("generates valid topology for each of the 12 roadmap fields", () => {
      for (const field of roadmapFields) {
        const topo = generateDisciplineTopology(field, {});
        expect(topo.canvasWidth).toBe(1000);
        expect(topo.canvasHeight).toBe(1350);
        expect(topo.legendCard).toBeDefined();
        expect(topo.curriculumCard).toBeDefined();
        expect(topo.trackTitleNode?.label).toBe(field.shortTitle);

        // Sections
        expect(topo.sectionBoxes.map((s) => s.id)).toEqual([
          "sec-box-features",
          "sec-box-decoders",
          "sec-box-safety",
        ]);

        // Main milestones
        const mainMilestones = topo.nodes.filter((n) => n.type === "milestone-main");
        expect(mainMilestones.length).toBeGreaterThanOrEqual(4);

        // Project callout cards
        const projectCards = topo.nodes.filter((n) => n.type === "project-card");
        expect(projectCards.length).toBe(3);
        const levels = projectCards.map((p) => p.projectLevel);
        expect(levels).toEqual(["Beginner", "Intermediate", "Advanced"]);

        // Capstone node
        const capstone = topo.nodes.find((n) => n.type === "capstone");
        expect(capstone?.id).toBe(`capstone-${field.id}`);
        expect(capstone?.y).toBe(1270);

        // Check bounding coordinates
        for (const node of topo.nodes) {
          expect(node.x).toBeGreaterThanOrEqual(0);
          expect(node.x + node.width).toBeLessThanOrEqual(topo.canvasWidth);
          expect(node.y).toBeGreaterThanOrEqual(0);
          expect(node.y + node.height).toBeLessThanOrEqual(topo.canvasHeight);
        }
      }
    });

    it("includes platforms, denoising, and streaming grids for BCI track", () => {
      const bci = roadmapFieldById("bci")!;
      const topo = generateDisciplineTopology(bci, {});

      // Platform pills (left branch M1)
      const platformPills = topo.nodes.filter((n) => n.group === "m1left" && n.type === "concept-pill");
      expect(platformPills.length).toBe(8);

      // Denoising pills (left branch M2)
      const denoisePills = topo.nodes.filter((n) => n.group === "m2left" && n.type === "concept-pill");
      expect(denoisePills.length).toBe(6);

      // Stream pills (left branch M3)
      const streamPills = topo.nodes.filter((n) => n.group === "m3left" && n.type === "concept-pill");
      expect(streamPills.length).toBe(4);
    });
  });

  describe("Canvas Components Exports", () => {
    it("exports all canvas components and badges", () => {
      expect(FlowNode).toBeDefined();
      expect(CanvasToolbar).toBeDefined();
      expect(NodeTooltipOverlay).toBeDefined();
      expect(FlowchartCanvas).toBeDefined();
      expect(BADGE_ICON.recommended).toBeDefined();
      expect(BADGE_ICON.alternative).toBeDefined();
      expect(BADGE_ICON.elective).toBeDefined();
    });
  });
});
