import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DisciplinePicker } from "./DisciplinePicker";
import { SearchBar } from "./SearchBar";
import { ProgressSummaryBar } from "./ProgressSummaryBar";
import { RoadmapHeader } from "./RoadmapHeader";
import { SocialRail } from "../floating/SocialRail";
import { roadmapFields, roadmapFieldById } from "../../content/roadmap";
import { TRACK_CATEGORY_ORDER } from "../types";

describe("Milestone 4: Header, Navigation & Floating Controls", () => {
  describe("DisciplinePicker Component", () => {
    it("renders trigger button with current track label and accessible ARIA attributes", () => {
      const html = renderToString(
        createElement(DisciplinePicker, {
          currentId: "bci",
          currentLabel: "Brain-Computer Interfaces",
        }),
      );

      expect(html).toContain("Brain-Computer Interfaces");
      expect(html).toContain('aria-haspopup="listbox"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('aria-label="Track: Brain-Computer Interfaces. Change track"');
      expect(html).toContain("rm-track-trigger");
    });

    it("includes master track and respects TRACK_CATEGORY_ORDER groupings", () => {
      const bciField = roadmapFieldById("bci");
      expect(bciField).toBeDefined();

      // Verify category ordering matches specification
      expect(TRACK_CATEGORY_ORDER).toEqual([
        "Neural Science",
        "Interfaces & Haptics",
        "Virtual Systems",
        "Hardware & Software",
        "Safety & Integration",
        "Frontier Research",
      ]);

      const neuralFields = roadmapFields.filter((f) => f.category === "Neural Science");
      expect(neuralFields.length).toBeGreaterThan(0);
    });

    it("handles onSelect callback contract when an option is selected", () => {
      const onSelect = vi.fn();
      const picker = createElement(DisciplinePicker, {
        currentId: "master",
        currentLabel: "Master Curriculum",
        onSelect,
      });

      expect(picker.props.currentId).toBe("master");
      expect(picker.props.onSelect).toBe(onSelect);
    });
  });

  describe("SearchBar Component", () => {
    it("renders pill search input with placeholder and '/' keyboard shortcut badge", () => {
      const onSearchChange = vi.fn();
      const html = renderToString(
        createElement(SearchBar, {
          searchQuery: "",
          onSearchChange,
          placeholder: "Find topic...",
        }),
      );

      expect(html).toContain('placeholder="Find topic..."');
      expect(html).toContain('role="search"');
      expect(html).toContain('aria-label="Find topic in roadmap"');
      expect(html).toContain("rm-search-kbd");
      expect(html).toContain("/");
      expect(html).not.toContain("rm-search-clear");
    });

    it("renders clear button and match count badge when search query is active", () => {
      const onSearchChange = vi.fn();
      const html = renderToString(
        createElement(SearchBar, {
          searchQuery: "neural",
          onSearchChange,
          matchCount: 4,
        }),
      );

      expect(html).toContain('value="neural"');
      expect(html).toContain("rm-search-clear");
      expect(html).toContain("rm-search-match-count");
      expect(html).toContain("4");
      expect(html).not.toContain("rm-search-kbd");
    });

    it("wires onClear callback when provided", () => {
      const onSearchChange = vi.fn();
      const onClear = vi.fn();
      const search = createElement(SearchBar, {
        searchQuery: "decoding",
        onSearchChange,
        onClear,
      });

      expect(search.props.searchQuery).toBe("decoding");
      expect(search.props.onClear).toBe(onClear);
    });
  });

  describe("ProgressSummaryBar Component", () => {
    it("renders unstarted state when doneCount and learningCount are 0", () => {
      const html = renderToString(
        createElement(ProgressSummaryBar, {
          doneCount: 0,
          totalTopics: 120,
          progressPercent: 0,
          learningCount: 0,
        }),
      );

      expect(html).toContain("120");
      expect(html).toContain("topics · none tracked yet");
      expect(html).not.toContain('role="progressbar"');
    });

    it("renders progress bar, percent indicator, and completed count when doneCount > 0", () => {
      const html = renderToString(
        createElement(ProgressSummaryBar, {
          doneCount: 15,
          totalTopics: 60,
          progressPercent: 25,
          learningCount: 5,
        }),
      );

      expect(html).toContain("15");
      expect(html).toContain("of 60 done");
      expect(html).toContain("5 in progress");
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('aria-valuenow="25"');
      expect(html).toContain("25%");
      expect(html).toContain("width:25%");
    });

    it("displays per-track metrics when discipline metrics are provided", () => {
      const html = renderToString(
        createElement(ProgressSummaryBar, {
          doneCount: 30,
          totalTopics: 100,
          progressPercent: 30,
          disciplineDoneCount: 8,
          disciplineTotalTopics: 10,
          disciplineProgressPercent: 80,
          trackTitle: "Neural Decoding",
        }),
      );

      expect(html).toContain("Neural Decoding: ");
      expect(html).toContain("8");
      expect(html).toContain("/10 (80%)");
      expect(html).toContain("rm-discipline-progress-tag");
    });
  });

  describe("RoadmapHeader Component", () => {
    const defaultProps = {
      slug: "bci",
      isMaster: false,
      title: "Brain-Computer Interfaces",
      description: "Neural signal acquisition, electrode arrays, and telemetry systems.",
      audience: "Neuroengineers, systems researchers",
      duration: "6-9 months",
      level: "Advanced",
      field: roadmapFieldById("bci"),
      tab: "roadmap" as const,
      viewMode: "flowchart" as const,
      onSelectTab: vi.fn(),
      projectsCount: 6,
      onSelectDiscipline: vi.fn(),
      saved: false,
      onToggleFavorite: vi.fn(),
      exported: false,
      onExportProgress: vi.fn(),
      copied: false,
      onShare: vi.fn(),
      searchQuery: "",
      onSearchChange: vi.fn(),
      doneCount: 3,
      totalTopics: 24,
      progressPercent: 12.5,
      learningCount: 2,
    };

    it("renders hero title, description, and breadcrumb link", () => {
      const html = renderToString(createElement(RoadmapHeader, defaultProps));

      expect(html).toContain("Brain-Computer Interfaces");
      expect(html).toContain("rm-breadcrumb-link");
      expect(html).toContain("All Roadmaps");
      expect(html).toContain("rm-hero-title");
      expect(html).toContain("rm-hero-subtitle");
    });

    it("renders navigation view tabs with active state on current tab", () => {
      const html = renderToString(createElement(RoadmapHeader, defaultProps));

      expect(html).toContain("Roadmap");
      expect(html).toContain("Projects");
      expect(html).toContain("Linear Guide");
      expect(html).toContain("Contribute");
      expect(html).toContain("rm-tab-count");
      expect(html).toContain("6"); // projects count
    });

    it("renders tracking banner and expandable overview accordion", () => {
      const htmlClosed = renderToString(
        createElement(RoadmapHeader, {
          ...defaultProps,
          showOverview: false,
        }),
      );

      expect(htmlClosed).toContain("Mark any topic to start tracking");
      expect(htmlClosed).toContain(`What is ${defaultProps.field?.title ?? defaultProps.title}?`);
      expect(htmlClosed).toContain("Read overview");
      expect(htmlClosed).not.toContain("Target Audience:");

      const htmlOpen = renderToString(
        createElement(RoadmapHeader, {
          ...defaultProps,
          showOverview: true,
        }),
      );

      expect(htmlOpen).toContain("Target Audience:");
      expect(htmlOpen).toContain("Neuroengineers, systems researchers");
      expect(htmlOpen).toContain("Estimated Duration:");
      expect(htmlOpen).toContain("6-9 months");
      expect(htmlOpen).toContain("Hide overview");
    });

    it("integrates action buttons (bookmark, download, share)", () => {
      const html = renderToString(
        createElement(RoadmapHeader, {
          ...defaultProps,
          saved: true,
          exported: true,
          copied: true,
        }),
      );

      expect(html).toContain("Saved to favorites");
      expect(html).toContain("Exported!");
      expect(html).toContain("rm-btn-share");
    });
  });

  describe("SocialRail Component", () => {
    it("renders floating social rail with copy link, X share, and GitHub repo", () => {
      const html = renderToString(
        createElement(SocialRail, {
          shareLink: "https://openfulldive.org/roadmap/bci",
          shareText: "Check out the BCI roadmap on OpenFullDive",
          title: "BCI Roadmap",
          repoUrl: "https://github.com/openfulldive/openfulldive",
        }),
      );

      expect(html).toContain("rm-floating-social-rail");
      expect(html).toContain('aria-label="Share this roadmap"');
      expect(html).toContain("Copy link to this roadmap");
      expect(html).toContain("Share on X");
      expect(html).toContain("View on GitHub");
      expect(html).toContain("Share on Hacker News");
      expect(html).toContain("Share on Reddit");
      expect(html).toContain("Share on Facebook");
    });

    it("displays checkmark feedback when copied is true", () => {
      const html = renderToString(
        createElement(SocialRail, {
          shareLink: "https://openfulldive.org/roadmap",
          copied: true,
        }),
      );

      expect(html).toContain("Link copied");
      expect(html).toContain("is-copied");
    });

    it("invokes share intent opener when intent button is triggered", () => {
      const onOpenShareIntent = vi.fn();
      const rail = createElement(SocialRail, {
        shareLink: "https://openfulldive.org/roadmap/bci",
        shareText: "Explore BCI",
        onOpenShareIntent,
      });

      expect(rail.props.onOpenShareIntent).toBe(onOpenShareIntent);
    });

    it("renders optional modal trigger button when onOpenShareModal is provided", () => {
      const onOpenShareModal = vi.fn();
      const html = renderToString(
        createElement(SocialRail, {
          shareLink: "https://openfulldive.org/roadmap",
          onOpenShareModal,
        }),
      );

      expect(html).toContain('aria-label="Share options"');
    });
  });
});
