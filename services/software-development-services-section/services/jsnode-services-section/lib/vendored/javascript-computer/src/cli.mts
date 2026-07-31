#!/usr/bin/env node
// cli.mts — javascript-computer introspect <dir-of-dts>
//
// Projects a directory of .d.ts files into a TypeCatalog and prints it as JSON.

import process from "node:process";
import { introspectDirectory } from "./introspect.mjs";

function main(argv: readonly string[]): void {
  const [command, target] = argv;
  if (command !== "introspect" || !target) {
    process.stderr.write("usage: javascript-computer introspect <dir-of-dts>\n");
    process.exitCode = 2;
    return;
  }
  const catalog = introspectDirectory(target);
  process.stdout.write(JSON.stringify(catalog, null, 2) + "\n");
}

main(process.argv.slice(2));
