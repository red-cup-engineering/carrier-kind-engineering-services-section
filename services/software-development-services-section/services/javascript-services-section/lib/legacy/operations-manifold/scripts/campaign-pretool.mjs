#!/usr/bin/env node
/**
 * campaign-pretool — PreToolUse force-feed for campaign-relevant edits.
 *
 * On Edit/Write/MultiEdit, this looks at the file being touched. When the file
 * lives in a package that an open campaign task names, it injects exactly that
 * task plus the absence rule (the CLAUDE.md doctrine for the relating-line
 * refactor) — relevant context delivered when the agent acts on a relevant file,
 * not pushed every turn. When the file is not campaign work it emits nothing, so
 * ordinary edits stay quiet. Any failure degrades to silence; a hook must never
 * wedge a tool call.
 */
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";
import { readStdin } from "../src/script-stdio.mts";
import { operationsManifoldWork } from "../src/work-management.mts";
import { foldCampaignRollup } from "../src/operating/planning/campaigning/library/campaign-rollup.mts";

// Parse the hook payload with native JSON: the manifold's parseJson codec eats
// backslash escapes, which corrupts Windows file paths (c:\\lib\\x -> c:libx) and
// would defeat the path match. A hook glue script reading a path needs the path
// intact, so it does not go through the lossy codec.
function parsePayload(text) {
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const ABSENCE_RULE = "Absence rule (CLAUDE.md): a dropped @emsenn/relating subpath is a design judgment, not a regression — import from @emsenn/relating or the primitive it collapsed into; never restore/alias/stub the old path.";

function filePathFrom(payload) {
  const input = payload?.tool_input ?? payload?.toolInput ?? {};
  const path = input.file_path ?? input.filePath ?? input.path ?? null;
  return typeof path === "string" ? path : null;
}

function packageSegment(filePath) {
  const norm = filePath.replace(/\\/gu, "/");
  const match = norm.match(/(lib|apps|services|sites)\/([^/]+)/u);
  return match === null ? null : `${match[1]}/${match[2]}`;
}

function tokens(text) {
  return new Set((text.toLowerCase().match(/[a-z0-9][a-z0-9.\-/]{2,}/gu) ?? []));
}

async function main(metaUrl) {
  const repoRoot = repoRootFromModule(metaUrl);
  const payload = parsePayload(await readStdin());
  const tool = payload?.tool_name ?? payload?.toolName ?? "";
  if (!/^(Edit|Write|MultiEdit|NotebookEdit)$/u.test(String(tool))) return;
  const filePath = filePathFrom(payload);
  if (filePath === null) return;
  const segment = packageSegment(filePath);
  if (segment === null) return;

  const reading = foldCampaignRollup(await operationsManifoldWork(repoRoot));
  if (reading.campaigns.length === 0) return;
  const segTokens = tokens(`${segment} ${segment.split("/").at(-1) ?? ""}`);

  // The open planning TASK whose title best matches the touched package, carrying
  // its containing PLAN. We force-feed at the PLAN level: the task is the
  // engagement, but the plan is the dependency-ordered commitment the agent must
  // honor (definition-of-done, ordering, requires-concepts).
  let best = null;
  const walk = (node, plan) => {
    const nextPlan = node.kind === "plan" ? node : plan;
    if (node.kind === "task" && node.gate === "record" && node.workStatus !== "done") {
      let score = 0;
      for (const tok of tokens(node.title)) if (segTokens.has(tok)) score += 1;
      if (best === null || score > best.score) best = { node, plan: nextPlan, score };
    }
    for (const child of node.children) walk(child, nextPlan);
  };
  for (const campaign of reading.campaigns) walk(campaign, null);
  if (best === null || best.score === 0) return;

  const { node: task, plan } = best;
  const workType = task.workType ?? plan?.workType ?? null;
  const lines = [`**Campaign context — editing ${segment}.**`];
  if (plan !== null) lines.push(`Plan: ${plan.title}.`);
  lines.push(`Open task: ${task.title}.`);
  if (workType !== null) lines.push(`Work-type: ${workType}.`);
  lines.push(ABSENCE_RULE);
  lines.push(`Run read-campaign for the full tree (plan ordering, definition-of-done, front).`);
  const text = lines.join("\n");
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: text } })}\n`);
}

if (isMainModule(import.meta.url)) {
  main(import.meta.url).then(() => process.exit(0)).catch(() => process.exit(0));
}
