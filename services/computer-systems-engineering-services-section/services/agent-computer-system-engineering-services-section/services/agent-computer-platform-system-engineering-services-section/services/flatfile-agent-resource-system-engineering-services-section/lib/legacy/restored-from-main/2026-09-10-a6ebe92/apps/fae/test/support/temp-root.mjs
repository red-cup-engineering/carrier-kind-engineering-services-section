import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Journal tests exercise synchronous append, rename, traversal, and recursive
// removal. On Linux those filesystem semantics belong on the native temporary
// filesystem, even when an inherited Windows TMP variable points os.tmpdir()
// at a mounted DrvFS directory. Callers may still select another native test
// location explicitly.
export function makeTempRoot(prefix) {
  const parent = process.env.FARS_TEST_TMPDIR || (process.platform === "linux" ? "/tmp" : tmpdir());
  mkdirSync(parent, { recursive: true });
  return mkdtempSync(path.join(parent, prefix));
}
