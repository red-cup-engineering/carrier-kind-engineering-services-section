#!/usr/bin/env node
// M10 bin entry (design spec S9's cli/jsfars.mjs, renamed per the
// revival-design addendum's ruling 1). The only file in cli/ that touches
// process.argv/stdout/stderr/exitCode — every verb's actual logic lives
// in cli/verbs.mjs as a pure, independently-testable function; this file
// is argv parsing and JSON printing over that surface, nothing else.
//
// Exit-code convention, stated explicitly (the mesh has at least three
// live conventions in circulation per this section's own
// dogfood-and-decomposition plan MINT-6 note — this CLI picks one and
// says so, rather than silently reusing a different script's):
//   0  success (validate/lint with zero diagnostics; a found record;
//      a completed replay — including a discharge whose state is a
//      *shadow*, since S8 requires the four-state report never be
//      coerced to a boolean pass/fail)
//   1  business refusal: validate/lint found diagnostics; show/witness/
//      discharge's record id did not resolve
//   2  usage error: missing/malformed arguments, unknown verb

import { runMain } from "@red-cup-engineering/javascript-file-main-guard-service";
import { readJavascriptNodeStandardInputText } from "@red-cup-engineering/read-javascript-node-standard-input-text-service";
import { runDischarge, runLint, runReplay, runShow, runValidate, runWitness, runWitnessLog } from "./verbs.mjs";
import { inspectFaeResource } from "../inspect-resource.mjs";

const USAGE = `fae <verb> [args]

  validate <root>                    debitum: the sigma battery (S8)
  lint <root>                        alias of validate (S1 STATUS note)
  show <root> <slug-or-path>         one flatfile's parsed record
  witness <root> <witness-id>        one Witness, re-validated
  witness-log <root> <channel> <at>  raw SEAVT rows for one day partition
  discharge <root> <record-id>       officium: the H*_t fixed point (S8)
  replay <root>                      fold root's whole event log
  inspect-resource                   inspect JSON request from standard input

Not implemented (see README STATUS): search — no analyze/ module exists
in this app's own kernel yet; gen-1's bm25 search is Python/pyfars-only
per the design spec's own module tree (S6, S9).
`;

function printAndExit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exitCode = code;
}

function usageError(message) {
  process.stderr.write(`${message}\n\n${USAGE}`);
  process.exitCode = 2;
}

async function main(argv) {
  const [verb, ...rest] = argv;
  if (verb === undefined || verb === "help" || verb === "--help" || verb === "-h") {
    process.stdout.write(USAGE);
    process.exitCode = verb === undefined ? 2 : 0;
    return;
  }

  switch (verb) {
    case "validate":
    case "lint": {
      const [root] = rest;
      if (!root) return usageError(`${verb}: missing <root>`);
      const runner = verb === "validate" ? runValidate : runLint;
      const result = await runner(root);
      return printAndExit(result, result.diagnostics.length === 0 ? 0 : 1);
    }
    case "show": {
      const [root, target] = rest;
      if (!root || !target) return usageError("show: missing <root> <slug-or-path>");
      const note = await runShow(root, target);
      return printAndExit(note, note === null ? 1 : 0);
    }
    case "witness": {
      const [root, witnessId] = rest;
      if (!root || !witnessId) return usageError("witness: missing <root> <witness-id>");
      const record = await runWitness(root, witnessId);
      return printAndExit(record, record === null ? 1 : 0);
    }
    case "witness-log": {
      const [root, channel, at] = rest;
      if (!root || !channel || !at) return usageError("witness-log: missing <root> <channel> <at>");
      const rows = await runWitnessLog(root, channel, at);
      return printAndExit(rows, 0);
    }
    case "discharge": {
      const [root, recordId] = rest;
      if (!root || !recordId) return usageError("discharge: missing <root> <record-id>");
      const result = await runDischarge(root, recordId);
      return printAndExit(result, result.found ? 0 : 1);
    }
    case "replay": {
      const [root] = rest;
      if (!root) return usageError("replay: missing <root>");
      const result = await runReplay(root);
      return printAndExit(result, 0);
    }
    case "inspect-resource": {
      if (rest.length !== 0) return usageError("inspect-resource: request JSON must arrive on standard input");
      const stdin = await readJavascriptNodeStandardInputText({ standardInput: process.stdin });
      try {
        const result = await inspectFaeResource(JSON.parse(stdin));
        process.stdout.write(`${JSON.stringify(result)}\n`);
      } catch (error) {
        process.stderr.write(`fae inspect-resource: ${error.message}\n`);
        process.exitCode = 1;
      }
      return;
    }
    case "search":
      return usageError("search: not implemented in this app — see README STATUS (no analyze/ module in the JS kernel)");
    default:
      return usageError(`unknown verb: ${verb}`);
  }
}

runMain(({ argv }) => main(argv), {
  moduleUrl: import.meta.url,
  formatError: (error) => `${error.message}\n`,
  exitCode: 2,
});
