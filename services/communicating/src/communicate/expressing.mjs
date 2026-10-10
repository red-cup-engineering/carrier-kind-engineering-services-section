/**
 * communicate/expressing — SEN terms for the bundle-independent meme-transforming morphisms.
 *
 * A meme is a SignCell: subject, predicate, object, and its evidence for and against. These terms
 * rearrange cells in SEN; every bilattice operation on evidence (negation, the knowledge and truth
 * joins) is SignChain's, named through relating's primitives.
 */
import { arrayTerm, objectTerm, stringTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { tm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";

const empty = arrayTerm([]);

/** A meme term from its triple and its two evidence sides. */
const memeTerm = (subject, predicate, object, forSide, againstSide) => objectTerm([
  ["subject", subject],
  ["predicate", predicate],
  ["object", object],
  ["for", forSide],
  ["against", againstSide],
]);
/** A meme term from a triple and an evidence term (a pair or a cell). */
const withEvidence = (subject, predicate, object, value) => memeTerm(subject, predicate, object, tm.field("for", value), tm.field("against", value));
/** An evidence pair term. */
const pair = (forSide, againstSide) => objectTerm([["for", forSide], ["against", againstSide]]);
const toldFor = (witness) => pair(arrayTerm([witness]), empty);
const toldAgainst = (witness) => pair(empty, arrayTerm([witness]));
const toldBoth = (witness) => pair(arrayTerm([witness]), arrayTerm([witness]));
const knowledgeJoin = (left, right) => tm.prim("signchain.knowledge-join", objectTerm([["left", left], ["right", right]]));
const truthJoin = (left, right) => tm.prim("signchain.truth-join", objectTerm([["left", left], ["right", right]]));

const prior = tm.var(0);
const field = (name, of = prior) => tm.field(name, of);
const input = tm.var(0);
const inputMeme = field("meme", input);
const inputSubject = field("subject", inputMeme);
const inputPredicate = field("predicate", inputMeme);
const inputObject = field("object", inputMeme);
const inputPositionIsObject = tm.coincide(field("position", input), stringTerm("object"));
const inputWith = field("with", input);
const sameTriple = (value) => withEvidence(inputSubject, inputPredicate, inputObject, value);
const isEmpty = (list) => tm.coincide(list, empty);

/** The meme with `mentioned` in its object position (or subject), its evidence kept. */
const quoteMeme = (mentioned) => tm.cond(
  inputPositionIsObject,
  withEvidence(inputSubject, inputPredicate, mentioned, inputMeme),
  withEvidence(mentioned, inputPredicate, inputObject, inputMeme),
);

export const communicateTerm = tm.lam(prior);

/** semiose: the prior meme becomes the new sign vehicle (the subject) and witnesses the new meme. */
export const semioseTerm = tm.lam(memeTerm(prior, field("predicate"), field("object"), arrayTerm([prior]), empty));

/** negate: SignChain's negation — the meme with its sides swapped. */
export const negateTerm = tm.lam(tm.prim("signchain.negate", prior));

/** speak: the meme's triple, told for by the speaker. */
export const speakTerm = tm.lam(sameTriple(toldFor(field("speaker", input))));

/** listen: the meme's triple, told against by the listener (taken up). */
export const listenTerm = tm.lam(sameTriple(toldAgainst(field("listener", input))));

/** quote: the meme mentioned inside a new meme, its evidence kept. */
export const quoteTerm = tm.lam(quoteMeme(inputMeme));

/** refer: the mentioned term resolved to an entity. */
export const referTerm = tm.lam(quoteMeme(objectTerm([
  ["resolvedFrom", tm.cond(inputPositionIsObject, inputObject, inputSubject)],
  ["entity", field("entity", input)],
])));

/** translate: the subject carried into another semiosphere, its evidence kept. */
export const translateTerm = tm.lam(withEvidence(
  objectTerm([
    ["translatedFrom", inputSubject],
    ["intoSemiosphere", objectTerm([["kind", stringTerm("communicating.semiosphere")], ["name", field("target", input)]])],
  ]),
  inputPredicate,
  inputObject,
  inputMeme,
));

/** presuppose: the meme as the subject of a presupposition, told both by its trigger. */
export const presupposeTerm = tm.lam(withEvidence(inputMeme, inputPredicate, inputObject, toldBoth(objectTerm([["presupposes", field("trigger", input)]]))));

/** compose: the meme's subject and predicate onto the other meme, their evidence joined in knowledge. */
export const composeTerm = tm.lam(withEvidence(inputSubject, inputPredicate, inputWith, knowledgeJoin(inputMeme, inputWith)));

/** ground: take up a partner's stance — challenge tells against, anything else for — joined in knowledge. */
export const groundTerm = tm.lam(sameTriple(knowledgeJoin(inputMeme, tm.cond(
  tm.coincide(field("mode", input), stringTerm("challenge")),
  toldAgainst(objectTerm([["basis", stringTerm("prior-discourse")], ["mode", field("mode", input)], ["partner", field("partner", input)]])),
  toldFor(objectTerm([
    ["basis", tm.cond(tm.coincide(field("mode", input), stringTerm("accommodation")), stringTerm("accommodation"), stringTerm("prior-discourse"))],
    ["mode", field("mode", input)],
    ["partner", field("partner", input)],
  ])),
))));

/** modalize: re-witness the meme's told side with the modal marker (for, if the meme is told for). */
export const modalizeTerm = tm.lam(sameTriple(knowledgeJoin(inputMeme, tm.cond(
  isEmpty(field("for", inputMeme)),
  toldAgainst(objectTerm([["modalize", field("mode", input)], ["witness", field("witness", input)]])),
  toldFor(objectTerm([["modalize", field("mode", input)], ["witness", field("witness", input)]])),
))));

/** illocute: the illocutionary force selects the evidence move. */
export const illocuteTerm = tm.lam(sameTriple(tm.cond(
  tm.coincide(field("force", input), stringTerm("assertive")),
  truthJoin(inputMeme, toldFor(stringTerm("assertive"))),
  tm.cond(
    tm.coincide(field("force", input), stringTerm("directive")),
    toldFor(stringTerm("directive")),
    tm.cond(
      tm.coincide(field("force", input), stringTerm("commissive")),
      toldFor(stringTerm("commissive")),
      tm.cond(
        tm.coincide(field("force", input), stringTerm("expressive")),
        knowledgeJoin(inputMeme, toldFor(stringTerm("expressive"))),
        toldBoth(stringTerm("declaration")),
      ),
    ),
  ),
)));

export const communicatingTerms = Object.freeze({
  communicate: communicateTerm,
  semiose: semioseTerm,
  negate: negateTerm,
  speak: speakTerm,
  listen: listenTerm,
  quote: quoteTerm,
  refer: referTerm,
  translate: translateTerm,
  presuppose: presupposeTerm,
  compose: composeTerm,
  ground: groundTerm,
  modalize: modalizeTerm,
  illocute: illocuteTerm,
});
