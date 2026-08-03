import { isCanonicalSha256NiUri } from "@red-cup-engineering/semantic-content-identify-service";

function ni(value, label) {
  if (!isCanonicalSha256NiUri(value)) throw new TypeError(`${label} must be a canonical SHA-256 ni identifier`);
  return value;
}

/** Convert source observation plus semantic scan into MUD-market repair moves. */
export function induceTemporalFailureRepairMoves({ raiser, repositoryObservation, scanReceipt, induceDemand }) {
  if (repositoryObservation?.type !== "RepositoryMaterialObservation") throw new TypeError("repositoryObservation must be a RepositoryMaterialObservation");
  const observationNi = ni(repositoryObservation.id, "repositoryObservation.id");
  if (scanReceipt?.type !== "TemporalFailureTerritoryScanReceipt" || scanReceipt.conforms !== false || !Array.isArray(scanReceipt.obligations)) throw new TypeError("scanReceipt must be a nonconforming TemporalFailureTerritoryScanReceipt");
  const scanNi = ni(scanReceipt.id, "scanReceipt.id");
  if (typeof induceDemand !== "function") throw new TypeError("induceDemand must be the canonical capability-repair demand fabricator");
  const demands = scanReceipt.obligations.map(({ resourcePath, mark }, index) => {
    if (typeof resourcePath !== "string" || resourcePath.length === 0 || typeof mark?.kind !== "string" || !Number.isInteger(mark?.at?.line)) throw new TypeError(`scanReceipt obligation ${index} is not an addressed temporal-failure mark`);
    return induceDemand({ raiser,
      locus: `repository-material:${observationNi}:${resourcePath}:${mark.at.line}:${mark.kind}`,
      operation: "remove-temporal-failure-mark",
      objective: `remove the witnessed ${mark.kind} mark from ${resourcePath} and preserve its causal repair evidence`,
      refusalCode: "temporal-failure-mark-present",
      refusalWitnessNis: [observationNi, scanNi],
      requiredStandard: "pending-running-observable-cancellable-without-temporal-failure",
      inputNi: scanNi,
    });
  });
  return Object.freeze({ type: "TemporalFailureRepairMoveSet", version: 1, repositoryObservationNi: observationNi, temporalFailureScanNi: scanNi, demands: Object.freeze(demands) });
}
