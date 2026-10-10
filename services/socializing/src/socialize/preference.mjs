/**
 * preference — socializing's COLLECTIVE-PREFERENCE aggregation: the corpus's escape from
 * ARROW'S IMPOSSIBILITY THEOREM and the CONDORCET PARADOX, built on a layer-1 capability.
 *
 * Layer-2 (socializing = communicating among many) inherits a famous impossibility: Arrow
 * (arrows-impossibility.md) proves no social-welfare function aggregating individual orderings
 * into a COMPLETE TRANSITIVE collective ordering can satisfy universal-domain + Pareto + IIA +
 * non-dictatorship. The sharpest face of it is the CONDORCET PARADOX: majority rule over the
 * classic profile (A≻B≻C, B≻C≻A, C≻A≻B) yields the INTRANSITIVE CYCLE A≻B≻C≻A.
 *
 * A Condorcet cycle is EXACTLY a non-trivial PERIODIC ORBIT in the social preference relation —
 * and the corpus PROVES (closure-monad-no-non-trivial-periodic-orbits.md, the layer-1 capability
 * behind knowing's `attract`) that the monotone + inflationary + idempotent ≤_k settling has NO
 * non-trivial periodic orbits. So aggregating preferences by the BILATTICE ≤_k JOIN cannot
 * produce a Condorcet cycle: a pair the members SPLIT on settles to ⊤ (told-both — INCOMPARABLE,
 * held paraconsistently by the negation involution) rather than being forced into a direction
 * that closes a cycle. This is the principled Arrow escape Arrow's own framework rules out by
 * assumption — RELAX COMPLETENESS of the collective order (allow ⊤/incomparable pairs; cf. Sen's
 * quasi-transitive / acyclic social choice) — keeping universal-domain, Pareto, IIA, transitivity
 * (acyclicity), AND non-dictatorship. The price is honest: where members genuinely conflict, the
 * society holds ⊤ instead of manufacturing a spurious winner.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { admitSeed, descend } from "@red-cup-engineering/animating/becoming/descending";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { claimValue } from "@red-cup-engineering/signcell/cell";

/** One settled pair of the social preference: the two alternatives (canonical order a < b), the
 *  ≤_k-aggregated standing on the canonical direction a≻b, and the directed verdict. */

   
     
  

    

/** socializing's collective-preference reading — a PARTIAL social order, Condorcet-cycle-free. */

  

    

  
  

    

  

  

/** Parse a membrane claim as a strict preference `X>Y` (X preferred to Y). */
function parsePreference(claim) {
  if (typeof claim !== "string") return null;
  const i = claim.indexOf(">");
  if (i < 0) return null;
  const hi = claim.slice(0, i).trim();
  const lo = claim.slice(i + 1).trim();
  return hi === "" || lo === "" ? null : { hi, lo };
}

const pairKey = (a, b) => `${a}\0${b}`;

/** Whether a directed edge set (Map of from→to[]) has a directed cycle (DFS three-colouring). */
function hasCycle(nodes, edges) {
  const colour = new Map(); // 0 unseen, 1 in-stack, 2 done
  const visit = (n) => {
    colour.set(n, 1);
    for (const m of edges.get(n) ?? []) {
      const c = colour.get(m) ?? 0;
      if (c === 1) return true; // back-edge → cycle
      if (c === 0 && visit(m)) return true;
    }
    colour.set(n, 2);
    return false;
  };
  for (const n of nodes) if ((colour.get(n) ?? 0) === 0 && visit(n)) return true;
  return false;
}

/**
 * aggregatePreferences — settle a society's pairwise preferences into a PARTIAL social order by
 * the ≤_k bilattice join, Condorcet-cycle-free. Each membrane line `voter|X>Y` is a vote X≻Y;
 * per unordered pair {a,b} (canonical a<b) the votes pool along ≤_k (a≻b ↦ potential, b≻a ↦
 * active) so a split pair settles to ⊤ (incomparable) rather than a cycle-closing direction. The
 * decided edges are verified acyclic; `majorityCyclic` records whether majority rule WOULD have
 * produced a paradox the ⊤-holding avoided.
 */
