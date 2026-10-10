/** Pure head-index arithmetic: where one namespaced causal-head document
 *  lives under a data root. No filesystem effect: reading and writing the
 *  document at this path live in `write-journal-store.mjs`, which imports
 *  this law rather than recomputing it. */
import path from "node:path";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { dataTierDirectory } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

/** The exact file path one namespaced head (`root`/`at`/`namespace`/`key`) resolves to. */
export function headPath(root, at, namespace, key) {
  return path.join(dataTierDirectory(root, "log", at), "index", namespace, `${sha256Hex(key)}.json`);
}
