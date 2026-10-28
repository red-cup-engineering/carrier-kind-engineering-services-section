import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendSearchJournalRow,
  searchJournalPath,
  withSearchJournal,
} from "../src/search-journal.mjs";
import { searchBareCedarFogMarkdownVaults } from "../src/index.mjs";

function readRows(packageRoot, server, at) {
  const path = searchJournalPath(packageRoot, server, at);
  return readFileSync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

function findRepositoryRoot(start) {
  let current = resolve(start);
  while (!existsSync(join(current, ".git"))) {
    const parent = dirname(current);
    if (parent === current) throw new Error("repository root not found");
    current = parent;
  }
  return current;
}

test("a zero-result tool call writes one row with results: 0", async () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "search-journal-"));
  try {
    // withSearchJournal takes no clock override; it always journals under
    // the real current UTC date, so rows are read back under that same
    // real date rather than a fixed literal that goes stale.
    const at = new Date();
    const wrapped = withSearchJournal({
      packageRoot,
      server: "markdown-vault",
      tool: "search_markdown_vaults",
      deriveCount: (output) => ({ results: output.matches.length, truncated: output.truncated }),
    }, async () => ({ matches: [], truncated: false }));
    await wrapped({ query: "no-such-term-anywhere" });
    const rows = readRows(packageRoot, "markdown-vault", at);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tool, "search_markdown_vaults");
    assert.equal(rows[0].results, 0);
    assert.equal(rows[0].truncated, false);
    assert.equal(rows[0].error, null);
    assert.deepEqual(rows[0].query, { query: "no-such-term-anywhere" });
    assert.equal(typeof rows[0].durationMs, "number");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("an erroring tool call writes a row carrying the error message and rethrows", async () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "search-journal-"));
  try {
    // Same real-clock note as above.
    const at = new Date();
    const wrapped = withSearchJournal({
      packageRoot,
      server: "markdown-vault",
      tool: "search_markdown_lightcone",
      deriveCount: () => ({ results: 0, truncated: false }),
    }, async () => { throw new Error("unknown vault id nope"); });
    await assert.rejects(() => wrapped({ query: "x", keywords: ["x"] }), /unknown vault id nope/);
    const rows = readRows(packageRoot, "markdown-vault", at);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].results, 0);
    assert.equal(rows[0].error, "unknown vault id nope");
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("appendSearchJournalRow lands under data/logs/YYYY/MM/DD/<server>-search-journal.jsonl", () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "search-journal-"));
  try {
    const at = new Date("2026-09-03T00:00:00.000Z");
    const path = appendSearchJournalRow({
      packageRoot,
      server: "markdown-vault",
      tool: "search_markdown_vaults",
      query: { query: "x" },
      results: 3,
      truncated: false,
      durationMs: 5,
      at,
    });
    assert.equal(path, join(packageRoot, "data", "logs", "2026", "09", "03", "markdown-vault-search-journal.jsonl"));
    const rows = readRows(packageRoot, "markdown-vault", at);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].results, 3);
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }
});

test("a real call to searchBareCedarFogMarkdownVaults, wrapped, journals its actual miss", async () => {
  const packageRoot = mkdtempSync(join(tmpdir(), "search-journal-real-"));
  try {
    const repoRoot = findRepositoryRoot(dirname(fileURLToPath(import.meta.url)));
    const wrapped = withSearchJournal({
      packageRoot,
      server: "markdown-vault",
      tool: "search_markdown_vaults",
      deriveCount: (output) => ({ results: output.matches.length, truncated: output.truncated }),
    }, async (input) => searchBareCedarFogMarkdownVaults({ root: repoRoot, ...input }));
    const nonsenseQuery = "zzqxqwzy-nonsense-term-with-no-carrier-9f3e";
    const output = await wrapped({ query: nonsenseQuery, generation: "current", limit: 5 });
    assert.equal(output.matches.length, 0);
    const rows = readRows(packageRoot, "markdown-vault", new Date());
    const row = rows.at(-1);
    assert.equal(row.results, 0);
    assert.equal(row.error, null);
    assert.deepEqual(row.query, { query: nonsenseQuery, generation: "current", limit: 5 });
  } finally {
    rmSync(packageRoot, { recursive: true, force: true });
  }
});
