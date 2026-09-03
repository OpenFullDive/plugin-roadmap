/**
 * Proves the plugin depends on nothing private. It must build with only what it
 * declares — so no source file may import a host alias (`@/…`), the database,
 * the job queue, or Better Auth internals. Enforced by a scan, not by trust.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = dirname(fileURLToPath(import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return Array.from(source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g), (m) => m[1]!);
}

describe("no private dependency", () => {
  it("imports no host alias, database, job queue, or auth internal", () => {
    const forbidden = [
      /^@\//, // any host path alias (@/db, @/lib, @/modules, @/app, @/store, @/components, @/data)
      /^pg$/,
      /^drizzle-orm/,
      /^pg-boss/,
      /better-auth/,
      /openfulldive\/(?!plugin-api)/i, // any OpenFullDive package other than the public SDK
    ];
    const violations = sourceFiles(srcRoot)
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .flatMap((file) =>
        importSpecifiers(file)
          .filter((spec) => forbidden.some((re) => re.test(spec)))
          .map((spec) => `${relative(srcRoot, file)} -> ${spec}`),
      );
    expect(violations, `private dependency:\n${violations.join("\n")}`).toEqual([]);
  });

  it("no relative import escapes the package's own src root", () => {
    const violations = sourceFiles(srcRoot).flatMap((file) =>
      importSpecifiers(file)
        .filter((spec) => spec.startsWith("."))
        .filter((spec) => relative(srcRoot, resolve(dirname(file), spec)).startsWith(".."))
        .map((spec) => `${relative(srcRoot, file)} -> ${spec}`),
    );
    expect(violations, `relative import escaping the package:\n${violations.join("\n")}`).toEqual([]);
  });

  it("the shipped UI imports React/Next, never a Node builtin", () => {
    const shipped = sourceFiles(srcRoot).filter((f) => /ui[\\/].*\.tsx?$/.test(f) && !/\.test\./.test(f));
    const violations = shipped.flatMap((file) =>
      importSpecifiers(file)
        .filter((spec) => /^node:/.test(spec))
        .map((spec) => `${relative(srcRoot, file)} -> ${spec}`),
    );
    expect(violations, `UI importing a node builtin:\n${violations.join("\n")}`).toEqual([]);
  });
});
