#!/usr/bin/env node
/**
 * seed-refactor-campaign — admit the relating-line refactor as a first-class
 * campaign in the work ledger along the corpus containment ladder:
 *
 *   campaign → project → plan → task
 *
 * (NO milestone tier — milestone/sprint/phase are work-breakdown markers, not
 * ladder tiers; the rollup collapses them, so seeding them would just produce
 * transparent nodes. We seed the real ladder directly.)
 *
 * The campaign carries a decidable OBJECTIVE and a time HORIZON, written as
 * `objective:` / `horizon:` (plus `metric:` / `deadline:` / `status:`) lines in
 * the campaign item's intent, exactly where campaign-rollup.mts parses them
 * (see parseObjective / parseHorizon, which scan an item's intent/success/notes).
 *
 * Every node is `gate: "record"` (a planning carrier that counts toward campaign
 * progress, never a stop-gate), so the spine reports progress without blocking
 * any session from stopping.
 *
 * Idempotent + self-correcting. On each run it first detects the OLD
 * milestone-structured campaign (a "Relating-line refactor migration" campaign
 * that still has milestone descendants) and ABANDONS it and its whole subtree via
 * updateWork(status:"abandoned"). Then, if a corrected plan-based campaign already
 * exists (a "Relating-line refactor migration" campaign with NO milestone
 * descendants that is not abandoned), it skips; otherwise it seeds the plan-based
 * tree. Run once from the repo root:
 *
 *   node sites/ops.561.group/scripts/seed-refactor-campaign.mjs
 */
import { startWork, updateWork, operationsManifoldWork } from "../src/work-management.mts";
import { isMainModule, repoRootFromModule } from "../src/runtime.mts";

const CAMPAIGN_TITLE = "Relating-line refactor migration";
const SOURCE = "operations-manifold.seed-refactor-campaign";
const ROADMAP = "dev/docs/notes/2026-06-21-refactor-roadmap.md";
const SERVER_NOTE = "dev/docs/notes/2026-06-21-server-manifold-and-relating-experimental-migration-roadmap.md";

// The campaign's decidable objective + time horizon, written where the rollup
// parses them: `objective:` / `metric:` / `deadline:` / `status:` / `horizon:`
// lines folded into the campaign item's intent. The strategic intermediate
// objective is the COMPUTING GATE: once computing is rederived in place the gate
// opens, unlocking the whole computing-with-* fleet and this manifold itself.
const CAMPAIGN_INTENT = [
  "Rederive the whole workspace onto @emsenn/relating and collapse the deprecated @emsenn/relating bloodline.",
  "objective: computing rederived in place — the gate opens, unlocking computing-with-* and ops.561.group",
  "metric: lib/computing compiles on relating-experimental + gaming, and every computing-with-* consumer and ops.561.group build off the new line",
  "deadline: 2026-07-15",
  "status: on-track",
  "horizon: Phase 3/4 migration wave — 2026-07-15",
].join("\n");

/** A spec tree the script walks depth-first, threading each parent's id down. */
const TREE = {
  kind: "campaign",
  title: CAMPAIGN_TITLE,
  intent: CAMPAIGN_INTENT,
  success: "pnpm check is green workspace-wide and no package imports @emsenn/relating outside the deprecated package itself.",
  focus: "lib/relating-experimental",
  deadline: "2026-07-15",
  evidence: [ROADMAP, SERVER_NOTE],
  children: [
    {
      kind: "project",
      title: "Phase 3 migration wave",
      intent: "Retarget packages off deprecated @emsenn/relating in dependency order, opening the computing gate, healing the red set, and retargeting the survivors.",
      success: "Every migration-set package compiles on @emsenn/relating.",
      focus: "lib",
      children: [
        {
          kind: "plan",
          title: "computing gate plan",
          intent: "Fold the green -experimental siblings into their canonical names and rederive computing in place; computing unblocks all computing-with-* and ops.561.group.",
          success: "lib/computing compiles on relating-experimental + gaming; the gate is open.",
          focus: "lib/computing",
          children: [
            { kind: "task", title: "Fold lib/animating onto relating-experimental", intent: "Fold the animating-experimental sibling into lib/animating on the new line.", success: "pnpm --filter @emsenn/animating check is green.", focus: "lib/animating" },
            { kind: "task", title: "Fold lib/gaming onto relating-experimental", intent: "Fold the gaming-experimental sibling into lib/gaming on the new line.", success: "pnpm --filter @emsenn/gaming check is green.", focus: "lib/gaming" },
            { kind: "task", title: "Retarget lib/managing-operations to the canonical line", intent: "Promote the useful work-management surface into lib/managing-operations and retarget consumers to the canonical package.", success: "pnpm --filter @emsenn/managing-operations check is green.", focus: "lib/managing-operations" },
            { kind: "task", title: "Rederive lib/computing in place", intent: "Rederive computing onto relating-experimental + gaming with no -experimental sibling.", success: "pnpm --filter @emsenn/computing check is green; the gate opens.", focus: "lib/computing" },
          ],
        },
        {
          kind: "plan",
          title: "heal-red plan",
          intent: "Heal the packages that error today: replace dropped subpath imports (TS2307) and removed exports (TS2305) with the new capability surface.",
          success: "pnpm check red count for the named packages reaches 0.",
          focus: "lib",
          children: [
            { kind: "task", title: "Heal red computing-with-* (hive, terminal, claude-code-cli)", intent: "Retarget the erroring computing-with-* consumers off deprecated relating.", success: "Those three packages compile.", focus: "lib" },
            { kind: "task", title: "Heal red apps (farolfi, llm-computer, openai-agent-tui, tui, waggle)", intent: "Heal the five apps failing on the dying line.", success: "Those apps compile.", focus: "apps" },
            { kind: "task", title: "Heal red services (conformance-tics, llm-claude-harness, llm-server, qwzspace-server, web-server)", intent: "Heal the failing services.", success: "Those services compile.", focus: "services" },
            { kind: "task", title: "Heal red sites (aagaard, cassia-lorne, farstone, flickering)", intent: "Heal the four failing sites.", success: "Those sites compile.", focus: "sites" },
          ],
        },
        {
          kind: "plan",
          title: "retarget plan",
          intent: "Retarget packages that still compile but ride the dying @emsenn/relating line.",
          success: "grep 'from \"@emsenn/relating\"' returns nothing outside the deprecated package.",
          focus: "lib",
          children: [
            { kind: "task", title: "Retarget the computing-with-* fleet off @emsenn/relating", intent: "Move the consumer fleet onto relating-experimental.", success: "No computing-with-* imports deprecated relating.", focus: "lib" },
            { kind: "task", title: "Retarget services/sites (fizzos, ops.561.group, research.561.group, koios)", intent: "Move the remaining services and sites — including this manifold — onto the new line.", success: "Those services/sites import relating-experimental.", focus: "sites" },
          ],
        },
      ],
    },
    {
      kind: "project",
      title: "Phase 4 collapse the bloodline",
      intent: "Rename relating-experimental to relating, remove the deprecated package, and fold the -experimental siblings into their canonical names.",
      success: "No package name contains -experimental; exactly one relating; pnpm check green.",
      focus: "lib/relating-experimental",
      children: [
        {
          kind: "plan",
          title: "collapse plan",
          intent: "Collapse to one boundary package and confirm the fleet runs on it.",
          success: "One relating; no -experimental; workspace green.",
          focus: "lib/relating-experimental",
          children: [
            { kind: "task", title: "Rename relating-experimental → relating; remove deprecated + siblings", intent: "Rename the experimental boundary onto the canonical name and delete the deprecated package and -experimental siblings.", success: "One relating; no -experimental; pnpm check green.", focus: "lib/relating-experimental" },
          ],
        },
      ],
    },
  ],
};

