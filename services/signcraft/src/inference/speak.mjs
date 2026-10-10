// The semiotic language model: Fregean predication -> Belnap FOUR -> Chu.
// An utterance is a saturation event (s,P,o) read in FOUR; a hole is a typed question;
// speaking is Gibbs-saturating holes from their witnessed read fibers, generalizing through
// FCA concept closure (metrologic's formal-context Galois intent/extent) when a fiber is sparse; every
// emission logs its excluded mass. RelConLang surface parsing lives in relconlang.mjs, not
// here; a cell's reading comes from its stance particle, read there. An aspect suffix rides the
// cell as a feature, never fragmenting the verb root into a second predicate.

import { mulberry32 } from "./learn.mjs";
import { makeContext, intent, extent } from "@red-cup-engineering/metrologic/closure/formal-context";
import { parseLine, tokenize, cellCorpus, cellsFromRows } from "./relconlang.mjs";
import { knowledgeBottom, knowledgeJoinReading, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

function normalizeUnitsInput(lines) {
  return lines.map((line, idx) => {
    if (typeof line === "string") return { id: `u${idx}`, text: line };
    if (line.id === undefined) return { ...line, id: `u${idx}` };
    return line;
  });
}

// Build a witnessed model directly from (s,P,o) cells (relconlang.mjs's shape): every cell's
// subject/object saturates its predicate's fiber (evidence-for, always potential — the cell's
// own stance reading rides separately on model.cells, per the header note above).
function witnessCells(cells) {
  const model = {
    predicates: new Map(), // V -> {subjFiber: Map(arg->FOUR), objFiber: Map(arg->FOUR), count}
    cells: [],              // saturation events with readings (the Chu points)
    vocabulary: new Set(),
  };
  for (const cell of cells) {
    if (!cell.s) continue; // no subject: nothing saturates the subject hole
    if (!model.predicates.has(cell.P)) {
      model.predicates.set(cell.P, { subjFiber: new Map(), objFiber: new Map(), count: 0 });
    }
    const P = model.predicates.get(cell.P);
    P.count += 1;
    P.subjFiber.set(cell.s, knowledgeJoinReading(P.subjFiber.get(cell.s) ?? knowledgeBottom(), toldFor));
    if (cell.o) P.objFiber.set(cell.o, knowledgeJoinReading(P.objFiber.get(cell.o) ?? knowledgeBottom(), toldFor));
    model.cells.push(cell);
    model.vocabulary.add(cell.s);
    model.vocabulary.add(cell.P);
    if (cell.o) model.vocabulary.add(cell.o);
  }
  return model;
}

/**
 * Witness a model from RelConLang input: plain surface strings, `{text}` units, or full corpus
 * records (agency `text`, dialogue `turns`, register `lines` — relconlang.mjs's `unitsOf`
 * shapes). Delegates all parsing to relconlang.mjs; this module only fibers the resulting cells.
 * @param {(string|object)[]} lines @returns {ReturnType<typeof witnessCells>}
 */
export function witnessCorpus(lines) {
  const { cells } = cellCorpus(normalizeUnitsInput(lines));
  return witnessCells(cells);
}

// FCA over hole-incidence (and, when supplied, corpus expect.features tags): argument a "bears"
// hole (V,role) — and optionally feature:tag — when witnessed there. Concept-mates are found via
// metrologic's formal-context own Galois intent/extent (the kernel's one FCA implementation), not a second
// hand-rolled overlap counter: for each attribute a bears, extent() gives every other object
// bearing it too.
export function holeConcepts(model, featuresByWord = new Map()) {
  const objects = new Set();
  const pairs = [];
  for (const [V, P] of model.predicates) {
    for (const a of P.subjFiber.keys()) { objects.add(a); pairs.push([a, `${V} subj`]); }
    for (const a of P.objFiber.keys()) { objects.add(a); pairs.push([a, `${V} obj`]); }
  }
  for (const [word, tags] of featuresByWord) {
    if (!objects.has(word)) continue; // only tag witnessed arguments, never invent new objects
    for (const tag of tags) pairs.push([word, `feature:${tag}`]);
  }
  const attributes = [...new Set(pairs.map(([, m]) => m))];
  const ctx = makeContext([...objects], attributes, pairs);
  const conceptMates = new Map();
  for (const a of ctx.G) {
    const mates = new Set();
    for (const m of intent(ctx, new Set([a]))) {
      for (const b of extent(ctx, new Set([m]))) if (b !== a) mates.add(b);
    }
    conceptMates.set(a, mates);
  }
  return { ctx, conceptMates };
}

function gibbsPick(entries, T, rng) {
  const weights = entries.map(([, w]) => Math.exp(w / Math.max(T, 1e-6)));
  const Z = weights.reduce((x, y) => x + y, 0);
  let r = rng() * Z;
  for (let i = 0; i < entries.length; i++) {
    r -= weights[i];
    if (r <= 0 || i === entries.length - 1) {
      const p = weights[i] / Z;
      return { choice: entries[i][0], p, excludedMass: 1 - p };
    }
  }
}

/** The point told for only. */
const toldFor = readingOfSides("knowledge", true, false);
/** A saturator's weight: +2 told for only, -2 told against only, else 0 (told both or none). */
const stanceWeight = (name) => { const [forTold, againstTold] = sidesOfReading(name); return (forTold && !againstTold ? 2 : 0) - (againstTold && !forTold ? 2 : 0); };

// A fiber's saturator weights, with concept-borrowed backoff (weaker weight) when the fiber is
// sparse (<3 witnessed saturators).
function fiberEntries(fiber, concepts) {
  const entries = [];
  for (const [a, q] of fiber) {
    entries.push([a, stanceWeight(q)]);
  }
  if (entries.length < 3 && concepts) {
    const seen = new Set(entries.map(([a]) => a));
    for (const [a] of fiber) {
      for (const mate of concepts.conceptMates.get(a) ?? []) {
        if (!seen.has(mate)) { entries.push([mate, 0.5]); seen.add(mate); }
      }
    }
  }
  return entries;
}

// Speak one sentence: pick a predicate, saturate both holes, emit surface
// with role particles and a receipt per choice (the wit ledger of the act).
export function speak(model, { T = 0.7, rng = Math.random, concepts = holeConcepts(model) } = {}) {
  const preds = [...model.predicates.entries()].map(([V, P]) => [V, Math.log(1 + P.count)]);
  const pv = gibbsPick(preds, T, rng);
  const P = model.predicates.get(pv.choice);
  const sv = gibbsPick(fiberEntries(P.subjFiber, concepts), T, rng);
  const ov = gibbsPick(fiberEntries(P.objFiber, concepts), T, rng);
  const text = `${sv.choice} ga ${pv.choice} do ${ov.choice}.`;
  return {
    text,
    cell: { s: sv.choice, P: pv.choice, o: ov.choice },
    receipt: {
      choices: [
        { hole: "predicate", chose: pv.choice, p: pv.p, excludedMass: pv.excludedMass },
        { hole: "subject", chose: sv.choice, p: sv.p, excludedMass: sv.excludedMass },
        { hole: "object", chose: ov.choice, p: ov.p, excludedMass: ov.excludedMass },
      ],
      temperature: T,
    },
  };
}

// Comprehend: parse to a saturation cell; unfilled holes come back as typed
// questions (Frege's unsaturation = the machine's demand), never guesses.
export function comprehend(model, text) {
  const parsed = parseLine({ id: "comprehend", text });
  if (!parsed.ok) {
    const V = tokenize(text).find((w) => model.predicates.has(w));
    if (V) {
      return { cell: null, questions: [
        { kind: "unsaturated", hole: "subject", predicate: V },
        { kind: "unsaturated", hole: "object", predicate: V },
      ] };
    }
    return { cell: null, questions: [{ kind: "unparsed", text }] };
  }
  const cell = cellsFromRows(parsed.rows)[0];
  if (!cell) return { cell: null, questions: [{ kind: "unparsed", text }] };
  const P = model.predicates.get(cell.P);
  const known = !!P;
  const subjectReading = (cell.s && P?.subjFiber.get(cell.s)) ?? knowledgeBottom();
  const objectReading = (cell.o && P?.objFiber.get(cell.o)) ?? knowledgeBottom();
  return {
    cell: { s: cell.s, P: cell.P, o: cell.o },
    predicateKnown: known,
    readings: { subject: subjectReading, object: objectReading },
    questions: [],
  };
}

// Fisher-Yates (unbiased; `[...arr].sort(() => rng()-0.5)` is a documented biased shuffle and is
// never used for evaluation splits here).
function shuffledFY(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const cellKeyOf = (c) => `${c.s}|${c.P}|${c.o}`;

// Dedupe to DISTINCT (s,P,o) facts: the RelConLang corpus is 45% exact-duplicate facts across
// its files, so splitting per-line leaks train/test answers through repeats. Only object-bearing
// cells are candidate facts (a ccomp-headed clause's `o` is null: nothing to mask).
function distinctObjectCells(cells) {
  const seen = new Map();
  for (const c of cells) if (c.s != null && c.o != null) seen.set(cellKeyOf(c), c);
  return [...seen.values()];
}

// Break weight ties by drawing uniformly among the maximizers (deterministic under a seeded rng).
function argmaxTies(pairs, rng) {
  let max = -Infinity;
  for (const [, w] of pairs) if (w > max) max = w;
  const winners = pairs.filter(([, w]) => w === max).map(([v]) => v);
  return winners.length <= 1 ? winners[0] : winners[Math.floor(rng() * winners.length)];
}

function joinPos(q) {
  if (!q) return 0;
  return stanceWeight(q);
}

// Held-out saturation prediction, one seed: dedupe to distinct (s,P,o) facts, Fisher-Yates
// split, then for each held-out fact score three predictors on the SAME 5-candidate pool (true
// object + same-predicate distractors) — a per-predicate frequency baseline, the plain
// witnessed fiber (no concept borrowing), and the fiber with FCA concept-closure backoff over
// expect.features. A masked-incidence gate that lets its baseline see the whole vocabulary
// while the model sees only a small pool is not scoring the same task; this scores all three
// predictors on one pool.
export function evaluateSaturation(records, opts = {}) {
  const { maskFrac = 0.25, seed = 7, distractors = 4, featuresByWord = new Map() } = opts;
  const rng = mulberry32(seed);
  const { cells } = cellCorpus(normalizeUnitsInput(records));
  const distinct = distinctObjectCells(cells);
  const order = shuffledFY(distinct, rng);
  const nMask = Math.max(1, Math.round(order.length * maskFrac));
  const test = order.slice(0, nMask);
  const train = order.slice(nMask);

  const model = witnessCells(train);
  const concepts = holeConcepts(model, featuresByWord);
  const predFreq = new Map(); // V -> Map(o -> count), per-predicate (never global) frequency
  for (const c of train) {
    if (!predFreq.has(c.P)) predFreq.set(c.P, new Map());
    const m = predFreq.get(c.P);
    m.set(c.o, (m.get(c.o) ?? 0) + 1);
  }

  let baselineHits = 0;
  let fiberHits = 0;
  let closureHits = 0;
  let closureFired = 0;
  const perCase = [];
  for (const cell of test) {
    const sameVerbObjects = [...new Set(train.filter((c) => c.P === cell.P).map((c) => c.o))].filter((v) => v !== cell.o);
    const chosenDistractors = shuffledFY(sameVerbObjects, rng).slice(0, distractors);
    const pool = shuffledFY([cell.o, ...chosenDistractors], rng);

    const freq = predFreq.get(cell.P) ?? new Map();
    const baselinePick = argmaxTies(pool.map((v) => [v, freq.get(v) ?? 0]), rng);
    if (baselinePick === cell.o) baselineHits += 1;

    const P = model.predicates.get(cell.P);
    const fiberPick = P ? argmaxTies(pool.map((v) => [v, joinPos(P.objFiber.get(v))]), rng) : undefined;
    if (fiberPick === cell.o) fiberHits += 1;

    const closureEntries = P ? fiberEntries(P.objFiber, concepts) : [];
    if (closureEntries.some(([, w]) => w === 0.5)) closureFired += 1;
    const closureMap = new Map(closureEntries);
    const closurePick = argmaxTies(pool.map((v) => [v, closureMap.get(v) ?? 0]), rng);
    if (closurePick === cell.o) closureHits += 1;

    perCase.push({ s: cell.s, P: cell.P, o: cell.o, pool, baselinePick, fiberPick, closurePick });
  }

  return {
    seed, distinctFacts: distinct.length, trainN: train.length, n: test.length,
    baselineHits, fiberHits, closureHits, closureFired, perCase,
  };
}

/**
 * Run `evaluateSaturation` across several seeds (>=5 for an honest mean) and report every seed's
 * numbers plus the mean, never only the mean.
 * @param {object[]} records @param {{seeds?:number} & Parameters<typeof evaluateSaturation>[1]} [opts]
 */
export function evaluateSaturationAcrossSeeds(records, opts = {}) {
  const { seeds = 5, ...rest } = opts;
  const perSeed = [];
  for (let seed = 1; seed <= seeds; seed += 1) perSeed.push(evaluateSaturation(records, { ...rest, seed }));
  const mean = (key) => perSeed.reduce((s, r) => s + r[key], 0) / perSeed.length;
  return {
    seeds, perSeed,
    meanN: mean("n"), meanBaselineHits: mean("baselineHits"),
    meanFiberHits: mean("fiberHits"), meanClosureHits: mean("closureHits"),
  };
}
