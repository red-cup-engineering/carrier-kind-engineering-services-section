/**
 * integrations/filesystem/services/agent-context — assemble an agent's filesystem-backed context suit: a
 * token-budgeted, query-restricted read over already-recorded material,
 * ranked by charge/linkage/magnitude/recency (`suitForCell`,
 * `src/agents/claim-sessions/context.mjs`), from the SAME filesystem
 * reads this read/write dispatch already knows how to make — a
 * work-ledger feed's admitted rows, a settlement's derived state excerpts,
 * a promoted content-tier document.
 *
 * Kept separate from `services/read-write.mts` (previously one ~991-line file
 * mixing this with the actual read/write verb dispatch): assembling an
 * agent's context suit is a distinct concern from dispatching a read or
 * write verb, even though both happen to read the same filesystem.
 */
import path from "node:path";

import { suitForCell } from "../../../claims/context.mjs";
import { isSessionChargeName } from "@red-cup-engineering/relating/running/session";
import { resource } from "@red-cup-engineering/relating/running/resource";
import { prompt, userMessage } from "../../../presentation/prompt.mjs";

import { parse } from "@red-cup-engineering/json-services-section";
import { dataDatePartition } from "@red-cup-engineering/computer-system-engine/addressing/data-artifact-address";
import { feedTokenFamilyMember } from "../../../agents/addressing/feed-token.mjs";
import { journal } from "@red-cup-engineering/computer-system-engine/journal/journal";

function jsonRecordAt(value, key) {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value)[key];
}

function jsonStringArrayAt(value, key) {
  const field = jsonRecordAt(value, key);
  return Array.isArray(field) ? Object.freeze(field.filter((entry) => typeof entry === "string")) : Object.freeze([]);
}

/** One claim-session-shaped feed row (the `claim-session` feed itself, or any
 *  feed cellized through it — `work-ledger`, `claude-session-<id>`,
 *  `codex-session-<id>`) read as a `SuitInput`, keyed by that row's OWN cell.
 *  Exported so fresh, in-memory session reads can reuse this exact conversion
 *  without going through `commitClaudeSessionSuitLogRecord`'s record-tier path, which
 *  hangs the read on record projection re-stamping the reading onto every
 *  row of the session's whole accreted log — the same duplication shape as
 *  the 222MB incident this module's own doc comment names, reproduced live
 *  2026-07-05 as a 28MB `commit-claude-session-*.jsonl` for one session. */
export function suitInputOfFeedRow(row, source) {
  const [, attribute, value] = row;
  const cellField = jsonRecordAt(attribute, "cell");
  const chargeField = jsonRecordAt(attribute, "charge");
  if (typeof cellField !== "string" || typeof chargeField !== "string" || !isSessionChargeName(chargeField)) return undefined;
  const boundary = jsonRecordAt(value, "boundary");
  const text = jsonRecordAt(boundary, "text");
  return Object.freeze({
    cell: cellField,
    kind: "feed-row",
    charge: chargeField,
    text: typeof text === "string" ? text : cellField,
    source,
    evidence: Object.freeze([...jsonStringArrayAt(boundary, "evidence"), `cell:${cellField}`, `charge:${chargeField}`]),
  });
}

const SESSION_RECORD_SUIT_BUDGET = 2000;

/**
 * Commit a `claude-session-<id>` feed's record as ONE constant reading — the
 * session's own suit statistic (token-budgeted, ranked by charge/linkage/
 * magnitude/recency, omissions counted; `src/agents/claim-sessions/context.mts`) over its own
 * admitted rows — rather than the generic per-entity record projection
 * leg, whose per-row repeated-view output is exactly what produced the 222MB
 * `commit-claude-session-*.jsonl` incident for a session whose rows
 * accumulate against one entity. `logSource` names the log in the suit's own
 * evidence trail. `feed`
 * must already be a decomposed `claude-session` family member (the caller
 * checks via `feedTokenFamilyMember`); this function trusts that and reads
 * the id back off the SAME decomposition rather than re-slicing the string.
 */
