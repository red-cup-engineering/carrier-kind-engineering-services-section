import type { Tm as RmnTerm, Ty as RmnType } from "@red-cup-engineering/relation-model-notation/types";

export type SrnPathTerm =
  | readonly ["pair", Tm, Tm]
  | readonly ["mark", string];
export type Tm = SrnPathTerm;
export type Ty = RmnType;

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

/** Reads a Three Dots and a Dash SRN surface into its RMN path claim. */
export declare const readSemioticResourceName: typeof derivePunctuatedName;

/** Infer and check the exact split RMN base/product type induced by an SRN path. */
export declare function inferSemioticResourceNameType(term: RmnTerm): RmnType;

/**
 * Renders an RMN term in the Three Dots and a Dash path sublanguage to its
 * unique SRN surface. Throws for a general RMN term or a lossy atom spelling.
 */
export declare function renderSemioticResourceName(term: Tm): string;
