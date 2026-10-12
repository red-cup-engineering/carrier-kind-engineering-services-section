import { test } from "node:test";
import assert from "node:assert/strict";

import { memeCarrier } from "@red-cup-engineering/relating";
import { canonical } from "@red-cup-engineering/json-services-section";
import { mark, utterance } from "@red-cup-engineering/signcell/utterance";
import { knowledgeReading, triple } from "@red-cup-engineering/signcell/cell";
import { memeActions, communicateAction, semioseAction, MEME_CARRIER_ID } from "../src/communicate/meme.mjs";
import { discourseCohesionOf } from "../src/communicate/cohesion.mjs";
import {
  morphismActions,
  negateAction,
  speakAction,
  listenAction,
  groundAction,
  composeAction,
  illocuteAction,
  modalizeAction,
  presupposeAction,
  quoteAction,
  referAction,
  translateAction,
} from "../src/communicate/morphisms/index.mjs";

// memeCarrier is now SignCell's flat cellSchema: {subject, predicate, object, for, against},
// additionalProperties:false — no "kind"/"cell"/"reading" wrapper. `for` witnessed by "observed"
// (told-for only) names the same "potential" knowledge point the old fixture's present/absent
// reading named.
const sampleMeme = Object.freeze({
  subject: { kind: "utterance.token", hand: "left", mark: { kind: "utterance.mark", value: "socrates" } },
  predicate: {
    kind: "predication.predicate",
    claim: { kind: "utterance.claim", hand: "right", mark: { kind: "utterance.mark", value: "is-mortal" } },
    mark: { kind: "utterance.mark", value: "is-mortal" },
  },
  object: { kind: "utterance.token", hand: "left", mark: { kind: "utterance.mark", value: "socrates" } },
  for: [{ kind: "utterance.mark", value: "observed" }],
  against: [],
});

test("the sample is a well-formed meme (test fixture is valid)", () => {
  assert.ok(memeCarrier.validate(sampleMeme));
});

test("the structural core is carried as CHL runTerm, not TS-only callbacks", () => {
  for (const act of [communicateAction, semioseAction, ...morphismActions]) {
    assert.ok(act.runTerm, `${act.verb} should expose a CHL runTerm`);
  }
});

// A totality check on the specific meme-transforming morphisms (communicate, negate, conflate, …):
// each maps a valued meme to a meme. This describes those morphisms; it is NOT a contract that
// gates communicating's surface — readings/codecs/language-ops that project a membrane into another
// carrier (e.g. `cohere`) are legitimate communicating operations too.
test("each argument-free meme-transforming morphism is total: a valued meme in yields a meme out", () => {
  const argFree = memeActions.filter((act) => act.options.length === 0);
  assert.ok(argFree.length >= 4, "expected the argument-free morphisms");
  for (const act of argFree) {
    const out = act.execute(sampleMeme, {});
    assert.ok(memeCarrier.validate(out), `${act.verb} did not return a meme`);
  }
});

test("communicate is the monoid unit: faithful transmission is the identity", () => {
  assert.equal(canonical(communicateAction.execute(sampleMeme, {})), canonical(sampleMeme));
});

test("negate is an involution and preserves the cell", () => {
  const once = negateAction.execute(sampleMeme, {});
  assert.ok(memeCarrier.validate(once));
  assert.equal(canonical(triple(once)), canonical(triple(sampleMeme)), "cell preserved");
  assert.notEqual(canonical(once), canonical(sampleMeme), "negate is non-trivial on this reading");
  const twice = negateAction.execute(once, {});
  assert.equal(canonical(twice), canonical(sampleMeme), "negate after negate is id");
});

// conflate is gone: subject-gone (see final report; morphisms/index.mjs no longer exports conflateAction,
// and SignChain's bilattice has no evidence-level conflate by design — four.mjs's conflateReading is
// reading-names-only, "the witness universe is open").

test("semiose is the iteration primitive: the interpretant's subject nests the prior meme", () => {
  const interpretant = semioseAction.execute(sampleMeme, {});
  assert.ok(memeCarrier.validate(interpretant));
  assert.equal(canonical(interpretant.subject), canonical(sampleMeme), "prior meme nested as vehicle");
  assert.equal(canonical(interpretant.object), canonical(sampleMeme.object), "object preserved");
});

