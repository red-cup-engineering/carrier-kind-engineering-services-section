/** TypeScript carriers and constructors for Relation Model Notation syntax. */

export type GeneratorName =
  | "specialization"
  | "converse"
  | "subjectProjection"
  | "objectProjection";

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
