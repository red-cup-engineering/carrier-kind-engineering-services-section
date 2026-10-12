#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { derivePriceDirectives } from "../src/price-directives.mjs";

export const deriveSetOfPriceDirectives = (input) => derivePriceDirectives(input);

if (import.meta.main) {
  let source;
  if (process.argv[2]) {
    source = readFileSync(process.argv[2], "utf8");
  } else {
    process.stdin.setEncoding("utf8");
    source = "";
    for await (const chunk of process.stdin) source += chunk;
  }
  deriveSetOfPriceDirectives(JSON.parse(source))
    .then((receipt) => process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`))
    .catch((error) => {
      process.stderr.write(`${error?.stack ?? error}\n`);
      process.exitCode = 1;
    });
}