const MARKER_KINDS = new Set(["milestone", "sprint", "phase"]);

async function admit(repoRoot, spec, parentId) {
  const result = await startWork(repoRoot, {
    title: spec.title,
    intent: spec.intent,
    success: spec.success,
    workKind: spec.kind,
    gate: "record",
    focus: spec.focus,
    ...(parentId === null ? {} : { contributesTo: [parentId] }),
    ...(spec.deadline === undefined ? {} : { deadline: spec.deadline }),
    evidence: spec.evidence ?? [ROADMAP],
    source: SOURCE,
  });
  const id = result.item.id;
  process.stdout.write(`  ${spec.kind.padEnd(9)} ${id}  ${spec.title}\n`);
  for (const child of spec.children ?? []) await admit(repoRoot, child, id);
  return id;
}

/** Every descendant id of `rootId`, following the contributesTo edges downward. */
function descendantIds(rootId, items) {
  const childrenOf = new Map();
  for (const item of items) {
    for (const parent of item.contributesTo) {
      const kids = childrenOf.get(parent) ?? [];
      kids.push(item.id);
      childrenOf.set(parent, kids);
    }
  }
  const out = new Set();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop();
    for (const child of childrenOf.get(id) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}

/** True when the campaign rooted at `id` has any milestone/sprint/phase marker in
 *  its subtree — the signature of the OLD, theory-violating structure. */
function hasMarkerDescendant(id, items) {
  const descendants = descendantIds(id, items);
  return items.some((item) => descendants.has(item.id) && MARKER_KINDS.has(item.workKind));
}

async function abandonSubtree(repoRoot, rootId, items, label) {
  const ids = [rootId, ...descendantIds(rootId, items)];
  process.stdout.write(`abandoning ${label} (${ids.length} items): ${rootId}\n`);
  for (const id of ids) {
    const item = items.find((candidate) => candidate.id === id);
    if (item !== undefined && (item.workStatus === "abandoned" || item.status === "complete")) continue;
    await updateWork(repoRoot, {
      id,
      status: "abandoned",
      note: "Abandoned by seed-refactor-campaign: superseded by the plan-based campaign>project>plan>task structure (no milestone tier).",
      source: SOURCE,
    });
    process.stdout.write(`  abandoned ${id}\n`);
  }
}

async function main() {
  const repoRoot = repoRootFromModule(import.meta.url);
  let snapshot = await operationsManifoldWork(repoRoot);

  const campaigns = snapshot.items.filter(
    (item) => item.workKind === "campaign" && item.title === CAMPAIGN_TITLE,
  );

  // RESEED: abandon every OLD milestone-structured campaign (and its subtree).
  const stale = campaigns.filter(
    (item) => item.workStatus !== "abandoned" && hasMarkerDescendant(item.id, snapshot.items),
  );
  for (const item of stale) {
    await abandonSubtree(repoRoot, item.id, snapshot.items, "milestone-structured refactor campaign");
    snapshot = await operationsManifoldWork(repoRoot);
  }

  // Skip when a corrected (plan-based, live) campaign already exists.
  const corrected = snapshot.items.find(
    (item) =>
      item.workKind === "campaign"
      && item.title === CAMPAIGN_TITLE
      && item.workStatus !== "abandoned"
      && item.status !== "complete"
      && !hasMarkerDescendant(item.id, snapshot.items),
  );
  if (corrected !== undefined) {
    process.stdout.write(`plan-based refactor campaign already seeded: ${corrected.id}\n`);
    return;
  }

  process.stdout.write(`seeding refactor campaign (campaign > project > plan > task):\n`);
  await admit(repoRoot, TREE, null);
  process.stdout.write(`done.\n`);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`seed-refactor-campaign: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
