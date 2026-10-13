/** Compatibility reader for pre-event JSONL journal files. */
import path from "node:path";

import { type JsonValue } from "../../lib/codecs/json/core.mts";
import { type EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import {
  foldFileLinesUtf8,
  pathExists,
  statPathOrNull,
  walkFiles,
} from "../../lib/filesystem/index.mts";
import {
  parseLegacyLineAsEvents,
  type JournalWitness,
} from "./events.mts";

export interface LegacyProjection {
  readonly statements: readonly JournalWitness[];
  readonly rows: readonly EAVT[];
  readonly malformed: readonly JournalWitness[];
  readonly bytes: number;
  readonly files: readonly string[];
}

function legacyAttemptDirectoryPath(logPath: string): string {
  const suffix = [".", "attempts"].join("");
  return `${logPath}${suffix}`;
}

export function legacySourceFiles(logPath: string): readonly string[] {
  const files: string[] = [];
  if (statPathOrNull(logPath) !== null) files.push(logPath);
  const directory = legacyAttemptDirectoryPath(logPath);
  if (pathExists(directory)) {
    files.push(...walkFiles(directory, {
      maxDepth: 0,
      includeFile: (name) => name.endsWith(".jsonl"),
    }));
  }
  return Object.freeze(files.sort((left, right) => left.localeCompare(right)));
}

export function projectLegacyLog(logPath: string, seat: JsonValue): LegacyProjection {
  const statements: JournalWitness[] = [];
  const rows: EAVT[] = [];
  const malformed: JournalWitness[] = [];
  let bytes = 0;
  const files = legacySourceFiles(logPath);
  for (const file of files) {
    bytes += statPathOrNull(file)?.size ?? 0;
    let lineNumber = 0;
    foldFileLinesUtf8(file, (line) => {
      lineNumber += 1;
      const projected = parseLegacyLineAsEvents(
        line,
        seat,
        "0000-00-00T00:00:00.000Z",
        `${path.basename(file)}:${lineNumber}`,
      );
      statements.push(...projected);
      for (const statement of projected) {
        if (Array.isArray(statement.observation.payload)) rows.push(statement.observation.payload as unknown as EAVT);
        else malformed.push(statement);
      }
    });
  }
  return Object.freeze({
    statements: Object.freeze(statements.sort((left, right) => left.id.localeCompare(right.id))),
    rows: Object.freeze(rows),
    malformed: Object.freeze(malformed),
    bytes,
    files,
  });
}
