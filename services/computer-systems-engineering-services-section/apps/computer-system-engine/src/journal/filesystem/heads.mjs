/** Pure causal-head arithmetic over an explicitly selected physical index.
 * Root-bound readers/writers select that binding through journalIndexDirectory;
 * this helper cannot infer a linked store from a logical settlement root. */
import path from "node:path";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { dataDatePartition } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

export function headPath({ indexDirectory }, at, namespace, key) {
  if (typeof indexDirectory !== "string" || !path.isAbsolute(indexDirectory)) {
    throw new TypeError("headPath requires an absolute physical indexDirectory binding");
  }
  return path.join(indexDirectory, "heads", dataDatePartition(at).date, namespace, `${sha256Hex(key)}.json`);
}
