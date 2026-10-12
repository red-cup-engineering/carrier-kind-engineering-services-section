/**
 * The inference-dispatch provider-admission carrier is the evidence boundary
 * for a model's declared capabilities.  A caller may name a Character, but it
 * cannot enlarge the model's admitted capability set.
 */

/** The stable public facts on an admitted inference-provider offer. */

/** The portable receiver binding for a provider-admission offer, narrowed to
 * the measured execution facts MetroPlat consumes. */

function capabilitiesOf(value) {
  if (typeof value.model !== "string" || value.model.length === 0) throw new TypeError("provider-admitted model must name one model");
  if (!Array.isArray(value.capabilities) || value.capabilities.some((capability) => typeof capability !== "string" || capability.length === 0)) {
    throw new TypeError("provider-admitted model capabilities must be non-empty strings");
  }
  return Object.freeze([...new Set(value.capabilities)].sort());
}

/** Project a named Character from the measured model facts of one admitted provider. */
export function modelCharacterFromProviderAdmission(
  id,
  admitted,
) {
  if (typeof id !== "string" || id.length === 0) throw new TypeError("ModelCharacter must name one Character");
  return Object.freeze({ model: admitted.object.model, id, capabilities: capabilitiesOf(admitted.object) });
}

/**
 * Form the deterministic receiver used at allocation.  One model cannot have
 * competing admitted capability declarations; a provider refresh must settle
 * that upstream before it becomes allocation evidence.
 */
export function modelCharacterResolverFromProviderAdmissions(
  admissions,
) {
  const byModel = new Map();
  for (const admitted of admissions) {
    const capabilities = capabilitiesOf(admitted);
    const existing = byModel.get(admitted.model);
    if (existing !== undefined && (existing.length !== capabilities.length || existing.some((capability) => !capabilities.includes(capability)))) {
      throw new TypeError(`provider admissions disagree about model ${admitted.model}`);
    }
    byModel.set(admitted.model, capabilities);
  }
  return (character) => {
    const capabilities = byModel.get(character.model);
    if (capabilities === undefined) throw new TypeError(`model ${character.model} has no provider admission`);
    return Object.freeze({ model: character.model, id: character.id, capabilities });
  };
}
