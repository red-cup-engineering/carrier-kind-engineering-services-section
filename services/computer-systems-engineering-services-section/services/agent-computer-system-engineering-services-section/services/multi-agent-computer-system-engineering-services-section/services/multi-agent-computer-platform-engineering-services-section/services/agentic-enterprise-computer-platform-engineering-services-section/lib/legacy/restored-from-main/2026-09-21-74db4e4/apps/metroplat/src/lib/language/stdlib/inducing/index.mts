/**
 * @packageDocumentation
 *
 * `@red-cup-engineering/metroplat/core/language/stdlib/inducing` exports the portable
 * morphisms of the Inducing process
 * morphisms as RMN terms.
 *
 * Each term is a closed lambda that faithfully rebuilds exactly what the
 * corresponding TS function produces, differential-checked byte-identical.
 * Together they express the induction loop's forward pass in the calculus:
 *
 *   articulate       Utterance → ArticulationCell
 *   predicate        ArticulationCell → PredicationSite generators
 *   posit            PredicationSite → PositPresheaf generators (re-tag)
 *   settle           PositPresheaf → Settlement generators (the
 *                    generator re-kind only: the settle ACTION runs the closure
 *                    engine over this spine and attaches the settled reading)
 *   inducing         settle ∘ posit ∘ predicate ∘ articulate (one composed term)
 *   relateRelations  { left, right } → Settlement generators (cell
 *                    union by structural coincidence; the action attaches the
 *                    knowledge-join settled reading at the boundary)
 *   coincide         { left, right } → token coincidence judgment
 *
 * Product reading: Inducing is not only a TypeScript pipeline. It is
 * also a portable term catalog, so the same relation-building spine can be
 * inspected, transported, audited, and replayed as data.
 *
 * `relate-relations`' term is deliberately only the carried generator morphism:
 * it unions cells by structural coincidence and appends specialization
 * generators. The action's host run still computes the boundary `settled`
 * readout through the proven valuation knowledge-join, parallel to `settle`
 * attaching closure-engine readings around a smaller portable generator body.
 */
import { tm } from "../../ast/index.mts";
import { objectTerm, arrayTerm, stringTerm } from "../../reader/projecting/index.mts";
import { projectField } from "@red-cup-engineering/relation-model-notation/json-codec";

/** The known, fixed field-name lists each direct projection below reads
 *  against — one source per shape, so `objectTerm` (construction) and
 *  `projectField` (reading) can never silently disagree about a shape's
 *  fields. Unsorted, as-authored; `projectField` sorts internally. */
const ARTICULATION_CELL_FIELDS = ["kind", "potentialAperiodicArticulationCell"];
const UTTERANCE_FIELDS = ["kind", "token", "claim"];
const CLAIM_FIELDS = ["kind", "hand", "mark"];
const PREDICATION_GENERATORS_FIELDS = ["kind", "cells", "specializations"];
const COINCIDENCE_INPUT_FIELDS = ["left", "right"];
const RELATE_RELATIONS_INPUT_FIELDS = ["left", "right"];

/** Build the initial articulation cell for one utterance object.
 *
 * `potentialAperiodicArticulationCell` is `[utterance, [[token], []]]` —
 * the potential cell's one designated generator is the utterance's own
 * token (`articulationCellShape.properties.potentialAperiodicArticulationCell`,
 * `@lenticule-science/articulating/utterance`): a single-element array
 * holding the token, paired with the always-empty second slot. */
export const articulateTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("utterance.articulation.cell")],
    [
      "potentialAperiodicArticulationCell",
      arrayTerm([
        tm.var(0),
        arrayTerm([arrayTerm([projectField(UTTERANCE_FIELDS, "token", tm.var(0))]), arrayTerm([])]),
      ]),
    ],
  ]),
);

/** Read an articulation cell into the generator-only predication site used by Inducing. */
export const predicateTerm = (() => {
  const input = tm.var(0);
  const utteranceObject = tm.fst(tm.snd(projectField(ARTICULATION_CELL_FIELDS, "potentialAperiodicArticulationCell", input)));
  const token = projectField(UTTERANCE_FIELDS, "token", utteranceObject);
  const claim = projectField(UTTERANCE_FIELDS, "claim", utteranceObject);
  const predicateObject = objectTerm([
    ["kind", stringTerm("predication.predicate")],
    ["claim", claim],
    ["mark", projectField(CLAIM_FIELDS, "mark", claim)],
  ]);
  const cellObject = objectTerm([
    ["subject", token],
    ["predicate", predicateObject],
    ["object", token],
  ]);
  return tm.lam(
    objectTerm([
      ["kind", stringTerm("predication.site")],
      ["cells", arrayTerm([cellObject])],
      ["specializations", arrayTerm([])],
    ]),
  );
})();

