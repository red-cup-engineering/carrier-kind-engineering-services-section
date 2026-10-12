/**
 * positing/modal-kripke-four-valued — finite FOUR-valued Kripke frames.
 *
 *
 * The Lean object is a finite fibration whose fiber at a cell is the list of
 * cells accessible from it. Runtime parity stores that relation directly:
 * `accessibility[world] = accessible worlds`. Possibility is the knowledge join
 * over a fiber; necessity is the knowledge meet over a fiber.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  meetKnowledgeValue,
  negateValue,
  sameChargeValue,

} from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import {
  valuations,
} from "@lenticule-science/metrologic/articulation/predicating/positing/modal-kripke-four-valued";

const freezeRecord = (record) => Object.freeze({ ...record });

const readValuation = (valuation, world) => valuation[world] ?? "absurd";

function knowledgeJoinList(values) {
  return values.reduce((acc, value) => joinKnowledgeValue(acc, value), chargeValue("absurd"));
}

function knowledgeMeetList(values) {
  return values.reduce((acc, value) => meetKnowledgeValue(acc, value), chargeValue("stable"));
}

const leqKnowledgeValue = (left, right) =>
  sameChargeValue(joinKnowledgeValue(chargeValue(left), chargeValue(right)), chargeValue(right));

const leqValuationKnowledge = (worlds, left, right) =>
  worlds.every((world) => leqKnowledgeValue(readValuation(left, world), readValuation(right, world)));

const sameValuation = (worlds, left, right) =>
  worlds.every((world) => readValuation(left, world) === readValuation(right, world));

export function possibilize(frame, valuation) {
  const out = {};
  for (const world of frame.worlds) {
    const values = (frame.accessibility[world] ?? []).map((target) => chargeValue(readValuation(valuation, target)));
    out[world] = chargeValueName(knowledgeJoinList(values));
  }
  return freezeRecord(out);
}

export function necessitate(frame, valuation) {
  const out = {};
  for (const world of frame.worlds) {
    const values = (frame.accessibility[world] ?? []).map((target) => chargeValue(readValuation(valuation, target)));
    out[world] = chargeValueName(knowledgeMeetList(values));
  }
  return freezeRecord(out);
}

export function closureOp(frame, valuation) {
  return necessitate(frame, possibilize(frame, valuation));
}

function requireExhaustiveWorlds(frame) {
  if (frame.worlds.length > 5) {
    throw new RangeError("modalKripkeReceipt: exhaustive FOUR-valued law checks are limited to at most 5 worlds");
  }
}

function checkKMonotone(frame, op) {
  for (const left of valuations(frame.worlds)) {
    for (const right of valuations(frame.worlds)) {
      if (leqValuationKnowledge(frame.worlds, left, right)
        && !leqValuationKnowledge(frame.worlds, op(frame, left), op(frame, right))) {
        return false;
      }
    }
  }
  return true;
}

function checkTInflation(frame) {
  if (!frame.reflexive) return Object.freeze([false, false]);
  for (const valuation of valuations(frame.worlds)) {
    if (!leqValuationKnowledge(frame.worlds, valuation, possibilize(frame, valuation))) return Object.freeze([false, false]);
    if (!leqValuationKnowledge(frame.worlds, necessitate(frame, valuation), valuation)) return Object.freeze([false, false]);
  }
  return Object.freeze([true, true]);
}

function checkS4Idempotence(frame) {
  if (!frame.reflexive || !frame.transitive) return Object.freeze([false, false]);
  for (const valuation of valuations(frame.worlds)) {
    const box = necessitate(frame, valuation);
    const diamond = possibilize(frame, valuation);
    if (!sameValuation(frame.worlds, necessitate(frame, box), box)) return Object.freeze([false, false]);
    if (!sameValuation(frame.worlds, possibilize(frame, diamond), diamond)) return Object.freeze([false, false]);
  }
  return Object.freeze([true, true]);
}

function checkS5Adjunction(frame) {
  if (frame.frameClass !== "S5") return false;
  for (const left of valuations(frame.worlds)) {
    for (const right of valuations(frame.worlds)) {
      const diamondBelow = leqValuationKnowledge(frame.worlds, possibilize(frame, left), right);
      const belowBox = leqValuationKnowledge(frame.worlds, left, necessitate(frame, right));
      if (diamondBelow !== belowBox) return false;
    }
  }
  return true;
}

function checkS5Commutating(frame) {
  if (frame.frameClass !== "S5") return false;
  for (const valuation of valuations(frame.worlds)) {
    if (!leqValuationKnowledge(
      frame.worlds,
      possibilize(frame, necessitate(frame, valuation)),
      necessitate(frame, possibilize(frame, valuation)),
    )) return false;
  }
  return true;
}

function checkAdjunctionUnit(frame) {
  if (frame.frameClass !== "S5") return false;
  return [...valuations(frame.worlds)].every((valuation) =>
    leqValuationKnowledge(frame.worlds, valuation, necessitate(frame, possibilize(frame, valuation))),
  );
}

function checkAdjunctionCounit(frame) {
  if (frame.frameClass !== "S5") return false;
  return [...valuations(frame.worlds)].every((valuation) =>
    leqValuationKnowledge(frame.worlds, possibilize(frame, necessitate(frame, valuation)), valuation),
  );
}

function checkSettledLeast(frame, seed) {
  const settled = closureOp(frame, seed);
  return sameValuation(frame.worlds, closureOp(frame, settled), settled)
    && [...valuations(frame.worlds)].every((candidate) =>
      !(leqValuationKnowledge(frame.worlds, seed, candidate)
        && sameValuation(frame.worlds, closureOp(frame, candidate), candidate))
      || leqValuationKnowledge(frame.worlds, settled, candidate),
    );
}

export function twistSplit(value) {
  const charge = chargeValue(value);
  return Object.freeze({
    kind: "positing.modalKripke.twistSplit",
    value,
    positive: charge.coordinates[0].name === "present",
    negative: charge.coordinates[1].name === "present",
  });
}

const checkTwistSplitNegate = () =>
  chargeValueNames.every((name) => {
    const original = twistSplit(name);
    const negated = twistSplit(chargeValueName(negateValue(chargeValue(name))));
    return negated.positive === original.negative && negated.negative === original.positive;
  });

