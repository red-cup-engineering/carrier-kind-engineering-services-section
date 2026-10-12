/**
 * akicita — the camp-marshal band of bounded scope (Akíčhita), at the wičhózani tier.
 *
 * Corpus: content/_archive/existence/lakota/.../lakotaean-governance/.../akicita-band.
 * The akicita is the polity's primary mechanism for SCOPE-BOUNDED coercive coordination
 * — the hunt, the migration, the camp-circle at the sun dance, a war party. Its defining
 * structural feature is AUTOMATIC REVOCATION AT SCOPE-COMPLETION: the band is constituted
 * over a specific named scope-action X with a clear completion-condition; while X is in
 * progress its `scope-active` and `enforcement-authority` cells stand at t; when X
 * completes both fall to ⊥. Even its sanctions are scoped — a person sanctioned during
 * the hunt carries the sanction-cell ONLY over the hunt-scope; once the hunt completes,
 * the cell drops. There is no carry-over, no criminal-record-cell.
 *
 * This is NOT police. The absence is constitutive: 𝒮_wolak contains a closure-rule-class
 * for akicita-authority but NO closure-rule-class for standing-police-authority — no
 * open-ended jurisdiction, no standing force between scopes. The retraction at
 * scope-completion is a ≤ₖ-DECREASING transition (t → ⊥), admissible because these are
 * scoped cells: scope-completion is not retraction-of-information but completion of the
 * interpretive window. lakotaTerm: "Akíčhita".
 */

/** An akicita band over a named scope-action — bounded authority that retracts on completion. */
export interface AkicitaBand {
  readonly kind: "organizing-as-lakota.akicita";
  /** The specific scope-action the band is authorized over (a hunt, a migration, a war party). */
  readonly scopeAction: string;
  /** The omníčiye or wakíčhuŋza that constituted the band. */
  readonly appointedBy: string;
  /** Whether the scope is in progress — t while active, ⊥ once completed. */
  readonly scopeActive: boolean;
  /** Coercive enforcement is enabled only while scope-active (follows scopeActive). */
  readonly enforcementAuthority: boolean;
  /** The constitutive absence: there is no standing-police authority between scopes. */
  readonly standingPolice: false;
}

/** Appoint an akicita band over a scope-action: scope-active and enforcement enabled. */
export function appointAkicita(scopeAction: string, appointedBy: string): AkicitaBand {
  return Object.freeze({
    kind: "organizing-as-lakota.akicita",
    scopeAction,
    appointedBy,
    scopeActive: true,
    enforcementAuthority: true,
    standingPolice: false,
  });
}

/**
 * Complete the scope: the defining retraction. `scope-active` and `enforcement-authority`
 * both fall to ⊥ — the band's authority is gone, with no carry-over. The returned band is
 * the post-completion reading (a ≤ₖ-decreasing transition on scoped cells).
 */
export function completeScope(band: AkicitaBand): AkicitaBand {
  return Object.freeze({
    kind: "organizing-as-lakota.akicita",
    scopeAction: band.scopeAction,
    appointedBy: band.appointedBy,
    scopeActive: false,
    enforcementAuthority: false,
    standingPolice: false,
  });
}
