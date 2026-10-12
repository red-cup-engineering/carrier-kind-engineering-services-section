/**
 * scaffold — create the standard dev/ documentation structure for a package.
 *
 * Creates dev/docs/{explanations,guides,tutorials,references}/ and
 * dev/planning/. Existing directories are skipped, so scaffold is safe to
 * re-run. `dryRun: true` reports what would be created without touching the
 * filesystem. No placeholder files are written — empty dirs are not tracked.
 */
import path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const DEV_DIRS = [
  "dev/docs/explanations",
  "dev/docs/guides",
  "dev/docs/tutorials",
  "dev/docs/references",
  "dev/planning",
] as const;

export type DevDir = (typeof DEV_DIRS)[number];

/** Projection report for documentation-directory scaffolding. The package and
 *  documentation surface are carrier-backed elsewhere; this boundary shape only
 *  records which filesystem paths were created or already present. */
export interface DocScaffoldResult {
  readonly name: string;
  readonly created: readonly DevDir[];
  readonly skipped: readonly DevDir[];
}

export function scaffoldPackageDocs(
  name: string,
  dir: string,
  opts: { readonly dryRun?: boolean } = {},
): DocScaffoldResult {
  const created: DevDir[] = [];
  const skipped: DevDir[] = [];
  for (const devDir of DEV_DIRS) {
    const target = path.join(dir, devDir);
    if (existsSync(target)) {
      skipped.push(devDir);
    } else {
      if (!opts.dryRun) {
        mkdirSync(target, { recursive: true });
      }
      created.push(devDir);
    }
  }
  return { name, created, skipped };
}
