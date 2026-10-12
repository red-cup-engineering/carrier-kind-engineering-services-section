import chargeNames from "../../../../specifications/charge-value-name.schema.json" with { type: "json" };
import { coincides, isOpaqueWitness, opaqueWitnessSchema as MarkSchema } from "./opaque-coincidence.mjs";
import { twistProduct } from "./twist-product.mjs";
export const ChargeSideSchema = {
    type: "object",
    required: ["kind", "name"],
    properties: {
        kind: { const: "bilattice-charge.side" },
        name: { enum: ["absent", "present"] },
    },
    additionalProperties: false,
};
export const ChargeCarrierSchema = {
    type: "object",
    required: ["kind", "value", "evidence"],
    properties: {
        kind: { const: "bilattice-charge.carrier" },
        value: {
            type: "array",
            prefixItems: [ChargeSideSchema, ChargeSideSchema],
            minItems: 2,
            maxItems: 2,
            items: false,
        },
        evidence: {
            type: "array",
            prefixItems: [
                { type: "array", items: MarkSchema },
                { type: "array", items: MarkSchema },
            ],
            minItems: 2,
            maxItems: 2,
            items: false,
        },
    },
    description: "A charge bearing evidence: the [truth, falsity] side coordinates and the witness Marks per side.",
    additionalProperties: false,
};
/** One of the four charge values: its name and its [truth, falsity] side coordinates. */
export const ChargeValueSchema = {
    type: "object",
    required: ["kind", "name", "coordinates"],
    properties: {
        kind: { const: "bilattice-charge.value" },
        name: { enum: ["absurd", "potential", "active", "stable"] },
        coordinates: { type: "array", prefixItems: [ChargeSideSchema, ChargeSideSchema], minItems: 2, maxItems: 2, items: false },
    },
    additionalProperties: false,
};
/** All charge side names. */
export const chargeSideNames = Object.freeze(["absent", "present"]);
/** All charge value names. */
export const chargeValueNames = Object.freeze(chargeNames.oneOf.map(value => value.const));
export function chargeSidesOf(name) {
    const [truth, falsity] = chargeValue(name).coordinates;
    return [truth.name === "present", falsity.name === "present"];
}
export function chargeNameOfSides(truthPresent, falsityPresent) {
    for (const name of chargeValueNames) {
        const [truth, falsity] = chargeSidesOf(name);
        if (truth === truthPresent && falsity === falsityPresent) return name;
    }
    throw new TypeError("The four-valued charge algebra is total on evidence-side pairs");
}
export function joinKnowledgeNames(names) {
    let truth = false;
    let falsity = false;
    for (const name of names) {
        const [presentTruth, presentFalsity] = chargeSidesOf(name);
        truth ||= presentTruth;
        falsity ||= presentFalsity;
    }
    return chargeNameOfSides(truth, falsity);
}
/**
 * Settle named judgments at the knowledge join while retaining the judgments
 * that independently carry a held contradiction.  The record is data: callers
 * choose the judgment fields and reasons they retain.
 */
export function settleLessonJudgments(judgments) {
    const records = Object.freeze([...judgments]);
    return Object.freeze({
        kind: "knowing.learning.lesson-settlement",
        value: joinKnowledgeNames(records.map((judgment) => judgment.value)),
        judgments: records,
        stableJudgments: Object.freeze(records.filter((judgment) => judgment.value === "stable")),
    });
}
/** Construct a charge side. */
export const chargeSide = (name) => Object.freeze({ kind: "bilattice-charge.side", name });
const chargeCoordinatesByName = Object.freeze(Object.fromEntries(chargeNames.oneOf.map(value => [value.const, Object.freeze([...value["x-coordinates"]])])));
/** Construct a charge value by name, resolving its side coordinates.
 *
 * @example
 * ```ts
 * chargeValue("active").coordinates.map(chargeSideName)
 * // ["absent", "present"]
 * ```
 */
