/**
 * Receives a legacy SQLite file through read-legacy-sqlite.py, a standalone read-only reader run in
 * its own process: this module imports no database and runs no query. The reader's rows are
 * written to a private scratch file and read back one line at a time, so memory stays bounded by a
 * row, and nothing is recorded by a caller until the reader has finished and exited cleanly.
 */
import { spawnSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const READER = join(dirname(fileURLToPath(import.meta.url)), "read-legacy-sqlite.py");
const revive = (_key, value) => (value !== null && typeof value === "object" && typeof value.$blob === "string" && Object.keys(value).length === 1 ? Buffer.from(value.$blob, "base64") : value);

function* linesOf(path) {
  const descriptor = openSync(path, "r");
  try {
    const chunk = Buffer.alloc(1 << 20);
    let pending = [];
    for (;;) {
      const read = readSync(descriptor, chunk, 0, chunk.length, null);
      if (read === 0) break;
      const filled = chunk.subarray(0, read);
      let start = 0;
      for (;;) {
        const at = filled.indexOf(10, start);
        if (at < 0) { pending.push(Buffer.from(filled.subarray(start))); break; }
        pending.push(filled.subarray(start, at));
        yield Buffer.concat(pending).toString("utf8");
        pending = [];
        start = at + 1;
      }
    }
  } finally { closeSync(descriptor); }
}

/**
 * Read `file` (never written) through the reader with `specs` (`[{ table, order?, join? }]`, see
 * the reader), then call `use({ has(table), rows(table) })` while the received rows are held:
 * `rows(table)` yields each row of a table in order, `has(table)` is whether the file holds it.
 * Returns what `use` returns. A reader that cannot run, or that refuses the file, throws before
 * `use` is called.
 */
export function readLegacySqlite(file, specs, use, { python = process.env.LEGACY_SQLITE_PYTHON || "python3" } = {}) {
  const scratch = mkdtempSync(join(tmpdir(), "legacy-sqlite-"));
  try {
    const received = join(scratch, "rows.jsonl");
    const output = openSync(received, "w", 0o600);
    let run;
    try {
      run = spawnSync(python, ["-I", READER, file, JSON.stringify(specs)], { stdio: ["ignore", output, "pipe"], encoding: "utf8", maxBuffer: 1 << 20 });
    } finally { closeSync(output); }
    if (run.error) throw new Error(`the legacy store reader could not run (${python}): ${run.error.message}`);
    if (run.status !== 0) throw new Error(`the legacy store reader refused ${file}: ${run.stderr.trim() || `exit ${run.status}`}`);
    const tables = new Set();
    for (const line of linesOf(received)) { for (const table of JSON.parse(line).tables ?? []) tables.add(table); break; }
    return use({
      has: (table) => tables.has(table),
      *rows(table) {
        const prefix = `{"kind":"row","table":${JSON.stringify(table)},`;
        for (const line of linesOf(received)) if (line.startsWith(prefix)) yield JSON.parse(line, revive).row;
      },
    });
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}
