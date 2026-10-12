// supervisor.mjs — supervisor/worker live orchestration on the spawn primitive.
//
// A SUPERVISOR decomposes a goal into sub-tasks, ROUTES each sub-task to a WORKER agent picked by
// capability + RECOGNITION (deriveLeader/recognizedAuthority — never an installed-office list), runs each
// worker as a governed spawnSubagent child (the spine gate is ALREADY inside it — admission + Gov regime +
// held-⊤ safety — the supervisor adds none), records each worker's finalAnswer as an OBSERVER cell on the
// shared trace, and FOLDS the workers' settled sections into one composed section. This is NOT new
// orchestration theory — it is a composition over the committed primitives the build note names:
//
//   • a worker IS a governed child: spawnSubagent (subagent.mjs:116) extends the delegation chain, so
//     authority moves to the worker while accountability stays H⁰-invariant at the supervisor/captain
//     (delegation.mjs accountabilityInvariantUnderExtension). Every worker tool re-passes runGovernedTool
//     under the meet-narrowed chain. The supervisor introduces NO new gate.
//   • the WORKER PICK is RECOGNITION, not office: officesWithCapability supplies only the CANDIDATE set
//     (offices.mjs:166 — the capability column), and recognizedAuthority/deriveLeader (recognition.mjs:144,
//     111) settle WHICH candidate holds authority for the route — t leader wins, a below-quorum/split
//     surfaces ⊥/⊤ (the swarm has not settled a leader), never a config default.
//   • CONSENSUS is the REUSED primitive: observerConsensus (consensus.mjs:30) reads the knowledge-MEET (H⁰,
//     the shared section every worker affirms) and is folded over the per-worker observer cells. DISAGREEMENT
//     is held ⊤ via the knowledge-JOIN — surfaced, NEVER collapsed to last-writer. (The substrate's EAVT
//     write is positive-only, so a (t,f) row-charge disagreement cannot arise from plain writes; the
//     federation-faithful reading — a FUNCTIONAL predicate two observers resolve to DIFFERENT objects — is
//     the swarm's held ⊤, computed over the SAME memoryChu Chu space observerConsensus builds, exactly
//     swarm-federation.mjs's propKey clash, kept here as the disagreement detector. No last-writer pick.)
//
// DERIVED-OR-GOVERNED CONSTANTS (no magic literal):
//   • FAN-OUT / max-workers is NOT a literal — it is one worker per task, and the task COUNT derives from
//     the decomposition's work form (workforms.mjs) whose plan-composition shape comes from
//     planCompositionKind (tuplets.mjs:137). The default decomposition is a single-task cobordism
//     (DEFAULT_WORK_FORM, workforms.mjs:104) — one worker — until a planner seam (options.decompose /
//     options.planner) supplies more.
//   • the recognition QUORUM is deriveLeader's default (strict majority of the electorate that has spoken,
//     recognition.mjs:122-124) OR a governed options.quorum — never a hidden threshold.
//   • worker BUDGETS derive from deriveChildBudget INSIDE spawnSubagent (the parent's remaining budget,
//     subagent.mjs:85) — the supervisor passes its remaining budget through and introduces no cap literal.
//   • the REQUIRED propositions for consensusReady come from the work form's convergence criterion
//     (workforms.mjs convergence field) or options.required — never hardcoded.


import { present } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

import { spawnSubagent } from "./subagent.mjs";
import { observerConsensus, consensusReady } from "./consensus.mjs";
import { deriveLeader, recognizedAuthority } from "./recognition.mjs";
import { officesWithCapability } from "./offices.mjs";
import { planCompositionKind } from "./tuplets.mjs";
import {
  WORK_FORMS,
  selectWorkForm,
  workFormForChildren,
  DEFAULT_WORK_FORM,
} from "./workforms.mjs";
import { writeTrace } from "./events.mjs";
import { stableId } from "./cognition.mjs";
import { memoryChu, propositionColumn } from "./eavt-chu.mjs";

