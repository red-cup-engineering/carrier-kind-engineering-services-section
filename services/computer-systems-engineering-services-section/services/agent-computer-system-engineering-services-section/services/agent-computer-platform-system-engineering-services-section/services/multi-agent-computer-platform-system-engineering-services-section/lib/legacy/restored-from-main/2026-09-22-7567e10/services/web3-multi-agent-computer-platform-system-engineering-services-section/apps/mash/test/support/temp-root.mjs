import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Mirrors apps/fae/test/support/temp-root.mjs exactly (same reasoning:
// Linux filesystem semantics belong on the native temp filesystem even
// under an inherited Windows TMP pointing tmpdir() at mounted DrvFS).
// A five-line helper, kept local rather than imported across the
// sibling app boundary — apps/fae's test/support/ is that app's own
// test-internal layout, not a surface this app composes as a public
// dependency the way src/kernel/{face,tick}.mjs compose src/index.mjs.
export function makeTempRoot(prefix) {
  const parent = process.env.FARS_TEST_TMPDIR || (process.platform === "linux" ? "/tmp" : tmpdir());
  mkdirSync(parent, { recursive: true });
  return mkdtempSync(path.join(parent, prefix));
}
