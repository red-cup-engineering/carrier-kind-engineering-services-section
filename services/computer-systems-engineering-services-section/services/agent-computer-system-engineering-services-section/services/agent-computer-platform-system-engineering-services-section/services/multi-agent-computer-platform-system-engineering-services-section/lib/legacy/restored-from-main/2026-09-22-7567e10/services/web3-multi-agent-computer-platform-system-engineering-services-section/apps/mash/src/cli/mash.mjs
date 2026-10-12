#!/usr/bin/env node
// The only file in cli/ that touches process.argv/stdout/stderr/exitCode
// — mirrors apps/fae/src/cli/fae.mjs's split, so a caller who already
// knows one FARS-family CLI's exit-code convention need not learn a
// second (see main's own JSDoc for the codes).

import { runTick } from "./verbs.mjs";

const USAGE = `mash <verb> [args]

  tick <id>=<root> [<id>=<root> ...]   compose members' settled faces (sigma) into one MASH readout

Exchange-firing (Delta) is a library seam (kernel/exchange.mjs,
composeMembers's optional \`cells\`), not a CLI verb: this verb never
supplies cells, so "exchanges" is always reported empty here. Signing,
spending, or deploying a real hire cell remains outside this CLI.
`;

function printAndExit(value, code = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exitCode = code;
}

function usageError(message) {
  process.stderr.write(`${message}\n\n${USAGE}`);
  process.exitCode = 2;
}

/**
 * Run one CLI verb against argv, writing to stdout/stderr and setting
 * process.exitCode: 0 success (a composed tick, even with a nonempty
 * `diagnostics` list — diagnostics are reported state, never a failure
 * code); 1 reserved (no verb here has a "found: false" business refusal
 * yet); 2 usage error (missing/malformed arguments, an unknown verb, or
 * a member whose root does not resolve to an existing directory).
 *
 * @param {string[]} argv the CLI arguments, without the node/script prefix
 * @returns {void}
 */
function main(argv) {
  const [verb, ...rest] = argv;
  if (verb === undefined || verb === "help" || verb === "--help" || verb === "-h") {
    process.stdout.write(USAGE);
    process.exitCode = verb === undefined ? 2 : 0;
    return;
  }

  switch (verb) {
    case "tick": {
      if (rest.length === 0) return usageError("tick: missing at least one <id>=<root>");
      let result;
      try {
        result = runTick(rest);
      } catch (error) {
        return usageError(`tick: ${error.message}`);
      }
      return printAndExit(result, 0);
    }
    default:
      return usageError(`unknown verb: ${verb}`);
  }
}

main(process.argv.slice(2));
