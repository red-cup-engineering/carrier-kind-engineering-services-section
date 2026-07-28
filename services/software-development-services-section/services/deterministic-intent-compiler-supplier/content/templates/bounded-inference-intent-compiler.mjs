const forbidden = /^(?:api[-_]?key|access[-_]?token|auth[-_]?token|password|secret|credential|authorization)$/iu;
function finite(value, seen = new Set()) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return;
  if (typeof value !== "object" || seen.has(value)) throw new TypeError("finite context required");
  seen.add(value);
  for (const [key, child] of Object.entries(value)) { if (forbidden.test(key)) throw new TypeError("forbidden context field"); finite(child, seen); }
  seen.delete(value);
}
export function compileBoundedInferenceIntent(input) {
  if (!input || typeof input !== "object" || ["requestedModel", "model", "modelId", "provider"].some((key) => Object.hasOwn(input, key))) throw new TypeError("model selection is forbidden");
  for (const key of ["taskType", "objective", "desiredUse"]) if (typeof input[key] !== "string" || !input[key]) throw new TypeError(`${key} is required`);
  if (!input.context || typeof input.context !== "object" || !input.outputSchema || typeof input.outputSchema !== "object") throw new TypeError("finite context and output schema are required");
  finite(input.context); finite(input.outputSchema);
  let encoded; try { encoded = JSON.stringify(input.context); } catch { throw new TypeError("finite context required"); }
  if (Buffer.byteLength(encoded) > 131072) throw new TypeError("finite context exceeds 131072 bytes");
  const considerationPolicy = input.considerationPolicy;
  if (!considerationPolicy || considerationPolicy.type !== "ConsiderationPolicy" || !Array.isArray(considerationPolicy.acceptableAlternatives) || considerationPolicy.acceptableAlternatives.length === 0) throw new TypeError("considerationPolicy is required");
  finite(considerationPolicy);
  return {
    type: "BoundedInferenceWorkLotIntent", taskType: input.taskType, objective: input.objective, desiredUse: input.desiredUse,
    context: input.context, outputSchema: input.outputSchema,
    constraints: { considerationPolicy, maxTokens: Math.min(Number.isFinite(input.maxTokens) ? input.maxTokens : 700, 700), difficulty: Math.min(Number.isFinite(input.difficulty) ? input.difficulty : 0.45, 0.45), refinement: "downward-only", upwardEscalationAuthorized: false, customerAcceptanceRequired: true },
  };
}
