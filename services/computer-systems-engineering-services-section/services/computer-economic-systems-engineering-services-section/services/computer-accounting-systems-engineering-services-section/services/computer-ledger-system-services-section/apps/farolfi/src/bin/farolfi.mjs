#!/usr/bin/env node
import { dispatch, parseCli, usage } from "../cli.mjs";

const parsed = parseCli(process.argv.slice(2));
if (parsed.error) {
  process.stderr.write(`${usage(parsed.error)}\n`);
  process.exitCode = 2;
} else if (!parsed.command || parsed.options.help) {
  process.stdout.write(`${usage(parsed.command ? null : "no command given")}\n`);
  process.exitCode = parsed.command ? 0 : 2;
} else {
  const result = dispatch(parsed.command, parsed.files, parsed.options);
  process.stdout.write(`${result.text}\n`);
  process.exitCode = result.exitCode;
}
