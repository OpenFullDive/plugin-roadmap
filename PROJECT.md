# Project: @openfulldive/plugin-roadmap Monolith Refactoring

## Architecture
Decomposition of the 4,196-line monolithic `src/ui/RoadmapExplorer.tsx` into cohesive, modular architectural units following `AGENTS.md` §6 presentation boundaries:
- `src/ui/types/`: Strict TypeScript interfaces (props, navigation, flowchart, projects, tooltip, state).
- `src/ui/utils/`: Pure utility functions (storage helpers, share actions, platform/denoising helpers, field icons).
- `src/ui/hooks/`: Reusable custom React hooks (storage bridge sync, progress calculation, topic drawer, search shortcuts, canvas viewport, cluster tooltips).
- `src/ui/canvas/`: Flowchart diagram rendering, canvas toolbar, flow nodes, bezier math, and layout coordinate generators (`canvas/layout/`).
- `src/ui/header/`: Header container, hero section, accessible discipline picker listbox, pill search bar, and progress indicator.
- `src/ui/drawer/`: Slide-out topic detail drawer with modal focus trap, scroll lock, knowledge tab, scientific specs/formulas, checklist progress, and resource links.
- `src/ui/views/`: Alternative view tabs: linear guide curriculum, projects catalog, contribution panel.
- `src/ui/floating/`: Social quick rail and node tooltip overlay.
- `src/ui/RoadmapExplorer.tsx`: Root UI orchestrator (<300 LOC) preserving public exports and backwards compatibility.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Public Export Compatibility | Preserve `import RoadmapExplorer from "@openfulldive/plugin-roadmap/ui"` and `RoadmapExplorerProps` | M6 | ORIGINAL_REQUEST §R2 |
| 2 | Storage Bridge Protocol | Host async storage bridge (`getState`, `setState`), fallback `localStorage`, cancellation guards, migration | M2 | ORIGINAL_REQUEST §R2 |
| 3 | Types & Interfaces | Unified type definitions for props, nodes, edges, sections, topics, tabs, and export format | M1 | ORIGINAL_REQUEST §R4 |
| 4 | Pure Utilities & Helpers | LocalStorage read/write, share URL generation, platform/denoising methods, field icons | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Progress Tracking Hook | Topic and checklist completion calculation, discipline percent, sequential navigation, JSON progress export | M2 | ORIGINAL_REQUEST §R1 |
| 6 | Topic Drawer State Hook | Modal accessibility, focus trapping, body scroll locking with gutter padding, focus restoration | M2 | ORIGINAL_REQUEST §R1 |
| 7 | Search & Keyboard Hook | Search query filtering, keyboard shortcut `/` to focus, `Escape` to blur/clear, node matching predicates | M2 | ORIGINAL_REQUEST §R1 |
| 8 | Canvas Viewport Hook | Container ResizeObserver, content-box measurement, responsive fitScale, pan state, arrow key navigation | M2 | ORIGINAL_REQUEST §R1 |
| 9 | Canvas Tooltip & Cluster Hook | Delayed tooltip timers (380ms warm / 500ms exit), cluster lighting `linkedGroup`, node ARIA labels | M2 | ORIGINAL_REQUEST §R1 |
| 10 | Bezier Path Engine | SVG cubic bezier connection math, connector endpoints, milestone track lines | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Topology Layout Engine | Master curriculum and single discipline coordinate generators, section boxes, 2-column platform grids | M3 | ORIGINAL_REQUEST §R1 |
| 12 | Flowchart Canvas & Toolbar | Canvas frame, pan hint indicator, fit/100% zoom toggle, interactive SVG overlay, node positioning | M3 | ORIGINAL_REQUEST §R1 |
| 13 | Interactive Flow Nodes | Flowchart topic cards, milestone titles, status badges, favorite stars, click/hover handlers | M3 | ORIGINAL_REQUEST §R1 |
| 14 | Header & Navigation Bar | Hero section, discipline selector, view mode tabs (flowchart, guide, projects, contribute) | M4 | ORIGINAL_REQUEST §R1 |
| 15 | Accessible Discipline Picker | Combobox/listbox with keyboard navigation (arrows, home/end, typeahead), click-outside dismiss | M4 | ORIGINAL_REQUEST §R1 |
| 16 | Pill Search Bar | Search input with shortcut badge `/`, clear button, live match highlighting | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Progress Summary Bar | Overall progress bar, percent indicator, completed topic count, learning status count | M4 | ORIGINAL_REQUEST §R1 |
| 18 | Floating Social Rail | Share button, copy link, native share sheet, Twitter/X intent, GitHub repository link | M4 | ORIGINAL_REQUEST §R1 |
| 19 | Topic Detail Drawer Container | Slide-out drawer modal, backdrop overlay, escape/click-outside close, prev/next topic buttons | M5 | ORIGINAL_REQUEST §R1 |
| 20 | Drawer Knowledge Tab | Core concepts, theoretical foundations, key milestones, prerequisites overview | M5 | ORIGINAL_REQUEST §R1 |
| 21 | Drawer Specs & Formulas Tab | Scientific specifications, mathematical formulas, physical parameters, LaTeX/math notation | M5 | ORIGINAL_REQUEST §R1 |
| 22 | Drawer Checklist Tab | Interactive checklist items, progress calculation, toggle completed status | M5 | ORIGINAL_REQUEST §R1 |
| 23 | Drawer Resources Tab | Recommended papers, books, tools, GitHub repositories, and related topic links | M5 | ORIGINAL_REQUEST §R1 |
| 24 | Linear Guide View | Sequential curriculum view grouped by phase, prerequisites, connecting disciplines | M6 | ORIGINAL_REQUEST §R1 |
| 25 | Projects Catalog View | Recommended hands-on projects with difficulty badges (Beginner, Intermediate, Advanced, Expert) | M6 | ORIGINAL_REQUEST §R1 |
| 26 | Contribution View | Contribution guidelines, issue reporting, topic proposal instructions | M6 | ORIGINAL_REQUEST §R1 |
| 27 | Top-Level Orchestrator Assembly | Reassemble `RoadmapExplorer.tsx` (<300 LOC) connecting hooks to components with zero regressions | M6 | ORIGINAL_REQUEST §R1 |
| 28 | Comprehensive Verification | 100% E2E tests, vitest suites, typecheck 0 errors, visual parity verification, boundary compliance | M7 | ORIGINAL_REQUEST §R3, R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Types & Core Utilities | `src/ui/types/`, `src/ui/utils/` | none | DONE |
| M2 | State Management & Custom Hooks | `src/ui/hooks/` (7 custom hooks) | M1 | DONE |
| M3 | Canvas & Topology Layout Engine | `src/ui/canvas/` (layout generators, canvas frame, toolbar, nodes) | M1, M2 | DONE |
| M4 | Header, Navigation & Floating Controls | `src/ui/header/`, `src/ui/floating/` (header, picker, search, progress, rail) | M1, M2 | DONE |
| M5 | Topic Detail Drawer Module | `src/ui/drawer/` (drawer modal + knowledge, resources, community tabs) | M1, M2 | DONE |
| M6 | Views & Orchestrator Assembly | `src/ui/views/`, `src/ui/RoadmapExplorer.tsx` (<300 LOC) | M1, M2, M3, M4, M5 | DONE |
| M7 | Full Verification & Coverage Hardening | Run all tests, typecheck, vitest suites, demo verification, adversarial audit | M6 | DONE |