export function commitClaudeSessionSuitLogRecord(
  logPath,
  feed,
  logSource,
) {
  const sessionId = feedTokenFamilyMember(feed)?.id ?? feed;
  const cell = `claude-session/${sessionId}`;
  const inputs = [];
  journal.scan(logPath, undefined, (_accum, row) => {
    const input = suitInputOfFeedRow(row, logSource);
    if (input !== undefined) inputs.push(input);
    return undefined;
  });
  const suit = suitForCell(inputs, { cell, text: cell }, { budget: SESSION_RECORD_SUIT_BUDGET });
  return journal.commitRecord(logPath, suit).datoms;
}

/** One `work-ledger`-shaped feed row read as a `SuitInput`, when its cell
 *  matches the wanted one — matched rows for the SAME cell (an opening claim,
 *  a later discharge) are exactly what `suitForCell`'s knowledge-order fold
 *  is for, so every matching row is kept, not just the first. */
function suitInputOfWorkLedgerRow(row, wantedCell, source) {
  const input = suitInputOfFeedRow(row, source);
  return input !== undefined && input.cell === wantedCell ? input : undefined;
}

/** One dated state-tier settlement artifact read as a `SuitInput`: the settlement's own
 *  address is its cell (`settlement:<token>`, distinct from any work-ledger cell so
 *  it never folds into a work item's own rows), and it carries the query
 *  cell as evidence only when the settlement's serialized JSON actually mentions
 *  that cell — a real structural containment check, not a keyword guess. */
function suitInputOfStateExcerpt(token, wantedCell, artifact, source) {
  const serialized = JSON.stringify(artifact);
  return Object.freeze({
    cell: `settlement:${token}`,
    kind: "settlement-excerpt",
    text: serialized,
    source,
    evidence: serialized.includes(wantedCell) ? Object.freeze([wantedCell]) : Object.freeze([]),
  });
}

/** The cell's own realized content-tier document, when the work-ledger feed
 *  has actually been promoted past `data/state` for this date (most feeds,
 *  per the `work-item:work-ledger/item/0001` obligation this suit itself can surface,
 *  have not yet) — absent is the ordinary case, not a read failure. */
function suitInputOfContentDocument(wantedCell, contentPath, options) {
  if (!options.pathExists(contentPath)) return undefined;
  const parsed = parse(options.readFileUtf8(contentPath));
  if (parsed === undefined) return undefined;
  return Object.freeze({
    cell: wantedCell,
    kind: "content-document",
    text: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
    source: contentPath,
    evidence: Object.freeze([wantedCell, `content:${contentPath}`]),
  });
}

/**
 * The host-facing suit assembly: gather one work-item/obligation cell's
 * already-recorded materials through the SAME read paths the `work-item`/
 * `governance`/`orientation` settlement derivers and the `work-ledger` feed already
 * use — no new read primitive — then compose them with `suitForCell`. Any
 * harness (an MCP resource/prompt read, a Claude Code session) can wear the
 * result: a suit is just a query-restricted, budget-packed settlement over material
 * this service already knows how to read.
 */
export function suitForWorkItem(
  dataRoot,
  cell,
  options = {},
) {
  const feedName = "work-ledger";
  const date = options.date;
  const { year, month, day } = dataDatePartition(date);
  const logPath = journal.feed(dataRoot, feedName, date, { subject: feedName });
  const logSource = logPath.name;

  const inputs = [];

  if (journal.sourceStatus(logPath).exists) {
    try {
      journal.scan(logPath, undefined, (_accum, row) => {
        const input = suitInputOfWorkLedgerRow(row, cell, logSource);
        if (input !== undefined) inputs.push(input);
        return undefined;
      });
    } catch {
      // An unreadable log must not block the suit; the caller sees fewer inputs, not a crash.
    }
  }

  for (const token of [`work-item-${feedName}`, `governance-${feedName}`, "orientation"]) {
    const artifactPath = path.join(dataRoot, "data", "state", year, month, day, `${date}-settle-${token}.json`);
    if (!options.pathExists(artifactPath)) continue;
    const parsed = parse(options.readFileUtf8(artifactPath));
    if (parsed === undefined) continue;
    inputs.push(suitInputOfStateExcerpt(token, cell, parsed, artifactPath));
  }

  const contentPath = journal.projectPath(logPath, "content", "json");
  const contentInput = suitInputOfContentDocument(cell, contentPath, options);
  if (contentInput !== undefined) inputs.push(contentInput);

  const ownRow = inputs.find((input) => input.kind === "feed-row" && input.cell === cell);
  return suitForCell(inputs, { cell, text: ownRow?.text ?? cell }, { ...(options.budget === undefined ? {} : { budget: options.budget }) });
}

