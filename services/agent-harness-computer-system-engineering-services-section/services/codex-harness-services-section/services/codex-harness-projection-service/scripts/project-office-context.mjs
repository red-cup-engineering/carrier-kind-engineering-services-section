#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { projectOfficeContext } from "../src/projector.mjs";

if (process.argv.length !== 3) throw new Error("usage: project-office-context <project-office.json>");
const file = resolve(process.argv[2]);
const config = JSON.parse(readFileSync(file, "utf8"));
if (config.type !== "SourceOfficeContextProjection" || config.authority !== "source-context-only") throw new Error("expected source-only office context binding");
// The binding may name where the briefing goes. Codex's workspace-write sandbox holds `.codex` read-only, so a binding
// placed there names a target outside it; the default stays the binding's sibling for bindings that are projected before the sandbox.
const target = resolve(dirname(file), config.target ?? "office-context.md");
try {
  const result = projectOfficeContext({ agencyRoot: resolve(dirname(file), config.agencyRoot), office: config.office, target });
  console.log(JSON.stringify({ office: result.office, duties: result.duties, skills: result.skills, target: result.target, written: result.written }));
} catch (error) {
  if (error?.code !== "OFFICE_CONTEXT_STALE") throw error;
  console.error(error.message);
  process.exitCode = 3;
}
