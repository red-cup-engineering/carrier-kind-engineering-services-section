/**
 * predicating/independent-evidence — the predication-charge machinery, reseated.
 *
 * A Fregean predication fixes ONE oriented (subject, predicate, object) point;
 * evidence FOR it and evidence AGAINST it are independent `Bool × Bool`
 * coordinates — relational converse and subject/object reversal are never
 * denial. This is the executable form of
 * `Obsmetrologia.Language.Predicating.FregeanFourChu`
 * (obsmetrological-services-section/lib/obsmetrologia/Obsmetrologia/Language/Predicating/FregeanFourChu.lean):
 * `independentEvidenceCharge : Bool × Bool -> Charge` is exactly
 * `independentEvidenceRow`/`independentEvidenceSide` feeding `foldIndependentEvidence`'s
 * per-cell join, and `predicationChu` is exactly what `sectionSpace` presents —
 * predications as points, witnessing parties as states, the FOUR-valued read as
 * the matrix entry. See `teaching-articles/explanations/independent-evidence.md`
 * for the full grounding (also the CHL/nuclear-quartet reading and glass-sponge
 * §16.4's "independence is evidential, not organizational").
 *
 * Ported from `@red-cup-engineering/computer`'s `posix-holography/src/substrate.mjs`
 * (a read-only deprecation inventory as of this port — write nothing there).
 * That module built this on top of the general `fold`/`settle`/`supersede`/
 * `relate` OS substrate (any predicate, any trace, functional or relational).
 * This port carries ONLY the independent-evidence family: `foldIndependentEvidence`
 * below is a self-contained fold restricted to claims seeded at ⊥ plus rows whose
 * side is resolved by `independentEvidenceSide` — it does not open the legacy
 * `opts.converse` remap (refused, as in the original) and, unlike the original's
 * shared `fold`, does not scan the trace for incidental `has-converse`
 * declarations either — a predication-charge fold has no path by which converse
 * can define denial. Both real consumers of the original (workspace-content-graph,
 * fae) only ever called it without that legacy path live, so this narrowing
 * changes no observed behavior; it just closes a door the function's own
 * doc comment already said should not exist.
 *
 * Row admission, identity, and grouping use the operational EAVT owner.
 * The independent evidence fold remains scientific; nothing here is
 * reimplemented: `foldIndependentEvidence` joins per-cell evidence with
 * `positing/bilattice-charge`'s `joinKnowledge`, and `sectionSpace` presents the
 * folded fiber as an explicit Chu space over FOUR via
 * `positing/logic/linear-logic-chu` — this package's own executable form of
 * `Obsmetrologia/Calculus/Logic/LinearLogicChu.lean`.
 */
