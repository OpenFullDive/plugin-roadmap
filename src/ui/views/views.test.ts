import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ContributionView } from "./ContributionView";
import { ProjectsCatalogView, PROJECT_KIND_BLURB } from "./ProjectsCatalogView";
import { LinearGuideView, MASTER_ENGINEERING_PHASES } from "./LinearGuideView";
import { roadmapFieldById, masterRoadmap } from "../../content/roadmap";
import type { ProjectItem, SelectedTopic } from "../types";

describe("Milestone 6: Views Module", () => {
  const bciField = roadmapFieldById("bci")!;

  describe("ContributionView Component", () => {
    it("renders 5 ordered contribution pipeline steps", () => {
      const html = renderToString(
        createElement(ContributionView, {
          fieldName: "Brain–Computer Interfaces",
        }),
      );

      expect(html).toContain("Contribute to Brain–Computer Interfaces");
      expect(html).toContain("Choose one bounded problem");
      expect(html).toContain("Declare scope and safety bounds");
      expect(html).toContain("Build and test in public");
      expect(html).toContain("Solicit peer challenge");
      expect(html).toContain("Submit to the evidence ledger");
      expect(html).toContain("rm-steps");
      expect(html).toContain("rm-step-marker");
      expect(html).toContain("/commons/technology");
      expect(html).toContain("/contribute");
    });
  });

  describe("ProjectsCatalogView Component", () => {
    const mockProjects: ProjectItem[] = [
      {
        id: "bci-p1",
        difficulty: "Beginner",
        field: bciField,
        section: "Signal Acquisition",
        kind: "explainer",
        title: "EEG Montage Comparison",
        description: "Compare dry vs wet electrodes",
      },
      {
        id: "bci-p2",
        difficulty: "Intermediate",
        field: bciField,
        section: "Signal Processing",
        kind: "reproduction",
        title: "Motor Imagery Decoder",
        description: "Reproduce CSP baseline",
      },
    ];

    it("renders difficulty filter pills and blurb for active difficulty", () => {
      const html = renderToString(
        createElement(ProjectsCatalogView, {
          isMaster: false,
          field: bciField,
          difficulty: "Beginner",
          onDifficultyChange: vi.fn(),
          projects: mockProjects,
        }),
      );

      expect(html).toContain("BCI Projects");
      expect(html).toContain("Beginner");
      expect(html).toContain("Intermediate");
      expect(html).toContain("Advanced");
      expect(html).toContain(PROJECT_KIND_BLURB.Beginner);
      expect(html).toContain("EEG Montage Comparison");
      expect(html).not.toContain("Motor Imagery Decoder");
    });

    it("renders intermediate projects when intermediate difficulty selected", () => {
      const html = renderToString(
        createElement(ProjectsCatalogView, {
          isMaster: false,
          field: bciField,
          difficulty: "Intermediate",
          onDifficultyChange: vi.fn(),
          projects: mockProjects,
        }),
      );

      expect(html).toContain(PROJECT_KIND_BLURB.Intermediate);
      expect(html).toContain("Motor Imagery Decoder");
      expect(html).not.toContain("EEG Montage Comparison");
    });
  });

  describe("LinearGuideView Component", () => {
    it("renders 4 master engineering phases with gates when isMaster is true", () => {
      const html = renderToString(
        createElement(LinearGuideView, {
          isMaster: true,
          field: null,
          statuses: {},
          onSelectTopic: vi.fn(),
        }),
      );

      for (const phase of MASTER_ENGINEERING_PHASES) {
        expect(html).toContain(phase.title.replace(/&/g, "&amp;"));
        expect(html).toContain(phase.gateTitle.replace(/&/g, "&amp;"));
      }
      expect(html).toContain("Phase Verification Gate");
    });

    it("renders single discipline phases and section rows when isMaster is false", () => {
      const onSelect = vi.fn();
      const html = renderToString(
        createElement(LinearGuideView, {
          isMaster: false,
          field: bciField,
          statuses: {},
          onSelectTopic: onSelect,
        }),
      );

      expect(html).toContain("Signal Acquisition");
      expect(html).toContain("Signal Processing");
      expect(html).toContain("rm-linear-row");
      expect(html).toContain("Prerequisites &amp; Preparation");
      expect(html).toContain("Connecting Disciplines");
    });

    it("filters topic rows when searchQuery is provided", () => {
      const html = renderToString(
        createElement(LinearGuideView, {
          isMaster: false,
          field: bciField,
          searchQuery: "invasive",
          statuses: {},
          onSelectTopic: vi.fn(),
        }),
      );

      expect(html).toContain("Invasive electrode arrays");
    });
  });
});
