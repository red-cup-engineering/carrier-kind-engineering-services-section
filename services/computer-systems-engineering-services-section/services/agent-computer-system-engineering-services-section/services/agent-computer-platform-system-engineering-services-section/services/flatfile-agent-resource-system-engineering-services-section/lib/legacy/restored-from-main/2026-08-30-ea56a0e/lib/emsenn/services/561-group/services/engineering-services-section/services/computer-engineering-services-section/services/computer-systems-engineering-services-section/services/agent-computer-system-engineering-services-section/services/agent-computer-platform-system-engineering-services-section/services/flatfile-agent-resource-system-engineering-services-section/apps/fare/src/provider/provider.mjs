function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

/**
 * A provider owns acquisition of its native resource kind. FARS standardizes
 * only the provider's graph-bearing observation outcome, never the upstream
 * carrier the provider had to understand.
 */
export function defineProvider({ id, observe }) {
  nonEmptyString(id, "provider.id");
  if (typeof observe !== "function") throw new TypeError("provider.observe must be a function");
  return Object.freeze({ id, observe });
}

export function validateResourceGraph(value, label = "resource graph") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const resource = nonEmptyString(value.resource, `${label}.resource`);
  const focus = nonEmptyString(value.focus ?? resource, `${label}.focus`);
  const observedAt = nonEmptyString(value.observedAt, `${label}.observedAt`);
  if (!Number.isFinite(Date.parse(observedAt))) throw new TypeError(`${label}.observedAt must be an ISO-compatible instant`);
  if (!Array.isArray(value.cells)) throw new TypeError(`${label}.cells must be an array`);
  const cells = value.cells.map((cell, index) => {
    if (cell === null || typeof cell !== "object" || Array.isArray(cell)) throw new TypeError(`${label}.cells[${index}] must be an object`);
    return Object.freeze({
      subject: nonEmptyString(cell.subject, `${label}.cells[${index}].subject`),
      predicate: nonEmptyString(cell.predicate, `${label}.cells[${index}].predicate`),
      object: nonEmptyString(cell.object, `${label}.cells[${index}].object`),
    });
  });
  const diagnostics = value.diagnostics ?? [];
  if (!Array.isArray(diagnostics)) throw new TypeError(`${label}.diagnostics must be an array when present`);
  return Object.freeze({ resource, focus, observedAt, cells: Object.freeze(cells), diagnostics: Object.freeze([...diagnostics]) });
}

export function validateProviderOutcome(value, providerId) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${providerId} outcome must be an object`);
  if (!Array.isArray(value.resources)) throw new TypeError(`${providerId} outcome.resources must be an array`);
  const diagnostics = value.diagnostics ?? [];
  if (!Array.isArray(diagnostics)) throw new TypeError(`${providerId} outcome.diagnostics must be an array when present`);
  return Object.freeze({
    resources: Object.freeze(value.resources.map((resource, index) => validateResourceGraph(resource, `${providerId}.resources[${index}]`))),
    diagnostics: Object.freeze([...diagnostics]),
  });
}
