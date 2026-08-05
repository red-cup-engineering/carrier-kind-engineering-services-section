#!/usr/bin/env node
import { inspectReformTarget } from "../src/inspect-reform-target.mjs";

const args = process.argv.slice(2);
const value = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const source = value("--source"), destination = value("--destination");
if (!source || !destination || args.some((argument, index) => argument.startsWith("--") && !["--source", "--destination", "--git"].includes(argument) && args[index - 1] !== "--source" && args[index - 1] !== "--destination" && args[index - 1] !== "--git")) {
  process.stderr.write("usage: inspect-reform-target --source DIRECTORY --destination DIRECTORY [--git EXECUTABLE]\n"); process.exit(2);
}
try { process.stdout.write(`${JSON.stringify(inspectReformTarget(source, destination, { gitExecutable: value("--git") ?? process.env.GIT_SERVICES_BIN ?? "git" }))}\n`); }
catch (error) { process.stderr.write(`inspect-reform-target: ${error.message}\n`); process.exit(1); }