## Interface Contracts
### Public Contract: `@openfulldive/plugin-roadmap/ui`
```typescript
export type RoadmapStorage = {
  getState: () => Promise<Record<string, unknown> | null>;
  setState: (key: string, value: unknown) => Promise<{ ok: boolean; error?: string }>;
};

export type RoadmapExplorerProps = {
  slug: string;
  isSignedIn?: boolean;
  storage?: RoadmapStorage;
};

export default function RoadmapExplorer(props: RoadmapExplorerProps): JSX.Element;
```

### Hooks Contract: `src/ui/hooks/`
- `useRoadmapStorage(storage, isSignedIn)` -> `{ statuses, favorites, checkedChecklist, setStatus, toggleFavorite, toggleChecklist, persist }`
- `useRoadmapProgress(fields, currentField, statuses, checkedChecklist)` -> `{ doneCount, learningCount, progressPercent, flatTopics, allTopicKeys, currentTopicIndex, exportProgress }`
- `useTopicDrawer(allTopicKeys, flatTopics)` -> `{ selected, drawerTab, setDrawerTab, activeTopicDetail, openTopic, closeDrawer, nextTopic, prevTopic, lastTriggerRef, drawerRef, drawerTitleId }`
- `useRoadmapSearch()` -> `{ searchQuery, setSearchQuery, searchInputRef, isNodeMatched, clearSearch }`
- `useCanvasViewport()` -> `{ flowRef, containerWidth, zoom, setZoom, pan, setPan, syncPan, fitScale, onCanvasKeyDown }`
- `useCanvasTooltip()` -> `{ tooltip, linkedGroup, openTooltip, closeTooltip, nodeTooltip, nodeAriaLabel }`
- `useShareActions(slug, isMaster, title)` -> `{ shareLink, copyLink, copied, openShareIntent }`

