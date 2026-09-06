/**
 * Structural, public export, and architectural constraint test suite.
 * Enforces presentation boundaries, maximum file length (<= 400 LOC),
 * dependency cycle freedom, and public package export contracts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import RoadmapExplorer, {
  type RoadmapExplorerProps,
  type RoadmapStorage,
} from "./ui/RoadmapExplorer";

const srcRoot = dirname(fileURLToPath(import.meta.url));
const uiDir = join(srcRoot, "ui");
const packageJsonPath = resolve(srcRoot, "../package.json");

function getAllFiles(dir: string, filterExt = /\.tsx?$/): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return getAllFiles(fullPath, filterExt);
    return filterExt.test(fullPath) ? [fullPath] : [];
  });
}

function getImportSpecifiers(filePath: string): string[] {
  const content = readFileSync(filePath, "utf8");
  return Array.from(
    content.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g),
    (m) => m[1]!,
  );
}

describe("UI Public Interface & Package Exports", () => {
  it("exports RoadmapExplorer as a default component function", () => {
    expect(RoadmapExplorer).toBeDefined();
    expect(typeof RoadmapExplorer).toBe("function");
    expect(RoadmapExplorer.name).toBe("RoadmapExplorer");
  });

  it("declares exact package.json exports mapping for public UI contract", () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      name: string;
      exports: Record<string, string>;
    };

    expect(pkg.name).toBe("@openfulldive/plugin-roadmap");
    expect(pkg.exports["."]).toBe("./src/index.ts");
    expect(pkg.exports["./ui"]).toBe("./src/ui/RoadmapExplorer.tsx");
    expect(pkg.exports["./server"]).toBe("./src/search.ts");
  });

  it("satisfies RoadmapExplorerProps and RoadmapStorage interface contract", () => {
    // Compile-time & runtime validation of interface shapes
    let storedState: Record<string, unknown> = {
      "roadmap:progress": { "neuroscience:neural-coding": "done" },
    };

    const mockStorage: RoadmapStorage = {
      getState: async () => storedState,
      setState: async (key: string, value: unknown) => {
        storedState = { ...storedState, [key]: value };
        return { ok: true };
      },
    };

    const validProps: RoadmapExplorerProps = {
      slug: "full-dive-development",
      isSignedIn: true,
      storage: mockStorage,
    };

    expect(validProps.slug).toBe("full-dive-development");
    expect(validProps.isSignedIn).toBe(true);
    expect(validProps.storage).toBeDefined();
    expect(typeof validProps.storage?.getState).toBe("function");
    expect(typeof validProps.storage?.setState).toBe("function");
  });
});

describe("Architectural Constraints & File Sizing", () => {
  it("enforces that no decomposed UI module exceeds ~400 lines of code", () => {
    const allUiFiles = getAllFiles(uiDir, /\.(tsx?)$/);
    const violations: { file: string; lines: number }[] = [];

    for (const file of allUiFiles) {
      const relPath = relative(uiDir, file);
      // Skip the monolithic root file during progressive milestone extraction
      // until M6 replaces it with orchestrator (<300 LOC)
      if (relPath === "RoadmapExplorer.tsx") continue;

      const lineCount = readFileSync(file, "utf8").split(/\r?\n/).length;
      if (lineCount > 400) {
        violations.push({ file: relPath, lines: lineCount });
      }
    }

    expect(
      violations,
      `The following decomposed UI files exceed 400 LOC:\n${violations
        .map((v) => `  ${v.file}: ${v.lines} lines`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("monitors RoadmapExplorer.tsx line count toward the <300 LOC orchestrator target", () => {
    const explorerPath = join(uiDir, "RoadmapExplorer.tsx");
    const content = readFileSync(explorerPath, "utf8");
    const lineCount = content.split(/\r?\n/).length;

    // If refactoring has decomposed RoadmapExplorer (< 4000 lines), verify it meets the <= 400 limit
    if (lineCount < 4000) {
      expect(
        lineCount,
        `Refactored RoadmapExplorer.tsx must be <= 400 lines (target < 300 LOC). Found: ${lineCount}`,
      ).toBeLessThanOrEqual(400);
    } else {
      // Monolith state: must be bounded by original pre-refactor line count (4,196 lines)
      expect(lineCount).toBeLessThanOrEqual(4300);
    }
  });

  it("has zero circular dependencies across all source and UI modules", () => {
    const allFiles = getAllFiles(srcRoot, /\.(tsx?)$/);
    const graph = new Map<string, string[]>();

    const resolveLocalImport = (fromFile: string, spec: string): string | null => {
      if (!spec.startsWith(".")) return null;
      const dir = dirname(fromFile);
      const candidates = [
        resolve(dir, spec),
        resolve(dir, `${spec}.ts`),
        resolve(dir, `${spec}.tsx`),
        resolve(dir, spec.replace(/\.js$/, ".ts")),
        resolve(dir, spec.replace(/\.js$/, ".tsx")),
        resolve(dir, spec, "index.ts"),
        resolve(dir, spec, "index.tsx"),
      ];
      for (const cand of candidates) {
        if (existsSync(cand) && statSync(cand).isFile() && !cand.endsWith(".d.ts")) {
          return cand;
        }
      }
      return null;
    };

    for (const file of allFiles) {
      const specs = getImportSpecifiers(file);
      const targets: string[] = [];
      for (const spec of specs) {
        const resolved = resolveLocalImport(file, spec);
        if (resolved && resolved !== file) {
          targets.push(resolved);
        }
      }
      graph.set(file, targets);
    }

    // Cycle detection via DFS with recursion stack
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const detectCycles = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          detectCycles(neighbor);
        } else if (recStack.has(neighbor)) {
          const cycleStartIdx = path.indexOf(neighbor);
          const cycle = path.slice(cycleStartIdx).concat(neighbor);
          cycles.push(cycle.map((p) => relative(srcRoot, p)));
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const file of allFiles) {
      if (!visited.has(file)) {
        detectCycles(file);
      }
    }

    expect(
      cycles,
      `Circular dependency cycles detected:\n${cycles.map((c) => c.join(" -> ")).join("\n")}`,
    ).toEqual([]);
  });

  it("verifies presentation boundaries: no host aliases or Node builtins in UI files", () => {
    const uiFiles = getAllFiles(uiDir, /\.(tsx?)$/).filter(
      (f) => !/\.test\./.test(f),
    );

    const forbiddenImports = [
      /^@\//,
      /^node:/,
      /^fs$/,
      /^path$/,
      /^os$/,
      /^crypto$/,
      /^stream$/,
    ];

    const violations: string[] = [];
    for (const file of uiFiles) {
      const specs = getImportSpecifiers(file);
      for (const spec of specs) {
        if (forbiddenImports.some((re) => re.test(spec))) {
          violations.push(`${relative(srcRoot, file)} -> ${spec}`);
        }
      }
    }

    expect(
      violations,
      `Presentation boundary violations found:\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});
