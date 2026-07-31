import assert from "node:assert/strict";
import test from "node:test";

import {
  articulate,
  cell,
  cellIdentity,
  claim,
  induce,
  isArticulationCarrier,
  knowledgeLeastMemeOfSingleUtterance,
  mark,
  predicate,
  predicationCarrier,
  readCharge,
  settleOneTraced,
  singleUtteranceTopology,
  specializationMorphism,
  token,
  utterance,
} from "./index.mjs";
import { isCell, natEqual, natOne } from "@emsenn/meme-algebra";
import {
  composePredicateWordPotential,
  derivationValidity,
  deriveInBase,
  predicateWordArrow,
  theoryOfBase,
} from "@emsenn/meme-logic";
import { potentialCarrier } from "./internal.mjs";

const tm = (value: string) => token(mark(value));
const cl = (value: string) => claim(mark(value));

test("utterance constructors expose stable runtime carrier shapes", () => {
  const left = mark("token");
  const right = mark("claim");
  const carrier = utterance(left, right);
  const articulation = articulate(carrier);
  const open = potentialCarrier([left, right]);
  const openedCarrier = potentialCarrier(carrier);

  assert.equal(articulation.kind, "utterance.articulation");
  assert.equal(articulation.utterance, carrier);
  assert.equal(articulation.polarization.positive.kind, "utterance.token");
  assert.equal(articulation.polarization.positive.hand, "left");
  assert.equal(articulation.polarization.positive.mark, left);
  assert.equal(articulation.polarization.negative.kind, "utterance.claim");
  assert.equal(articulation.polarization.negative.hand, "right");
  assert.equal(articulation.polarization.negative.mark, right);
  assert.equal(isArticulationCarrier(articulation), true);
  assert.equal(open.kind, "utterance.potential");
  assert.equal(open.potential[0]?.kind, "utterance.token");
  assert.equal(open.potential[1]?.kind, "utterance.claim");
  assert.deepEqual(openedCarrier.potential, [articulation.polarization.positive, articulation.polarization.negative]);
  assert.equal(Object.isFrozen(carrier), true);
  assert.equal(Object.isFrozen(articulation), true);
});

test("typed theory derives judgments over predication carriers", () => {
  const socrates = tm("socrates");
  const human = tm("human");
  const base = predicationCarrier([specializationMorphism(socrates, human)]).base;
  const theory = theoryOfBase(base);
  const derivability = deriveInBase(base, human, socrates);
  const potential = composePredicateWordPotential({
    kind: "typedTheory.predicateWordPotential",
    potential: [
      predicateWordArrow(tm("a"), cl("p"), tm("b")),
      predicateWordArrow(tm("b"), cl("q"), tm("c")),
    ],
  });

  assert.equal(theory.rules[0]?.trace.morphisms[0]?.kind, "typedTheory.inferenceMorphism.specialization");
  assert.equal(derivability.kind, "typedTheory.derivationSearch:witness");
  if (derivability.kind !== "typedTheory.derivationSearch:witness") throw new TypeError("expected derivation witness");
  assert.equal(derivability.derivation.kind, "typedTheory.derivation");
  assert.equal(natEqual(derivability.derivation.length, natOne), true);
  assert.equal(derivationValidity(theory, derivability.derivation).kind, "typedTheory.derivationCheck:witness");
  assert.equal(potential.potential.length, 3);
});

test("meme-topology helpers wire single-utterance and witnessed APIs", () => {
  const speaksTruth = cell(tm("socrates"), cl("speaks"), tm("truth"));
  const topology = induce([utterance(mark({ subject: "socrates", object: "truth" }), mark("speaks"))]);
  const left = mark("token");
  const right = mark("claim");
  const single = singleUtteranceTopology(left, right);
  const expected = predicate([articulate(utterance(left, right))]);
  const witnessed = single.witnesses[0];
  const settled = knowledgeLeastMemeOfSingleUtterance([left, right]);
  const traced = settleOneTraced(utterance(left, right));

  assert.equal(topology.kind, "meme-topology.carrier");
  assert.equal(topology.proofs.kind, "typedTheory.proof.carrier");
  assert.equal(readCharge(topology.fixedPointReadings.knowledgeLeast, speaksTruth).kind, "bilattice-charge.carrier");
  assert.equal(single.kind, "meme-topology.carrier");
  assert.equal(single.proofs.kind, "typedTheory.proof.carrier");
  assert.equal(single.fixedPoints.knowledge.least.sheaf.section.fibers.length, 1);
  assert.equal(witnessed?.kind, "utterance.carrier");
  assert.equal(isCell(settled.cell), true);
  assert.equal(cellIdentity(settled.cell, expected.cells.cells[0]!).kind, "predication.cellIdentity:witness");
  assert.equal(settled.kind, "predication.fiber.meme");
  assert.equal(traced.kind, "meme-topology.singleSettling.carrier");
  assert.equal(traced.meme.kind, "predication.fiber.meme");
});