export function aggregatePreferences(membrane) {
  const pooled = new Map();       // canonical pairKey → ≤_k reading of a≻b
  const forCanonical = new Map();       // votes a≻b (canonical direction)
  const againstCanonical = new Map();   // votes b≻a
  const alternatives = new Set();
  for (const carrier of membrane) {
    const pref = parsePreference(claimValue(carrier));
    if (pref === null) continue;
    const { hi, lo } = pref; // hi ≻ lo
    alternatives.add(hi);
    alternatives.add(lo);
    const [a, b] = hi < lo ? [hi, lo] : [lo, hi]; // canonical a < b
    const key = pairKey(a, b);
    const canonical = hi === a; // the vote agrees with canonical direction a≻b
    const side = (canonical ? "potential" : "active");
    const prior = pooled.get(key);
    pooled.set(key, prior === undefined ? side : knowledgeJoinReading(prior, side));
    (canonical ? forCanonical : againstCanonical).set(key, ((canonical ? forCanonical : againstCanonical).get(key) ?? 0) + 1);
  }

  const pairs = [];
  const decidedEdges = new Map();      // from → to over DECIDED pairs
  const majorityEdges = new Map();     // from → to with ⊤ broken by majority
  let decided = 0;
  let contested = 0;
  for (const [key, reading] of pooled) {
    const sep = key.indexOf("\0");
    const a = key.slice(0, sep);
    const b = key.slice(sep + 1);
    const standing = reading;
    const winner = standing === "potential" ? "a" : standing === "active" ? "b" : "incomparable";
    pairs.push({ a, b, standing, winner });

    if (winner === "a") { decided += 1; addEdge(decidedEdges, a, b); addEdge(majorityEdges, a, b); }
    else if (winner === "b") { decided += 1; addEdge(decidedEdges, b, a); addEdge(majorityEdges, b, a); }
    else {
      contested += 1;
      // majority resolution of the ⊤ pair (the move the bilattice REFUSES): orient by vote count.
      const fa = forCanonical.get(key) ?? 0;
      const fb = againstCanonical.get(key) ?? 0;
      if (fa >= fb) addEdge(majorityEdges, a, b); else addEdge(majorityEdges, b, a);
    }
  }

  const alts = [...alternatives].sort();
  const totalPairs = (alts.length * (alts.length - 1)) / 2;
  return {
    kind: "socializing.collective-preference",
    alternatives: Object.freeze(alts),
    pairs: Object.freeze(pairs.sort((x, y) => (x.a === y.a ? x.b.localeCompare(y.b) : x.a.localeCompare(y.a)))),
    decided,
    contested,
    acyclic: !hasCycle(alts, decidedEdges),
    complete: contested === 0 && pairs.length === totalPairs,
    majorityCyclic: hasCycle(alts, majorityEdges),
  };
}

function addEdge(edges, from, to) {
  edges.set(from, [...(edges.get(from) ?? []), to]);
}

const PREFERENCE_SCHEMA = Object.freeze({
  $id: "socializing/collective-preference",
  title: "CollectivePreference",
  type: "object",
  description: "the society's partial social order, Condorcet-cycle-free: alternatives, per-pair ≤_k standing + directed winner (incomparable ⊤ where members split), decided/contested counts, acyclic (guaranteed), complete, and majorityCyclic (whether majority rule would have produced the paradox the ⊤-holding avoided).",
});

const PREFERENCE_INPUT_SCHEMA = Object.freeze({
  $id: "socializing/preference-input",
  title: "CollectivePreferenceInput",
  type: ["string", "array"],
  description: "an inter-agent membrane: newline `voter|X>Y` lines, or a JSON array of `[voter, \"X>Y\"]` / `{ subject, predicate }` items.",
});

const preferenceCarrier = schemaFrom(PREFERENCE_SCHEMA);
const preferenceInputCarrier = schemaFrom(PREFERENCE_INPUT_SCHEMA);

/** aggregate — the collective-preference reading: aggregate pairwise votes into a partial,
 *  Condorcet-cycle-free social order (the corpus's Arrow escape via the no-periodic-orbit theorem). */
export const aggregateAction = operation({
  verb: "aggregate-preferences",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Aggregate a society's pairwise preferences into a partial social order, Condorcet-cycle-free (the bilattice escape from Arrow's impossibility).",
  description: "Domain: an inter-agent membrane — newline `voter|X>Y` lines (each a vote X≻Y), or a JSON array of `[voter, \"X>Y\"]` / `{ subject, predicate }` items. Codomain: socializing/collective-preference — the society's PARTIAL social order aggregated by the ≤_k bilattice join. A pair the members SPLIT on settles to ⊤ (incomparable) instead of a cycle-closing direction, so the order is GUARANTEED acyclic (no Condorcet cycle) by the no-non-trivial-periodic-orbit theorem — the principled escape from Arrow's impossibility (relax completeness, keep transitivity + non-dictatorship). `majorityCyclic` shows whether majority rule would have produced the paradox the ⊤-holding avoided. Grounded in arrows-impossibility.md + closure-monad-no-non-trivial-periodic-orbits.md.",
  domain: preferenceInputCarrier,
  codomain: preferenceCarrier,
  run: (input) => jsonResource(aggregatePreferences(descend(admitSeed(input)).utterances), "collective-preference"),
});
