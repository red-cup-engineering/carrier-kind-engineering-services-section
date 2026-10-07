// fold-harness-turns — folds lifecycle.{UserPromptSubmit,Stop} rows (see readTurnEvents) into
// utterance/session entities via world-say's say(); see each export's own JSDoc for the law.
// Run: node scripts/fold-harness-turns.mjs [tracePath] (defaults below; overridable by argv/env).

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { constitute } from "@red-cup-engineering/eavt/constitute-entity";
import { appendEavtRow } from "@red-cup-engineering/eavt/append-eavt-row";
import { readEavtEntries } from "@red-cup-engineering/eavt/read-eavt-entries";
import { readSeavtEntriesAtPath } from "@red-cup-engineering/semiotic-eavt-services-section/read-seavt-entries-at-path";
import { termToJson } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { ADMITTED_HARNESS_ACTORS } from "../src/harness-lifecycle.mjs";
import * as lagoonWorld from "@red-cup-engineering/flatfile-resource-graph-service/lagoon-world";

import { DEFAULT_JOURNAL_ROOTS } from "./fold-harness-lifecycle.mjs";
import { deriveOfficeSeeds, seed as seedOffices } from "./seed-offices.mjs";

// findRepoRoot, folded local to this script — see fold-harness-lifecycle.mjs's own copy for why.
function findRepoRoot(startDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("fold-harness-turns: could not find repo root (no .git above " + startDir + ")");
    dir = parent;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(__dirname);

// The world trace lives at computer-deployment-engine — the one seat licensed to hold it, not
// this script's own (now HARN) directory, and not LAGOON's former apps/lagoon (dissolved).
const DEPLOYMENT_ENGINE_APP_PATH =
  "lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/computer-operating-system-services-section/apps/computer-deployment-engine";
const DEFAULT_TRACE_PATH = path.join(repoRoot, DEPLOYMENT_ENGINE_APP_PATH, "data/state/world.eavt");
const DEFAULT_PLACE_NAME = "bare-cedar-fog";
const CONTENT_FEED_FILENAME = "witness-journal-seavt.jsonl";
const OBSERVATION_TYPE = "BareCedarFogClaudeLifecycleObservation";
const TURN_CATEGORIES = new Set(["lifecycle.UserPromptSubmit", "lifecycle.Stop"]);

/**
 * Session entities carry no domain-meaningful genesis time of their own — a sessionDigest alone
 * disambiguates one session from every other — so every session is constituted at this one fixed
 * t (mirroring seed-offices.mjs's own fixed DEFAULT_MEASURED_AT pattern).
 * @type {number}
 */
const SESSION_GENESIS_T = 0;

/**
 * Every witness-journal-seavt.jsonl file under `<root>/data/logs/**`, sorted — the same small
 * local walk fold-harness-lifecycle.mjs already carries (see its own header for why this is not
 * a shared package dependency).
 *
 * @param {string} root A journal root.
 * @returns {string[]} Matching file paths, sorted.
 */
function contentFeedFiles(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // a missing data/logs tree reads as no feed files, not an error.
    }
    for (const dirent of entries) {
      const p = path.join(dir, dirent.name);
      if (dirent.isDirectory()) walk(p);
      else if (dirent.isFile() && dirent.name === CONTENT_FEED_FILENAME) found.push(p);
    }
  };
  walk(path.join(root, "data", "logs"));
  return found.sort();
}

/**
 * Reads every lifecycle.UserPromptSubmit/lifecycle.Stop row out of a set of journal roots,
 * admitted only when its own record names the observer's own type
 * (`BareCedarFogClaudeLifecycleObservation`), carries a nonempty sessionDigest and occurredAt,
 * carries a nonempty promptDigest when it is a UserPromptSubmit row, and names an admitted
 * harness actor.
 *
 * @param {string[]} roots Journal roots (see DEFAULT_JOURNAL_ROOTS).
 * @returns {Array<{id: string, category: string, recordedAt: string, record: object}>} Events, in
 *   recordedAt order (ties broken by content id, for a stable fold order).
 */
export function readTurnEvents(roots) {
  const events = [];
  for (const root of roots) {
    for (const filePath of contentFeedFiles(root)) {
      for (const row of readSeavtEntriesAtPath({ path: filePath })) {
        const category = termToJson(row.a);
        if (!TURN_CATEGORIES.has(category)) continue;
        const record = termToJson(row.v);
        if (!record || record.type !== OBSERVATION_TYPE) continue;
        if (typeof record.sessionDigest !== "string" || record.sessionDigest === "") continue;
        if (typeof record.occurredAt !== "string" || record.occurredAt === "") continue;
        if (!ADMITTED_HARNESS_ACTORS.includes(record.actor)) continue;
        if (record.event === "UserPromptSubmit" && (typeof record.promptDigest !== "string" || record.promptDigest === "")) continue;
        const id = termToJson(row.e);
        if (typeof id !== "string") continue;
        events.push({ id, category, recordedAt: row.t, record });
      }
    }
  }
  events.sort((left, right) => left.recordedAt.localeCompare(right.recordedAt) || left.id.localeCompare(right.id));
  return events;
}

