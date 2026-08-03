export type Tm =
  | readonly ["var", number]
  | readonly ["lam", Tm]
  | readonly ["app", Tm, Tm]
  | readonly ["pair", Tm, Tm]
  | readonly ["fst", Tm]
  | readonly ["snd", Tm]
  | readonly ["star"]
  | readonly ["mark", string]
  | readonly ["coincide", Tm, Tm]
  | readonly ["cond", Tm, Tm, Tm]
  | readonly ["fold", Tm, Tm, Tm];

/** One admitted Adm(A, mark, B) edge, exactly as the paper's §7 relation states it. */
export type AdmittedRelation = {
  from: string;
  mark: "." | ":" | "-";
  atom: string;
};

export type AdmissibilityResult =
  | { admitted: true }
  | { admitted: false; refusedAtStep: number; reason: string };

/**
 * Checks the steps of a punctuated-name RMN term (as produced by
 * punctuated-name-derivation-service: `["mark", atom]` for a bare atom, or
 * `["pair", previous, ["pair", ["mark", relation], ["mark", atom]]]` per
 * step), in order, against a caller-supplied admitted-relations table (the
 * paper's Adm(A, mark, B)). The table is data: this function never
 * hardcodes any relation. A bare atom's term (`["mark", atom]`, the
 * identity path) is always admitted, independent of the table, because
 * K_valid is a subcategory of K and every subcategory contains the identity
 * morphism of each of its objects — there is no Adm gate on an identity
 * path.
 *
 * Throws a TypeError if `term` is not shaped as punctuated-name-derivation-
 * service would produce it (e.g. an underscore-escape `{claim: "none"}` or a
 * refusal object passed in by mistake), or if `admittedRelations` is not an
 * array of `{from, mark, atom}` entries.
 */
export declare function checkNameRelationAdmissibility(
  term: Tm,
  admittedRelations: AdmittedRelation[],
): AdmissibilityResult;