export function chargeValue(name) {
    const [truth, falsity] = chargeCoordinatesByName[name];
    return Object.freeze({
        kind: "bilattice-charge.value",
        name,
        coordinates: Object.freeze([chargeSide(truth), chargeSide(falsity)]),
    });
}
/** All four charge values. */
export const chargeValues = Object.freeze(chargeValueNames.map(chargeValue));
/** The finite-algebra carrier of the charge bilattice. */
export const chargeFiniteAlgebra = Object.freeze({
    kind: "bilattice-charge.finiteAlgebra",
    sides: Object.freeze(chargeSideNames.map(chargeSide)),
    values: chargeValues,
});
/** The name of a charge side. */
export const chargeSideName = (side) => side.name;
/** The name of a charge value. */
export const chargeValueName = (value) => value.name;
const sameSide = (left, right) => left.name === right.name;
const presentSide = (side) => sameSide(side, chargeSide("present"));
const absentSide = (side) => sameSide(side, chargeSide("absent"));
const joinSide = (left, right) => presentSide(left) || presentSide(right) ? chargeSide("present") : chargeSide("absent");
const meetSide = (left, right) => presentSide(left) && presentSide(right) ? chargeSide("present") : chargeSide("absent");
const complementSide = (side) => presentSide(side) ? chargeSide("absent") : chargeSide("present");
const leqSide = (left, right) => absentSide(left) || presentSide(right);
/** The two-coordinate specialization of the shared twist-product program. */
export const chargeTwist = twistProduct({
    bottom: chargeSide("absent"),
    top: chargeSide("present"),
    one: chargeSide("present"),
    leq: leqSide,
    meet: meetSide,
    join: joinSide,
    fuse: meetSide,
    imply: (left, right) => leqSide(left, right) ? chargeSide("present") : chargeSide("absent"),
});
/** Whether a string names a charge value. */
export function isChargeValueName(value) {
    return Object.prototype.hasOwnProperty.call(chargeCoordinatesByName, value);
}
/** Whether a string names a charge side. */
export function isChargeSideName(value) {
    return value === "absent" || value === "present";
}
/** Type guard for a charge side. */
export function isChargeSide(value) {
    if (typeof value !== "object" || value === null) return false;
    const kind = "kind" in value ? value.kind : undefined;
    const name = "name" in value ? value.name : undefined;
    return kind === "bilattice-charge.side" && typeof name === "string" && isChargeSideName(name);
}
/** Type guard for a charge value. */
export function isChargeValue(value) {
    if (typeof value !== "object" || value === null) return false;
    const kind = "kind" in value ? value.kind : undefined;
    const name = "name" in value ? value.name : undefined;
    const coordinates = "coordinates" in value ? value.coordinates : undefined;
    return kind === "bilattice-charge.value"
        && typeof name === "string"
        && isChargeValueName(name)
        && Array.isArray(coordinates)
        && coordinates.length === 2
        && typeof coordinates[0] === "object" && coordinates[0] !== null && isChargeSide(coordinates[0])
        && typeof coordinates[1] === "object" && coordinates[1] !== null && isChargeSide(coordinates[1])
        && chargeCoordinatesByName[name].every((side, index) => coordinates[index].name === side);
}
/** Type guard for a charge carrier. */
export function isCharge(value) {
    if (typeof value !== "object" || value === null) return false;
    const kind = "kind" in value ? value.kind : undefined;
    const chargeValue = "value" in value ? value.value : undefined;
    const evidence = "evidence" in value ? value.evidence : undefined;
    return kind === "bilattice-charge.carrier"
        && Array.isArray(chargeValue) && chargeValue.length === 2
        && typeof chargeValue[0] === "object" && chargeValue[0] !== null && isChargeSide(chargeValue[0])
        && typeof chargeValue[1] === "object" && chargeValue[1] !== null && isChargeSide(chargeValue[1])
        && Array.isArray(evidence) && evidence.length === 2
        && Array.isArray(evidence[0]) && Array.isArray(evidence[1])
        && evidence[0].every(isOpaqueWitness)
        && evidence[1].every(isOpaqueWitness);
}
/** Coerce a string to a charge value name, or throw. */
export function asChargeValueName(value) {
    if (!isChargeValueName(value)) {
        throw new TypeError(`not a bilattice charge value name: ${JSON.stringify(value)} (expected one of ${chargeValueNames.join(", ")})`);
    }
    return value;
}
/** Coerce a value or name to a charge value. */
export function asChargeValue(value) {
    if (typeof value === "object" && isChargeValue(value))
        return value;
    return chargeValue(asChargeValueName(value));
}
/**
 * FOUR is one object, Bool x Bool, and a point has a name only in a reading
 * (Obsmetrologia Positing/Charge, TruthOrder, Articulation/FourCorner):
 *
 * - phase: the articulation phase the point is (absurd, potential, active, stable);
 * - knowledge: its place in the knowledge order <=k, by what it has been told
 *   (told none = bottom, told true and told false incomparable between, told both = top);
 * - truth: its place in the truth order <=t (false = bottom, neither and both
 *   between, true = top);
 * - extremal: each point named by the one order in which it is an extreme,
 *   the notation's names: unknown and contested are the knowledge extremes
 *   (bottom, top), denied and held the truth extremes (bottom, top).
 *
 * A display names charges in the reading of the order it presents; there is no
 * reading-free name.
 */