import { row as assertRow } from "@red-cup-engineering/eavt";
import { canonicalCborToNiUri, encodeCanonical } from "@red-cup-engineering/computer-data-engine/identity";
const canonicalKey = (value) => Buffer.from(encodeCanonical(value)).toString("base64");
export const rowId = (value) => canonicalCborToNiUri(encodeCanonical(assertRow(value)));
import { mark } from "@red-cup-engineering/computer-data-engine/utterance";
import { bottom, charge, chargeSideName, chargeValue, joinKnowledge, negate, witnessedPotential } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { chuSpace } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/linear-logic-chu.mjs";
// === reified-row identity ===================================================================
/** A reified row is a row ABOUT a base row: its subject `e` is the base row's content-id, prefixed. */
export const REIFIED_PREFIX = "row:";
/** reify(base) -> the content-address of a base row, prefixed with the full canonical EAVT identity. */
export const reify = (base) => `${REIFIED_PREFIX}${rowId(base)}`;
/** isReified(e) -> is this entity-id an attribution about a row (not a subject)? */
export const isReified = (e) => typeof e === "string" && e.startsWith(REIFIED_PREFIX);
// === independent predication evidence ==========================================================
/** The witness kind tagging a row as one independent evidence-for/evidence-against observation. */
export const INDEPENDENT_EVIDENCE_WITNESS_KIND = "predication.independent-evidence";
/** Build one independent-evidence row: an exact EAVT row whose `t` names the side and the observer. */
export function independentEvidenceRow({ subject, predicate, object, side, by, witness }) {
    if (typeof subject !== "string" || subject === "")
        throw new TypeError("independentEvidenceRow: subject must be a non-empty string");
    if (typeof predicate !== "string" || predicate === "")
        throw new TypeError("independentEvidenceRow: predicate must be a non-empty string");
    if (side !== "positive" && side !== "negative")
        throw new TypeError("independentEvidenceRow: side must be positive or negative");
    if (typeof by !== "string" || by === "")
        throw new TypeError("independentEvidenceRow: by must be a non-empty string");
    if (witness === undefined)
        throw new TypeError("independentEvidenceRow: witness is required");
    const row = {
        e: subject,
        a: predicate,
        v: object,
        t: { kind: INDEPENDENT_EVIDENCE_WITNESS_KIND, version: 1, side, by, witness },
    };
    assertRow(row);
    return deepFreeze(row);
}
/** The independent-evidence side an EAVT row witnesses, or null when the row carries no such witness. */
export function independentEvidenceSide(row) {
    const t = row?.t;
    if (t?.kind !== INDEPENDENT_EVIDENCE_WITNESS_KIND)
        return null;
    if (t.version !== 1)
        throw new TypeError("independent evidence witness must be version 1");
    if (t.side !== "positive" && t.side !== "negative") {
        throw new TypeError("independent evidence witness side must be positive or negative");
    }
    return t.side;
}
/**
 * foldIndependentEvidence — fold one subject's claims and evidence rows into its settled section.
 *
 * Claims seed the points, so a point with no evidence remains present at ⊥. Every evidence row is
 * exact EAVT; `independentEvidenceSide` names which independent coordinate it observed. A cell told
 * both sides settles to ⊤ (a HELD value, not an error) via the shared charge `joinKnowledge` —
 * nothing here re-derives the join.
 */
export function foldIndependentEvidence(subject, claims, rows, opts = {}) {
    if (typeof subject !== "string" || !subject)
        throw new TypeError("foldIndependentEvidence: subject must be a non-empty string");
    if (!Array.isArray(claims))
        throw new TypeError("foldIndependentEvidence: claims must be an array");
    if (!Array.isArray(rows))
        throw new TypeError("foldIndependentEvidence: rows must be an {e,a,v,t} array");
    if (Object.hasOwn(opts, "converse"))
        throw new TypeError("foldIndependentEvidence: converse is not denial; use independent negative witnesses");
    for (const row of rows)
        assertRow(row);
    const retractedAfter = new Map();
    if (opts.retract !== false) {
        for (const r of rows) {
            if (r.e === subject && r.v === null) {
                const cur = retractedAfter.get(r.a);
                if (cur === undefined || r.t > cur)
                    retractedAfter.set(r.a, r.t);
            }
        }
    }
    const cells = new Map();
    for (const [index, claim] of claims.entries()) {
        if (!claim || typeof claim !== "object" || Array.isArray(claim))
            throw new TypeError(`foldIndependentEvidence: claims[${index}] must be an object`);
        if (claim.subject !== subject)
            throw new TypeError(`foldIndependentEvidence: claims[${index}].subject must equal the folded subject`);
        if (typeof claim.predicate !== "string" || claim.predicate === "")
            throw new TypeError(`foldIndependentEvidence: claims[${index}].predicate must be a non-empty string`);
        const key = canonicalKey([claim.predicate, claim.object]);
        cells.set(key, { predicate: claim.predicate, object: claim.object, charge: bottom });
    }
    for (const r of rows) {
        if (r.e !== subject)
            continue;
        if (isReified(r.e))
            continue;
        if (r.v === null)
            continue; // a retraction row carries no positive evidence
        const tombstone = retractedAfter.get(r.a);
        if (tombstone !== undefined && r.t < tombstone)
            continue;
        const side = independentEvidenceSide(r);
        if (side === null)
            continue; // not an independent-evidence witness: no path to charge a cell
        const id = rowId(r);
        const positive = witnessedPotential(mark(id));
        const contribution = side === "negative" ? negate(positive) : positive;
        const key = canonicalKey([r.a, r.v]);
        const prior = cells.get(key)?.charge ?? bottom;
        cells.set(key, { predicate: r.a, object: r.v, charge: joinKnowledge(prior, contribution) });
    }
    const fiber = [...cells.values()]
        .sort((a, b) => canonicalKey([a.predicate, a.object]).localeCompare(canonicalKey([b.predicate, b.object])))
        .map(({ predicate, object, charge }) => ({
        predicate,
        object,
        value: {
            pos: chargeSideName(charge.value[0]) === "present" ? 1 : 0,
            neg: chargeSideName(charge.value[1]) === "present" ? 1 : 0,
            evidence: [charge.evidence[0].map(rowIdentity), charge.evidence[1].map(rowIdentity)],
        },
    }));
    return deepFreeze({ entity: subject, fiber });
}
// The operational projection exposes row IDs; semantic evidence remains Marks.
function rowIdentity(witness) {
    if (typeof witness.value !== "string")
        throw new TypeError("independent evidence must carry a row identity");
    return witness.value;
}
/**
 * sectionSpace(folded, rows, opts?) — lift a folded fiber-algebra into an explicit Chu space over
 * FOUR (`positing/logic/linear-logic-chu`): the rich sibling of `section()`. The POINTS are the
 * folded cells (keyed `canonicalKey([predicate,object])`), the STATES are the witnessing coordinate
 * `stateOf(row)` (e.g. the party in `t.by`), and the charge at (cell, state) is the FOUR face that
 * state witnesses: `potential` if it charged the positive face, `active` the converse, `stable`
 * both, `absurd` (open-world absent) neither. This is exactly the Chu presentation
 * `Obsmetrologia.predicationChu` names: predications as points, valuations (here, witnessing
 * parties) as states, evaluation as the matrix entry.
 */
