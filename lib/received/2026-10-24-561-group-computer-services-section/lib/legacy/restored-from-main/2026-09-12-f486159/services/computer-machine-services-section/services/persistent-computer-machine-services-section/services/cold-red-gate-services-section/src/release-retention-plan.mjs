/**
 * The deterministic decision boundary for reclaiming a release generation.
 * Observations are deliberately closed-world: missing protection evidence is
 * protection, never permission to remove bytes from a production machine.
 */
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isBytes = (value) => Number.isSafeInteger(value) && value >= 0;

/** A release stages dependencies before its old generation can be reclaimed. */
export const RELEASE_DEPLOYMENT_HEADROOM_BYTES = 512 * 1024 * 1024;

function protectedReason(generation) {
  if (!isRecord(generation)) return "generation-not-observed";
  for (const field of ["current", "previous", "active", "interrupted"]) {
    if (generation[field] !== false) return `${field}-or-unobserved`;
  }
  return null;
}

/**
 * @param {{rootAvailableBytes: number, minimumRootAvailableBytes: number, generations: readonly {path: string, bytes: number, current: boolean, previous: boolean, active: boolean, interrupted: boolean}[]}} observation
 */
export function planReleaseRetention(observation) {
  if (!isRecord(observation) || !isBytes(observation.rootAvailableBytes) || !isBytes(observation.minimumRootAvailableBytes) || !Array.isArray(observation.generations)) {
    return Object.freeze({ type: "ColdRedGateReleaseRetentionPlan", version: 1, admitted: false, refusals: Object.freeze(["retention-observation-incomplete"]), candidates: Object.freeze([]), reclaimableBytes: 0 });
  }
  const candidates = observation.generations.map((generation) => {
    const reason = protectedReason(generation);
    const validPath = isRecord(generation) && typeof generation.path === "string" && generation.path.length > 0;
    const validBytes = isRecord(generation) && isBytes(generation.bytes);
    return Object.freeze({ path: validPath ? generation.path : "", bytes: validBytes ? generation.bytes : 0, reclaimable: validPath && validBytes && reason === null, refusal: validPath && validBytes ? reason : "generation-identity-or-size-unobserved" });
  });
  const reclaimableBytes = candidates.reduce((sum, candidate) => sum + (candidate.reclaimable ? candidate.bytes : 0), 0);
  const deploymentHeadroomBytes = observation.deploymentHeadroomBytes === undefined ? RELEASE_DEPLOYMENT_HEADROOM_BYTES : observation.deploymentHeadroomBytes;
  if (!isBytes(deploymentHeadroomBytes)) return Object.freeze({ type: "ColdRedGateReleaseRetentionPlan", version: 1, admitted: false, refusals: Object.freeze(["retention-headroom-invalid"]), candidates: Object.freeze([]), reclaimableBytes: 0 });
  const requiredAvailableBytes = observation.minimumRootAvailableBytes + deploymentHeadroomBytes;
  const deficitBytes = Math.max(0, requiredAvailableBytes - observation.rootAvailableBytes);
  return Object.freeze({
    type: "ColdRedGateReleaseRetentionPlan",
    version: 1,
    admitted: observation.rootAvailableBytes >= requiredAvailableBytes || reclaimableBytes >= deficitBytes,
    rootAvailableBytes: observation.rootAvailableBytes,
    minimumRootAvailableBytes: observation.minimumRootAvailableBytes,
    deploymentHeadroomBytes,
    requiredAvailableBytes,
    deficitBytes,
    reclaimableBytes,
    candidates: Object.freeze(candidates),
  });
}
