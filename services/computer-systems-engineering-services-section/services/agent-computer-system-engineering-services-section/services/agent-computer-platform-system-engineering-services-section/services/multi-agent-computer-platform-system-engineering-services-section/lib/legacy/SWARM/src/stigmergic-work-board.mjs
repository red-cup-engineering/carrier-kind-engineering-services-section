// stigmergic-work-board — a workflow is WORK DEPOSITED ON A TRACE FIELD, not a central orchestrator.
//
// This is the stigmergic-orchestration seam's seed (design note:
// docs/dev/notes/2026-06-05-seam-stigmergic-orchestration.md). It realizes, ON the swarm-sheaf
// substrate, the contrast the corpus draws between the two coordination regimes:
//
//   • ORCHESTRATED: a central workflow() holds the agent list, pairs work to agents, and serializes
//     the assignment. Per-step coordination cost is superlinear — ~O(N²) peer-to-peer, ω(N) at the
//     orchestrator — and the empirical saturation knee lands at ~4 agents
//     (theories/.../coordination-overhead-grows-superlinearly, MASFT 2025).
//   • STIGMERGIC: work is DEPOSITED as a mark on the shared environment-trace field; later workers
//     SENSE the field and pick up work; no worker addresses another. Per-step cost is O(N+|L|) with
//     NO O(N²) term (theories/.../stigmergy-decouples-coordination-cost, status PROVED).
//
// The field IS the EAVT predication trace. Deposition is appending a cell; sensing is the swarm-sheaf
// canonical fold (settledSection / columnRead); the gradient is the count of affirming witnesses the
// fold already carries (the trace's stand-in for pheromone concentration — read-time, never a
// destructive evaporation, because the trace is append-only and monotone).
//
// The paraconsistent twist the corpus keeps: a CLAIM is itself a deposited cell that settles. If two
// characters claim the same work, the (work, "claimedBy") cell holds BOTH claimants as distinct
// objects — it rises to held-⊤ (contested), NOT last-writer-collapse. consensus(H0) is the case where
// exactly one claimant stands; disagreement (H1) is the held-⊤ contested claim, surfaced not silenced.
// This module reads that contest off the Chu space; it does not resolve it by fiat.
//
// SUBSTRATE: every read goes through swarm-sheaf (the ONE canonical fold). Every write goes through
// events.writeTrace (the ONE governed append). This module adds NO new algebra and NO message bus.

import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";
import { settledSection } from "./swarm-sheaf.mjs";

// the board's field lives under one term per work item: a deposited unit of work is a term carrying
// the work's status cell and (once claimed) its claim cells. The board "location space" L is the set
// of these work terms — |L| grows with the work, NOT with the square of the characters sensing it.
function workTerm(board, workId) {
  return `stigmergy/work-board/${board}/${workId}`;
}

// the scalar value a settled section stores a coordinate as (TTMS rides scalars as {const:v}).
const scalarOf = (x) => (x && typeof x === "object" && "const" in x ? x.const : x);

// depositWork(root, board, workId, fields, options) — DEPOSIT a unit of work on the field. No agent is
// named; no recipient is addressed. A later character finds it by sensing an `open` gradient. Returns
// the written trace. This is the orchestrator-free analogue of enqueueing into a workflow().
export function depositWork(root, board, workId, fields = {}, options = {}) {
  const term = workTerm(board, workId);
  return writeTrace(root, term, { status: "open", workId, ...fields }, options);
}

// senseOpen(root, board, workIds, options) — SENSE the field for pickup-able work: the open gradient.
// A character supplies the work ids it can see (the carrier; the board folds each named term until
// writeDual makes this a local predicate-log fold — refounding P3). Returns each open work with its
// claim gradient: how many distinct claimants the (work, claimedBy) cell already holds. A character's
// local pickup rule reads this gradient — it does NOT consult any other character.
export function senseOpen(root, board, workIds, options = {}) {
  // reads go through the canonical fold at the MEMORY root — events.writeTrace deposits under
  // memoryRootOf(root), so the board senses the same field it deposits to.
  const mem = memoryRootOf(root);
  const open = [];
  for (const id of workIds) {
    const term = workTerm(board, id);
    const section = settledSection(mem, term);
    const statuses = section.assignments
      .filter((a) => scalarOf(a.cell.predicate) === "status")
      .map((a) => scalarOf(a.cell.object));
    if (!statuses.includes("open")) continue;
    if (statuses.includes("done")) continue;
    const claim = claimGradient(section);
    open.push({ workId: id, term, claimants: claim.claimants, contested: claim.contested });
  }
  // sort by WEAKEST claim gradient first — pick up the least-attended work, the stigmergic load
  // balancer (a deposited claim raises a work's gradient, steering the next character elsewhere).
  open.sort((a, b) => a.claimants.length - b.claimants.length);
  return open;
}

// claimGradient(section) — read the (work, "claimedBy") cell off the settled section. The fold keeps
// EVERY claimant as a distinct cell, so contested === more than one claimant stands (held-⊤, an H1
// disagreement). consensus (H0) is exactly one claimant. We read the contest; we do not collapse it.
export function claimGradient(section) {
  const claimants = section.assignments
    .filter((a) => scalarOf(a.cell.predicate) === "claimedBy")
    .map((a) => scalarOf(a.cell.object));
  const unique = [...new Set(claimants)];
  return { claimants: unique, contested: unique.length > 1, consensus: unique.length === 1 };
}

// claimWork(root, board, workId, by, options) — DEPOSIT a claim mark. This is a local append: the
// character writes (work, claimedBy, itsName). It does NOT lock, does NOT message the other characters,
// does NOT consult an orchestrator. Two characters may both deposit; the field then holds a contested
// claim, surfaced by readClaim — the stigmergic system's honest H1, not a silent race.
export function claimWork(root, board, workId, by, options = {}) {
  const term = workTerm(board, workId);
  // a claim is its own witnessed cell; the depositor's name is the object so distinct claimants stay
  // distinct cells. A monotone t (the claimant + the supplied tick) keeps re-claims idempotent.
  const t = options.t ?? `${workId}:claim:${by}`;
  return writeTrace(root, term, { claimedBy: by }, { ...options, t });
}

// readClaim(root, board, workId) — read the settled claim off the field: who stands, and whether the
// claim is consensual (H0, one claimant) or contested (H1, held-⊤). The single read a character does
// AFTER depositing its claim to learn whether it won uncontested or must defer/settle.
export function readClaim(root, board, workId) {
  const section = settledSection(memoryRootOf(root), workTerm(board, workId));
  return claimGradient(section);
}

// completeWork(root, board, workId, by, options) — DEPOSIT a completion mark. A `done` status cell is
// appended ALONGSIDE the `open` cell (append-only: the work term then holds open AND done as distinct
// cells — its full history stands), and senseOpen filters it out of future pickup. No central
// bookkeeper marks the work closed; the field carries the completion and every sensing character reads
// it off the same fold.
export function completeWork(root, board, workId, by, options = {}) {
  const term = workTerm(board, workId);
  const t = options.t ?? `${workId}:done:${by}`;
  return writeTrace(root, term, { status: "done", completedBy: by }, { ...options, t });
}