function existingGenesisAddresses(rows) {
  const addresses = new Set();
  for (const row of rows) if (row.a === "constituted") addresses.add(row.e);
  return addresses;
}
function hasRow(rows, e, a, v) {
  return rows.some((r) => r.e === e && r.a === a && r.v === v);
}

/**
 * Folds every lifecycle.UserPromptSubmit/lifecycle.Stop event from `roots` into `tracePath`:
 * each UserPromptSubmit becomes an utterance (via world-say's say(), text = its own
 * promptDigest) attributed turn-of a sessionDigest-derived session entity and occurred-at its own
 * timestamp; each Stop appends a closed-at row against that same session entity. Ensures the
 * harness actor's office and the named place both exist first by calling seed-offices' own
 * idempotent seed() (constitutes them if absent — never a second constitution path).
 *
 * @param {string[]} roots Journal roots (see DEFAULT_JOURNAL_ROOTS).
 * @param {string} tracePath Path to the on-disk EAVT trace to fold into (created if missing).
 * @param {{placeName?: string, officeSeeds?: object[]}} [opts] placeName (default
 *   "bare-cedar-fog") is the utterance's spoken-at place, per world-say's own name resolution;
 *   officeSeeds (default deriveOfficeSeeds()'s own real harness sources) is passed straight to
 *   seed-offices' seed() — overridable so tests can seed synthetic actors instead of the repo's
 *   real ones.
 * @returns {Array<{kind: string, skipped: boolean, detail: string}>} One entry per row considered.
 * @throws {Error} When no place named opts.placeName is constituted (run seed-world.mjs first).
 */
export function fold(roots, tracePath, { placeName = DEFAULT_PLACE_NAME, officeSeeds } = {}) {
  mkdirSync(path.dirname(tracePath), { recursive: true });
  seedOffices(officeSeeds ?? deriveOfficeSeeds(), tracePath);

  let rows = readEavtEntries({ path: tracePath });
  const already = existingGenesisAddresses(rows);
  const results = [];

  const ensureSession = (sessionDigest) => {
    const { address, genesis: genesisRow } = constitute({ kind: "session", attributes: { sessionDigest }, t: SESSION_GENESIS_T });
    if (!already.has(address)) {
      appendEavtRow({ path: tracePath, row: genesisRow });
      rows = [...rows, genesisRow];
      already.add(address);
      results.push({ kind: "session", skipped: false, detail: address });
    }
    return address;
  };

  const appendIfNew = (row, kind, detail) => {
    if (hasRow(rows, row.e, row.a, row.v)) {
      results.push({ kind, skipped: true, detail });
      return;
    }
    appendEavtRow({ path: tracePath, row });
    rows = [...rows, row];
    results.push({ kind, skipped: false, detail });
  };

  for (const event of readTurnEvents(roots)) {
    const t = Date.parse(event.record.occurredAt);
    if (Number.isNaN(t)) throw new TypeError(`fold-harness-turns: event ${event.id} has an unparseable occurredAt: ${JSON.stringify(event.record.occurredAt)}`);

    const sessionAddress = ensureSession(event.record.sessionDigest);

    if (event.record.event === "UserPromptSubmit") {
      const { address: utteranceAddress } = constitute({ kind: "utterance", attributes: { text: event.record.promptDigest }, t });
      if (already.has(utteranceAddress)) {
        results.push({ kind: "turn", skipped: true, detail: utteranceAddress });
        continue;
      }
      const said = lagoonWorld.speakInWorld(tracePath, event.record.actor, placeName, event.record.promptDigest, t);
      rows = [...rows, said.genesisRow, said.spokenByRow, said.spokenAtRow];
      already.add(utteranceAddress);
      appendIfNew({ e: utteranceAddress, a: "turn-of", v: sessionAddress, t }, "turn-of", utteranceAddress);
      appendIfNew({ e: utteranceAddress, a: "occurred-at", v: event.record.occurredAt, t }, "occurred-at", utteranceAddress);
      results.push({ kind: "turn", skipped: false, detail: utteranceAddress });
    } else if (event.record.event === "Stop") {
      appendIfNew({ e: sessionAddress, a: "closed-at", v: event.record.occurredAt, t }, "closed-at", sessionAddress);
    }
  }

  return results;
}

// Only run when invoked directly (so tests can import readTurnEvents/fold without side effects).
if (import.meta.url === `file://${process.argv[1]}`) {
  const tracePath = process.argv[2] || process.env.LAGOON_WORLD_TRACE_PATH || DEFAULT_TRACE_PATH;
  const results = fold(DEFAULT_JOURNAL_ROOTS, tracePath);
  for (const { kind, skipped, detail } of results) {
    console.log(`${skipped ? "skip (already folded)" : "appended"}: ${kind} ${detail}`);
  }
}
