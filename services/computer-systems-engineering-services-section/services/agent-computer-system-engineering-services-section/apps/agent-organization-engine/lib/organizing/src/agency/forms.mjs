/** Coesite's authored office/duty forms, instantiated in AOE without creating a seat.
 * Only data substitution and text composition are allowed; no code is evaluated.
 */
import path from "node:path";

export function instantiateAgencyForm(agency, pool, binding, section = "") {
  if (binding["formed-from"] === undefined) return binding;
  if (!["offices", "duties"].includes(pool)) throw new TypeError("only offices and duties instantiate service officer forms");
  // An exact key is required: an ambiguous basename cannot silently change an office.
  const ref = binding["formed-from"];
  if (typeof ref !== "string" || ref.split("#").length !== 2) throw new TypeError("a form reference names a section and form");
  const [address, id] = ref.split("#");
  const at = address.startsWith(".") ? path.posix.normalize(path.posix.join(section, address)) : address;
  if (at === ".." || at.startsWith("../")) throw new TypeError("form reference outside agency");
  const form = agency.forms.get(at + "#" + id);
  if (form?.kind !== "service-officer-form" || !form[pool]) throw new TypeError("missing service officer form " + binding["formed-from"]);
  const parameters = binding.parameters;
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw new TypeError("form requires parameters");
  for (const key of Object.keys(parameters)) if (!Object.hasOwn(form.parameters, key)) throw new TypeError("unknown form parameter " + key);
  const substitute = (value) => {
    if (Array.isArray(value)) return value.map(substitute);
    if (value === null || typeof value !== "object") return value;
    if (Object.hasOwn(value, "$parameter")) {
      if (Object.keys(value).length !== 1) throw new TypeError("invalid parameter expression");
      const key = value.$parameter, parameter = parameters[key], type = form.parameters[key];
      const actual = Array.isArray(parameter) ? "array" : typeof parameter;
      if (parameter === undefined || parameter === null || actual !== type || (type === "string" && !parameter.trim())) throw new TypeError("missing or invalid form parameter " + key);
      return structuredClone(parameter);
    }
    if (Object.hasOwn(value, "$join")) {
      if (Object.keys(value).length !== 1 || !Array.isArray(value.$join)) throw new TypeError("invalid text composition");
      const parts = value.$join.map(substitute);
      if (parts.some((part) => typeof part !== "string")) throw new TypeError("text composition requires strings");
      return parts.join(" ");
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item)]));
  };
  const fields = substitute(form[pool]);
  for (const key of Object.keys(fields)) if (Object.hasOwn(binding, key)) throw new TypeError("binding overrides formed field " + key);
  return { ...binding, ...fields };
}
