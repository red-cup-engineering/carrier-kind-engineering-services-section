export const VOXEL_PROFILE = "org.harmonious-union.semiotic-voxel.v1";

export function fabricateSemioticVoxelPackageDescriptor({ manifest, identity, classification } = {}) {
  if (!manifest || typeof manifest !== "object" || !identity || typeof identity.name !== "string" || !classification || typeof classification.kind !== "string") {
    throw new TypeError("manifest, identity, and classification are required");
  }
  return Object.freeze({
    profile: VOXEL_PROFILE,
    owner: identity.owner,
    kind: classification.kind,
    actor: manifest["x-agentic-metro-enterprise"]?.actor ?? "urn:ame:" + identity.leaf,
    operations: Object.freeze([...classification.operations]),
    capabilities: Object.freeze(classification.capabilities.map(([capability, faces]) => Object.freeze({ capability, faces: Object.freeze([...faces]) }))),
    package: identity.name,
  });
}