/** Retag a predication-site generator object as the corresponding posit-presheaf generator object. */
export const positTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("predication.posit.presheaf")],
    ["cells", projectField(PREDICATION_GENERATORS_FIELDS, "cells", tm.var(0))],
    ["specializations", projectField(PREDICATION_GENERATORS_FIELDS, "specializations", tm.var(0))],
  ]),
);

/** Retag a posit-presheaf generator object as the slim settlement-filtration generator object. */
export const settleTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["cells", projectField(PREDICATION_GENERATORS_FIELDS, "cells", tm.var(0))],
    ["specializations", projectField(PREDICATION_GENERATORS_FIELDS, "specializations", tm.var(0))],
  ]),
);

/** One Inducing pass, settle ∘ posit ∘ predicate ∘ articulate, as one composed IR term. */
export const inducingTerm = tm.lam(
  tm.app(settleTerm, tm.app(positTerm, tm.app(predicateTerm, tm.app(articulateTerm, tm.var(0))))),
);

/** Append `item` to the end of `list`, using only the array spine primitives. */
const appendItemTerm = tm.lam(tm.lam(
  tm.reverseArray(tm.consArray(tm.var(0), tm.reverseArray(tm.var(1)))),
));

/** Whether `list` already contains `item` by structural coincidence. */
const arrayContainsTerm = tm.lam(tm.lam(
  tm.fold(
    tm.lam(tm.lam(tm.cond(
      tm.var(1),
      tm.bool(true),
      tm.coincide(tm.var(0), tm.var(2)),
    ))),
    tm.bool(false),
    tm.var(1),
  ),
));

/** Append `item` only when no coincident element is already present. */
const appendUniqueItemTerm = tm.lam(tm.lam(
  tm.cond(
    tm.app(tm.app(arrayContainsTerm, tm.var(1)), tm.var(0)),
    tm.var(1),
    tm.app(tm.app(appendItemTerm, tm.var(1)), tm.var(0)),
  ),
));

/** `left ∪ right` for array objects, deduping by `coincide`. */
const arrayUnionTerm = tm.lam(tm.lam(
  tm.fold(appendUniqueItemTerm, tm.var(1), tm.var(0)),
));

/** `left ++ right` as a call-site composition of fold/reverse/cons. */
const arrayAppendTerm = tm.lam(tm.lam(
  tm.fold(appendItemTerm, tm.var(1), tm.var(0)),
));

/** Relate two settlement generator objects as a portable generator morphism. */
export const relateRelationsTerm = (() => {
  const input = tm.var(0);
  const left = projectField(RELATE_RELATIONS_INPUT_FIELDS, "left", input);
  const right = projectField(RELATE_RELATIONS_INPUT_FIELDS, "right", input);
  const leftCells = projectField(PREDICATION_GENERATORS_FIELDS, "cells", left);
  const rightCells = projectField(PREDICATION_GENERATORS_FIELDS, "cells", right);
  const leftSpecializations = projectField(PREDICATION_GENERATORS_FIELDS, "specializations", left);
  const rightSpecializations = projectField(PREDICATION_GENERATORS_FIELDS, "specializations", right);
  return tm.lam(objectTerm([
    ["kind", stringTerm("predication.settlement.filtration")],
    ["cells", tm.app(tm.app(arrayUnionTerm, leftCells), rightCells)],
    ["specializations", tm.app(tm.app(arrayAppendTerm, leftSpecializations), rightSpecializations)],
  ]));
})();

/** Token coincidence judgment: `{ left, right }` → witness or obstruction. */
export const coincideTerm = (() => {
  const input = tm.var(0);
  const leftPayload = projectField(COINCIDENCE_INPUT_FIELDS, "left", input);
  const rightPayload = projectField(COINCIDENCE_INPUT_FIELDS, "right", input);
  const tokenOf = (payload: import("../../ast/index.mts").Tm) => objectTerm([
    ["kind", stringTerm("utterance.token")],
    ["hand", stringTerm("left")],
    ["mark", objectTerm([["kind", stringTerm("utterance.mark")], ["value", payload]])],
  ]);
  const judgment = (kind: string) => objectTerm([
    ["kind", stringTerm(kind)],
    ["left", tokenOf(leftPayload)],
    ["right", tokenOf(rightPayload)],
  ]);
  return tm.lam(tm.cond(
    tm.coincide(leftPayload, rightPayload),
    judgment("utterance.coincidence:witness"),
    judgment("utterance.coincidence-obstruction"),
  ));
})();
