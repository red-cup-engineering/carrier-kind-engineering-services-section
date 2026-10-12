import { SEN_FORMS, SEN_TYPE_FORMS } from "./forms.mjs";

const atomSchemas = {
  natural: { type: "integer", minimum: 0 },
  text: { type: "string" },
};

function tuple(tag, form, references) {
  const width =
    1 +
    Object.keys(form.atoms ?? {}).length +
    (form.terms?.length ?? 0) +
    (form.types?.length ?? 0);
  const items = Array.from({ length: width }, () => ({}));
  items[0] = { const: tag };
  for (const index of form.terms ?? [])
    items[index] = { $ref: references.term };
  for (const index of form.types ?? [])
    items[index] = { $ref: references.type };
  for (const [index, constraint] of Object.entries(form.atoms ?? {}))
    items[index] = atomSchemas[constraint];
  return {
    type: "array",
    prefixItems: items,
    minItems: width,
    maxItems: width,
    items: false,
  };
}

export const TySchema = {
  $id: "semiotic-expression-notation/term/ty",
  title: "SEN Ty",
  anyOf: Object.entries(SEN_TYPE_FORMS).map(([tag, form]) =>
    tuple(tag, form, { term: "#", type: "#" }),
  ),
};

export const TmSchema = {
  $id: "semiotic-expression-notation/term/tm",
  title: "SEN Tm",
  anyOf: Object.entries(SEN_FORMS).map(([tag, form]) =>
    tuple(tag, form, { term: "#", type: "semiotic-expression-notation/term/ty" }),
  ),
};
