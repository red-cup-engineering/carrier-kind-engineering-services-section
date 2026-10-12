import { asChargeValueName } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";
// recognition.mjs — recognition-based authority (NOT office-installed).
//
// The corpus's swarm-governance note (computer/docs/dev/notes/swarm-governance.md §1) states it
// plainly: "a swarm is governed by a RECOGNITION discipline — characters emit recognition cells naming
// which other characters they treat as load-bearing for which decisions. The aggregate of recognition
// cells over a participant determines that participant's structural role — including whether they bear
// the leader role. AUTHORITY IN A SWARM IS THE AGGREGATE OF RECOGNITION; IT IS NOT INSTALLED BY
// OFFICE." The `has-leader` predication is DERIVED from the recognition cells (swarm-governance.md §1
// lines 22-24), "absent when no character holds SUFFICIENT recognition."
//
// HEADER/CODE RECONCILIATION (refounding plan risk #8). The operative `has-leader` derivation this
// module computes is the THRESHOLD reading the note states in §1: a leader exists iff a participant
// holds SUFFICIENT recognition — i.e. recognition-COUNT ≥ quorum (deriveLeader below, lines computing
// `top.recognitionCount >= quorum`). The §3 identity-4 "meet of member-recognition cells" language
// (swarm-governance.md:84-85) is the WITHDRAWAL semantics, NOT a second derivation: iyúhá-šni
// (withdrawal-without-severance) drops a recognizer's engagement to ⊥ — it "collapses the conjunction"
// by REMOVING that standing recognition (recognitionFor's second pass deletes it), which lowers the
// count toward the quorum. So the two readings are one mechanism: standing recognitions are counted,
// withdrawal removes one, and `has-leader` fires when the surviving count meets the threshold. This
// header now matches the code (count ≥ quorum); it does not claim a knowledge-meet the code never runs.
//
// This is the theory's other pole from swarm's running office model (offices.mjs installs capabilities
// by office). It does NOT replace it — the README/JOB keep both. This module ADDS the recognition
// reading: workers emit recognition cells over the EAVT trace (stigmergic — no addressee), and a
// participant's authority for a decision is the AGGREGATE of recognition naming it load-bearing. The
// leader is DERIVED (the conjunction of recognition over a quorum), never installed. It authors no
// Lakota content; the wolakȟota standing it points at remains the corpus's.

import read from "@561-group/computer/typed-term-memory-system/reading";
import { present } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";


import { stableId } from "./cognition.mjs";
import { writeTrace } from "./events.mjs";
import { memoryRootOf } from "./memory.mjs";

// recognition cells live at a per-decision term: who recognizes whom as load-bearing for a decision.
// The cell is (recognizer, "recognizes", recognized) filed under the decision's recognition term — a
// stigmergic deposit, found by aggregation, not sent to anyone.
function recognitionTerm(decision) {
  return `recognition/decisions/${decision}`;
}

// recognize(root, recognizer, recognized, decision, options) — a worker EMITS a recognition cell: it
// names `recognized` as load-bearing for `decision`. Append-only; the aggregate is read by
// recognitionFor. A worker may later WITHDRAW (recognize with affirm=false) — iyúhá-šni: the engagement
// drops to ⊥/f on the negative side while the relation (the cell's existence) persists in the trace.
export function recognize(root, recognizer, recognized, decision, options = {}) {
  const term = recognitionTerm(decision);
  const now = options.now ?? new Date().toISOString();
  const affirm = options.affirm !== false;
  const t = options.t ?? stableId([decision, recognizer, recognized, affirm, now], "recognition");
  // a recognition deposits a positive cell `recognizes:<recognized> = <recognizer>`. A WITHDRAWAL
  // (affirm:false — iyúhá-šni) deposits a DISTINCT positive cell `withdraws:<recognized> =
  // <recognizer>`: the trace stays append-only and monotone (no destructive write), and the relation
  // (the original recognition cell) PERSISTS — recognitionFor folds the withdrawal OUT at read time,
  // dropping engagement to ⊥ while the recognition cell still stands in the trace. The corpus's
  // withdrawal-without-severance, kept as two positive facts the read reconciles.
  const predicate = affirm ? `recognizes:${recognized}` : `withdraws:${recognized}`;
  const doc = { [predicate]: recognizer, recognizedParticipant: recognized, recognizedBy: recognizer, decision };
  return writeTrace(root, term, doc, { ...options, t });
}

