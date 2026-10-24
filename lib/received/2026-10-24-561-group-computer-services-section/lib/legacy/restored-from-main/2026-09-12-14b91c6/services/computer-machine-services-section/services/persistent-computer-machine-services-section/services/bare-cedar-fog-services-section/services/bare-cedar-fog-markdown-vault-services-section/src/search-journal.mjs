/**
 * search-journal — one JSON line per MCP search-tool call, at
 * `<packageRoot>/data/logs/YYYY/MM/DD/<server>-search-journal.jsonl` (UTC
 * date): `{at, tool, query, results, truncated, durationMs, error}`.
 * Counts only — never carrier content.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * @param {string} packageRoot - absolute path to the owning package directory
 * @param {string} server - short server name, e.g. "markdown-vault"
 * @param {Date} [at]
 * @returns {string} absolute path of the day's journal file
 */
export function searchJournalPath(packageRoot, server, at = new Date()) {
  if (typeof packageRoot !== "string" || packageRoot.length === 0) {
    throw new TypeError("packageRoot is required");
  }
  if (typeof server !== "string" || server.length === 0) {
    throw new TypeError("server is required");
  }
  const yyyy = String(at.getUTCFullYear());
  const mm = String(at.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(at.getUTCDate()).padStart(2, "0");
  return join(packageRoot, "data", "logs", yyyy, mm, dd, `${server}-search-journal.jsonl`);
}

/**
 * Appends one search-journal row.
 * @param {object} params
 * @param {string} params.packageRoot
 * @param {string} params.server
 * @param {string} params.tool
 * @param {unknown} params.query - the caller's arguments, verbatim
 * @param {number} params.results
 * @param {boolean} params.truncated
 * @param {number} params.durationMs
 * @param {string|null} [params.error]
 * @param {Date} [params.at]
 * @returns {string} the path the row was appended to
 */
export function appendSearchJournalRow({
  packageRoot,
  server,
  tool,
  query,
  results,
  truncated,
  durationMs,
  error = null,
  at = new Date(),
}) {
  if (typeof tool !== "string" || tool.length === 0) throw new TypeError("tool is required");
  if (!Number.isFinite(results)) throw new TypeError("results must be a finite number");
  if (typeof truncated !== "boolean") throw new TypeError("truncated must be a boolean");
  if (!Number.isFinite(durationMs)) throw new TypeError("durationMs must be a finite number");
  const path = searchJournalPath(packageRoot, server, at);
  mkdirSync(dirname(path), { recursive: true });
  const row = {
    at: at.toISOString(),
    tool,
    query,
    results,
    truncated,
    durationMs,
    error: error === undefined ? null : error,
  };
  appendFileSync(path, `${JSON.stringify(row)}\n`, "utf8");
  return path;
}

/**
 * Wraps an async MCP tool handler so every call is journaled: a successful
 * call derives `results`/`truncated` from its payload via `deriveCount`; a
 * thrown error is journaled with `results: 0` and rethrown unchanged.
 * @param {object} params
 * @param {string} params.packageRoot
 * @param {string} params.server
 * @param {string} params.tool
 * @param {(payload: unknown) => {results: number, truncated: boolean}} params.deriveCount
 * @param {(input: unknown) => Promise<unknown>} handler
 * @returns {(input: unknown) => Promise<unknown>}
 */
export function withSearchJournal({ packageRoot, server, tool, deriveCount }, handler) {
  return async (input) => {
    const at = new Date();
    const startedAt = performance.now();
    try {
      const output = await handler(input);
      const { results, truncated } = deriveCount(output);
      appendSearchJournalRow({
        packageRoot,
        server,
        tool,
        query: input,
        results,
        truncated,
        durationMs: Math.round(performance.now() - startedAt),
        error: null,
        at,
      });
      return output;
    } catch (error) {
      appendSearchJournalRow({
        packageRoot,
        server,
        tool,
        query: input,
        results: 0,
        truncated: false,
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
        at,
      });
      throw error;
    }
  };
}
