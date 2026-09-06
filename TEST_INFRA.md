# Dual-Track Test Infrastructure: @openfulldive/plugin-roadmap

## 1. Overview & Dual-Track Testing Principles

The `@openfulldive/plugin-roadmap` refactoring follows a strict **Dual-Track Testing Architecture** to guarantee zero visual regressions, 100% backwards compatibility, and architectural integrity as the 4,196-line monolithic `src/ui/RoadmapExplorer.tsx` is decomposed into modular subcomponents across Milestones M1–M7.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DUAL-TRACK TESTING ARCHITECTURE                         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│  TRACK 1: Structural & Architectural │  TRACK 2: Functional & Operational    │
│  Invariants (Static & Boundary)      │  Contracts (Dynamic & Behavioral)    │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  • Tier 4: Architectural Constraints │  • Tier 1: Public Interface & Bridge │
│    - <= 400 LOC per UI component     │    - Package export shapes           │
│    - Zero circular dependencies      │    - Storage bridge protocol (async) │
│    - No private host (@/) aliases    │    - LocalStorage fallback & sync    │
│    - No Node builtins in UI bundle   │  • Tier 2: Boundary Conditions       │
│    - No escape outside src root      │    - Empty/whitespace search query   │
│  • Tier 1: Package Export Contracts  │    - Special characters & regex safety│
│    - package.json exports mapping    │    - Extreme zoom (MIN_FIT_SCALE)    │
│    - Default export component shape  │    - Panning bounds & zero widths    │
│    - Props type contracts            │    - Missing/failing storage bridge  │
│                                      │  • Tier 3: Cross-Feature Integration │
│                                      │    - Progress math & status cycling  │
│                                      │    - Checklist toggle & metrics      │
│                                      │    - Synchronized persistence        │
│                                      │    - Sequential topic traversal      │
│                                      │    - Progress export JSON schema     │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Core Testing Pillars:
1. **Opaque-Box Verification**: Tests assert observable behavior, interface contracts, and mathematical properties rather than internal implementation details.
2. **Progressive Testability**: Tests are isolated, deterministic, and runnable at every milestone stage without requiring unbuilt future milestones.
3. **Strict Boundaries**: Enforces presentation boundaries (`AGENTS.md` §6), zero host coupling, and strict modularity.

---

## 2. Test Architecture & Runner Setup

