#!/usr/bin/env node
// organizing-with-openai-codex-harness — read/plan/apply the Codex CLI substrate
// (~/.codex/config.toml) against the canonical You<->MCP<->561 Group Operations Manifold wiring.
import process from "node:process";
import { readHarness, planHarness, renderHarness, applyConfig } from "../harness.mjs";

function flag(name: string, argv: readonly string[]): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

function main(argv: readonly string[]): number {
  const cmd = argv[0];
  const home = flag("--home", argv);
  if (cmd === "read") {
    console.log(renderHarness(readHarness(home === undefined ? {} : { home })));
    return 0;
  }
  if (cmd === "plan") {
    console.log("# canonical harness — the wiring organizing-with-openai-codex-harness would project:");
    console.log(renderHarness(planHarness()));
    return 0;
  }
  if (cmd === "apply") {
    const dry = argv.includes("--dry-run");
    const hubUrl = flag("--hub-url", argv);
    const r = applyConfig({
      ...(home === undefined ? {} : { home }),
      ...(hubUrl === undefined ? {} : { hubUrl }),
      write: !dry,
    });
    const verb = r.alreadyWired ? "(already wired)" : r.wrote ? "wrote" : "(dry-run) would write";
    console.log(`${verb} ${r.path}:`);
    console.log(r.text);
    return 0;
  }
  console.error("usage: organizing-with-openai-codex-harness <read|plan|apply> [--home <dir>] [--dry-run] [--hub-url <url>]");
  return 2;
}

process.exitCode = main(process.argv.slice(2));
