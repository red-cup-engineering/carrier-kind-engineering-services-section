#!/usr/bin/env node
import { chargeSettlement } from "../src/settlement.mjs";
import { readSettling, writeSettling } from "../src/wire.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

export default function mergeSetOfSettlings(wireSettlings) {
  if (!Array.isArray(wireSettlings)) throw new TypeError("merge-set-of-settlings: expected a list of settlings");
  return writeSettling(chargeSettlement.mergeAll(wireSettlings.map(readSettling)));
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "merge-set-of-settlings", description: "mergeSetOfSettlings — the merge-set-of-settlings operation.", operation: mergeSetOfSettlings }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
