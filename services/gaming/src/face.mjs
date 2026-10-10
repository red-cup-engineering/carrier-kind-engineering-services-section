/**
 * face — gaming's OUTSIDE local section over an inter-agent membrane, read on
 * the EVIDENCE axis.
 *
 * In the bulk-over-faces relation (dev/docs/notes/2026-06-21-bulk-over-faces-
 * local-section-threading.md), organizing is a holographic *bulk* over three
 * boundary *faces*; gaming is the **outside** face. Each face is a local section
 * over its faculty's inter-agent membrane (a `readonly UtteranceCarrier[]` log),
 * read on one of the three transverse bilattice axes (the agentive triad,
 * Avron's twist-product representation). Gaming reads the **evidence** axis: the
 * paired ⟨a₊, a₋⟩ for/against record (content/_archive …/predication-categories/
 * concepts/evidence.md — "the value of an assertion is a *pair* of independently
 * tracked sides, never collapsed into a single signed scalar"; negation
 * interchanges the sides).
 *
 * Crucially this is **gaming's own reading**, not organizing's generic
 * descend-then-section-count. The for/against pair is precisely Player/Opponent
 * polarity (structuring/concurrent-game/with-symmetry/polarity: positive ↔ told-
 * true ↔ Player, negative ↔ told-false ↔ Opponent). So gaming builds its OWN
 * **arena** — a polarized prime event structure with causality and conflict — out
 * of the membrane, and reads the local section off the *arena's event geometry*:
 *
 *   - cover     = the arena's events (each settled cell is one polarized event)
 *   - held      = events committing a definite side (readingPolarity ≠ null) —
 *                 the for/against record the arena actually holds
 *   - contested = events in CONFLICT (a for-event and an against-event on the
 *                 same locus) OR carrying the told-both (⊤, stable) reading — the
 *                 held contradiction the twist product reads at ⟨a₊,a₋⟩ = ⟨1,1⟩
 *
 * The bulk (organizing) glues this against socializing (truth) and computing
 * (knowledge) by the three-replica Mayer–Vietoris in its `crossArena`. This
 * module never imports `@red-cup-engineering/organizing`; the dependency runs bulk → faces,
 * and gaming is a leaf over relating/animating/playing.
 */
import { rankVanishing } from "@red-cup-engineering/signgraph/cohomology";
import { descend } from "@red-cup-engineering/animating/becoming/descending";
import { arena, arenaEvents } from "./structuring/concurrent-game/with-symmetry/arena.mjs";
import { event, eventStructure } from "@red-cup-engineering/playing/structuring/event/structure";
import { polarity } from "@red-cup-engineering/playing/structuring/polarity";
import { transposition } from "./structuring/concurrent-game/with-symmetry/nominalizing/permutation.mjs";
import { eventName, nominalActionJudgment } from "./structuring/concurrent-game/with-symmetry/nominalizing/action.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { census } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The agentive-triad bilattice axis gaming's face reads. */

/** The evidence-axis FOUR census of the arena's events, one corner per cell, read as
 *  ADJUDICATION's disciplines (the receiving-dual reading the organizing bulk consolidates;
 *  content/_archive adjudication.md) on the evidence twist product ⟨a₊,a₋⟩: ⊥ told-nothing
 *  = ⟨0,0⟩ held OPEN (no committed side), t told-true = ⟨1,0⟩ a₊ (Player / for), f
 *  told-false = ⟨0,1⟩ a₋ (Opponent / against), ⊤ told-both = ⟨1,1⟩ held CONTESTED. This is
 *  the clean per-cell partition of the cover by reading value (`potential`+`active` = the
 *  committed `held`; `stable` = the per-cell told-both); the richer `contested` (also
 *  counting for/against CONFLICT edges across cells) and `forCount`/`againstCount` remain
 *  the arena's own evidence geometry. */

    

    

    

       

/**
 * The CONCURRENCY structure of gaming's arena — its REAL CGS work (the defining datum of a
 * concurrent game, now that the generic census/reading math is upstream). The arena is a prime
 * event structure (E, ≤, #) and the three relations PARTITION the distinct event pairs (they
 * are exhaustive and mutually exclusive): causality `≤` (one event ENABLES another — sequential
 * order), conflict `#` (two events EXCLUDE each other — cannot both stand), and CONCURRENCY `co`
 * (neither — genuinely INDEPENDENT / parallel moves). Concurrency is what makes a CONCURRENT
 * game concurrent (vs sequential Hyland–Ong play); `causal + conflict + concurrent = C(|E|,2)`.
 * Grounded in dev/docs/notes/2026-06-21-gaming-as-multi-agent-playing.md (the arena = prime
 * event structure with symmetry; CGS = Rideau–Winskel / Castellan–Clairambault–Winskel).
 */

    

  

    
  

