#!/usr/bin/env node
/**
 * cut-ledger — project a ledger feed's state snapshot to its compact record tier
 * (data/record/<feed>.jsonl), dropping bulky payloads. Non-destructive: the
 * append-only log is never rewritten. JSON param `feed` selects the feed
 * (default operations).
 */
import { cutLedger } from "../src/ledger-cut.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => cutLedger(repoRoot, { feed: params["feed"] ?? params["q"] });

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "cut-ledger", "operations-manifold ledger cut result", morphism);
}
