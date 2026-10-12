/**
 * Portable RMN descent over canonical Articulating presentations.
 * Positing admits explicit charge evidence; settling preserves an explicit
 * closure profile. Full closure is reconstructed by Articulating from the
 * resulting evidence-bearing presentation.
 */
import { tm } from "@red-cup-engineering/relation-model-notation";
import { objectTerm, arrayTerm, stringTerm } from "@red-cup-engineering/relation-model-notation-json-codec";

/** Build the initial articulation cell for one utterance carrier. */
export const articulateTerm = tm.lam(
  objectTerm([
    ["kind", stringTerm("utterance.articulation.cell")],
    [
      "potentialAperiodicArticulationCell",
      arrayTerm([tm.var(0), arrayTerm([arrayTerm([tm.field("token", tm.var(0))]), arrayTerm([])])]),
    ],
  ]),
);

/** Read an articulation cell into the generator-only predication site used by the descent. */
export const predicateTerm = (() => {
  const input = tm.var(0);
  const carrier = tm.fst(tm.snd(tm.field("potentialAperiodicArticulationCell", input)));
  const token = tm.field("token", carrier);
  const claim = tm.field("claim", carrier);
  const predicateObject = objectTerm([
    ["kind", stringTerm("predication.predicate")],
    ["claim", claim],
    ["mark", tm.field("mark", claim)],
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

/** Admit explicit charge evidence over each predication cell. */
export const positTerm = tm.lam(objectTerm([
  ["kind", stringTerm("predication.posit.presheaf")],
  ["cells", tm.field("cells", tm.field("predication", tm.var(0)))],
  ["specializations", tm.field("specializations", tm.field("predication", tm.var(0)))],
  ["assignments", tm.fold(
    tm.lam(tm.lam(tm.append(tm.var(1), arrayTerm([objectTerm([
      ["kind", stringTerm("predication.fiber.meme")],
      ["cell", tm.var(0)],
      ["charge", tm.field("admittedCharge", tm.var(2))],
    ])])))),
    arrayTerm([]), tm.field("cells", tm.field("predication", tm.var(0))),
  )],
]));

/** Carry evidence and an explicit closure profile into the canonical presentation. */
export const settleTerm = tm.lam(objectTerm([
  ["kind", stringTerm("predication.settlement.filtration.presentation")],
  ["cells", tm.field("cells", tm.field("posit", tm.var(0)))],
  ["specializations", tm.field("specializations", tm.field("posit", tm.var(0)))],
  ["assignments", tm.field("assignments", tm.field("posit", tm.var(0)))],
  ["closureProfile", tm.field("closureProfile", tm.var(0))],
]));

/** Portable descent from { utterance, admittedCharge, closureProfile }. */
export const induceRelationTerm = tm.lam(tm.app(settleTerm, objectTerm([
  ["posit", tm.app(positTerm, objectTerm([
    ["predication", tm.app(predicateTerm, tm.app(articulateTerm, tm.field("utterance", tm.var(0))))],
    ["admittedCharge", tm.field("admittedCharge", tm.var(0))],
  ]))],
  ["closureProfile", tm.field("closureProfile", tm.var(0))],
])));

/** Union canonical presentations only when their explicit closure profiles agree. */
export const relateRelationsTerm = tm.lam(tm.cond(
  tm.coincide(tm.field("closureProfile", tm.field("left", tm.var(0))),
    tm.field("closureProfile", tm.field("right", tm.var(0)))),
  objectTerm([
    ["kind", stringTerm("predication.settlement.filtration.presentation")],
    ...["cells", "specializations", "assignments"].map((name) => [name, tm.append(
      tm.field(name, tm.field("left", tm.var(0))),
      tm.field(name, tm.field("right", tm.var(0))),
    )] as const),
    ["closureProfile", tm.field("closureProfile", tm.field("left", tm.var(0)))],
  ]),
  tm.field("incompatible closure profiles", objectTerm([])),
));

/** Token coincidence judgment: `{ left, right }` → witness or obstruction. */
export const coincideTerm = (() => {
  const input = tm.var(0);
  const leftPayload = tm.field("left", input);
  const rightPayload = tm.field("right", input);
  const tokenOf = (payload: import("@red-cup-engineering/relation-model-notation").Tm) => objectTerm([
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