/**
 * The SYMMETRY of gaming's arena — the datum `Ẽ` that promotes a plain concurrent game to
 * CGS proper (`(E,≤,#,Ẽ)`, the "WITH symmetry" of Castellan–Clairambault–Winskel). A
 * symmetry is a bijection on events preserving polarity, causality, and conflict; the groupoid
 * of such bijections is FSym(𝔸) — finite permutations of the agent/name set — and "symmetry IS
 * the multi-agent structure" (the nominalizing layer playing leaves un-surfaced, gaming's core;
 * 2026-06-21-gaming-as-multi-agent-playing.md). Two events are interchangeable when transposing
 * just them is a valid arena symmetry (decided by the REAL `nominalActionJudgment` law over
 * per-event AGMOS names) — structurally identical independent plays by interchangeable agents.
 * This is organizing's `nameMobility` (entity-mobility, FSym(𝔸)-equivariance) read at arena
 * scale: 0 symmetric pairs ⟺ a RIGID arena (every play a distinct role, no permutation symmetry);
 * `symmetric > 0` ⟺ genuinely "with symmetry" — the arena admits non-trivial agent permutations.
 */

 ﻿  

  

    

  

/**
 * Gaming's outside local section over a membrane, read on the evidence axis. The
 * thin trio `{ cover, held, contested }` is what the bulk consumes; the
 * axis-thick fields expose the arena geometry the trio is read from — the
 * Player/Opponent split (`forCount`/`againstCount`) and the conflict obstruction
 * (`conflicts`) that make this an *evidence* reading rather than a flat count.
 */

     

  

  

  

  

  
  
    
   
  

  

     ﻿

  

/** A settled cell's `subject|predicate` key — its locus identity in the arena. */
const cellKey = (cell) => `${String(cell.subject)}|${JSON.stringify(cell.predicate)}`;

/** A settled cell's subject — its locus (the agent/assertion the events sit on). */
const subjectKey = (cell) =>
  String(cell.subject);

/** The polarized moves a settled cell makes: one per side told — for ↦ positive (Player, a₊), against ↦
 *  negative (Opponent, a₋). A cell told both makes both, and they conflict on its locus. */
const movesOf = (told) => [
  ...(told.for.length > 0 ? [{ id: `${cellKey(told)}|for`, locus: subjectKey(told), name: "positive" }] : []),
  ...(told.against.length > 0 ? [{ id: `${cellKey(told)}|against`, locus: subjectKey(told), name: "negative" }] : []),
];

/**
 * Build gaming's OWN arena from a settled membrane's moves: each told side of a
 * settled cell is one polarized event. The reading's committed side IS the Player/Opponent polarity
 * (positive ↔ potential/told-true ↔ Player; negative ↔ active/told-false ↔
 * Opponent); cells whose reading commits no side (absurd ⊥ / told-both ⊤) get the
 * positive polarity by default but are *not* counted as held (see `gamingFace`).
 *
 * Causality chains events on the same locus by their settlement order — an
 * earlier for/against record on a locus causally precedes a later one (the
 * accumulation the knowledge order tracks, here read as the prefix order of the
 * arena's plays). Conflict joins an opposed pair on the same locus — a for-event
 * and an against-event on one assertion cannot both stand: the held
 * contradiction.
 */
