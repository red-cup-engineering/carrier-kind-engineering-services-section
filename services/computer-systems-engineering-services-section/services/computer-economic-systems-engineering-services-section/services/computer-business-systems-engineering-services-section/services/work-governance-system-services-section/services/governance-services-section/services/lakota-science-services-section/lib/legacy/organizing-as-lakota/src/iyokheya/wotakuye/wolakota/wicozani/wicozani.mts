/**
 * wicozani — well-being as substrate quiescence.
 *
 * Wičhózani (well-being, wholeness) names the condition the corpus
 * (lakota/.../wicozani-as-quiescence) records as a QUIESCENCE CONDITION on the
 * relational settling under the wólakȟota discipline. For an entity — person,
 * tiyóšpaye, oyáte, or the Očhéthi Šakówiŋ — at a time it holds when four
 * conditions stand together:
 *
 *   (1) NO PERSISTENT ⊤ on relation-cells. A momentary ⊤ is normal; an
 *       UNREPAIRED ⊤ is the failure — repaired through the wiping-of-tears.
 *   (2) NO PERSISTENT ⊥ on cells where settlement is DUE — e.g. a person who
 *       does not know their kin.
 *   (3) conduct-cells settled under S_wolak (acting wólakȟota).
 *   (4) the ceremonial substrate ACTIVE — ceremony cells at t.
 *
 * Wičhózani is STRUCTURAL, NOT AGGREGATE: a property of the relational settling
 * taken as a whole, never a sum over separable dimensions. A person whose
 * body / mind / emotion / social cells are all t but whose spirit-relation cells
 * are ⊥ is NOT in wičhózani — the property is GLOBAL. This is why a checklist
 * intervention misses it, and why restoring ceremony, kinship, or language can
 * lift it globally rather than dimension-by-dimension.
 *
 * At polity scale the same four conditions are read at polity scale, and
 * wičhózani is the institution's clean settling-quiescence: H¹ = 0 over the
 * polity's own cells. The historical traumas (boarding schools, Wounded Knee,
 * the Pick-Sloan dams, the pressure on Pȟahá Sápa) are substrate-attacks that
 * produce persistent ⊤/⊥; contemporary language, ceremony, kinship, and treaty
 * work is wičhózani-RESTORATION.
 *
 * This module DERIVES the condition from the substrate rather than asserting it:
 * it builds a @emsenn/organizing institution over the entity's social boundary
 * and reads quiescence off the institution's gluing (H¹ = institution's
 * cohomologyRank) together with the persistent-contradiction count over the
 * settled section. Charge value names follow the LIVE relating convention:
 * absurd = ⊥ (under-determined), potential = t, active = f, stable = ⊤
 * (over-determined / contradiction).
 *
 * lakotaTerm: Wičhózani — coming-to-wholeness, well-being as the quiescence of
 * the relational settling under the wólakȟota discipline.
 */
import {
  sectionOf,
  type JsonValue,
} from "@emsenn/relating";
import { descend, admitSeed, chargeValueOfCarrier } from "@emsenn/animating";
import { institute, type SocialBoundary } from "@emsenn/organizing";

/**
 * The wičhózani reading of an entity's relational settling at a time. Each field
 * is read off the substrate, not posited: `h1` is the institution's own
 * cohomology rank, the counts are over the settled section, and `quiescent` is
 * the four-condition verdict in its load-bearing form.
 */
export interface Wicozani {
  readonly kind: "organizing-as-lakota.wicozani";
  /**
   * The quiescence verdict: gluing (H¹ = 0) with NO persistent ⊤. True iff the
   * relational settling is whole as a structure.
   */
  readonly quiescent: boolean;
  /** Count of persistent ⊤ ("stable") cells — unrepaired contradiction (condition 1). */
  readonly persistentContradiction: number;
  /** Count of persistent ⊥ ("absurd") cells — settlement that is due but absent (condition 2). */
  readonly persistentUnsettled: number;
  /** H¹ over the entity's own cells — the institution's cohomology rank. */
  readonly h1: number;
  /** Wičhózani is a property of the whole settling. */
  readonly structural: true;
  /** It is never a sum over separable dimensions. */
  readonly aggregate: false;
}

/**
 * Read the wičhózani of an entity from a relational seed.
 *
 * The seed is admitted as the entity's social boundary, an institution is
 * settled over it (`institute`), and the section of the settled reading is
 * scanned for persistent ⊤ ("stable") and ⊥ ("absurd") cells. Quiescence is the
 * institution's clean gluing — H¹ = 0, i.e. `cohomologyRank === 0` — together
 * with no persistent contradiction. The verdict is the algebra's, read off the
 * substrate, not asserted here.
 */
export function wicozani(seed: string | JsonValue): Wicozani {
  const boundary: SocialBoundary = { socializing: seed };
  const institution = institute(boundary);

  const section = sectionOf(descend(admitSeed(seed)).readings.knowledgeLeast);
  let persistentContradiction = 0;
  let persistentUnsettled = 0;
  for (const entry of section.entries) {
    const name = chargeValueOfCarrier(entry.charge).name;
    if (name === "stable") persistentContradiction += 1;
    else if (name === "absurd") persistentUnsettled += 1;
  }

  const h1 = institution.cohomologyRank;
  const quiescent = institution.glued && h1 === 0 && persistentContradiction === 0;

  return Object.freeze({
    kind: "organizing-as-lakota.wicozani",
    quiescent,
    persistentContradiction,
    persistentUnsettled,
    h1,
    structural: true,
    aggregate: false,
  });
}
