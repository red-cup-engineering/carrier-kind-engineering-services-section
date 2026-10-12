/**
 * mitakuye-oyasin — the global theorem on the relational field.
 *
 * lakotaTerm: Mitákuye Oyás'iŋ ("all my relatives")
 *
 * Mitakuye oyasin — the metaphysics: reality is a kinship-cosmos, a relational whole in
 * which every being stands in kin-relation with every other. This is not generalized
 * interconnection; it is the global theorem on the relational field — its content is
 * that the field is ONE (the four-fold is fractal and self-similar at every scale:
 * cosmos = polity = kin = individual run the same FOUR).
 *
 * At this metaphysical tier it is the standing invariant the rest of the library reads
 * under; the kinship MORPHISMS that enact it (wótakuye binding, tȟakúye the kin-cell)
 * are built at the predicating tier above this core.
 *
 * corpus node: content/_archive/existence/lakota/discharging/library/tobtob-kin/
 */
import { chargeValueNames, type ChargeValueName } from "@emsenn/relating";

/**
 * The mitakuye oyasin invariant carrier — the standing claim that the relational whole
 * is one, read over the four-charge field, self-similar at every scale.
 */
export interface MitakuyeOyasin {
  readonly kind: "organizing-as-lakota.mitakuye-oyasin";
  /** The standing claim. */
  readonly claim: string;
  /** The four charges over which the field is read — every scale runs these. */
  readonly field: readonly ChargeValueName[];
  /** The self-similarity: the FOUR recurs at every scale of relational complexity. */
  readonly selfSimilar: true;
  /** The invariant carried: the relational whole is one. */
  readonly relationalWhole: true;
}

/** The mitakuye oyasin invariant over the four-charge field. */
export function mitakuyeOyasin(): MitakuyeOyasin {
  return Object.freeze({
    kind: "organizing-as-lakota.mitakuye-oyasin",
    claim: "all my relatives: reality is a kinship-cosmos; every being stands in kin-relation with every other",
    field: Object.freeze([...chargeValueNames]),
    selfSimilar: true,
    relationalWhole: true,
  });
}