export const chargeReadingNames = Object.freeze(["phase", "knowledge", "truth", "extremal"]);
const reading = (name, symbol, order, position) => Object.freeze({ name, symbol, order, position });
const CHARGE_READINGS = Object.freeze({
    phase: Object.freeze({ absurd: reading("absurd", "⊥ₖ", "phase", "initial"), potential: reading("potential", "t", "phase", "articulated"), active: reading("active", "f", "phase", "articulated"), stable: reading("stable", "⊤ₖ", "phase", "settled") }),
    knowledge: Object.freeze({ absurd: reading("told none", "⊥ₖ", "knowledge", "bottom"), potential: reading("told true", "t", "knowledge", "between"), active: reading("told false", "f", "knowledge", "between"), stable: reading("told both", "⊤ₖ", "knowledge", "top") }),
    truth: Object.freeze({ active: reading("false", "f", "truth", "bottom"), absurd: reading("neither", "⊥ₖ", "truth", "between"), stable: reading("both", "⊤ₖ", "truth", "between"), potential: reading("true", "t", "truth", "top") }),
    extremal: Object.freeze({ absurd: reading("unknown", "⊥ₖ", "knowledge", "bottom"), stable: reading("contested", "⊤ₖ", "knowledge", "top"), active: reading("denied", "f", "truth", "bottom"), potential: reading("held", "t", "truth", "top") }),
});
/** A charge value (or its name) read in one reading of FOUR: its name there, symbol, order and position. */
export function readChargeValue(value, readingName) {
    const table = CHARGE_READINGS[readingName];
    if (table === undefined) throw new TypeError(`not a charge reading: ${JSON.stringify(readingName)} (expected one of ${chargeReadingNames.join(", ")})`);
    return table[typeof value === "string" ? asChargeValueName(value) : chargeValueName(asChargeValue(value))];
}
/** The charge value a name denotes in one reading. */
export function chargeValueOfReading(name, readingName) {
    const table = CHARGE_READINGS[readingName];
    if (table === undefined) throw new TypeError(`not a charge reading: ${JSON.stringify(readingName)}`);
    const found = Object.entries(table).find(([, entry]) => entry.name === name);
    if (found === undefined) throw new TypeError(`not a ${readingName} charge name: ${JSON.stringify(name)}`);
    return chargeValue(found[0]);
}
const CHARGE_VALUE_NAME_OF_NOTATION_NAME = Object.freeze(Object.fromEntries(Object.entries(CHARGE_READINGS.extremal).map(([value, entry]) => [entry.name, value])));
const NOTATION_NAME_OF_CHARGE_VALUE_NAME = Object.freeze(Object.fromEntries(Object.entries(CHARGE_READINGS.extremal).map(([value, entry]) => [value, entry.name])));
/** The data-engine charge-value name for a relation-model-notation charge name:
 *  `unknown` → `absurd`, `held` → `potential`, `denied` → `active`,
 *  `contested` → `stable`. Total over SEN's four names; throws on anything else. */
export function chargeValueNameOfNotationName(notationName) {
    if (!Object.prototype.hasOwnProperty.call(CHARGE_VALUE_NAME_OF_NOTATION_NAME, notationName)) {
        throw new TypeError(`not a relation-model-notation charge name: ${JSON.stringify(notationName)} (expected one of ${Object.keys(CHARGE_VALUE_NAME_OF_NOTATION_NAME).join(", ")})`);
    }
    return CHARGE_VALUE_NAME_OF_NOTATION_NAME[notationName];
}
/** The relation-model-notation charge name for a data-engine charge value name:
 *  `absurd` → `unknown`, `potential` → `held`, `active` → `denied`,
 *  `stable` → `contested`. Total over the four charge value names; throws on
 *  anything else. */
