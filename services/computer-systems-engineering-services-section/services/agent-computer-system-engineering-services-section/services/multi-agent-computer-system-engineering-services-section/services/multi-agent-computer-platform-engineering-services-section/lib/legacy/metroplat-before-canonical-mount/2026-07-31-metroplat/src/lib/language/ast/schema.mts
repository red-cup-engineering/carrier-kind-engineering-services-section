/** Runtime admission schemas for the Relation Model Notation abstract syntax. */

export const TySchema = {
  $id: "metroplat/term/ty",
  title: "CHL Ty",
  description: "Recursive JSON s-expression for base, arrow, product, and unit types.",
  anyOf: [
    { type: "array", items: [{ const: "base" }], minItems: 1, maxItems: 1, additionalItems: false },
    { type: "array", items: [{ const: "arrow" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "prod" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "unit" }], minItems: 1, maxItems: 1, additionalItems: false },
    { type: "array", items: [{ const: "list" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
  ],
} as const;

export const TmSchema = {
  $id: "metroplat/term/tm",
  title: "CHL Tm",
  description: "Recursive de-Bruijn JSON s-expression for terms.",
  anyOf: [
    { type: "array", items: [{ const: "var" }, { type: "integer", minimum: 0 }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "lam" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "app" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "pair" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "fst" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "snd" }, { $ref: "#" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "star" }], minItems: 1, maxItems: 1, additionalItems: false },
    { type: "array", items: [{ const: "mark" }, { type: "string" }], minItems: 2, maxItems: 2, additionalItems: false },
    { type: "array", items: [{ const: "coincide" }, { $ref: "#" }, { $ref: "#" }], minItems: 3, maxItems: 3, additionalItems: false },
    { type: "array", items: [{ const: "cond" }, { $ref: "#" }, { $ref: "#" }, { $ref: "#" }], minItems: 4, maxItems: 4, additionalItems: false },
    { type: "array", items: [{ const: "fold" }, { $ref: "#" }, { $ref: "#" }, { $ref: "#" }], minItems: 4, maxItems: 4, additionalItems: false },
  ],
} as const;