// recognitionFor(root, decision, options) — AGGREGATE the recognition cells for a decision: for each
// recognized participant, the set of recognizers who name it load-bearing (the affirming cells minus
// the withdrawn). Returns each participant's recognition count and the set of recognizers — the
// "aggregate of recognition" that determines structural role. PURE fold over the trace.
export function recognitionFor(root, decision, options = {}) {
  const settled = read(memoryRootOf(root), recognitionTerm(decision));
  const byParticipant = new Map();
  const ensure = (recognized) => {
    if (!byParticipant.has(recognized)) byParticipant.set(recognized, { recognizers: new Set(), withdrawn: new Set() });
    return byParticipant.get(recognized);
  };
  // first pass: collect every standing recognition cell (positively present in the trace).
  for (const assignment of settled.assignments) {
    const predicate = assignment.cell.predicate.const ?? assignment.cell.predicate;
    if (typeof predicate !== "string" || !predicate.startsWith("recognizes:")) continue;
    const [pos] = present(assignment.charge);
    if (!pos) continue;
    const recognized = predicate.slice("recognizes:".length);
    const recognizer = assignment.cell.object.const ?? assignment.cell.object;
    ensure(recognized).recognizers.add(recognizer);
  }
  // second pass: fold OUT every withdrawal (iyúhá-šni) — engagement dropped, the recognition cell kept.
  for (const assignment of settled.assignments) {
    const predicate = assignment.cell.predicate.const ?? assignment.cell.predicate;
    if (typeof predicate !== "string" || !predicate.startsWith("withdraws:")) continue;
    const [pos] = present(assignment.charge);
    if (!pos) continue;
    const recognized = predicate.slice("withdraws:".length);
    const recognizer = assignment.cell.object.const ?? assignment.cell.object;
    const rec = ensure(recognized);
    rec.withdrawn.add(recognizer);
    rec.recognizers.delete(recognizer);
  }
  const participants = [...byParticipant.entries()].map(([participant, rec]) => ({
    participant,
    recognizers: [...rec.recognizers].sort(),
    withdrawn: [...rec.withdrawn].sort(),
    recognitionCount: rec.recognizers.size,
  })).sort((a, b) => b.recognitionCount - a.recognitionCount || a.participant.localeCompare(b.participant));
  return Object.freeze({ kind: "swarm.recognition", decision, participants });
}

// deriveLeader(root, decision, options) — DERIVE who (if anyone) bears the leader role for a decision:
// the participant whose recognition count meets the quorum (the CONJUNCTION of member recognition —
// "the meet of member-recognition cells"). `quorum` is the count required (default: a strict majority
// of the recognizers who have spoken; pass options.quorum for an absolute threshold). The `has-leader`
// reading is ABSENT (leader: null) when no participant holds sufficient recognition — never installed.
export function deriveLeader(root, decision, options = {}) {
  const aggregate = recognitionFor(root, decision, options);
  // the electorate is everyone who has SPOKEN — recognizers AND withdrawers. A withdrawal does not
  // shrink the electorate (the member stays in relation, iyúhá-šni); it only moves that member out of
  // the standing recognition. So the quorum is computed over the full electorate, and a withdrawal
  // genuinely COLLAPSES the conjunction: the same quorum, fewer standing recognitions to meet it.
  const electorate = new Set();
  for (const p of aggregate.participants) {
    for (const r of p.recognizers) electorate.add(r);
    for (const w of p.withdrawn) electorate.add(w);
  }
  const quorum = Number.isFinite(options.quorum)
    ? options.quorum
    : Math.floor(electorate.size / 2) + 1; // strict majority of the electorate that has spoken
  const top = aggregate.participants[0] ?? null;
  const hasLeader = !!top && top.recognitionCount >= quorum && quorum > 0;
  return Object.freeze({
    kind: "swarm.recognition.leader",
    decision,
    hasLeader,                                   // DERIVED, not installed — absent below quorum
    leader: hasLeader ? top.participant : null,
    recognitionCount: top?.recognitionCount ?? 0,
    quorum,
    recognizers: top?.recognizers ?? [],
    participants: aggregate.participants,
  });
}

