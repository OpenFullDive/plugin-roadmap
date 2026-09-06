import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { TopicDrawer, DRAWER_TABS } from "./TopicDrawer";
import { DrawerKnowledgeTab } from "./DrawerKnowledgeTab";
import { DrawerResourcesTab } from "./DrawerResourcesTab";
import { DrawerCommunityTab } from "./DrawerCommunityTab";
import { roadmapFieldById } from "../../content/roadmap";
import { getTopicDetails } from "../../content/topic-details";
import { topicKey } from "../utils/storage";
import type { SelectedTopic } from "../types";

describe("Milestone 5: Topic Detail Drawer Module", () => {
  const bciField = roadmapFieldById("bci")!;
  const firstSection = bciField.sections[0]!;
  const sampleTopic: SelectedTopic = {
    field: bciField,
    section: firstSection,
    topic: firstSection.topics[0] ?? "Signal Acquisition",
  };
  const sampleDetails = getTopicDetails(sampleTopic.field.id, sampleTopic.topic);

  describe("DrawerKnowledgeTab Component", () => {
    it("renders scientific mechanism, subtopic concepts, and checklist items", () => {
      const html = renderToString(
        createElement(DrawerKnowledgeTab, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          checkedChecklist: {},
        }),
      );

      expect(html).toContain("Scientific Mechanism");
      expect(html).toContain(sampleDetails.overview);
      expect(html).toContain("Subtopic Concepts");
      expect(html).toContain("Verification Competencies");
      expect(html).toContain('role="checkbox"');
      expect(html).toContain('aria-checked="false"');
    });

    it("displays active subtopic focus highlighting when specified", () => {
      const focusedTopic: SelectedTopic = {
        ...sampleTopic,
        subtopicFocus: sampleDetails.subtopics[0],
      };

      const html = renderToString(
        createElement(DrawerKnowledgeTab, {
          selected: focusedTopic,
          topicDetail: sampleDetails,
        }),
      );

      expect(html).toContain("Selected");
    });

    it("reflects checked state for completed competencies", () => {
      const checkKey = `${sampleTopic.field.id}:${sampleTopic.topic}:chk:0`;
      const html = renderToString(
        createElement(DrawerKnowledgeTab, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          checkedChecklist: { [checkKey]: true },
        }),
      );

      expect(html).toContain('aria-checked="true"');
    });
  });

  describe("DrawerResourcesTab Component", () => {
    it("renders curated literature and papers with external link icons", () => {
      const html = renderToString(
        createElement(DrawerResourcesTab, {
          topicDetail: sampleDetails,
        }),
      );

      expect(html).toContain("Curated Scientific &amp; Technical Literature");
      for (const res of sampleDetails.resources) {
        expect(html).toContain(res.title);
      }
    });
  });

  describe("DrawerCommunityTab Component", () => {
    it("renders milestone project deliverable and commons discussion links", () => {
      const html = renderToString(
        createElement(DrawerCommunityTab, {
          selected: sampleTopic,
        }),
      );

      expect(html).toContain("Suggested Milestone Deliverable");
      expect(html).toContain(sampleTopic.section.project);
      expect(html).toContain("Technology Commons Feed");
      expect(html).toContain("/contribute");
      expect(html).toContain("/commons/technology");
    });
  });

  describe("TopicDrawer Shell Component", () => {
    it("returns null when selected or topicDetail is missing", () => {
      const htmlNullSelected = renderToString(
        createElement(TopicDrawer, {
          selected: null,
          topicDetail: sampleDetails,
          drawerTab: "knowledge",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: {},
          onSetStatus: vi.fn(),
        }),
      );
      expect(htmlNullSelected).toBe("");

      const htmlNullDetail = renderToString(
        createElement(TopicDrawer, {
          selected: sampleTopic,
          topicDetail: null,
          drawerTab: "knowledge",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: {},
          onSetStatus: vi.fn(),
        }),
      );
      expect(htmlNullDetail).toBe("");
    });

    it("renders accessible modal dialog with backdrop and header", () => {
      const html = renderToString(
        createElement(TopicDrawer, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          drawerTab: "knowledge",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: {},
          onSetStatus: vi.fn(),
          drawerTitleId: "test-title-id",
        }),
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="test-title-id"');
      expect(html).toContain("roadmap-inspector-backdrop");
      expect(html).toContain("roadmap-resource-drawer");
      expect(html).toContain(sampleTopic.topic);
      expect(html).toContain(sampleTopic.field.shortTitle);
      expect(html).toContain('aria-label="Close topic details"');
    });

    it("renders learning status radio group with Todo, Learning, Done, Skip", () => {
      const currentTopicKey = topicKey(sampleTopic.field, sampleTopic.topic);
      const html = renderToString(
        createElement(TopicDrawer, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          drawerTab: "knowledge",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: { [currentTopicKey]: "learning" },
          onSetStatus: vi.fn(),
          drawerTitleId: "test-title-id",
        }),
      );

      expect(html).toContain('role="radiogroup"');
      expect(html).toContain("Your Learning Status");
      expect(html).toContain("Todo");
      expect(html).toContain("Learning");
      expect(html).toContain("Done");
      expect(html).toContain("Skip");
      expect(html).toContain('status-learning is-active');
    });

    it("renders sub-tabs with tablist semantics and roving tabindex", () => {
      const html = renderToString(
        createElement(TopicDrawer, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          drawerTab: "resources",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: {},
          onSetStatus: vi.fn(),
          drawerTitleId: "test-title-id",
        }),
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-label="Topic detail sections"');
      expect(html).toContain("Technical Brief");
      expect(html).toContain("Resources");
      expect(html).toContain("Build &amp; Discuss");
      // active tab (resources) has aria-selected="true" and tabIndex="0"
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('tabindex="0"');
    });

    it("renders footer with next and previous topic navigation", () => {
      const prevTopic: SelectedTopic = {
        field: bciField,
        section: firstSection,
        topic: "Prior Topic",
      };
      const nextTopic: SelectedTopic = {
        field: bciField,
        section: firstSection,
        topic: "Next Frontier",
      };

      const html = renderToString(
        createElement(TopicDrawer, {
          selected: sampleTopic,
          topicDetail: sampleDetails,
          drawerTab: "knowledge",
          setDrawerTab: vi.fn(),
          onClose: vi.fn(),
          statuses: {},
          onSetStatus: vi.fn(),
          prevTopic,
          nextTopic,
        }),
      );

      expect(html).toContain("Previous");
      expect(html).toContain("Next: Next Frontier");
    });
  });
});
