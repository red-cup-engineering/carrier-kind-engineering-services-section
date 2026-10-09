#!/usr/bin/env node
// Receive one game command result into the host-owned semantic journal.
// Child output and exit status are observations, not proof of settlement.

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { recordClaim } from "../src/core/journal.mjs";

function fail(message) {
  process.stderr.write(`journal-game-tick: ${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const options = { journal: "", game: "", account: "", command: [] };
  let index = 0;
  for (; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") { options.command = argv.slice(index + 1); break; }
    const take = () => { const v = argv[index + 1]; if (!v) fail(`${arg} requires a value`); index += 1; return v; };
    if (arg === "--journal-root") options.journal = resolve(take());
    else if (arg === "--game") options.game = take();
    else if (arg === "--account") options.account = take();
    else fail(`unknown argument ${arg}`);
  }
  if (!options.journal) fail("--journal-root is required; receive evidence into the persistent fleet journal");
  if (!/^[a-z][a-z0-9-]*$/.test(options.game)) fail("a canonical --game is required");
  if (!/^[a-z][a-z0-9.-]{2,15}$/.test(options.account)) fail("a canonical --account is required");
  if (options.command.length === 0) fail("a command is required after --");
  return options;
}

function runChild(command) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on("error", (error) => resolve({ code: 1, stdout, stderr: stderr + String(error) }));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { code, stdout, stderr } = await runChild(options.command);
  let outcome;
  try { outcome = JSON.parse(stdout.trim()); } catch { outcome = null; }
  const line = {
    recordedAt: new Date().toISOString(),
    game: options.game,
    account: options.account,
    exitCode: code,
    ...(outcome !== null ? { outcome } : { unparsedOutput: { stdout, stderr } }),
  };
  recordClaim(options.journal, `aagaard.game-command.${options.game}`, line.recordedAt, line);
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  process.exitCode = code;
}

main();
