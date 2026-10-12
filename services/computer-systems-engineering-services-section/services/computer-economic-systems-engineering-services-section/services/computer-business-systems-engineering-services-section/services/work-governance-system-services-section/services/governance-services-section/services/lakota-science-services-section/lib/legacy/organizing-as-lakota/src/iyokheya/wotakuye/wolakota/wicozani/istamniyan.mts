/**
 * istamniyan — the wiping-of-tears, the quiescence-restoration morphism (Ištámniyaŋ
 * Wičhákičhipakiŋtapi), at the wičhózani (settling) tier.
 *
 * Corpus: content/_archive/existence/lakota/.../wiping-of-tears-as-polity-quiescence-
 * restoration. A loss (a death, or a collective loss at polity scale) produces two
 * substrate disturbances that put the bereaved out of wičhózani: a persistent ⊤ on the
 * grief-cell (the kin-relation is real — the tie does not vanish at death — yet also
 * broken, since the deceased is no longer in the lived populace), and a persistent ⊥ on
 * cells the death has unsettled (who now speaks for what they spoke for, carries what they
 * carried).
 *
 * The wiping-of-tears morphism — performed about a year after the loss — resolves both. It
 * does NOT erase the loss and does NOT negate the relation: it RE-CLASSIFIES. The
 * lived-relation cell settles at f (the deceased is no longer in the lived populace) and a
 * NEW ancestor-relation cell settles at t — both consistently, so the ⊤ contradiction is
 * resolved into a determinate, wakȟáŋ-marked ancestor-relation that persists forever
 * (sustained thereafter by wanáǧi yuhápi). The unsettled ⊥ cells are reassigned and
 * witnessed. The aggregate effect is the return to wičhózani.
 *
 * This is RESTORATIVE governance, not punitive: a punitive operation installs
 * liable-for / sanction / confinement cells; this installs relation-repaired /
 * re-integration cells — different cells, different closure-subsystem. The polity repairs
 * its relational structure across loss WITHOUT a punitive apparatus. lakotaTerm:
 * "Ištámniyaŋ Wičhákičhipakiŋtapi".
 */

/** The re-classification a wiping-of-tears performs on a grief-relation in persistent ⊤. */
export interface TearsWiped {
  readonly kind: "organizing-as-lakota.istamniyan";
  /** The bereaved whose grief-cell carried the ⊤. */
  readonly bereaved: string;
  /** The one lost. */
  readonly deceased: string;
  /** The lived-relation cell settles at f — the deceased is no longer in the lived populace. */
  readonly livedRelation: "active";
  /** A new ancestor-relation cell settles at t — wakȟáŋ-marked, permanent. */
  readonly ancestorRelation: "potential";
  /** The ⊤ contradiction is resolved (both cells settle consistently — not by negation). */
  readonly contradictionResolved: true;
  /** The morphism does not erase the loss; the ancestor-relation persists forever. */
  readonly erasesLoss: false;
  /** Restorative, never punitive. */
  readonly restorative: true;
  /** The bereaved returns to wičhózani. */
  readonly restoresWicozani: true;
  /** At polity scale (after collective loss — Wounded Knee, epidemics), the same morphism at wider scope. */
  readonly scale: "person" | "polity";
}

/**
 * Wipe the tears: resolve the persistent ⊤ on a grief-relation by re-classifying it into a
 * lived-relation at f and a permanent, wakȟáŋ-marked ancestor-relation at t — restoring the
 * bereaved (a person, or the polity) to wičhózani. `scale` is "polity" for collective loss.
 */
export function wipeTears(
  bereaved: string,
  deceased: string,
  scale: "person" | "polity" = "person",
): TearsWiped {
  return Object.freeze({
    kind: "organizing-as-lakota.istamniyan",
    bereaved,
    deceased,
    livedRelation: "active",
    ancestorRelation: "potential",
    contradictionResolved: true,
    erasesLoss: false,
    restorative: true,
    restoresWicozani: true,
    scale,
  });
}
