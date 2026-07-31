function leafOf(manifest, path) {
  const fromName = typeof manifest.name === "string" ? manifest.name.replace(/^@[^/]+\//u, "") : "";
  return (fromName || path.replaceAll("\\", "/").split("/").at(-2) || "").replace(/^eo-/u, "").replace(/[^a-z0-9-]+/gu, "-").replace(/^-+|-+$/gu, "");
}
function operationsOf(manifest) { return Object.keys(manifest["x-agentic-metro-enterprise"]?.["operation-catalog"] ?? {}).sort(); }
function capabilitiesOf(manifest, path) {
  const capabilities = new Map(), catalog = manifest["x-agentic-metro-enterprise"]?.["operation-catalog"] ?? {};
  for (const operation of operationsOf(manifest)) {
    const declared = catalog[operation]?.capability;
    const capability = typeof declared === "string" && declared ? declared : leafOf(manifest, path);
    capabilities.set(capability, [...(capabilities.get(capability) ?? []), operation].sort());
  }
  return capabilities;
}
function declaredOf(manifest) {
  const descriptor = manifest["x-semiotic-voxel"];
  if (!descriptor || typeof descriptor !== "object" || Array.isArray(descriptor)) return null;
  if (!["actor", "aggregate-capability-defect", "capability-cell", "inert-material"].includes(descriptor.kind)) return null;
  if (!Array.isArray(descriptor.operations) || !Array.isArray(descriptor.capabilities)) return null;
  if (descriptor.operations.some((value) => typeof value !== "string" || !value)) return null;
  if (descriptor.capabilities.some((value) => !value || typeof value.capability !== "string" || !Array.isArray(value.faces))) return null;
  return { kind: descriptor.kind, operations: [...new Set(descriptor.operations)], capabilities: descriptor.capabilities.map(({ capability, faces }) => [capability, [...new Set(faces)]]) };
}
function organizational(manifest, path) {
  const kind = String(manifest["x-agentic-metro-enterprise"]?.["organizational-kind"] ?? "");
  const directory = path.replaceAll("\\", "/").split("/").at(-2) ?? "";
  const named = leafOf(manifest, path);
  return /(?:section|sector|team|board|office|colony|enterprise)$/u.test(directory)
    || /(?:section|sector|team|board|office|colony|enterprise)$/u.test(named)
    || /(?:section|sector|team|board|office|colony|enterprise)/u.test(kind);
}

export function classifySemioticVoxelPackage({ manifest, path } = {}) {
  if (!manifest || typeof manifest !== "object" || typeof path !== "string") throw new TypeError("manifest and path are required");
  const declared = declaredOf(manifest);
  if (declared) return declared;
  const operations = operationsOf(manifest), capabilities = capabilitiesOf(manifest, path);
  if (organizational(manifest, path)) return { kind: "actor", operations, capabilities: [...capabilities] };
  if (capabilities.size === 1) return { kind: "capability-cell", operations, capabilities: [...capabilities] };
  if (capabilities.size > 1) return { kind: "aggregate-capability-defect", operations, capabilities: [...capabilities] };
  const leaf = leafOf(manifest, path);
  if (manifest.bin || /(?:assay|border|broker|cell|gateway|provider|readout|service)$/u.test(leaf)) return { kind: "capability-cell", operations: [leaf], capabilities: [[leaf, [leaf]]] };
  return { kind: "inert-material", operations, capabilities: [] };
}