// ── decomposeGoal ────────────────────────────────────────────────────────────────────────────────
// decomposeGoal(goal, options) -> { tasks: [{ id, prompt, capability, dependsOn }], workForm }.
// The decomposition shape is a WORK FORM (data), not code. An injected planner seam — options.decompose
// (a function goal->tasks) or options.tasks (an explicit task list) — supplies the tasks; absent a seam,
// the default is a SINGLE-task cobordism (DEFAULT_WORK_FORM, workforms.mjs:104): one task, one worker.
// The work form is then DERIVED from the produced tasks' dependency shape via workFormForChildren
// (planCompositionKind, tuplets.mjs:137) so the form reflects the actual decomposition — never asserted.
export function decomposeGoal(goal, options = {}) {
  const planned =
    typeof options.decompose === "function"
      ? options.decompose(goal, options)
      : Array.isArray(options.tasks)
        ? options.tasks
        : null;

  const rawTasks =
    planned && planned.length
      ? planned
      : // the least-commitment default: the whole goal is one task — a single-task cobordism.
        [{ prompt: typeof goal === "string" ? goal : goal?.prompt ?? "", capability: options.capability }];

  const tasks = rawTasks.map((task, index) => normalizeTask(task, index, goal, options));

  // the work form is DERIVED from the tasks' dependency shape (planCompositionKind), or an explicit
  // governed override (options.workForm), or read off a structuration doc (selectWorkForm). Never a literal.
  const workForm = options.workForm
    ? (WORK_FORMS[options.workForm] ? options.workForm : DEFAULT_WORK_FORM)
    : options.structuration
      ? selectWorkForm(options.structuration)
      : workFormForChildren(tasks.map((t) => ({ id: t.id, dependsOn: t.dependsOn })));

  return Object.freeze({ tasks, workForm, planCompositionKind: planCompositionKind(tasks.map((t) => ({ id: t.id, dependsOn: t.dependsOn }))) });
}

function normalizeTask(task, index, goal, options) {
  const prompt = typeof task === "string" ? task : task.prompt ?? "";
  const capability = task.capability ?? options.capability ?? "";
  const dependsOn = [].concat(task.dependsOn ?? []);
  // a content id so two identical decompositions address the same task term (stableId, content-addressed).
  const id = task.id ?? stableId([goal, prompt, capability, index], "task");
  return Object.freeze({ id, prompt, capability, dependsOn });
}

// ── pickWorker ───────────────────────────────────────────────────────────────────────────────────
// pickWorker(root, task, candidates, options) -> { worker, value, derived, reason }.
// The candidate set is the CAPABILITY column (officesWithCapability, offices.mjs:166) unless the caller
// supplies an explicit `candidates` list. WHICH candidate is chosen is settled by RECOGNITION, not by
// office order: deriveLeader(root, `dispatch:<task.id>`) names the recognized leader for this route, and
// recognizedAuthority confirms the leader holds recognition ≥ quorum. The verdict is FOUR-shaped:
//   • t   — a recognized leader among the candidates: worker = that leader.
//   • ⊥   — recognition stands but no candidate meets quorum (authority undecided — the swarm has not
//           settled a leader): worker = null, surfaced (NOT a default-to-first pick).
//   • ⊤   — recognition names MORE THAN ONE candidate at/above quorum (a split): held, worker = null.
//   • f   — no candidate holds standing recognition: worker = null (a leader is denied).
// The quorum is deriveLeader's default (strict majority of the electorate that has spoken) OR options.quorum.
export function pickWorker(root, task, candidates, options = {}) {
  const decision = `dispatch:${task.id}`;
  const candidateSet =
    Array.isArray(candidates) && candidates.length
      ? candidates
      : task.capability
        ? officesWithCapability(task.capability)
        : [];

  const derived = deriveLeader(root, decision, options);

  // restrict the recognition reading to the CANDIDATE set — only a candidate may bear this route.
  const inSet = new Set(candidateSet);
  const ranked = derived.participants.filter((p) => inSet.size === 0 || inSet.has(p.participant));
  const atOrAboveQuorum = derived.quorum > 0 ? ranked.filter((p) => p.recognitionCount >= derived.quorum) : [];

  if (atOrAboveQuorum.length > 1) {
    return Object.freeze({
      worker: null,
      value: "stable",
      derived,
      candidates: candidateSet,
      reason: `recognition names ${atOrAboveQuorum.length} candidates at/above quorum ${derived.quorum} (${atOrAboveQuorum.map((p) => p.participant).join(", ")}); a leader is contradicted, held ⊤ — no pick.`,
    });
  }

  if (atOrAboveQuorum.length === 1) {
    const leader = atOrAboveQuorum[0].participant;
    const authority = recognizedAuthority(root, decision, leader, options);
    return Object.freeze({
      worker: authority.value === "potential" ? leader : null,
      value: authority.value === "potential" ? "potential" : "absurd",
      derived,
      candidates: candidateSet,
      reason: authority.reason,
    });
  }

  const anyRecognition = ranked.some((p) => p.recognitionCount > 0);
  if (anyRecognition) {
    return Object.freeze({
      worker: null,
      value: "absurd",
      derived,
      candidates: candidateSet,
      reason: `recognition stands among candidates but none meets quorum ${derived.quorum}; authority undecided (⊥) — no pick.`,
    });
  }

  return Object.freeze({
    worker: null,
    value: "active",
    derived,
    candidates: candidateSet,
    reason: `no candidate holds standing recognition for ${decision}; a leader is denied (f) — no pick.`,
  });
}