export function sectionSpace(folded, rows = [], opts = {}) {
    const stateOf = opts.stateOf ?? ((r) => (r && r.t && typeof r.t === "object" ? r.t.by : r?.t));
    const absent = charge(chargeValue(opts.absent ?? "absurd"));
    const stateOfId = new Map();
    for (const r of rows) {
        const s = stateOf(r);
        if (s != null)
            stateOfId.set(rowId(r), String(s));
    }
    const partiesOf = (ids) => {
        const out = new Set();
        for (const id of ids) {
            const s = stateOfId.get(id);
            if (s != null)
                out.add(s);
        }
        return out;
    };
    const cells = new Map();
    const posParties = new Map();
    const negParties = new Map();
    const stateSet = new Set();
    for (const c of folded.fiber) {
        if (opts.predicate !== undefined && c.predicate !== opts.predicate)
            continue;
        const key = canonicalKey([c.predicate, c.object]);
        cells.set(key, { predicate: c.predicate, object: c.object, charge: c.value });
        const [posIds, negIds] = c.value.evidence;
        const pos = partiesOf(posIds);
        const neg = partiesOf(negIds);
        posParties.set(key, pos);
        negParties.set(key, neg);
        for (const s of pos)
            stateSet.add(s);
        for (const s of neg)
            stateSet.add(s);
    }
    const points = [...cells.keys()].sort();
    const states = [...stateSet].sort();
    const chargeAt = (point, state) => {
        const pos = posParties.get(point)?.has(state) ?? false;
        const neg = negParties.get(point)?.has(state) ?? false;
        if (!pos && !neg)
            return absent;
        if (pos && neg)
            return charge(chargeValue("stable"));
        return charge(chargeValue(pos ? "potential" : "active"));
    };
    return {
        space: chuSpace(points, states, chargeAt, { absent }),
        cellFor: (key) => cells.get(key),
        stateOfId,
    };
}
function deepFreeze(v) {
    if (v && typeof v === "object" && !Object.isFrozen(v)) {
        for (const c of Object.values(v))
            deepFreeze(c);
        Object.freeze(v);
    }
    return v;
}
