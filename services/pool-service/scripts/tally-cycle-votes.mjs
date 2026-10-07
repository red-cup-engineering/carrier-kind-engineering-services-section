#!/usr/bin/env node
/**
 * Tallies one cycle's recorded distribution votes, weighted by each voter's fixed matched-
 * tally weight, applying the quorum rule (membership-and-governance specification, "The
 * distribution rule"). Reads a request `{cycleId, closedAt}` as one JSON object via `--request`
 * or stdin. One effect: persists the tally onto `--state <path>` and records a cycle-tally
 * receipt into `--journal-root <dir>` (default: alongside the state file).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { tallyCycleVotes } from "../src/votes.mjs";
import { readStore, writeStore } from "../src/store.mjs";
import { recordPoolReceipt } from "../src/receipts.mjs";

/**
 * Tallies `request.cycleId`'s recorded votes against the pool document at `statePath`.
 * @param {string} statePath Path to the pool's persisted JSON document.
 * @param {string} journalRoot Custody root the cycle-tally receipt is recorded under.
 * @param {object} request `{cycleId, closedAt}`.
 * @returns {{cycleId: string, quorumMet: boolean, voterCount: number, totalWeight: number, shares: Record<string, number>, receipt: string}} The cycle's tally, persisted and receipted.
 * @throws {Error} When no pool document exists at `statePath`.
 */
export function tallyCycleVotesFromStore(statePath, journalRoot, request) {
  const document = readStore(statePath, null);
  if (!document?.pool) throw new Error(`tally-cycle-votes: no pool document at ${statePath}`);
  const votes = document.votes ?? [];
  const tally = tallyCycleVotes(votes, request.cycleId);

  const cycleTallies = (document.cycleTallies ?? []).filter((t) => t.cycleId !== request.cycleId);
  writeStore(statePath, { ...document, cycleTallies: [...cycleTallies, { ...tally, closedAt: request.closedAt }] });
  const receipt = recordPoolReceipt(journalRoot, "cycle-tally", tally, request.closedAt);
  return { ...tally, receipt: receipt.id };
}

if (import.meta.main) {
  const { values } = parseArgs({ options: { state: { type: "string" }, "journal-root": { type: "string" }, request: { type: "string" } } });
  if (!values.state) {
    process.stderr.write("error: --state is required\n");
    process.exitCode = 2;
  } else {
    const journalRoot = values["journal-root"] ?? dirname(resolve(values.state));
    const requestText = values.request ?? readFileSync(0, "utf8");
    const result = tallyCycleVotesFromStore(values.state, journalRoot, JSON.parse(requestText));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}