function arenaOfMembrane(entries)

 {
  const events = [];
  const causality = [];
  const conflict = [];
  const committed = new Map();
  // last seen event id per locus, and the for/against event ids per locus.
  const lastOnLocus = new Map();
  const forOnLocus = new Map();
  const againstOnLocus = new Map();

  for (const move of entries) {
    const { id, name, locus } = move;
    if (committed.has(id)) continue; // one event per told side
    // the Player/Opponent polarity IS the telling's side.
    events.push(event(id, polarity(name)));
    committed.set(id, name);

    const prev = lastOnLocus.get(locus);
    if (prev !== undefined) causality.push(Object.freeze([prev, id]));
    lastOnLocus.set(locus, id);

    if (name === "positive") {
      for (const opp of againstOnLocus.get(locus) ?? []) conflict.push(Object.freeze([opp, id]));
      forOnLocus.set(locus, [...(forOnLocus.get(locus) ?? []), id]);
    } else if (name === "negative") {
      for (const f of forOnLocus.get(locus) ?? []) conflict.push(Object.freeze([f, id]));
      againstOnLocus.set(locus, [...(againstOnLocus.get(locus) ?? []), id]);
    }
  }

  return {
    arena: arena(eventStructure(events, causality, conflict)),
    committed,
  };
}

/** The CONCURRENCY partition of an arena's event pairs: causal (≤), conflict (#), and
 *  concurrent (co — neither). Exhaustive and mutually exclusive over distinct pairs, so
 *  `causal + conflict + concurrent = C(|E|,2)`. Concurrency is the CGS-defining structure. */
function concurrencyOf(a, eventCount) {
  const pairKey = (x, y) => (x < y ? `${x}|${y}` : `${y}|${x}`);
  const causalSet = new Set(a.structure.causality.map(([x, y]) => pairKey(x, y)));
  const conflictSet = new Set(a.structure.conflict.map(([x, y]) => pairKey(x, y)));
  const causal = causalSet.size;
  const conflict = conflictSet.size;
  const total = (eventCount * (eventCount - 1)) / 2;
  const concurrent = Math.max(0, total - causal - conflict);
  return Object.freeze({ causal, conflict, concurrent });
}

/**
 * Discover the arena's SYMMETRY groupoid `Ẽ` from the membrane, using the REAL CGS symmetry
 * law (`nominalActionJudgment` over per-event AGMOS names): two events are interchangeable iff
 * transposing JUST them (fixing the rest) is a valid arena symmetry — total, bijective, and
 * preserving polarity/causality/conflict. Returns both the FSym-generator bijections (to install
 * into the arena as `Ẽ`) and the `ArenaSymmetry` reading (orbits/interchangeable/uniform), with
 * orbits computed as the connected components of the symmetric relation (union–find). */
function symmetryOf(a, events) {
  const n = events.length;
  // each event named by its own id (unique cellKeys) — the AGMOS one-name-per-move labelling.
  const labels = events.map((e) => eventName(e.id, e.id));
  // union–find over event indices for the orbit partition.
  const parent = events.map((_, i) => i);
  const find = (i) => { let r = i; while (parent[r] !== r) { parent[r] = parent[parent[r]]; r = parent[r]; } return r; };
  const union = (i, j) => { const ri = find(i), rj = find(j); if (ri !== rj) parent[ri] = rj; };

  const groupoid = [];
  let symmetric = 0;
  for (let i = 0; i < n; i += 1) {
    const ei = events[i];
    for (let j = i + 1; j < n; j += 1) {
      const ej = events[j];
      const judgment = nominalActionJudgment(a, labels, transposition(ei.id, ej.id));
      if (judgment.kind === "game.nominal.action:witness") {
        symmetric += 1;
        groupoid.push(judgment.bijection);
        union(i, j);
      }
    }
  }
  const roots = new Set();
  for (let i = 0; i < n; i += 1) roots.add(find(i));
  let interchangeable = 0;
  const orbitSize = new Map();
  for (let i = 0; i < n; i += 1) { const r = find(i); orbitSize.set(r, (orbitSize.get(r) ?? 0) + 1); }
  for (let i = 0; i < n; i += 1) if ((orbitSize.get(find(i)) ?? 0) >= 2) interchangeable += 1;

  return {
    reading: Object.freeze({ names: n, symmetric, orbits: roots.size, interchangeable, uniform: symmetric > 0 }),
    groupoid,
  };
}

/** The ids that appear in any conflict edge of the arena. */
function conflictedIds(a) {
  const ids = new Set();
  for (const [from, to] of a.structure.conflict) {
    ids.add(from);
    ids.add(to);
  }
  return ids;
}

/** The arena's conflict cohomology: each for/against conflict edge is one first-cohomology generator
 *  (a cell from one event to the other), the rank is their count, and it vanishes exactly when there are none. */
