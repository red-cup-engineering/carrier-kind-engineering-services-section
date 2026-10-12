#!/usr/bin/env node
// english-enterprise.mjs — the network/process face. Owns every ambient
// effect (argv, stdin/stdout, files, exit code) and mounts english-die.mjs's
// pure solicit/invoke behind the exact CLI transport run-leader-movement.js's
// invokeOperation() uses: spawned as a subprocess with
// `--operation <name> --now <instant>`, JSON on stdin, JSON on stdout.

import { readFileSync, writeFileSync } from "node:fs";

import { invoke, solicit } from "./english-die.mjs";

function arg(flag) { const index = process.argv.indexOf(flag); return index === -1 ? undefined : process.argv[index + 1]; }
function operationName() { return arg("--operation") ?? "solicit-service"; }
function now() { return arg("--now") ?? new Date().toISOString(); }
function input() { return JSON.parse(readFileSync(arg("--input-file") ?? 0, "utf8")); }
function emit({ value, code }) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const outputFile = arg("--output-file");
  if (outputFile === undefined) process.stdout.write(serialized);
  else writeFileSync(outputFile, serialized, "utf8");
  process.exitCode = code;
}

function main() {
  const instant = now();
  let activity;
  try { activity = input(); }
  catch (error) { emit({ value: { type: "Reject", object: { type: "Refusal", reason: `invalid JSON input: ${error.message}` } }, code: 2 }); return; }
  const op = operationName();
  if (op === "solicit-service") emit(solicit(activity));
  else if (op === "invoke-service") emit(invoke(activity, instant));
  else emit({ value: { type: "Reject", object: { type: "Refusal", reason: `unknown provider operation ${op}` } }, code: 2 });
}

if (import.meta.main) main();