export function notationNameOfChargeValueName(name) {
    if (!Object.prototype.hasOwnProperty.call(NOTATION_NAME_OF_CHARGE_VALUE_NAME, name)) {
        throw new TypeError(`not a bilattice charge value name: ${JSON.stringify(name)} (expected one of ${chargeValueNames.join(", ")})`);
    }
    return NOTATION_NAME_OF_CHARGE_VALUE_NAME[name];
}
/** Construct a charge carrier from a value and optional evidence. */
export function charge(value, evidence = [[], []]) {
    const [truth, falsity] = value.coordinates;
    return Object.freeze({
        kind: "bilattice-charge.carrier",
        value: Object.freeze([truth, falsity]),
        evidence: Object.freeze([Object.freeze([...evidence[0]]), Object.freeze([...evidence[1]])]),
    });
}
/** The coordinate pair a charge carries. */
export const present = (c) => c.value;
/** Whether two charge values name the same value. */
export const sameChargeValue = (left, right) => left.name === right.name;
/** Whether two charge carriers denote the same value. */
export function sameCharge(left, right) {
    return sameChargeValue(valueOf(left), valueOf(right));
}
/** The charge value named by a carrier's coordinates. */
export function valueOf(c) {
    return chargeValueAt(c.value);
}
/** Name a point of the finite charge specialization. */
export function chargeValueAt([truth, falsity]) {
    return chargeValue(chargeNameOfSides(presentSide(truth), presentSide(falsity)));
}
/** The knowledge-order bottom: absurd with no evidence. */
export const bottom = charge(chargeValue("absurd"));
/** A potential carrier whose positive side carries the given witness. */
export const witnessedPotential = (witness) => charge(chargeValue("potential"), [[witness], []]);
/** An active carrier whose negative side carries the given witness. */
export const witnessedActive = (witness) => charge(chargeValue("active"), [[], [witness]]);
/** Negate a charge: swap truth and falsity sides and their evidence. */
export function negate(c) {
    return Object.freeze({
        kind: "bilattice-charge.carrier",
        value: chargeTwist.negate(c.value),
        evidence: Object.freeze([c.evidence[1], c.evidence[0]]),
    });
}
/** Conflate a charge: complement and swap both sides, keeping evidence. */
export function conflate(c) {
    return Object.freeze({
        kind: "bilattice-charge.carrier",
        value: Object.freeze([complementSide(c.value[1]), complementSide(c.value[0])]),
        evidence: c.evidence,
    });
}
// Evidence merges by structural content coincidence (content-addressed), so equal
// payloads count once and survive a JSON round-trip.
const mergeEvidence = (left, right) => {
    const out = [];
    for (const witness of [...left, ...right])
        if (!out.some((item) => coincides(item.value, witness.value)))
            out.push(witness);
    return Object.freeze(out);
};
const combine = (operation) => (left, right) => Object.freeze({
    kind: "bilattice-charge.carrier",
    value: operation({ left: left.value, right: right.value }),
    evidence: Object.freeze([mergeEvidence(left.evidence[0], right.evidence[0]), mergeEvidence(left.evidence[1], right.evidence[1])]),
});
/** Knowledge-order join: both sides grow. */
export const joinKnowledge = combine(chargeTwist.joinKnowledge);
/** Knowledge-order meet: both sides shrink. */
export const meetKnowledge = combine(chargeTwist.meetKnowledge);
/** Truth-order join: truth grows, falsity shrinks. */
export const joinTruth = combine(chargeTwist.joinTruth);
/** Truth-order meet: truth shrinks, falsity grows. */
export const meetTruth = combine(chargeTwist.meetTruth);
/** Knowledge-order join of values (evidence ignored).
 *
 * @example
 * ```ts
 * chargeValueName(joinKnowledgeValue(chargeValue("active"), chargeValue("stable")))
 * // "stable"
 * ```
 */
export const joinKnowledgeValue = (left, right) => valueOf(joinKnowledge(charge(left), charge(right)));
/** Knowledge-order meet of values. */
export const meetKnowledgeValue = (left, right) => valueOf(meetKnowledge(charge(left), charge(right)));
/** Truth-order join of values. */
export const joinTruthValue = (left, right) => valueOf(joinTruth(charge(left), charge(right)));
/** Truth-order meet of values. */
export const meetTruthValue = (left, right) => valueOf(meetTruth(charge(left), charge(right)));
/** Negation of a charge value. */
export const negateValue = (value) => valueOf(negate(charge(value)));
/** Conflation of a charge value. */
export const conflateValue = (value) => valueOf(conflate(charge(value)));
/** Census a list of charge values into the FOUR corners — the count at each bilattice value
 *  (absurd ⊥ / potential t / active f / stable ⊤). The shared per-cover tally every face's
 *  local-section reading needs; faculties map their own cells to charge values and parameterize
 *  this rather than re-implementing the count. */
