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
import { type Row as EavtRow } from "@red-cup-engineering/eavt";
export declare const rowId: (value: EavtRow) => string;
import { type ChargeValueName } from "../../../../../../../../computer-data-engineering-services-section/apps/computer-data-engine/src/bilattice-charge.mjs";
import { type ChuSpace } from "./positing/logic/linear-logic-chu.mjs";
export type { Row as EavtRow } from "@red-cup-engineering/eavt";
/** A reified row is a row ABOUT a base row: its subject `e` is the base row's content-id, prefixed. */
export declare const REIFIED_PREFIX = "row:";
/** reify(base) -> the content-address of a base row, prefixed with the full canonical EAVT identity. */
export declare const reify: (base: EavtRow) => string;
/** isReified(e) -> is this entity-id an attribution about a row (not a subject)? */
export declare const isReified: (e: unknown) => e is string;
/** The witness kind tagging a row as one independent evidence-for/evidence-against observation. */
export declare const INDEPENDENT_EVIDENCE_WITNESS_KIND = "predication.independent-evidence";
/** One side of independent predication evidence. */
export type IndependentEvidenceSideName = "positive" | "negative";
/** The witness carried by an independent-evidence row's `t`. */
export type IndependentEvidenceWitness = {
    readonly kind: typeof INDEPENDENT_EVIDENCE_WITNESS_KIND;
    readonly version: 1;
    readonly side: IndependentEvidenceSideName;
    readonly by: string;
    readonly witness: EavtRow["t"];
};
/** Input to `independentEvidenceRow`. */
export interface IndependentEvidenceRowInput {
    readonly subject: string;
    readonly predicate: string;
    readonly object: unknown;
    readonly side: IndependentEvidenceSideName;
    readonly by: string;
    readonly witness: unknown;
}
/** An independent-evidence row: `t` carries which side this observation charges and who observed it. */
export interface IndependentEvidenceRow extends EavtRow {
    readonly t: IndependentEvidenceWitness;
}
/** Build one independent-evidence row: an exact EAVT row whose `t` names the side and the observer. */
export declare function independentEvidenceRow({ subject, predicate, object, side, by, witness }: IndependentEvidenceRowInput): IndependentEvidenceRow;
/** The independent-evidence side an EAVT row witnesses, or null when the row carries no such witness. */
export declare function independentEvidenceSide(row: EavtRow): IndependentEvidenceSideName | null;
/** One claim seeding a predication point: a subject/predicate/object triple to fold evidence onto. */
export interface PredicationClaim {
    readonly subject: string;
    readonly predicate: string;
    readonly object: unknown;
}
/** One folded cell: the charge at a (predicate, object) point on the folded subject. */
export interface FoldedCell {
    readonly predicate: string;
    readonly object: unknown;
    readonly value: {
        readonly pos: 0 | 1;
        readonly neg: 0 | 1;
        readonly evidence: readonly [readonly string[], readonly string[]];
    };
}
/** A subject's settled section: a fiber of cells, one per distinct (predicate, object). */
export interface FoldedSection {
    readonly entity: string;
    readonly fiber: readonly FoldedCell[];
}
/** Options accepted by `foldIndependentEvidence`. `converse` is refused (see the module doc). */
export interface FoldIndependentEvidenceOptions {
    readonly retract?: boolean;
}
/**
 * foldIndependentEvidence — fold one subject's claims and evidence rows into its settled section.
 *
 * Claims seed the points, so a point with no evidence remains present at ⊥. Every evidence row is
 * exact EAVT; `independentEvidenceSide` names which independent coordinate it observed. A cell told
 * both sides settles to ⊤ (a HELD value, not an error) via the shared charge `joinKnowledge` —
 * nothing here re-derives the join.
 */
export declare function foldIndependentEvidence(subject: string, claims: readonly PredicationClaim[], rows: readonly EavtRow[], opts?: FoldIndependentEvidenceOptions & {
    readonly converse?: never;
}): FoldedSection;
/** Options accepted by `sectionSpace`. */
export interface SectionSpaceOptions {
    /** The column coordinate a row witnesses (default `r.t?.by ?? r.t`). */
    readonly stateOf?: (row: EavtRow) => unknown;
    /** Keep only cells on this predicate (optional filter). */
    readonly predicate?: string;
    /** The charge a non-witnessing (cell,state) reads (default `absurd`, open-world EAVT). */
    readonly absent?: ChargeValueName;
}
/** One resolved cell of a `sectionSpace`. `charge` is the folded cell's own `value` (pos/neg/evidence) —
 * the exact carrier a consumer needs to read which row ids witnessed each face, not a flattened pair. */
export interface SectionSpaceCell {
    readonly predicate: string;
    readonly object: unknown;
    readonly charge: FoldedCell["value"];
}
/** The result of lifting a folded fiber into an explicit Chu space over FOUR. */
export interface SectionSpaceResult {
    readonly space: ChuSpace;
    readonly cellFor: (pointKey: string) => SectionSpaceCell | undefined;
    readonly stateOfId: ReadonlyMap<string, string>;
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
export declare function sectionSpace(folded: FoldedSection, rows?: readonly EavtRow[], opts?: SectionSpaceOptions): SectionSpaceResult;