function conflictCohomologyReceipt(a) {
  const generators = Object.freeze(a.structure.conflict.map(([from, to]) => Object.freeze({ subject: from, predicate: "gaming-conflict", object: to })));
  return Object.freeze({
    kind: "gaming.face.conflict-cohomology",
    obstruction: generators.length,
    first: Object.freeze({ kind: "gaming.conflictFirstCohomology", generators, rank: generators.length, degree: 1 }),
    vanishing: rankVanishing(generators.length),
  });
}

/**
 * Gaming's outside face: read the membrane as gaming's own arena and project the
 * evidence-axis local section.
 *
 * Domain: an inter-agent membrane (a `readonly UtteranceCarrier[]` log).
 * Codomain: `GamingFace` — `{ cover, held, contested }` (the trio the bulk
 * glues) plus the arena and the ⟨for, against⟩ split it was read from.
 *
 * Law: `cover` = |arena events|; `held` = events committing a definite side
 * (for + against); `contested` = events in a for/against conflict OR carrying
 * the told-both (⊤, stable) reading. An empty membrane yields the empty arena and
 * the zero section. This is gaming's reading — the arena's event geometry — not
 * a relabelled generic descend.
 */
export function gamingFace(membrane) {
  if (membrane.length === 0) {
    const emptyArena = arena(eventStructure([]));
    return Object.freeze({
      kind: "gaming.face",
      faculty: "gaming",
      direction: "outside",
      axis: "evidence",
      cover: 0,
      held: 0,
      contested: 0,
      forCount: 0,
      againstCount: 0,
      belnap: Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 }),
      obstruction: 0,
      cohomology: conflictCohomologyReceipt(emptyArena),
      concurrency: Object.freeze({ causal: 0, conflict: 0, concurrent: 0 }),
      symmetry: Object.freeze({ names: 0, symmetric: 0, orbits: 0, interchangeable: 0, uniform: false }),
      arena: emptyArena,
    });
  }

  const state = descend(membrane);
  const entries = state.settlement.settled.flatMap(movesOf); // every side actually told
  const { arena: discrete, committed } = arenaOfMembrane(entries);
  const events = arenaEvents(discrete);
  // discover the FSym(𝔸) symmetry groupoid Ẽ and install it: the arena is now "with symmetry".
  const { reading: symmetry, groupoid } = symmetryOf(discrete, events);
  const built = arena(discrete.structure, groupoid);
  const conflicted = conflictedIds(built);

  let forCount = 0;
  let againstCount = 0;
  // The evidence-axis FOUR census is PARAMETERIZED from relating's `census` over the distinct
  // cells' COMMITTED evidence side (the negation-aware Player/Opponent polarity, not the
  // all-positive descent reading): positive→a₊ potential, negative→a₋ active. Each move commits ONE
  // side; a cell told both makes two moves, and the held contradiction ⊤ surfaces as the for/against
  // CONFLICT edge between them on its locus (gaming's event-structure model of told-both), counted in
  // `contested`/`obstruction`.
  const distinctReadings = [];
  const censused = new Set();
  for (const move of entries) {
    const id = move.id;
    const side = committed.get(id);
    if (side === "positive") forCount += 1;
    else if (side === "negative") againstCount += 1;
    if (!censused.has(id)) {
      censused.add(id);
      distinctReadings.push((side === "negative" ? "active" : "potential"));
    }
  }
  const belnap = census(distinctReadings);

  const held = forCount + againstCount;
  // contested = held contradictions: for/against CONFLICT events on a shared locus (the ⊤
  // told-both the evidence twist product reads as ⟨1,1⟩, here a conflict edge in the arena).
  const contested = conflicted.size;

  return Object.freeze({
    kind: "gaming.face",
    faculty: "gaming",
    direction: "outside",
    axis: "evidence",
    cover: events.length,
    held,
    contested,
    forCount,
    againstCount,
    belnap: Object.freeze(belnap),
    // H¹: the for/against conflict edges — the arena's gluing obstruction (≠ contested).
    obstruction: built.structure.conflict.length,
    cohomology: conflictCohomologyReceipt(built),
    // gaming's CGS-defining reading: the causal/conflict/concurrent partition of the arena.
    concurrency: concurrencyOf(built, events.length),
    // the FSym(𝔸) symmetry Ẽ the membrane's interchangeable plays exhibit (the "with symmetry").
    symmetry,
    arena: built,
  });
}