test("cohere exposes discourse H1 as a normalized relating cohomology receipt", () => {
  const said = (who, what) => utterance(mark(who), mark(what));
  const cohesion = discourseCohesionOf([
    said("bob", "alice"),
    said("carol", "bob"),
    said("alice", "carol"),
  ]);

  assert.equal(cohesion.kind, "communicating.discourse-cohesion");
  assert.equal(cohesion.subjects, 3);
  assert.equal(cohesion.topics, 1);
  assert.equal(cohesion.redundant, true);
  assert.equal(cohesion.irreducible, 1, "the three-edge discourse triangle has one H1 loop");
  assert.equal(cohesion.cohomology.kind, "communicating.discourse-cohesion.cohomology");
  assert.equal(cohesion.cohomology.subjects, cohesion.subjects);
  assert.equal(cohesion.cohomology.topics, cohesion.topics);
  assert.equal(cohesion.cohomology.cells, 3);
  assert.equal(cohesion.cohomology.h1, cohesion.irreducible);
  assert.equal(cohesion.cohomology.vanishing.kind, "signgraph.rankVanishing-obstruction");
  assert.equal(cohesion.cohomology.laplacian.kind, "signgraph.laplacian");
  assert.equal(cohesion.cohomology.laplacian.firstCohomologyCokernelRank.kind, "signgraph.rankIdentity:witness");
});

test("speak re-readings the meme as witnessed-potential and preserves the cell", () => {
  const spoken = speakAction.execute({ meme: sampleMeme, speaker: "alice" }, {});
  assert.ok(memeCarrier.validate(spoken));
  assert.equal(canonical(triple(spoken)), canonical(triple(sampleMeme)), "cell preserved identically");
  assert.equal(knowledgeReading(spoken), "potential", "transit reading is potential");
});

test("speak consumes one input carrier: transport fields are not a semantic args channel", () => {
  const spoken = speakAction.execute({ meme: sampleMeme, speaker: "alice", medium: "wire", capacity: 1 }, {});
  assert.ok(memeCarrier.validate(spoken));
  assert.equal(knowledgeReading(spoken), "potential", "speak remains total over admitted input");
});

test("listen consumes one input carrier and remains total over admitted memes", () => {
  const heard = listenAction.execute({ meme: sampleMeme, listener: "bob" }, {});
  assert.ok(memeCarrier.validate(heard));
  assert.equal(knowledgeReading(heard), "active", "uptake moves the reading to active");
  const heardAgain = listenAction.execute({ meme: heard, listener: "bob" }, {});
  assert.ok(memeCarrier.validate(heardAgain), "total proof evaluator returns a meme, not a spent-resource throw");
});

test("ground supports the common-ground update modes", () => {
  for (const mode of ["assertion", "accommodation", "challenge"]) {
    const grounded = groundAction.execute({ meme: sampleMeme, partner: "carol", mode }, {});
    assert.ok(memeCarrier.validate(grounded), `ground ${mode} yields a meme`);
    assert.equal(canonical(triple(grounded)), canonical(triple(sampleMeme)), `ground ${mode} preserves the cell`);
  }
});

test("every product-carrier morphism evaluates through IR to a meme", () => {
  const cases = [
    [speakAction, { meme: sampleMeme, speaker: "alice" }],
    [listenAction, { meme: sampleMeme, listener: "bob" }],
    [groundAction, { meme: sampleMeme, partner: "carol", mode: "assertion" }],
    [composeAction, { meme: sampleMeme, with: sampleMeme }],
    [illocuteAction, { meme: sampleMeme, force: "assertive" }],
    [modalizeAction, { meme: sampleMeme, mode: "evidential", witness: "source" }],
    [presupposeAction, { meme: sampleMeme, trigger: "factive" }],
    [quoteAction, { meme: sampleMeme, position: "subject" }],
    [referAction, { meme: sampleMeme, position: "object", entity: "plato" }],
    [translateAction, { meme: sampleMeme, target: "academy" }],
  ];
  for (const [act, input] of cases) {
    assert.ok(act.runTerm, `${act.verb} should be IR-backed`);
    assert.ok(memeCarrier.validate(act.execute(input, {})), `${act.verb} should return a meme`);
  }
});
