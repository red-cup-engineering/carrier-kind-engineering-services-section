// The RMN AST shape, mirrored (not re-declared with different names) from
// .../javascript-services-section/lib/legacy/metroplat/src/lib/language/ast/types.mts.
export type Ty =
  | readonly ["base"]
  | readonly ["arrow", Ty, Ty]
  | readonly ["prod", Ty, Ty]
  | readonly ["unit"]
  | readonly ["list", Ty];

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

export type PunctuatedNameEscape = { claim: "none" };

export type PunctuatedNameRefusal = {
  ok: false;
  rule: "Atom" | "Expr" | "namestring";
  position: number;
  message: string;
};

export type PunctuatedNameDerivation = Tm | PunctuatedNameEscape | PunctuatedNameRefusal;

/**
 * Derives the RMN term a Three Dots and a Dash punctuated name denotes:
 * `["mark", atom]` for a bare atom, and
 * `["pair", previous, ["pair", ["mark", relation], ["mark", atom]]]` for
 * each generation/witness/obstruction step, left to right. See README.md
 * for the exact encoding and its totality/confluence argument.
 *
 * - Conformant name, no underscore: returns the Tm term.
 * - Name containing `_` anywhere: returns `{claim: "none"}` — explicitly not
 *   a refusal (§8's escape hatch).
 * - Malformed name: returns a typed refusal naming the broken grammar rule.
 */
export declare function derivePunctuatedName(name: string): PunctuatedNameDerivation;