### Topology Layout Contract: `src/ui/canvas/layout/`
- `generateMasterTopology(fields, statuses)` -> `FlowchartData`
- `generateDisciplineTopology(field, statuses)` -> `FlowchartData`
- `FlowchartData = { canvasWidth, canvasHeight, nodes, edges, sectionBoxes, legendCard?, curriculumCard?, trackTitleNode? }`

## Code Layout
```
src/ui/
├── RoadmapExplorer.tsx              # Top-level orchestrator (<300 LOC)
├── flowchart.css                    # Preserved verbatim (2,626 lines)
├── types/
│   ├── props.ts                     # Public props & storage contract
│   ├── navigation.ts                # Tabs, view modes, difficulty, drawer tabs
│   ├── flowchart.ts                 # Flowchart nodes, edges, section boxes, topology data
│   ├── project.ts                   # Projects catalog item types
│   ├── tooltip.ts                   # Tooltip state & payload types
│   ├── state.ts                     # Selected topic, pan, zoom, progress summary
│   └── index.ts                     # Unified types re-export
├── utils/
│   ├── storage.ts                   # Storage keys, readLocal, writeLocal, topicKey
│   ├── share.ts                     # Share URL building, clipboard copy, share intents
│   ├── platform-helpers.ts          # Platform & denoising methods lookups
│   └── field-icons.tsx              # SVG field icons switch
├── hooks/
│   ├── useRoadmapStorage.ts         # Storage bridge sync & persistence
│   ├── useRoadmapProgress.ts        # Progress counts, percentages, export
│   ├── useTopicDrawer.ts            # Drawer state, focus trap, body scroll lock
│   ├── useRoadmapSearch.ts          # Search state & keyboard shortcuts
│   ├── useCanvasViewport.ts         # Viewport measurement, zoom, pan, key nav
│   ├── useCanvasTooltip.ts          # Node hover tooltips & cluster highlights
│   └── useShareActions.ts           # Sharing links, clipboard, social intents
├── canvas/
│   ├── layout/
│   │   ├── bezier.ts                # SVG cubic bezier connection math
│   │   ├── master-flowchart.ts      # Master curriculum topology generator
│   │   └── discipline-flowchart.ts  # Single discipline topology generator
│   ├── FlowchartCanvas.tsx          # Main canvas viewport scroller & SVG frame
│   ├── CanvasToolbar.tsx            # Pan hint & zoom fit/100% controls
│   ├── FlowNode.tsx                 # Individual interactive flowchart topic node
│   └── NodeTooltipOverlay.tsx       # Floating delayed node tooltip
├── header/
│   ├── RoadmapHeader.tsx            # Header container & layout
│   ├── DisciplinePicker.tsx         # Accessible combobox/listbox track selector
│   ├── SearchBar.tsx                # Pill search bar with '/' shortcut
│   ├── ProgressSummaryBar.tsx       # Progress bar & metrics indicator
│   └── SocialRail.tsx               # Floating quick social rail
├── drawer/
│   ├── TopicDrawer.tsx              # Modal drawer dialog & backdrop
│   ├── DrawerKnowledgeTab.tsx       # Core concepts & theoretical knowledge
│   ├── DrawerSpecsTab.tsx           # Scientific formulas & technical specs
│   ├── DrawerChecklistTab.tsx       # Actionable interactive checklist
│   └── DrawerResourcesTab.tsx       # Papers, books, tools & related topics
└── views/
    ├── CurriculumView.tsx           # Linear guide curriculum view
    ├── ProjectsView.tsx             # Hands-on projects catalog view
    └── ContributionView.tsx         # Contribution guidelines & feedback panel
```