function distinctCellsOfWorkLedgerLogPath(logPath) {
  const seen = new Set();
  journal.scan(logPath, undefined, (_accum, row) => {
    const [, attribute] = row;
    const cellField = jsonRecordAt(attribute, "cell");
    if (typeof cellField === "string") seen.add(cellField);
    return undefined;
  });
  return Object.freeze([...seen]);
}

/**
 * One MCP-readable resource per cell the `work-ledger` feed currently
 * carries for the given date (default today): the suit for that cell,
 * serialized as its own JSON body. `collectResources` (`api/induce.mts`)
 * picks these up like any other exported `ResourceRegistration`; the induced apex
 * still has to be told to include them (`InduceBinsOptions.resources`), the
 * same explicit step `assembleDefaultService` already takes for
 * the apex's static resources — this function only supplies the suit resources, it
 * does not itself patch the default service apex's static resource list.
 */
export function suitResourcesForWorkLedger(
  binding,
  options = {},
) {
  const feedName = "work-ledger";
  const date = options.date ?? binding.now().slice(0, 10);
  const logPath = journal.feed(binding.dataRoot, feedName, date, { subject: feedName });
  if (!journal.sourceStatus(logPath).exists) return Object.freeze([]);
  let cells;
  try {
    cells = distinctCellsOfWorkLedgerLogPath(logPath);
  } catch {
    return Object.freeze([]);
  }
  return Object.freeze(cells.map((cell) => resource({
    uri: `metroplat://executing/suit/${encodeURIComponent(cell)}`,
    name: `suit:${cell}`,
    mimeType: "application/json",
    description: `The context suit for work-ledger cell "${cell}": already-recorded materials ranked by charge, linkage, magnitude, and recency, packed under a token budget.`,
    read: () => JSON.stringify(
      suitForWorkItem(binding.dataRoot, cell, { ...binding, date, ...(options.budget === undefined ? {} : { budget: options.budget }) }),
      null,
      2,
    ),
  })));
}

/** The suit prompt: an agent supplies a work-item/obligation cell (and an
 *  optional token budget) as prompt arguments, and gets back the composed
 *  suit as a guided message — the MCP prompt-side twin of
 *  `suitResourcesForWorkLedger`, for cells not yet known well enough to have
 *  their own resource entry. */
export function suitPrompt(binding) {
  return prompt({
    name: "wear-suit",
    description: "Compose and wear the context suit for a work-item/obligation cell: already-recorded materials ranked by charge, linkage, magnitude, and recency, packed under a token budget.",
    arguments: [
      Object.freeze({ name: "cell", description: "The work-item/obligation cell to suit up for (e.g. work-item:work-ledger/item/0002).", required: true }),
      Object.freeze({ name: "budget", description: "Approximate token budget (bytes/4). Default 2000.", required: false }),
    ],
    compose: (args) => {
      const cell = args["cell"];
      if (typeof cell !== "string" || cell.trim().length === 0) {
        return [userMessage('wear-suit: a non-empty "cell" argument is required.')];
      }
      const rawBudget = args["budget"];
      const budget = rawBudget !== undefined && rawBudget !== "" ? Number(rawBudget) : undefined;
      const suit = suitForWorkItem(binding.dataRoot, cell, { ...binding, date: binding.now().slice(0, 10), ...(budget === undefined || Number.isNaN(budget) ? {} : { budget }) });
      return [userMessage(JSON.stringify(suit, null, 2))];
    },
  });
}
