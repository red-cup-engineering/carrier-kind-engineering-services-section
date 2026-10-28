# @561-group/propaganda-topology

Propaganda in Jowett & O'Donnell's standard sense — "the deliberate,
systematic attempt to shape perceptions … to achieve a response that
furthers the desired intent of the propagandist" — as a carrier on the
content site (`@561-group/content-topology`). A `PropagandaObjectCarrier`
is exactly that definition made structural: a `ContentObject`, plus a
DECLARED telos (the intended response, first-class and auditable — an
undeclared telos is a malformed shape, not a quieter propaganda), plus an
append-only trace of WITNESSED effects. Whether the witnessed response
moves toward the telos is the furtherance judgment: a charge with
two-sided evidence (witnesses-for and witnesses-against), never a boolean.

The consumer contract: all carriers are frozen and operations return new
carriers; the effect trace only accumulates (`witnessEffect` appends at the
next stage ordinal — sequencing is never wall-clock); effect magnitudes and
telos targets are exact (bigint demand charges); conflicting movement
settles to `stable` and keeps its receipts.

## Quick start

```ts
import { demandCharge, demandEntry, contentObject, communicator, audience } from "@561-group/content-topology";
import {
  declareTelos, propagandaObject, witnessEffect,
  furtherance, effectsAsDemand, telosDeclarationUtterance,
} from "@561-group/propaganda-topology";

// The telos: attention over a keyword space, declared by the editorial desk.
const telos = declareTelos({
  id: "attention-q2",
  intent: "attention",
  target: demandCharge(["collapse"], [demandEntry("collapse", 100n, ["editorial-goal"])]),
  audience: audience("collapse-readers"),
  declaredBy: "koios-editorial",
});

// Content bound to its declared purpose; effects witnessed, never presumed.
const post = contentObject({ id: "post-1", communicator: communicator("koios") });
let p = propagandaObject(post, telos);
p = witnessEffect(p, { term: "collapse", magnitude: 12n, evidence: ["views:day-1"] });

// Furtherance: a charge with evidence-for and evidence-against.
const judgment = furtherance(p);
judgment.charge;   // potential — witnessed movement toward the telos
judgment.movement; // the realized movement, exact, as a demand charge

// The demand loop: witnessed views fold into the demand that creates the
// next assignment (see assignmentFromDemand in content-topology).
const moved = effectsAsDemand(p.effects);
```

## Objects and morphisms

The declared telos:

- `TelosCarrier` — `declareTelos({ id, intent, target, audience?, declaredBy })`;
  the target is a signed demand charge over audience/effect term space, and
  `declaredBy` is required.
- `telosDeclarationUtterance(contentId, telos)` — puts
  "content declares-telos telos" on the meme floor; the declarant and
  intent travel on the `TelosCarrier` itself.
- Terms and predicates: `telosTerm`, `declaresTelosPredicate`,
  `furthersPredicate`.

The propaganda object and its effect trace:

- `PropagandaObjectCarrier` — `propagandaObject(content, telos)`.
- `EffectWitness` — `effectWitness({ term, magnitude, stage, evidence? })`;
  `witnessEffect(object, { term, magnitude, evidence? })` appends at the
  next stage ordinal and returns a new carrier.

The furtherance judgment (subpath `./furtherance`):

- `furtherance(object)` → `FurtheranceJudgment`: a bilattice `ChargeCarrier`
  whose evidence is `[witnesses-for, witnesses-against]` — `potential`
  (furthering), `active` (countering), `stable` (held contradiction),
  `absurd` (no witnessed movement on the target) — plus the realized
  `movement` as an exact demand charge.
- `effectsAsDemand(effects, space?)` — folds an effect trace into a demand
  charge; the wire of the demand loop.

## Layer

lib/ — vocabulary and computation. Depends on
`@561-group/content-topology` (propaganda is a specialization of content)
and `@emsenn/meme-topology` (the floor) — L1.
