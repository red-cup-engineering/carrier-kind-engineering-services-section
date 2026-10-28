#!/usr/bin/env node
/**
 * derive-set-of-search-misses — reads both development-box MCP search
 * journals (markdown-vault, jsnode-server) for a date range and prints the
 * ranked `bare-cedar-fog.search-misses` readout: queries that found nothing
 * or errored, ranked by how often each recurred. Plain data transformation
 * over the journals `search-journal.mjs`/`journal.mts` already wrote — no
 * inference.
 */
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  deriveSetOfSearchMisses,
  journalCandidatePaths,
  parseJournalLines,
} from "../src/search-misses.mjs";

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));
const JSNODE_SERVER_RELATIVE_ROOT =
  "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/"
  + "services/computer-code-engineering-services-section/services/javascript-engineering-services-section/services/javascript-node-services-section/"
  + "services/jsnode-workspace-analysis-services-section/services/jsnode-server";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 7;

function usage() {
  return [
    "usage: derive-set-of-search-misses --since <ISO date> [--until <ISO date>]",
    "                                    [--markdown-vault-root <path>] [--jsnode-server-root <path>]",
    "",
    "Reads both MCP search journals (markdown-vault, jsnode-server) for a date range",
    "(--since defaults to 7 days before --until) and prints the ranked",
    "{kind:\"bare-cedar-fog.search-misses\"} JSON readout: queries that found nothing",
    "or errored, ranked by how often each recurred.",
  ].join("\n");
}

function findRepositoryRoot(start) {
  let current = start;
  while (!existsSync(`${current}/.git`)) {
    const parent = current.split("/").slice(0, -1).join("/") || "/";
    if (parent === current) throw new Error("repository root not found");
    current = parent;
  }
  return current;
}

/**
 * @param {string[]} argv
 * @returns {{since?: string, until?: string, markdownVaultRoot?: string, jsnodeServerRoot?: string}}
 */
const FLAG_KEYS = Object.freeze({
  "--since": "since",
  "--until": "until",
  "--markdown-vault-root": "markdownVaultRoot",
  "--jsnode-server-root": "jsnodeServerRoot",
});

export function parseSearchMissesArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const key = FLAG_KEYS[argument];
    if (key === undefined) throw new TypeError(`unrecognized argument: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined) throw new TypeError(`${argument} requires a value`);
    options[key] = value;
    index += 1;
  }
  return options;
}

/**
 * Reads and merges journal rows for one server across its candidate paths in
 * the window. Missing files (a day with no calls) are silently skipped.
 * @param {string} root
 * @param {string} server
 * @param {string} sinceIso
 * @param {string} untilIso
 * @returns {object[]}
 */
function readServerRows(root, server, sinceIso, untilIso) {
  const rows = [];
  for (const path of journalCandidatePaths(root, server, sinceIso, untilIso)) {
    if (!existsSync(path)) continue;
    rows.push(...parseJournalLines(readFileSync(path, "utf8"), sinceIso, untilIso));
  }
  return rows;
}

/**
 * @param {{since?: string, until?: string, markdownVaultRoot?: string, jsnodeServerRoot?: string}} options
 * @returns {object} the bare-cedar-fog.search-misses readout
 */
export function deriveSearchMissesFromDisk(options = {}) {
  const untilIso = options.until ?? new Date().toISOString();
  const sinceIso = options.since ?? new Date(new Date(untilIso).getTime() - DEFAULT_WINDOW_DAYS * MILLISECONDS_PER_DAY).toISOString();
  const markdownVaultRoot = options.markdownVaultRoot ?? PACKAGE_ROOT;
  const jsnodeServerRoot = options.jsnodeServerRoot ?? `${findRepositoryRoot(PACKAGE_ROOT)}/${JSNODE_SERVER_RELATIVE_ROOT}`;
  const rows = [
    ...readServerRows(markdownVaultRoot, "markdown-vault", sinceIso, untilIso),
    ...readServerRows(jsnodeServerRoot, "jsnode-server", sinceIso, untilIso),
  ];
  return deriveSetOfSearchMisses({ rows, sinceIso, untilIso });
}

function main(argv) {
  if (argv.length === 0) {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  let options;
  try {
    options = parseSearchMissesArguments(argv);
  } catch (error) {
    process.stderr.write(`${error.message}\n${usage()}\n`);
    process.exitCode = 2;
    return;
  }
  const readout = deriveSearchMissesFromDisk(options);
  process.stdout.write(`${JSON.stringify(readout, null, 2)}\n`);
}

if (fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main(process.argv.slice(2));
}
