// Exact rule inference over SignCells, SignChain and SignCraft. This derives
// warranted claims; it does not generate prose or stand in for a model API.
// The legacy attribute API remains a projection of the settled evidence so
// existing verdict consumers can migrate without a second closure engine.

import { makeContext, closeAttrs } from "@red-cup-engineering/metrologic/closure/formal-context";
import { readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { makeValuation, withReading, settle, readingAt } from "./nuclei.mjs";
import { makeComplex, withConductance, refusalNumber } from "./complex.mjs";
import { address, cell, triple } from "@red-cup-engineering/signcell/cell";
import { rule } from "@red-cup-engineering/signchain/rules";
import { site } from "@red-cup-engineering/signgraph/site";
import { settleValuation } from "../settle.mjs";

export function makeInference({ attributes, rules }) {
  const ruleImps = rules.map((r, i) => ({
    from: new Set(r.if),
    to: new Set(r.then),
    name: r.name ?? `rule-${i}`,
  }));
  return { attributes: [...attributes], ruleImps };
}

// Attributes are predicates over one inference subject. Their content-addressed
// cells retain the evidence and rule premises that licensed each conclusion.
/** The point told for only, and the point told against only. */
const toldFor = readingOfSides("knowledge", true, false);
const toldAgainst = readingOfSides("knowledge", false, true);
const SUBJECT = "signcraft.inference";
const at = (attribute) => triple({ subject: SUBJECT, predicate: attribute, object: SUBJECT });

function settleInference(engine, facts, denials) {
  const affirmed = new Set(facts), denied = new Set(denials);
  const attributes = new Set([...engine.attributes, ...facts, ...denials]);
  for (const imp of engine.ruleImps) {
    for (const attr of imp.from) attributes.add(attr);
    for (const attr of imp.to) attributes.add(attr);
  }
  const cells = [...attributes].map(at);
  const rules = engine.ruleImps.flatMap((imp) => [...imp.to].flatMap((target) => [
    rule(imp.name, [...imp.from].map((attr) => ({ cell: at(attr), atLeast: toldFor })), { cell: at(target), reading: toldFor }),
    rule(imp.name, [...imp.from].map((attr) => ({ cell: at(attr), atLeast: toldAgainst })), { cell: at(target), reading: toldAgainst }),
  ]));
  const seed = cells.filter((value) => affirmed.has(value.predicate) || denied.has(value.predicate)).map((value) => cell(value.subject, value.predicate, value.object, {
    for: affirmed.has(value.predicate) ? [{ kind: "signcraft.inference.given", attribute: value.predicate }] : [],
    against: denied.has(value.predicate) ? [{ kind: "signcraft.inference.denied", attribute: value.predicate }] : [],
  }));
  return settleValuation(site(cells), seed, rules);
}

function derivationOf(settlement, side) {
  const found = new Map();
  const attributeByAddress = new Map(settlement.site.cells.map((value) => [address(value), value.predicate]));
  for (const stage of settlement.stages) {
    for (const value of stage.valuation) {
      if (found.has(value.predicate) || value[side].length === 0) continue;
      const witness = value[side][0];
      found.set(value.predicate, {
        attr: value.predicate,
        by: witness.rule ?? "given",
        premises: (witness.from ?? []).map((key) => attributeByAddress.get(key)),
        ...(witness.ruleId === undefined ? {} : { ruleId: witness.ruleId }),
      });
    }
  }
  return found;
}

export function derive(engine, facts) {
  return derivationOf(settleInference(engine, facts, []), "for");
}

export function witnessChain(derivation, attr) {
  const node = derivation.get(attr);
  if (!node) return null;
  const chain = [];
  const seen = new Set();
  (function walk(a) {
    if (seen.has(a)) return;
    seen.add(a);
    const n = derivation.get(a);
    if (!n) return;
    for (const p of n.premises) walk(p);
    chain.push({ attr: a, by: n.by, premises: n.premises, ...(n.ruleId === undefined ? {} : { ruleId: n.ruleId }) });
  })(attr);
  return chain;
}

// Full query: positive and negative evidence lanes run separately (FOUR),
// then the verdict is read off both, with the machinery's receipts.
export function infer(engine, { facts = [], denials = [], query, conductances = [] }) {
  const settled = settleInference(engine, facts, denials);
  const posDeriv = derivationOf(settled, "for");
  const negDeriv = derivationOf(settled, "against");
  const pos = posDeriv.has(query);
  const neg = negDeriv.has(query);
  const verdict = readingOfSides("knowledge", pos, neg);

  let cx = makeComplex(engine.attributes);
  for (const [a, b, w] of conductances) cx = withConductance(cx, a, b, w);

  const out = { query, verdict, witness: null, counterWitness: null, refusal: null, questions: [] };
  if (pos) out.witness = witnessChain(posDeriv, query);
  if (neg) out.counterWitness = witnessChain(negDeriv, query);
  if (pos && neg) {
    const assignment = {};
    for (const [a] of posDeriv) assignment[a] = 1;
    for (const [a] of negDeriv) assignment[a] = (assignment[a] ?? 0) - 1;
    out.refusal = refusalNumber(cx, assignment);
  }
  if (!pos && !neg) {
    for (const imp of engine.ruleImps) {
      if (imp.to.has(query)) {
        const missing = [...imp.from].filter((p) => !posDeriv.has(p));
        out.questions.push({ kind: "would-settle", rule: imp.name, missing });
      }
    }
  }
  return out;
}

// Settling-backed variant over an object: routes the same rules through the
// kernel's sigma/settle so the H-theorem and trace receipts apply.
export function inferSettled(engine, objectName, facts) {
  const ctx = makeContext([objectName], engine.attributes, facts.map((f) => [objectName, f]));
  let v = makeValuation();
  for (const f of facts) v = withReading(v, objectName, f, toldFor);
  const settled = settle(ctx, v, { basis: engine.ruleImps });
  const holds = {};
  for (const m of engine.attributes) holds[m] = sidesOfReading(readingAt(settled.v, objectName, m))[0];
  return { holds, steps: settled.steps, trace: settled.trace, closure: [...closeAttrs(ctx, new Set(facts))] };
}