- **Runner**: [Vitest](https://vitest.dev/) `^4.0.0` configured in `vitest.config.ts`.
- **Command**: `npm test` (`vitest run`).
- **Type Checking**: `npm run typecheck` (`tsc --noEmit`).
- **Test Discovery Pattern**: `src/**/*.test.ts`.

### Test Suite Manifest

| Test File | Track | Tier | Scope & Primary Assertions |
|---|---|---|---|
| `src/ui-structure.test.ts` | Track 1 | Tier 1, 4 | Package exports, default component export, prop contracts, <=400 LOC per UI file, zero circular dependencies, presentation boundary rules. |
| `src/ui-contracts.test.ts` | Track 2 | Tier 1, 2, 3 | Storage bridge protocol, migration, fallback, progress calculations, search filtering, zoom/pan bounds, cross-feature state persistence. |
| `src/no-private-deps.test.ts` | Track 1 | Tier 4 | No `@/` host aliases, no database/auth internals, no Node built-ins in UI, no escaping `src`. |
| `src/manifest.test.ts` | Track 1 | Tier 1 | Plugin manifest validation, permission grants, declared routes and storage keys. |
| `src/content/roadmap.test.ts` | Track 2 | Tier 1, 2 | Roadmap content integrity, category/level valid sets, stable topic slugs, legacy alias resolution. |
| `src/search.test.ts` | Track 2 | Tier 1, 2 | Server search category, ranking, query substring matching, pagination limits, URL paths. |

---

## 3. Tier 1–4 Test Plan

### Tier 1: Public Interface, Exports, Prop Shapes & Storage Bridge Contracts
- **Package Exports**:
  - `package.json` defines `"."` (`./src/index.ts`), `"./ui"` (`./src/ui/RoadmapExplorer.tsx`), and `"./server"` (`./src/search.ts`).
  - `RoadmapExplorer` is exported as default function component matching `RoadmapExplorerProps`.
- **Storage Bridge Protocol**:
  - `RoadmapStorage` interface: `getState: () => Promise<Record<string, unknown> | null>` and `setState: (key: string, value: unknown) => Promise<{ ok: boolean; error?: string }>`.
  - Keys contract:
    - Local keys: `STATUS_KEY = "ofd-roadmap-status-v1"`, `FAVORITES_KEY = "ofd-roadmap-favorites-v1"`, `CHECKLIST_KEY = "ofd-roadmap-checklist-v1"`.
    - Remote keys: `PROGRESS_STORAGE_KEY = "roadmap:progress"`, `FAVORITES_STORAGE_KEY = "roadmap:favorites"`, `CHECKLIST_STORAGE_KEY = "roadmap:checklist"`.
  - Deterministic topic key generation: `topicKey(field, topic) = ${field.id}:${slugifyTopic(topic)}`.
  - Fallback logic: Unauthenticated (`isSignedIn: false`) or missing storage bridge reads and writes to `localStorage` only.
  - Sync & Migration logic: When authenticated with storage bridge, missing remote state is seeded from non-empty `localStorage` data via `setState`.

### Tier 2: Boundary Conditions & Adversarial Stress
- **Search Filtering**:
  - Empty string `""` or whitespace `"   "` matches nothing (returns empty or unfiltered baseline; never all nodes erroneously highlighted).
  - Regex meta-character handling: queries containing `.*+?^${}()|[]\` are treated as literal text or safely escaped without throwing `SyntaxError`.
  - Case-insensitivity: lower/upper/mixed case yields identical matches.
  - Stress testing: 5,000-character search strings process without hanging or memory leaks.
- **Viewport & Zoom/Pan**:
  - Minimum fit scale invariant: `MIN_FIT_SCALE = 0.62`.
  - Container width bounds: Width 0 or negative inner padding clamped to `0`, fitScale clamped to `>= MIN_FIT_SCALE`.
  - Narrow mobile screens (width = 320px) vs Ultrawide monitors (width = 3840px).
  - Scroll pan limits: `pannable: max > 8`, `atStart: scrollLeft <= 4`, `atEnd: max - scrollLeft <= 4`.
- **Fault Resilience & Quota Limits**:
  - Storage bridge `getState()` promise rejection: caught and safely falls back without uncaught exception.
  - Storage bridge `setState()` promise rejection: caught without unhandled rejection.
  - LocalStorage `QuotaExceededError`: caught and suppressed in `writeLocal`.
  - Corrupted JSON in localStorage: returns fallback value without throwing.
  - Unknown slug: `roadmapFieldById` returns `undefined`, UI displays fallback notice cleanly.

### Tier 3: Cross-Feature Interactions & State Integration
- **Progress Tracking & Metrics**:
  - `doneCount`: count of keys with status `"done"`.
  - `learningCount`: count of keys with status `"learning"`.
  - `progressPercent = allTopicKeys.length ? Math.round((doneCount / allTopicKeys.length) * 100) : 0`.
  - Edge cases: 0 total topics -> 0%; all done -> 100%; rounding precision (1/3 -> 33%, 2/3 -> 67%).
- **Checklist & Topic Progress**:
  - Checkpoint keys: `${field.id}:${topic}:chk:${idx}`.
  - Checkbox toggle state flips boolean and persists to both local and remote keys.
  - Progress export format: creates structured JSON payload containing `{ slug, exportedAt, summary: { total, done, learning, progressPercent }, statuses, favorites, checklists }`.
- **Sequential Topic Traversal (`flatTopics`)**:
  - Index bounds: Index 0 has `prevTopic === null`, last index has `nextTopic === null`, unselected has `currentTopicIndex === -1`.
- **Tooltip Timing & Placement Invariants**:
  - Cold delay: 380ms; Warm delay: 0ms; Cool-down timeout: 500ms.
  - Viewport placement inversion: `rect.top < 150` flips placement to `"below"`, otherwise `"above"`.

### Tier 4: Architectural Constraints
- **File Length Limit**: No single UI component file in `src/ui/` exceeds ~400 lines of code. Extracted modules are strictly checked; legacy monolith is monitored until M6 reassembly.
- **Dependency Cycle Freedom**: Dependency graph across all TypeScript files must contain 0 circular dependency cycles.
- **Presentation Boundaries**: Zero host private imports (`@/`), zero Node builtins in UI bundle, zero imports escaping package root.

---

## 4. Feature Coverage Matrix

| Feature # | Feature Description (PROJECT.md) | Test Suites Covering Feature | Tier |
|---|---|---|---|
| 1 | Public Export Compatibility | `src/ui-structure.test.ts`, `src/manifest.test.ts` | Tier 1 |
| 2 | Storage Bridge Protocol | `src/ui-contracts.test.ts`, `src/manifest.test.ts` | Tier 1, 2 |
| 3 | Types & Interfaces | `src/ui-structure.test.ts`, `src/ui-contracts.test.ts` | Tier 1 |
| 4 | Pure Utilities & Helpers | `src/ui-contracts.test.ts`, `src/content/roadmap.test.ts` | Tier 1, 2 |
| 5 | Progress Tracking Hook | `src/ui-contracts.test.ts` | Tier 2, 3 |
| 6 | Topic Drawer State Hook | `src/ui-contracts.test.ts` | Tier 2, 3 |
| 7 | Search & Keyboard Hook | `src/ui-contracts.test.ts`, `src/search.test.ts` | Tier 1, 2 |
| 8 | Canvas Viewport Hook | `src/ui-contracts.test.ts` | Tier 2 |
| 9 | Canvas Tooltip & Cluster Hook | `src/ui-contracts.test.ts` | Tier 2, 3 |
| 10 | Bezier Path Engine | `src/ui-contracts.test.ts`, `src/ui-structure.test.ts` | Tier 1 |
| 11 | Topology Layout Engine | `src/ui-contracts.test.ts`, `src/content/roadmap.test.ts` | Tier 2 |
| 12 | Flowchart Canvas & Toolbar | `src/ui-contracts.test.ts`, `src/ui-structure.test.ts` | Tier 2 |
| 13 | Interactive Flow Nodes | `src/ui-contracts.test.ts` | Tier 1, 2 |
| 14 | Header & Navigation Bar | `src/ui-structure.test.ts`, `src/content/roadmap.test.ts` | Tier 1 |
| 15 | Accessible Discipline Picker | `src/ui-contracts.test.ts`, `src/content/roadmap.test.ts` | Tier 1, 2 |
| 16 | Pill Search Bar | `src/ui-contracts.test.ts` | Tier 2 |
| 17 | Progress Summary Bar | `src/ui-contracts.test.ts` | Tier 3 |
| 18 | Floating Social Rail | `src/ui-contracts.test.ts` | Tier 1 |
| 19 | Topic Detail Drawer Container | `src/ui-contracts.test.ts` | Tier 2, 3 |
| 20 | Drawer Knowledge Tab | `src/content/roadmap.test.ts`, `src/ui-contracts.test.ts` | Tier 1 |
| 21 | Drawer Specs & Formulas Tab | `src/ui-contracts.test.ts` | Tier 1 |
| 22 | Drawer Checklist Tab | `src/ui-contracts.test.ts` | Tier 3 |
| 23 | Drawer Resources Tab | `src/ui-contracts.test.ts` | Tier 1 |
| 24 | Linear Guide View | `src/ui-contracts.test.ts`, `src/content/roadmap.test.ts` | Tier 2 |
| 25 | Projects Catalog View | `src/ui-contracts.test.ts`, `src/content/roadmap.test.ts` | Tier 1 |
| 26 | Contribution View | `src/ui-structure.test.ts` | Tier 1 |
| 27 | Top-Level Orchestrator Assembly | `src/ui-structure.test.ts` | Tier 1, 4 |
| 28 | Comprehensive Verification | All test suites (`npm test`, `npm run typecheck`) | Tier 1–4 |

---

## 5. Running the Tests & Validation Commands

### 1. Run All Vitest Suites
```bash
npm test
```

### 2. Run TypeScript Type Checking
```bash
npm run typecheck
```

### 3. Verification in Standalone Demo Application
```bash
npm run dev
# Open http://localhost:5173 to test interactive rendering
```

### 4. Verification in Host Application (OpenFullDive)
```bash
# In openfulldive root:
npm run dev
# Open http://localhost:3000/roadmap to verify integration
```
