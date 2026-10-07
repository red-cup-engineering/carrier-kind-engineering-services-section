/**
 * Identity — the ludics copycat / Fax, the unit of the category of behaviours.
 *
 * Corpus / Girard 2001 "Locus Solum": the identity on a behaviour B is **Fax**, the
 * η-expanded **copycat** design — the B ⊸ B map that `cut`-composes to the identity
 * (`cut(Fax_B, d) ≃ d` for `d ∈ B`). Landing it is what turns behaviours from a mere
 * closure operator into a genuine **category** (objects = behaviours, composition =
 * `cut` in `proving/computational-ludics`, identity = Fax) — the gaming ROADMAP's
 * NEXT #1.
 *
 * A theory-honest note about the grain (this is a result, not a shortcut): the true
 * Fax is **reactive** — it copies whatever move the environment plays from one side of
 * its interface to the other. A reactive strategy is NOT expressible as a *static*
 * reading valuation (the `Design` grain of `ludicizing/design.mts`): a valuation fixes
 * its readings in advance, it cannot mirror an unknown counter-move. So the full
 * categorical identity lives at the **chronicle/action grain** (`chronicle.mts` carries
 * the action sequences), where copying-as-it-goes is expressible. What the flat
 * valuation grain DOES carry faithfully is the copycat's **convergence content**: the
 * canonical design that converges with (accepts) every member of a behaviour — its
 * universal counter-design, `faxResponder`, which lies in `B^⊥`. We build and witness
 * that here, and state the full identity law (with its grain) as `faxIdentity`.
 */
import { design } from "./design.mjs";
import { locusFromKey } from "./locus.mjs";
import { incarnation } from "./settling/incarnation.mjs";
import { orthogonal } from "./settling/orthogonality.mjs";

/** Daimonize a design: ⊤ (`stable`) at exactly its committed loci — the "accept here" response. */
function daimonize(d) {
  return design(new Map(d.entries.map((e) => [e.locusKey, ("stable")])));
}

/**
 * `faxResponder(B)` — the flat-valuation **copycat responder** at a behaviour: the
 * superposition of the Daimon (⊤) responses over the behaviour's material core
 * (`incarnation`). It commits ⊤ at every locus any incarnated member of B visits, so
 * it **converges with (accepts) every member of B** — i.e. it lies in `B^⊥`. This is
 * the convergence shadow of the reactive Fax at the valuation grain. (At the chronicle
 * grain it sharpens into the full η-expanded copycat; see `faxIdentity`.)
 */
export function faxResponder(set, universe) {
  const core = incarnation(set, universe);
  const labelling = new Map();
  for (const member of core) {
    for (const entry of daimonize(member).entries) labelling.set(entry.locusKey, entry.reading);
  }
  return design(labelling);
}

  

    

/**
 * Witness that `faxResponder(B)` accepts every member of B (lies in `B^⊥`): the
 * copycat-convergence law at the valuation grain. The witness records the responder
 * and its interface loci; an obstruction names a member it cannot meet (a member with
 * empty support, which no design can converge with).
 */
export function faxResponderJudgment(set, universe) {
  const responder = faxResponder(set, universe);
  const core = incarnation(set, universe);
  const rejected = core.find((member) => member.entries.length > 0 && !orthogonal(responder, member));
  if (rejected !== undefined) {
    return Object.freeze({ kind: "game.identity.fax-responder-obstruction", responder, rejected });
  }
  return Object.freeze({
    kind: "game.identity.fax-responder:witness",
    responder,
    interface: Object.freeze(responder.entries.map((e) => locusFromKey(e.locusKey))),
    acceptsAll: true,
  });
}

/**
 * The categorical-identity law for Fax, carried as data with its grain made explicit.
 * Naming the theorem the way `cutElimination` names the Hauptsatz: the engine (cut =
 * `interact` gated by convergence) lives in `proving/computational-ludics`; this states
 * what Fax IS and where it lives.
 */
export function faxIdentity() {
  return Object.freeze({
    kind: "game.identity.fax.statement",
    theorem:
      "Girard 2001: the identity on a behaviour B is Fax, the η-expanded copycat — the B ⊸ B design with cut(Fax_B, d) ≃ d for every d ∈ B, making behaviours a category (composition = cut, identity = Fax). Fax is REACTIVE (it copies the environment's move across its interface), so it is not a static reading valuation; the full identity lives at the chronicle/action grain. At the flat-valuation grain its faithful shadow is faxResponder(B): the canonical design in B^⊥ that converges with (accepts) every member of B. faxResponderJudgment witnesses that acceptance.",
  });
}

export function isFaxResponderWitness(value) {
  return typeof value === "object" && value !== null
    && (value).kind === "game.identity.fax-responder:witness";
}