// ── foldWorkerSections ─────────────────────────────────────────────────────────────────────────────
// foldWorkerSections(root, observerTerms, options) -> { consensus, shared, disagreements }.
// The REUSE point: observerConsensus (consensus.mjs:30) reads the knowledge-MEET (H⁰ shared section) over
// the per-worker observer cells — the composed section is exactly what every worker affirms. The held-⊤
// disagreement section is the FUNCTIONAL-predicate clash (a predicate two workers resolve to DIFFERENT
// objects), read over the SAME memoryChu Chu space observerConsensus builds — swarm-federation.mjs's propKey
// reading, the substrate-faithful held ⊤ (the positive-only EAVT write admits no row-charge denial). The
// clash is HELD with both sides as witnesses; it is NEVER collapsed to a last-writer object.
export function foldWorkerSections(root, observerTerms, options = {}) {
  const consensus = observerConsensus(root, observerTerms, options);

  // the functional-predicate disagreement set: group affirmed cells by predicate across observers; a
  // predicate resolved to more than one object is a held ⊤ (both objects stand, both sides witnessed).
  const space = memoryChu(root, observerTerms, options);
  const byPredicate = new Map(); // predicate -> Map(observer -> object)
  for (const state of space.states) {
    const label = space.labelOf(state);
    const predicate = label?.predicate?.const ?? label?.predicate;
    const object = label?.object?.const ?? label?.object;
    for (const cell of propositionColumn(space, state)) {
      if (!present(cell.charge)[0]) continue; // only affirmed cells stand in the section
      if (!byPredicate.has(predicate)) byPredicate.set(predicate, new Map());
      byPredicate.get(predicate).set(cell.point, object);
    }
  }

  const disagreements = [];
  for (const [predicate, observerObjects] of byPredicate) {
    const objects = new Set([...observerObjects.values()]);
    if (objects.size > 1) {
      disagreements.push({
        predicate,
        value: "stable",
        sides: [...observerObjects.entries()].map(([observer, object]) => ({ observer, object })),
        evidence: `predicate ${predicate} is resolved to ${objects.size} different objects across workers; held ⊤, both sides witnessed — never collapsed to last-writer.`,
      });
    }
  }

  return Object.freeze({
    consensus,
    // the H⁰ composed section: the propositions every worker affirms (consensus reads t) — observerConsensus.
    shared: consensus.shared,
    // the held-⊤ section: functional-predicate clashes + observerConsensus's own (t,f) join disagreements.
    disagreements: [...consensus.disagreements.map((d) => ({ ...d, value: "stable" })), ...disagreements],
  });
}

// ── supervisorRouteSchema ────────────────────────────────────────────────────────────────────────
// The OpenAI function-schema a PARENT loop advertises so the model can request a supervised decomposition
// from inside its tool loop. Advertised (optional) — the parent registers it through neededExistingEdits.
export const supervisorRouteSchema = {
  name: "supervisor.route",
  description:
    "Decompose a goal into sub-tasks and route each to a worker agent picked by recognition; fold the " +
    "workers' settled sections into one composed section. Disagreeing workers are held ⊤, never last-writer.",
  parameters: {
    type: "object",
    properties: {
      goal: { type: "string", description: "the goal to decompose and supervise" },
      capability: { type: "string", description: "the capability the candidate worker set is read from" },
      quorum: { type: "number", description: "governed recognition quorum (default: strict majority of the electorate)" },
    },
    required: ["goal"],
  },
};

