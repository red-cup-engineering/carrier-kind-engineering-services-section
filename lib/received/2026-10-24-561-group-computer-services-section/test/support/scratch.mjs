import { mkdirSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dataKindDirectory } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** A fresh scratch directory in this section's own state, which the repository ignores. */
export function scratchDirectory(prefix) {
  const state = dataKindDirectory(SECTION_ROOT, "state", "test-scratch");
  mkdirSync(state, { recursive: true });
  return mkdtempSync(join(state, prefix));
}
