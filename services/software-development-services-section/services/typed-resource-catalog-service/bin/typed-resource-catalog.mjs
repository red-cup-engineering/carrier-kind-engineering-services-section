#!/usr/bin/env node
import { trcApex } from "../src/actions.mjs";

let stdin = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) stdin += chunk;
if (Buffer.byteLength(stdin, "utf8") > 1_048_576) {
  process.stderr.write("typed-resource-catalog: stdin exceeds 1048576 UTF-8 bytes\n");
  process.exitCode = 64;
} else {
const result = trcApex.dispatch(process.argv.slice(2), stdin, { caller: { transport: "cli" } });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exitCode = result.code;
}