// ── runSupervisor ────────────────────────────────────────────────────────────────────────────────
// runSupervisor(root, supervisor, goal, options) -> async
//   { value, composed, workers, contested, consensus, runId, cost, term, traceLog }.
// The composition:
//   1. decomposeGoal(goal) -> tasks (data; the work form derives the fan-out, no literal).
//   2. for each task: pickWorker reads the candidate set (officesWithCapability) and settles authority by
//      recognition (deriveLeader/recognizedAuthority) — t leader wins, ⊥/⊤/f surfaced (no default pick).
//   3. the chosen worker runs via spawnSubagent — the spine gate is ALREADY inside it; the supervisor's
//      remaining budget threads through so the child budget DERIVES (deriveChildBudget), no cap literal.
//   4. each worker's finalAnswer is recorded as an OBSERVER cell at `supervisor/<runId>/observers/<worker>`.
//   5. foldWorkerSections folds the observer cells: H⁰ shared section composed; held-⊤ disagreement surfaced.
//   6. value is "stable" if ANY worker itself contested (spawnSubagent value === "stable") OR any required
//      proposition disagreed; held, NEVER collapsed to last-writer. Accountability stays H⁰-invariant at the
//      supervisor (each spawnSubagent witnesses it).
export async function runSupervisor(root, supervisor, goal, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const runId = options.runId ?? stableId([supervisor?.name ?? "supervisor", goal, now], "supervision");

  const { tasks, workForm } = decomposeGoal(goal, options);
  const form = WORK_FORMS[workForm] ?? WORK_FORMS[DEFAULT_WORK_FORM];

  const cost = { providerCalls: 0, promptTokens: 0, completionTokens: 0 };
  const workers = [];
  const contested = [];
  const observerTerms = [];

  for (const task of tasks) {
    // 2. PICK the worker by recognition over the capability-derived candidate set.
    const pick = pickWorker(root, task, options.candidates, options);

    if (!pick.worker) {
      // recognition has NOT settled a leader for this route (⊥ undecided / ⊤ split / f denied). The route
      // is surfaced as the pick's verdict — NOT defaulted to a first-candidate office. A ⊤ split is held.
      writeRouteCell(root, runId, task, pick, null, now);
      workers.push(Object.freeze({ task: task.id, worker: null, value: pick.value, reason: pick.reason, runId: null }));
      if (pick.value === "stable") contested.push({ task: task.id, value: "stable", reason: pick.reason });
      continue;
    }

    // 3. RUN the worker as a governed child — the spine gate is ALREADY inside spawnSubagent.
    const worker = { name: pick.worker, ...(options.workerOf ? options.workerOf(pick.worker) : {}) };
    const spawn = await spawnSubagent(
      root,
      supervisor,
      { child: pick.worker, prompt: task.prompt, tools: options.tools ?? [], scope: options.scope ?? "*" },
      {
        ...options,
        now,
        // the supervisor's remaining budget threads through; the child budget DERIVES inside spawnSubagent.
        parentBudget: options.parentBudget,
        parentSpend: addCost(options.parentSpend, cost),
      },
    );

    foldCost(cost, spawn.cost);

    // 4. record the worker's finalAnswer as an OBSERVER cell so foldWorkerSections can read it. The observer
    //    cell holds ONLY the worker's ANSWER propositions (no supervisor bookkeeping — that rides the route
    //    cell), so the H⁰ meet and the held-⊤ clash read the workers' POSITIONS, not their metadata. A JSON
    //    answer is parsed into its (predicate, object) propositions; a bare answer rides as predicate `answer`.
    const observerTerm = `supervisor/${runId}/observers/${pick.worker}`;
    const observerDoc = observerPropositions(spawn.finalAnswer);
    const obs = writeTrace(root, observerTerm, observerDoc, { t: stableId([runId, pick.worker, task.id], "observer") });
    observerTerms.push(observerTerm);

    writeRouteCell(root, runId, task, pick, spawn, now);

    workers.push(
      Object.freeze({
        task: task.id,
        worker: pick.worker,
        value: spawn.value,
        finalAnswer: spawn.finalAnswer,
        runId: spawn.runId,
        observerTerm: obs.term,
        reason: spawn.reason,
      }),
    );

    // a worker that itself folded back contested (held ⊤ in any of its tool runs) PROPAGATES up.
    if (spawn.value === "stable") {
      contested.push({ task: task.id, worker: pick.worker, value: "stable", reason: spawn.reason, runId: spawn.runId });
    }
  }

  // 5. FOLD the workers' settled sections into one composed section (H⁰) + the held-⊤ disagreement section.
  const folded = foldWorkerSections(root, [...new Set(observerTerms)], options);

  // the required propositions for the convergence gate come from the work form's convergence criterion OR
  // options.required — never hardcoded. consensusReady reports ⊤ when a required proposition is disagreed.
  const required = options.required ?? [];
  const ready = consensusReady(folded.consensus, required);

  // 6. value: "stable" if ANY worker contested OR any disagreement stands. Held, never collapsed.
  const anyDisagreement = folded.disagreements.length > 0 || ready.value === "stable";
  const value = contested.length || anyDisagreement ? "stable" : "potential";

  const reason = contested.length
    ? `${contested.length} worker(s)/route(s) surfaced held ⊤; the contradiction is held, not collapsed.`
    : anyDisagreement
      ? `workers disagree on ${folded.disagreements.length} predicate(s); held ⊤, never last-writer.`
      : `all workers composed under ${supervisor?.name ?? "supervisor"}'s standing accountability (${form?.name ?? DEFAULT_WORK_FORM}).`;

  // one append-only supervision cell recording the whole supervised decomposition + its fold.
  const term = `supervisor/${runId}`;
  const doc = {
    kind: "swarm.supervisor.run",
    runId,
    created: now,
    supervisor: supervisor?.name ?? "supervisor",
    goal: typeof goal === "string" ? goal : JSON.stringify(goal),
    workForm,
    tasks: tasks.length,
    workers: workers.length,
    contested: contested.length,
    disagreements: folded.disagreements.length,
    value,
    reason,
    convergence: form?.convergence ?? "",
    consensusReady: ready.value,
    evidence:
      "supervised decomposition: workers picked by recognition (not office), each a governed spawnSubagent " +
      "child (spine gate inside), folded by observerConsensus (H⁰ shared) with held-⊤ disagreement surfaced.",
  };
  const written = writeTrace(root, term, doc, { t: runId });

  const composed = {
    shared: folded.shared,
    disagreements: folded.disagreements,
    workForm,
    convergence: form?.convergence ?? "",
    consensusReady: ready.value,
  };

  return Object.freeze({
    value,
    composed,
    workers,
    contested,
    consensus: folded.consensus,
    runId,
    cost,
    term: written.term,
    traceLog: written.log,
    reason,
  });
}