export function fourCensus(values) {
    const census = { potential: 0, active: 0, stable: 0, absurd: 0 };
    for (const value of values)
        census[value.name] += 1;
    return Object.freeze(census);
}
/** Census a list of charge-value NAMES into the FOUR corners (the name-level form of
 *  `fourCensus`, for readings that already carry the bilattice value name). */
export function fourCensusOfNames(names) {
    const census = { potential: 0, active: 0, stable: 0, absurd: 0 };
    for (const name of names)
        census[name] += 1;
    return Object.freeze(census);
}
/** The KNOWLEDGE-order join (∨_k) over a list of charge values — the collective standing the
 *  whole cover accumulates to. "The fixed point settling reaches is a join" (content/…/join.md),
 *  the least upper bound of the graded chain; ≤_k accumulates monotonically, top ⊤ = told-both
 *  (content/…/knowledge-order.md). Folds `joinKnowledgeValue` from the ≤_k bottom ⊥ (absurd);
 *  the empty list is ⊥. */
export const knowledgeAggregate = (values) => values.reduce((accumulated, value) => joinKnowledgeValue(accumulated, value), chargeValue("absurd"));
/** The ∨_k collective standing read directly off a FOUR census — the closed form of
 *  `knowledgeAggregate` (equal by idempotence + associativity of ∨_k): ⊤ stable if any cell is
 *  stable OR both for (potential) and against (active) are present (potential ∨_k active =
 *  ⟨1,0⟩ ∨_k ⟨0,1⟩ = ⟨1,1⟩); else the lone present side; else ⊥ absurd (nothing accumulated). */
export function knowledgeAggregateOfCensus(census) {
    const hasFor = census.potential > 0;
    const hasAgainst = census.active > 0;
    if (census.stable > 0 || (hasFor && hasAgainst))
        return "stable";
    if (hasFor)
        return "potential";
    if (hasAgainst)
        return "active";
    return "absurd";
}
/** The TRUTH-order join (∨_t) over a list of charge values — the collective LEAN, which way the
 *  whole cover leans on the truth order (∨_t raises truth, lowers falsity; potential t is the ≤_t
 *  top, active f the bottom — content/…/truth-order.md, negation antitone). The DUAL of
 *  `knowledgeAggregate` (the ≤_k accumulation): where ∨_k measures HOW MUCH is settled, ∨_t reads
 *  WHICH WAY it leans. Folds `joinTruthValue` from the ≤_t bottom (active); the empty list is
 *  absurd ⊥ (no lean — special-cased, not the ≤_t bottom, since "nothing said" is not "leans
 *  against"). */
export const truthAggregate = (values) => values.length === 0 ? chargeValue("absurd") : values.reduce((leaning, value) => joinTruthValue(leaning, value), chargeValue("active"));
/** The ∨_t collective LEAN read directly off a FOUR census — the closed form of `truthAggregate`
 *  (∨_t = ⟨max truth, min falsity⟩): the truth side is present iff ANY cell has truth present
 *  (potential or stable), the falsity side iff EVERY cell has falsity present (every cell active or
 *  stable — no potential, no absurd). So: potential if any-truth and not-all-falsity (leans FOR);
 *  active if all-falsity and no-truth (leans AGAINST); stable if both (polarized — told-both wins);
 *  absurd if neither (empty / nothing said). */
export function truthAggregateOfCensus(census) {
    const total = census.potential + census.active + census.stable + census.absurd;
    const anyTruth = census.potential > 0 || census.stable > 0; // some cell has the truth side present
    const allFalsity = total > 0 && census.potential === 0 && census.absurd === 0; // every cell has the falsity side present
    if (anyTruth && allFalsity)
        return "stable";
    if (anyTruth)
        return "potential";
    if (allFalsity)
        return "active";
    return "absurd";
}
/** The KNOWLEDGE-order MEET (∧_k) over a list of charge values — the CONSENSUS, the maximum
 *  information shared by ALL cells (the network-sheaf H⁰ global section = the categorical limit;
 *  content/…/sheaf/network-sheaf-consensus-on-agent-graphs.md: consensus = ⋀_k over agents). Dual
 *  to `knowledgeAggregate` (the ∨_k join / disagreement-inclusive accumulation): consensus ⪯_k
 *  aggregate always, strict at disagreement loci. Folds `meetKnowledgeValue` from the ≤_k TOP ⊤
 *  (stable); the empty list is ⊤ (vacuous — everything trivially shared). */
