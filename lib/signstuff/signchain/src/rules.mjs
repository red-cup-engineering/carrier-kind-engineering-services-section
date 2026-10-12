/**
 * SignChain — rules and the immediate-consequence step over cell sets.
 *
 * A rule has positive threshold antecedents — "this cell reads at least this
 * point in the knowledge order" — and one consequent: a cell and the point it
 * tells it (Fitting 1991: logic programs over bilattices, valued in the
 * knowledge order). Firing a rule tells its consequent with a derivation as the
 * witness: the rule's content identity, name and the addresses of its premises. So every
 * derived telling is content-addressed back to what licensed it — the chain.
 * The rule language has no negation: an antecedent reading told against is a
 * threshold on the cell's against side, and a consequent told against tells
 * that side.
 *
 * `step` is Fitting's immediate-consequence operator T(v) = v ⊔ fire(v): monotone
 * and inflationary in the knowledge order. Repeating a derivation tells the same
 * witness again, which the evidence sets absorb, so iterating T on finitely many
 * rules reaches its least fixed point above the seed.
 */
import { address, cell, cellSet, knowledgeReading, mergeCellSets, triple } from "@red-cup-engineering/signcell/cell";
import { isReading, sidesOfReading, knowledgeLeqReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const cellAtTriple = (valuation, at) => valuation.find((told) => address(told) === address(at)) ?? cell(at.subject, at.predicate, at.object);
const indexedCellAtTriple = (valuation, at) => valuation.get(address(at)) ?? cell(at.subject, at.predicate, at.object);
const validateDerivationVersion = (version) => {
  if (version !== 1 && version !== 2) throw new TypeError("signchain derivation: unsupported version");
};

/** A rule: antecedents [{ cell, atLeast }], consequent { cell, reading }. */
export function rule(name, antecedent, consequent) {
  if (typeof name !== "string" || name === "") throw new TypeError("signchain rule: name must be a non-empty string");
  for (const condition of antecedent) if (!isReading(condition.atLeast)) throw new TypeError(`signchain rule ${name}: ${String(condition.atLeast)} is not a reading`);
  if (!isReading(consequent.reading)) throw new TypeError(`signchain rule ${name}: ${String(consequent.reading)} is not a reading`);
  return Object.freeze({
    kind: "signchain.rule",
    name,
    antecedent: Object.freeze(antecedent.map((condition) => Object.freeze({ cell: triple(condition.cell), atLeast: condition.atLeast }))),
    consequent: Object.freeze({ cell: triple(consequent.cell), reading: consequent.reading }),
  });
}

/** A rule with no antecedent: it always tells its consequent. */
export const always = (at, reading) => rule(`always:${address(at)}:${reading}`, [], { cell: at, reading });

/** Whether every antecedent of a rule holds in a valuation. */
export const antecedentHolds = (r, valuation) => r.antecedent.every((condition) => knowledgeLeqReading(condition.atLeast, knowledgeReading(cellAtTriple(valuation, condition.cell))));
const antecedentHoldsIn = (r, valuation) => r.antecedent.every((condition) => knowledgeLeqReading(condition.atLeast, knowledgeReading(indexedCellAtTriple(valuation, condition.cell))));

/** A stable witness per rule, including thresholds, conclusion and evidence lane in its identity.
 * Version 1 is retained only to replay historical settlements; it identifies labels and premise
 * addresses, not the complete license. Neither version is a signature or authenticates an issuer. */
export function derivation(r, version = 2) {
  validateDerivationVersion(version);
  return Object.freeze({
    rule: r.name,
    from: Object.freeze(r.antecedent.map((condition) => address(condition.cell))),
    ...(version === 2 ? { ruleId: semanticId(r) } : {}),
  });
}

/** What one rule tells in a valuation: its consequent cell, on the sides its reading tells, witnessed by
 *  its derivation; nothing if its antecedent fails. */
export function fireRule(r, valuation, derivationVersion = 2) {
  return fireRuleIn(r, new Map(valuation.map((at) => [address(at), at])), derivationVersion);
}

/** Fire against an addressed valuation. Settlement can reuse this index across stages. */
export function fireRuleIn(r, valuation, derivationVersion = 2) {
  validateDerivationVersion(derivationVersion);
  if (!antecedentHoldsIn(r, valuation)) return cellSet();
  const [forTold, againstTold] = sidesOfReading(r.consequent.reading);
  const witness = derivation(r, derivationVersion), at = r.consequent.cell;
  if (!forTold && !againstTold) return cellSet();
  return cellSet([cell(at.subject, at.predicate, at.object, { for: forTold ? [witness] : [], against: againstTold ? [witness] : [] })]);
}

/** Everything the rules tell in a valuation. */
export function fire(rules, valuation) {
  const indexed = new Map(valuation.map((at) => [address(at), at]));
  const tellings = [];
  for (const r of rules) {
    tellings.push(...fireRuleIn(r, indexed));
  }
  return cellSet(tellings);
}

/** The immediate-consequence step: the valuation joined with what its rules tell. */
export const step = (rules, valuation) => mergeCellSets(valuation, fire(rules, valuation));

/** The names of the rules whose antecedents hold. */
export const firedRuleNames = (rules, valuation) => Object.freeze(rules.filter((r) => antecedentHolds(r, valuation)).map((r) => r.name));