// observerPropositions(finalAnswer) — turn a worker's settled finalAnswer into the (predicate, object)
// propositions of its observer cell. A JSON object answer contributes one proposition per field (so two
// workers can MEET on shared fields and CLASH on a functional field resolved to different objects). A bare
// string answer rides as a single `answer` proposition. Empty answers contribute nothing (an absent cell).
function observerPropositions(finalAnswer) {
  if (finalAnswer == null || finalAnswer === "") return {};
  if (typeof finalAnswer === "string") {
    const trimmed = finalAnswer.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const doc = {};
          for (const [k, v] of Object.entries(parsed)) {
            doc[k] = typeof v === "object" ? JSON.stringify(v) : v;
          }
          return doc;
        }
      } catch {
        // not JSON after all — fall through to the bare-answer reading.
      }
    }
    return { answer: finalAnswer };
  }
  if (typeof finalAnswer === "object" && !Array.isArray(finalAnswer)) {
    const doc = {};
    for (const [k, v] of Object.entries(finalAnswer)) doc[k] = typeof v === "object" ? JSON.stringify(v) : v;
    return doc;
  }
  return { answer: String(finalAnswer) };
}

// addCost(base, delta) — a non-mutating sum of two cost records (used to thread the supervisor's spend so
// far into the next worker's parentSpend, so each worker's derived budget reflects what was already spent).
function addCost(base = {}, delta = {}) {
  return {
    steps: (Number(base.steps) || 0) + (Number(delta.steps) || 0),
    providerCalls: (Number(base.providerCalls) || 0) + (Number(delta.providerCalls) || 0),
    promptTokens: (Number(base.promptTokens) || 0) + (Number(delta.promptTokens) || 0),
    completionTokens: (Number(base.completionTokens) || 0) + (Number(delta.completionTokens) || 0),
  };
}

// foldCost(acc, delta) — accumulate a worker's folded-back cost into the supervisor's running total.
function foldCost(acc, delta = {}) {
  acc.providerCalls += Number(delta.providerCalls) || 0;
  acc.promptTokens += Number(delta.promptTokens) || 0;
  acc.completionTokens += Number(delta.completionTokens) || 0;
}

// writeRouteCell — one append-only EAVT cell per ROUTE: which worker the recognition pick named for the
// task, the pick verdict, and the spawned child runId (empty when no leader was settled).
function writeRouteCell(root, runId, task, pick, spawn, now) {
  const id = stableId([runId, task.id], "route");
  const term = `supervisor/${runId}/routes/${id}`;
  const doc = {
    kind: "swarm.supervisor.route",
    id,
    created: now,
    runId,
    task: task.id,
    capability: task.capability,
    worker: pick.worker ?? "",
    pickValue: pick.value,
    pickReason: pick.reason,
    candidates: pick.candidates ?? [],
    childRunId: spawn?.runId ?? "",
    childValue: spawn?.value ?? "",
    evidence:
      "route: candidate set is the capability column (offices); the worker is the recognition-derived " +
      "leader (deriveLeader/recognizedAuthority), not an installed office — a below-quorum/split is surfaced.",
  };
  return writeTrace(root, term, doc, { t: id });
}