export const knowledgeMeet = (values) => values.reduce((shared, value) => meetKnowledgeValue(shared, value), chargeValue("stable"));
/** The ∧_k consensus read directly off a FOUR census — the closed form of `knowledgeMeet`
 *  (∧_k = componentwise MIN of the twist-product coordinates): the meet's truth side is present
 *  iff EVERY cell has truth present (no active, no absurd), the falsity side iff every cell has
 *  falsity present (no potential, no absurd). So ⊤ stable iff all cells stable; potential iff all
 *  on the for-side (potential/stable, ≥1 potential); active iff all on the against-side; else ⊥
 *  absurd (a for/against split, or any absurd cell — no shared information). Empty census = ⊤. */
export function knowledgeMeetOfCensus(census) {
    const everyTruthPresent = census.active === 0 && census.absurd === 0; // no cell drops the truth side
    const everyFalsityPresent = census.potential === 0 && census.absurd === 0; // no cell drops the falsity side
    if (everyTruthPresent && everyFalsityPresent)
        return "stable";
    if (everyTruthPresent)
        return "potential";
    if (everyFalsityPresent)
        return "active";
    return "absurd";
}
/** Whether left ≤ right in the knowledge order. */
export function leqKnowledge(left, right) {
    return chargeTwist.leqKnowledge({ left: left.value, right: right.value });
}
/** The right charge of a pair when left ≤ right in the knowledge order, else throw. */
export function compareKnowledge(pair) {
    if (!leqKnowledge(pair.left, pair.right)) {
        throw new TypeError("compareKnowledge: no knowledge-order witness; left has knowledge not present in right");
    }
    return pair.right;
}
/** The knowledge-order join of a pair, accumulating evidence. */
export const aggregate = (pair) => joinKnowledge(pair.left, pair.right);
/** Whether left ≤ right in the truth order (truth grows, falsity shrinks). */
export function leqTruth(left, right) {
    return chargeTwist.leqTruth({ left: left.value, right: right.value });
}
const everyCharge = (predicate) => chargeValues.every(predicate);
const everyChargePair = (predicate) => chargeValues.every((a) => chargeValues.every((b) => predicate(a, b)));
const everyChargeTriple = (predicate) => chargeValues.every((a) => chargeValues.every((b) => chargeValues.every((c) => predicate(a, b, c))));
const sameNamed = (left, right) => sameChargeValue(left, right);
const joinK = (left, right) => joinKnowledgeValue(left, right);
const meetK = (left, right) => meetKnowledgeValue(left, right);
const joinT = (left, right) => joinTruthValue(left, right);
const meetT = (left, right) => meetTruthValue(left, right);
/** Exhaustive finite receipt for the RelMath `Charge` bilattice laws. */
export function chargeBilatticeLawReceipt() {
    const kBot = chargeValue("absurd");
    const kTop = chargeValue("stable");
    const tBot = chargeValue("active");
    const tTop = chargeValue("potential");
    return Object.freeze({
        kind: "bilattice-charge.laws:witness",
        knowledgeJoinCommutative: everyChargePair((a, b) => sameNamed(joinK(a, b), joinK(b, a))),
        knowledgeMeetCommutative: everyChargePair((a, b) => sameNamed(meetK(a, b), meetK(b, a))),
        knowledgeJoinAssociative: everyChargeTriple((a, b, c) => sameNamed(joinK(joinK(a, b), c), joinK(a, joinK(b, c)))),
        knowledgeMeetAssociative: everyChargeTriple((a, b, c) => sameNamed(meetK(meetK(a, b), c), meetK(a, meetK(b, c)))),
        knowledgeJoinIdempotent: everyCharge((a) => sameNamed(joinK(a, a), a)),
        knowledgeMeetIdempotent: everyCharge((a) => sameNamed(meetK(a, a), a)),
        knowledgeAbsorptionJoinMeet: everyChargePair((a, b) => sameNamed(joinK(a, meetK(a, b)), a)),
        knowledgeAbsorptionMeetJoin: everyChargePair((a, b) => sameNamed(meetK(a, joinK(a, b)), a)),
        truthJoinCommutative: everyChargePair((a, b) => sameNamed(joinT(a, b), joinT(b, a))),
        truthMeetCommutative: everyChargePair((a, b) => sameNamed(meetT(a, b), meetT(b, a))),
        truthJoinAssociative: everyChargeTriple((a, b, c) => sameNamed(joinT(joinT(a, b), c), joinT(a, joinT(b, c)))),
        truthMeetAssociative: everyChargeTriple((a, b, c) => sameNamed(meetT(meetT(a, b), c), meetT(a, meetT(b, c)))),
        knowledgeBottomJoinIdentity: everyCharge((a) => sameNamed(joinK(kBot, a), a)),
        knowledgeTopMeetIdentity: everyCharge((a) => sameNamed(meetK(kTop, a), a)),
        knowledgeBottomLeast: everyCharge((a) => leqKnowledge(charge(kBot), charge(a))),
        knowledgeTopGreatest: everyCharge((a) => leqKnowledge(charge(a), charge(kTop))),
        knowledgeMeetDistributesOverKnowledgeJoin: everyChargeTriple((a, b, c) => sameNamed(meetK(a, joinK(b, c)), joinK(meetK(a, b), meetK(a, c)))),
        truthMeetDistributesOverKnowledgeJoin: everyChargeTriple((a, b, c) => sameNamed(meetT(a, joinK(b, c)), joinK(meetT(a, b), meetT(a, c)))),
        negationInvolutive: everyCharge((a) => sameNamed(negateValue(negateValue(a)), a)),
        negationPreservesKnowledgeOrder: everyChargePair((a, b) => leqKnowledge(charge(negateValue(a)), charge(negateValue(b))) === leqKnowledge(charge(a), charge(b))),
        negationReversesTruthOrder: everyChargePair((a, b) => leqTruth(charge(negateValue(a)), charge(negateValue(b))) === leqTruth(charge(b), charge(a))),
        negationSwapsTruthPoles: sameNamed(negateValue(tTop), tBot) && sameNamed(negateValue(tBot), tTop),
        negationFixesKnowledgePoles: sameNamed(negateValue(kBot), kBot) && sameNamed(negateValue(kTop), kTop),
    });
}
/** Whether a charge is the top (absurd). */
export function isTop(c) {
    return presentSide(c.value[0]) && presentSide(c.value[1]);
}
/** Whether a charge is the bottom (potential). */
export function isBottom(c) {
    return absentSide(c.value[0]) && absentSide(c.value[1]);
}
/** All gauge element names. */
export const gaugeElementNames = Object.freeze(["id", "negation", "conflation", "double"]);
/** Apply a gauge element to a charge value. */
export function gauge(sigma, value) {
    if (sigma === "negation")
        return negateValue(value);
    if (sigma === "conflation")
        return conflateValue(value);
    if (sigma === "double")
        return negateValue(conflateValue(value));
    return value;
}
const gaugePermutation = (sigma) => chargeValueNames.map((name) => gauge(sigma, chargeValue(name)).name);
function gaugeElementForPermutation(permutation) {
    const found = gaugeElementNames.find((element) => gaugePermutation(element).every((image, index) => image === permutation[index]));
    if (!found)
        throw new TypeError("gaugeElementForPermutation: permutation is not in K4");
    return found;
}
/** The K4 multiplication, derived from action composition: `left` after `right`. */
export function gaugeMul(left, right) {
    return gaugeElementForPermutation(chargeValueNames.map((name) => gauge(left, gauge(right, chargeValue(name))).name));
}
export function gaugeOrderEffect(element) {
    const preservesKnowledge = everyChargePair((a, b) => leqKnowledge(charge(gauge(element, a)), charge(gauge(element, b))) === leqKnowledge(charge(a), charge(b)));
    const reversesKnowledge = everyChargePair((a, b) => leqKnowledge(charge(gauge(element, a)), charge(gauge(element, b))) === leqKnowledge(charge(b), charge(a)));
    const preservesTruth = everyChargePair((a, b) => leqTruth(charge(gauge(element, a)), charge(gauge(element, b))) === leqTruth(charge(a), charge(b)));
    const reversesTruth = everyChargePair((a, b) => leqTruth(charge(gauge(element, a)), charge(gauge(element, b))) === leqTruth(charge(b), charge(a)));
    if (preservesKnowledge && preservesTruth)
        return "preserves-both";
    if (preservesKnowledge && reversesTruth)
        return "preserves-knowledge-reverses-truth";
    if (reversesKnowledge && preservesTruth)
        return "reverses-knowledge-preserves-truth";
    if (reversesKnowledge && reversesTruth)
        return "reverses-both";
    throw new TypeError(`gaugeOrderEffect: ${element} has no K4 order effect`);
}
/** The charge values fixed by a gauge element. */
export const fixedSet = (sigma) => Object.freeze(chargeValues.filter((value) => sameChargeValue(gauge(sigma, value), value)));
const sameGauge = (left, right) => left === right;
/** Bundle the finite Node shadow of `RelMath.KleinFour.K4.isGroup`. */
export function kleinFourGaugeReceipt() {
    const closure = gaugeElementNames.every((left) => gaugeElementNames.every((right) => gaugeElementNames.includes(gaugeMul(left, right))));
    const associative = gaugeElementNames.every((left) => gaugeElementNames.every((middle) => gaugeElementNames.every((right) => sameGauge(gaugeMul(gaugeMul(left, middle), right), gaugeMul(left, gaugeMul(middle, right))))));
    const identity = gaugeElementNames.every((element) => gaugeMul("id", element) === element && gaugeMul(element, "id") === element);
    const selfInverse = gaugeElementNames.every((element) => gaugeMul(element, element) === "id");
    const abelian = gaugeElementNames.every((left) => gaugeElementNames.every((right) => gaugeMul(left, right) === gaugeMul(right, left)));
    const actionHomomorphism = gaugeElementNames.every((left) => gaugeElementNames.every((right) => chargeValues.every((value) => sameChargeValue(gauge(gaugeMul(left, right), value), gauge(left, gauge(right, value))))));
    const generatedByNegationConflation = gaugeElementNames.every((element) => element === "id" || element === "negation" || element === "conflation" || gaugeMul("negation", "conflation") === element);
    if (!closure || !associative || !identity || !selfInverse || !abelian || !actionHomomorphism || !generatedByNegationConflation) {
        throw new TypeError("kleinFourGaugeReceipt: K4 finite group laws failed");
    }
    return Object.freeze({
        kind: "bilattice-charge.kleinFourGauge:witness",
        theorem: "RelMath.KleinFour.K4.isGroup",
        elements: gaugeElementNames,
        orderFour: true,
        closure: true,
        associative: true,
        identity: true,
        selfInverse: true,
        abelian: true,
        actionHomomorphism: true,
        generatedByNegationConflation: true,
        negationOrbit: Object.freeze(["potential", "active"]),
        conflationOrbit: Object.freeze(["absurd", "stable"]),
        negationFixed: Object.freeze(fixedSet("negation").map((value) => value.name)),
        conflationFixed: Object.freeze(fixedSet("conflation").map((value) => value.name)),
        orderEffects: Object.freeze(Object.fromEntries(gaugeElementNames.map((element) => [element, gaugeOrderEffect(element)]))),
    });
}
/** Test a labeling for self-duality under a gauge element. */
export function firingPatternSelfDuality(labeling, sigma) {
    const fixed = fixedSet(sigma);
    const moving = Object.freeze(labeling.filter((value) => !fixed.some((fixedValue) => sameChargeValue(fixedValue, value))));
    return moving.length === 0
        ? Object.freeze({ kind: "bilattice-charge.firingPatternSelfDuality:witness", labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed })
        : Object.freeze({ kind: "bilattice-charge.firingPatternSelfDuality-obstruction", labeling: Object.freeze([...labeling]), gaugeElement: sigma, fixed, moving });
}
/** Compare two charge values for identity. */
export function chargeValueIdentity(left, right) {
    return sameChargeValue(left, right)
        ? Object.freeze({ kind: "bilattice-charge.valueIdentity:witness", left, right })
        : Object.freeze({ kind: "bilattice-charge.valueIdentity-obstruction", left, right });
}
const orderLeq = (order, join) => (left, right) => {
    const joined = join(left, right);
    return sameChargeValue(joined, right)
        ? Object.freeze({ kind: "bilattice-charge.orderLeq:witness", order, left, right, join: joined })
        : Object.freeze({ kind: "bilattice-charge.orderLeq-obstruction", order, left, right, join: joined });
};
/** Whether one charge value is ≤ another in the knowledge order. */
export const knowledgeLeq = orderLeq("knowledge", joinKnowledgeValue);
/** Whether one charge value is ≤ another in the truth order. */
export const truthLeq = orderLeq("truth", joinTruthValue);
