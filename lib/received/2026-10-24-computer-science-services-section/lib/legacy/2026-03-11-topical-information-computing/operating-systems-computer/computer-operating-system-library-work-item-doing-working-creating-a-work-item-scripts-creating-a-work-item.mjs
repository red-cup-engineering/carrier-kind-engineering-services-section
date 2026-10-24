#!/usr/bin/env node
// Creates a new work-item-inhabiting record. Asserting positing-morphism.

import { writeFileSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start) {
  let d = start;
  while (d !== "/") {
    if (existsSync(resolve(d, ".git"))) return d;
    d = dirname(d);
  }
  return process.cwd();
}

const REPO_ROOT = findRepoRoot(__dirname);
const WI_JSONL = resolve(REPO_ROOT, "library/object/library/thing/library/system/library/operating-system/library/computer-operating-system/library/work-item/work-item.jsonl");

const KINDS = ["task", "goal", "milestone", "campaign", "objective", "project", "expedition", "plan", "phase", "sprint", "question", "decision", "friction-note", "triage-note"];

const args = {};
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([a-z-]+)=(.*)$/);
  if (m) args[m[1]] = m[2];
}

function reject(reason, details) {
  console.log(JSON.stringify({ status: "rejected", reason, details }, null, 2));
  process.exit(1);
}

if (!args.target) reject("missing-args", "--target required");
if (!args.kind || !KINDS.includes(args.kind)) reject("invalid-kind", `--kind must be one of: ${KINDS.join(", ")}`);
if (!args.name || !args.name.match(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/)) reject("invalid-name", "--name must be kebab-case");
if (!args["owned-by"]) reject("missing-args", "--owned-by required");

if (existsSync(args.target)) reject("target-exists", `${args.target} already exists`);

const status = args["has-status"] || "open";

const frontmatter = [
  "---",
  `name: ${args.name}`,
  args.description ? `description: ${args.description}` : null,
  `has-kind: ${args.kind}`,
  `has-status: ${status}`,
  `owned-by: ${args["owned-by"]}`,
  args["assigned-to"] ? `assigned-to: [${args["assigned-to"]}]` : null,
  args["has-priority"] ? `has-priority: ${args["has-priority"]}` : null,
  args["has-deadline"] ? `has-deadline: ${args["has-deadline"]}` : null,
  args["contributes-to"] ? `contributes-to: [${args["contributes-to"]}]` : null,
  args["depends-on"] ? `depends-on: [${args["depends-on"]}]` : null,
  "---",
  "",
  args.description || `A new ${args.kind} created by creating-a-work-item.`,
  "",
].filter(l => l !== null).join("\n");

writeFileSync(args.target, frontmatter);
appendFileSync(WI_JSONL, JSON.stringify({
  e: args.name,
  a: "creating-a-work-item",
  v: { kind: args.kind, target: args.target, "owned-by": args["owned-by"] },
  t: new Date().toISOString(),
}) + "\n");

console.log(JSON.stringify({ status: "created", target: args.target, kind: args.kind, name: args.name }, null, 2));
