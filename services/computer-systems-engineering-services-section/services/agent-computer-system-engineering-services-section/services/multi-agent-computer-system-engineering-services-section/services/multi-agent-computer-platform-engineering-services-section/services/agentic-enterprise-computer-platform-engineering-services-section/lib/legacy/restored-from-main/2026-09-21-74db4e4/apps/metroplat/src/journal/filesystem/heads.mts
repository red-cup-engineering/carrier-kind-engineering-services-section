/** Small mutable causal-head indexes owned by the filesystem journal. */
import path from "node:path";
import { sha256Hex } from "../../lib/identity/index.mts";
import { parse, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { dataTierDirectory } from "../../lib/addressing/index.mts";
import { readFileUtf8, writeFileAtomic } from "../../lib/filesystem/index.mts";

function headPath(root: string, at: string, namespace: string, key: string): string {
  return path.join(dataTierDirectory(root, "log", at), "index", namespace, `${sha256Hex(key)}.json`);
}

export function readJournalHead(root: string, at: string, namespace: string, key: string): Readonly<Record<string, JsonValue>> | undefined {
  try {
    const value = parse(readFileUtf8(headPath(root, at, namespace, key)));
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? value as Readonly<Record<string, JsonValue>>
      : undefined;
  } catch {
    return undefined;
  }
}

export function writeJournalHead(root: string, at: string, namespace: string, key: string, value: Readonly<Record<string, JsonValue>>): void {
  writeFileAtomic(headPath(root, at, namespace, key), `${JSON.stringify(value)}\n`);
}
