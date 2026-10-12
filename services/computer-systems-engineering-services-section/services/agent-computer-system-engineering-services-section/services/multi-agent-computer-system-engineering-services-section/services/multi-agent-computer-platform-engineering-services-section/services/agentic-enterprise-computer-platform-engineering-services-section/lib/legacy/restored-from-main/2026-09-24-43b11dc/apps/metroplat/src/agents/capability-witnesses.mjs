/** Agent-operation capability declarations. */
/** Capability witnesses supplied by application and integration sources.
 *
 * The executable carrier is deliberately kept here, above runtime.  Runtime
 * receives only the claim, its FOUR charge, and causal declarations.
 */
import { tm } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation";
import {
  capabilityClaim,
  capabilityWitness,
  readCapabilityWitnesses,

} from "@red-cup-engineering/feltos/capability/claims";

import { readProgramContractStanding } from "../rpc/contract.mjs";

export function capabilityWitnessForOperation(
  operation,
  causes = [],
  contractEvidence,
) {
  const address = tm.mark(operation.verb);
  const body = operation.runTerm === undefined
    ? Object.freeze({ kind: "metroplat.capability.effector", declaration: operation.verb })
    : Object.freeze({ kind: "metroplat.capability.term", term: operation.runTerm });
  return capabilityWitness(
    capabilityClaim(
      address,
      body,
      readProgramContractStanding(operation, contractEvidence),
      Object.freeze([operation.inputFormat, operation.outputFormat]),
      operation.reads,
      operation.writes,
    ),
    "held",
    operation,
    causes,
  );
}

export function capabilityWitnessesForOperations(
  operations,
  contractEvidence,
) {
  return Object.freeze(operations.map((operation) => capabilityWitnessForOperation(operation, [], contractEvidence)));
}

/** The exact current callable face, read from the settlement rather than a registry. */
export function callableOperationsFromWitnesses(witnesses)

 {
  const reading = readCapabilityWitnesses(witnesses);
  const designated = new Set(reading.designated.map((entry) => entry.address));
  const operations = witnesses
    .filter((witness) => designated.has((reading.designated.find((entry) => entry.claim === witness.claim)?.address) ?? ""))
    .map((witness) => witness.carrier);
  return Object.freeze({ reading, operations: Object.freeze(operations) });
}