// recognizedAuthority(root, decision, participant, options) — does `participant` hold RECOGNITION-based
// authority for `decision`? A FOUR-style verdict the dispatch/governance path can fold in: t when the
// participant is the derived leader (recognition ≥ quorum), f when recognized by none, ⊥ when some
// recognize but quorum is not met (authority undecided — the swarm has not settled a leader). This is
// the recognition POLE of authority, alongside (not replacing) the office gate (offices.can).
export function recognizedAuthority(root, decision, participant, options = {}) {
  const derived = deriveLeader(root, decision, options);
  if (derived.hasLeader && derived.leader === participant) {
    return { value: "potential", reason: `${participant} holds recognition ${derived.recognitionCount} ≥ quorum ${derived.quorum}.`, derived };
  }
  const p = derived.participants.find((x) => x.participant === participant);
  if (!p || p.recognitionCount === 0) {
    return { value: "active", reason: `${participant} is recognized by no one for ${decision}.`, derived };
  }
  return { value: "absurd", reason: `${participant} holds recognition ${p.recognitionCount} < quorum ${derived.quorum}; authority undecided.`, derived };
}

// authorityFour(root, decision, participant, options) — recognizedAuthority's verdict ROUTED THROUGH
// `asFour` into a genuine FOUR member (not a bare 'potential'/'active'/'absurd' string), so the governance/dispatch
// fold can settle "does this participant hold recognition-authority?" alongside any other FOUR
// judgment under the admissibility meet. The 'absurd' (some recognition, but below quorum — the swarm has
// not settled a leader) becomes "absurd" (⊥, genuinely undecided), the state the binary isLeader gate
// could never express. This carries the recognition POLE of authority into the four-valued world.
export function authorityFour(root, decision, participant, options = {}) {
  const verdict = recognizedAuthority(root, decision, participant, options);
  return { value: asChargeValueName(verdict.value), reason: verdict.reason, derived: verdict.derived };
}

// leaderJudgment(root, decision, options) — settle "A LEADER EXISTS for this decision" as a FOUR-valued
// judgment over the recognition cells, the recognition-pole answer to the binary `has-leader`:
//   • t   — a participant's recognition count ≥ quorum: a leader is settled (deriveLeader.hasLeader).
//   • ⊥   — some recognition stands but no participant meets the quorum: undecided, the swarm has not
//           settled a leader (the 'absurd' state). This is the genuinely-undecided pole.
//   • ⊤   — TWO or more participants meet the quorum at once: a HELD contradiction — recognition names
//           more than one leader and the swarm has not resolved which. Never collapsed to one.
//   • f   — no participant holds any standing recognition: a leader is denied (no electorate has named
//           anyone load-bearing for this decision).
// `bot`→⊥ and the tie→⊤ are the two "undecided" homes the binary gate lacked.
export function leaderJudgment(root, decision, options = {}) {
  const derived = deriveLeader(root, decision, options);
  const atOrAboveQuorum = derived.quorum > 0
    ? derived.participants.filter((p) => p.recognitionCount >= derived.quorum)
    : [];
  if (atOrAboveQuorum.length > 1) {
    return {
      value: "stable",
      reason: `${atOrAboveQuorum.length} participants each hold recognition ≥ quorum ${derived.quorum} (${atOrAboveQuorum.map((p) => p.participant).join(", ")}); a leader is contradicted, held ⊤.`,
      derived,
    };
  }
  if (derived.hasLeader) {
    return {
      value: "potential",
      reason: `${derived.leader} holds recognition ${derived.recognitionCount} ≥ quorum ${derived.quorum}; a leader is settled.`,
      derived,
    };
  }
  const anyRecognition = derived.participants.some((p) => p.recognitionCount > 0);
  if (anyRecognition) {
    return {
      value: "absurd",
      reason: `recognition stands but none meets quorum ${derived.quorum}; a leader is undecided (⊥).`,
      derived,
    };
  }
  return {
    value: "active",
    reason: `no participant holds standing recognition for ${decision}; a leader is denied.`,
    derived,
  };
}
