/**
 * ocethi — the óčhéthi cohomological signature; the council-fire fingerprint of
 * wólakȟota-governance.
 *
 * Corpus node: lakota/.../cohomological-signature-of-lakota-governance. The captain's
 * claim is that a governance-pattern is not merely a culture or a set of norms but a
 * closure-rule fragment with a MEASURABLE cohomological signature, computed on the
 * pattern's own closure-rule scope (S_wolak — the wólakȟota lifeway fragment). The
 * Lakota pattern's signature has four load-bearing features, and two of them together
 * pick it out UNIQUELY among governance-patterns: it is the only pattern with a
 * non-trivial lax-idempotence 2-cell AND a zero accumulation-class. Not "different in
 * spirit" — cohomologically different, and the difference is computable.
 *
 * The Očhéthi (the council fire) is the seat at which wólakȟota-governance is enacted;
 * its cohomological signature is the fingerprint of the fire — the measurable invariant
 * that distinguishes the Lakota pattern from any other governance-pattern around any
 * other fire.
 *
 * This module presents that signature as a carrier and reads its distinguishing verdict
 * off the algebra of the four features, rather than asserting the verdict directly. It
 * fibers over @emsenn/organizing (the closure-2-monad / Mayer-Vietoris machinery the
 * signature is computed in) but needs no live federation here: the four features are
 * the corpus's recorded measurements, parameterised by the two restoration-relevant
 * conditions (Heyókȟa vocations present; settler-overlay reservation conditions), and
 * the distinguishing fact is derived from them.
 *
 * The four features (quoted faithfully):
 *   (a) Peacetime H1 = 0 — the pattern produces uniform settling-quiescence
 *       (Scott-continuous S_wolak, no cohomological residue in its own scope).
 *   (b) NON-TRIVIAL lax-idempotence 2-cell under Heyókȟa-bearing — lives in the
 *       closure-2-monad's 2-categorical structure, not classical cohomology; most other
 *       patterns collapse it to strict-idempotence (a trivial 2-cell).
 *   (c) ZERO accumulation-class — no H0-class corresponds to surplus/wealth-
 *       accumulation (S_wolak has no surplus-cell-firing). H0 is dominated by
 *       kin-relation, virtue-standing, and place-relation classes; the accumulation
 *       class is structurally ABSENT. A wealth-stratified pattern would have a non-zero
 *       accumulation H0 whose representatives are the wealthy agents.
 *   (d) NON-TRIVIAL settler-overlay H1 under reservation conditions — the
 *       federation-level Mayer-Vietoris produces PERSISTENT classes from the
 *       Beck-Chevalley failure with S_US-fed (the colonial overlay); a polity firing
 *       S_wolak ALONE has no such class.
 *
 * The signature is computable, and restoration work restores these features — so the
 * carrier doubles as a restoration-tracking instrument.
 *
 * Features (a), (b), (c) are DERIVED from this package's own lifeway modules, not taken
 * as free constants: (a) peacetime H¹ is `wolakota().h1`; (c) the zero accumulation-class
 * is read off the wólakȟota property/surplus absence (`sWolakAbsences`); (b) the
 * lax-idempotence 2-cell is `laxIdempotence(heyokhaVocations).nonTrivialTwoCell`. Only
 * (d), the settler-overlay class, is an external condition (the colonial overlay is not
 * part of S_wolak).
 *
 * lakotaTerm: Očhéthi — the council fire; the seat of wólakȟota-governance whose
 * cohomological signature is the measurable fingerprint of the pattern.
 */
import { wolakota } from "../wolakota.mjs";
import { laxIdempotence } from "../../../heyokha/heyokha.mjs";

/** Whether a 2-cell / overlay-class is present in the signature. */

/** Whether the settler-overlay H1 class is present under the given conditions. */

/** Options selecting the two restoration-relevant conditions of the measurement. */

   
     
   

  

/**
 * The cohomological signature of a governance-pattern as a four-feature tuple, with the
 * derived distinguishing verdict. Each field is a measurement the corpus records on the
 * closure-rule fragment; `distinguishing` is the algebra's verdict on the only-row case.
 */

  

   

  

  

  

/**
 * Derive the cohomological signature of the Lakota governance pattern under the given
 * conditions. The (a) and (c) features are structural invariants of S_wolak (peacetime
 * H1 = 0; accumulation-class = 0); features (b) and (d) are switched by the two
 * recorded conditions. `distinguishing` is computed from (b) and (c) — it is not
 * asserted but read off the only-row predicate (non-trivial lax-idempotence 2-cell AND
 * zero accumulation).
 */
export function lakotaGovernanceSignature(opts = {}) {
  const heyokhaVocations = opts.heyokhaVocations ?? 0;
  const settlerOverlay = opts.settlerOverlay ?? false;

  const discipline = wolakota();
  // (a) the peacetime H¹ is the discipline's own cohomology — 0 in S_wolak's scope.
  const peacetimeH1 = discipline.h1;
  // (b) the 2-cell is non-trivial exactly under Heyókȟa-bearing — heyokha's iff.
  const laxIdempotenceTwoCell = laxIdempotence(heyokhaVocations).nonTrivialTwoCell
    ? "non-trivial"
    : "trivial";
  // (c) the accumulation-class is structurally absent: S_wolak fires no property/surplus
  // cell, recorded as the property absence — so there is no H0 accumulation generator.
  const accumulationClass = discipline.absences.some((a) => a.absent === "property") ? 0 : 1;
  // (d) only the settler-overlay is external to S_wolak.
  const settlerOverlayH1 = settlerOverlay ? "non-trivial" : "absent";

  // The only-row case: the unique pattern with a non-trivial lax-idempotence 2-cell AND
  // a zero accumulation-class. Derived from the two features, not asserted.
  const distinguishing = laxIdempotenceTwoCell === "non-trivial" && accumulationClass === 0;

  return Object.freeze({
    kind: "organizing-as-lakota.governance-signature",
    peacetimeH1,
    laxIdempotenceTwoCell,
    accumulationClass,
    settlerOverlayH1,
    distinguishing,
  });
}

/**
 * Whether the Lakota signature is cohomologically distinguished FROM another pattern's
 * signature in feature (b) or (c) — i.e. the two patterns differ in the lax-idempotence
 * 2-cell or in the accumulation-class. This is the corpus's "not merely culturally
 * different — cohomologically different" comparison, made computable.
 */
export function distinguishesFrom(
  other,
  signature = lakotaGovernanceSignature({ heyokhaVocations: 1 }),
) {
  return (
    other.laxIdempotenceTwoCell !== signature.laxIdempotenceTwoCell ||
    other.accumulationClass !== signature.accumulationClass
  );
}
