// model.ts — append-only settling model for simple continuation generation.


import { noEvidence } from "@red-cup-engineering/signchain/bilattice";
import { knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { realizeSection } from "./section.mjs";

import { knowledgeJoin, witnessedReading } from "@red-cup-engineering/signchain/bilattice";
const TRUE = "potential";
const FALSE = "active";
const TOP = "stable";
const BOTTOM = "absurd";
const PRECEDES = "precedes";
const DENIES = "denies";

export const emptyCorpus = Object.freeze({ assertions: [] });

function tokenize(text) {
  return text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
}

function assertionId(assertion, index) {
  return `${assertion.subject}\x00${assertion.predicate}\x00${assertion.object}\x00${index}`;
}

export function ingest(corpus, text, witness) {
  const tokens = tokenize(text);
  const assertions = [...corpus.assertions];
  for (let i = 0; i < tokens.length - 1; i++) {
    const told = { subject: tokens[i], predicate: PRECEDES, object: tokens[i + 1] };
    const id = assertionId(told, assertions.length);
    assertions.push({ ...told, evidence: witnessedReading(TRUE, witness ?? id), ...(witness !== undefined ? { witness } : {}), id });
  }
  return { assertions };
}

export function recall(corpus, context) {
  const tokens = tokenize(context);
  const subject = tokens[tokens.length - 1];
  if (subject === undefined) return [];
  return corpus.assertions.filter((assertion) => assertion.subject === subject && assertion.predicate === PRECEDES);
}

export function predict(corpus, context) {
  const assertions = recall(corpus, context);
  if (assertions.length === 0) return [{ token: null, evidence: noEvidence, regime: "void", reason: "unseen" }];
  const byToken = new Map();
  for (const assertion of assertions) {
    const prior = byToken.get(assertion.object);
    byToken.set(assertion.object, prior ? knowledgeJoin(prior, assertion.evidence) : assertion.evidence);
  }
  return [...byToken.entries()].map(([token, evidence]) => ({
    token,
    evidence,
    regime: regimeOf(evidence),
    ...(knowledgeReading(evidence) === "stable" ? { reason: "contested" } : {}),
  }));
}

export function settleNext(corpus, context) {
  const predictions = predict(corpus, context);
  return predictions.find((p) => p.regime === "affirmed") ?? predictions[0];
}

export function model(seedText, witness) {
  const corpus = seedText === undefined ? emptyCorpus : ingest(emptyCorpus, seedText, witness);
  return wrap(corpus);
}

function wrap(corpus) {
  return {
    corpus,
    assertions: corpus.assertions,
    ingest: (text, witness) => wrap(ingest(corpus, text, witness)),
    predict: (context) => predict(corpus, context),
    settle: (context) => settleNext(corpus, context),
    generate(seed, opts) {
      const limit = opts?.limit ?? 12;
      const tokens = tokenize(seed);
      let text = seed;
      for (let i = 0; i < limit; i++) {
        const settled = settleNext(corpus, text);
        if (settled.token == null || settled.regime === "void") break;
        text = `${text} ${settled.token}`;
      }
      return text;
    },
    realizeContinuation(subject, predicate, context) {
      const settled = settleNext(corpus, context);
      const out = realizeSection({
        subject,
        cells: [{
          predicate,
          object: settled.token,
          evidence: settled.evidence,
          tense: "present",
        }],
      });
      return { ...out, settled, contested: settled.regime === "contradicted" };
    },
  };
}

function regimeOf(evidence) {
  const reading = knowledgeReading(evidence);
  if (reading === "potential") return "affirmed";
  if (reading === "active") return "denied";
  if (reading === "stable") return "contradicted";
  return "void";
}

export { PRECEDES, DENIES, TRUE, FALSE, TOP, BOTTOM };
