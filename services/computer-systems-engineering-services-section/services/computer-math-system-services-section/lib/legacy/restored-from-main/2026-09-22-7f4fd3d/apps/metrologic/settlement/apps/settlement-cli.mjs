#!/usr/bin/env node
// settlement-cli -- the composed face over this section's scripts. It adds no law: each verb is
// one script, read from standard input as JSON and written to standard output as JSON.
//
//   settlement-cli merge          < settlings.json
//   settlement-cli check-orbit [cell] < orbit.json
import mergeSetOfSettlings from "../scripts/merge-set-of-settlings.mjs";
import checkSettlingOrbit from "../scripts/check-settling-orbit.mjs";

const USAGE = "usage: settlement-cli <merge|check-orbit> [cell]   (JSON on standard input)";

async function readStandardInputText() {
  process.stdin.setEncoding("utf8");
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

export async function main(argv) {
  const [verb, ...rest] = argv;
  if (verb === "merge") {
    const input = JSON.parse(await readStandardInputText());
    return { output: mergeSetOfSettlings(input), code: 0 };
  }
  if (verb === "check-orbit") {
    const input = JSON.parse(await readStandardInputText());
    const verdict = checkSettlingOrbit(input, { cell: rest[0] ?? "" });
    return { output: verdict, code: verdict.monotone ? 0 : 1 };
  }
  return { output: { error: USAGE }, code: 1 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { output, code } = await main(process.argv.slice(2));
  console.log(JSON.stringify(output, null, 2));
  process.exit(code);
}
