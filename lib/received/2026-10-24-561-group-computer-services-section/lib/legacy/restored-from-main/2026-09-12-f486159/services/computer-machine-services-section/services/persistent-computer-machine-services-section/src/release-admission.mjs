import { evaluateWorkResourceControl } from "@red-cup-engineering/decide-work-placement-service/resource-reservations";
import { verifyControlCommandAdmission } from "@red-cup-engineering/principal-office-seating-service";

/**
 * Pure admission for a release effect.  The surrounding host adapter obtains
 * observations and performs deployment; this function neither reads a host
 * nor writes a receipt.  A receipt requirement is deliberately not confused
 * with a receipt proving a completed deployment.
 */
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonNegativeSafeInteger = (value) => Number.isSafeInteger(value) && value >= 0;
const isText = (value) => typeof value === "string" && value.length > 0;
const isInstant = (value) => isText(value) && Number.isFinite(Date.parse(value));

function reason(code, subject) {
  return Object.freeze({ code, subject });
}

/**
 * Decides whether a release may enter its imperative deployment shell.
 * @param {{controlCommand: object, machine: object, resourceControl: object, reservationReceipt: object, reserve: object, capacity: object, deploy: object, receipt: object, evaluatedAt: string}} input
 * @returns {{type: "ReleaseAdmissionDecision", version: 1, admitted: boolean, reasons: readonly object[], evidence: object}}
 */
export function decideReleaseAdmission(input) {
  const reasons = [];
  const machine = input?.machine;
  const controlCommand = input?.controlCommand;
  const resourceControl = input?.resourceControl;
  const reservationReceipt = input?.reservationReceipt;
  const reserve = input?.reserve;
  const capacity = input?.capacity;
  const deploy = input?.deploy;
  const receipt = input?.receipt;

  const evaluatedAt = input?.evaluatedAt;
  const endpoint = machine?.runtimeEndpoint;
  if (!isObject(machine) || machine.type !== "ReleaseMachineBinding" || machine.version !== 1 || !isText(machine.machineIdentity) || !isText(machine.observationEvidenceIdentity) || !isInstant(machine.observedAt) || !isInstant(machine.validUntil) || Date.parse(machine.observedAt) >= Date.parse(machine.validUntil) || !Array.isArray(machine.allowedEffects) || !machine.allowedEffects.includes("release") || !isObject(endpoint) || endpoint.type !== "RuntimeEndpoint" || endpoint.version !== 1 || !isText(endpoint.transport) || !isText(endpoint.address)) reasons.push(reason("machine-binding-not-admitted", "machine"));
  let evaluatedControl;
  try { evaluatedControl = evaluateWorkResourceControl(resourceControl?.binding, evaluatedAt); } catch { reasons.push(reason("resource-control-not-admitted", "resourceControl")); }
  if (evaluatedControl && (resourceControl?.type !== "WorkResourceControlEvaluation" || resourceControl?.disposition !== "admitted" || evaluatedControl.disposition !== "admitted")) reasons.push(reason("resource-control-not-admitted", "resourceControl"));
  if (!isObject(reservationReceipt) || reservationReceipt.type !== "WorkResourceReservationResult" || reservationReceipt.disposition !== "attempted" || !isText(reservationReceipt.reservationIdentity) || !evaluatedControl?.binding || ["providerIdentity", "accountIdentity", "windowIdentity"].some((field) => reservationReceipt[field] !== evaluatedControl.binding[field])) reasons.push(reason("reservation-receipt-not-admitted", "reservationReceipt"));
  const commandRequirementsPresent = isText(evaluatedAt) && isText(machine?.machineIdentity)
    && isObject(endpoint) && endpoint.type === "RuntimeEndpoint" && endpoint.version === 1 && isText(endpoint.transport) && isText(endpoint.address)
    && isText(evaluatedControl?.binding?.providerIdentity) && isText(evaluatedControl?.binding?.accountIdentity) && isText(evaluatedControl?.binding?.windowIdentity) && isText(reservationReceipt?.reservationIdentity);
  if (!commandRequirementsPresent || !verifyControlCommandAdmission(controlCommand, {
    now: evaluatedAt,
    effect: "release",
    machineIdentity: machine.machineIdentity,
    observationEvidenceIdentity: machine.observationEvidenceIdentity,
    observedAt: machine.observedAt,
    runtimeEndpoint: endpoint,
    providerIdentity: evaluatedControl.binding.providerIdentity,
    accountIdentity: evaluatedControl.binding.accountIdentity,
    windowIdentity: evaluatedControl.binding.windowIdentity,
    reservationIdentity: reservationReceipt.reservationIdentity,
  })) reasons.push(reason("control-command-not-admitted", "controlCommand"));
  if (!isObject(reserve) || reserve.type !== "ReleaseCapacityReserve" || reserve.version !== 1
    || !isNonNegativeSafeInteger(reserve.minimumRootAvailableBytes) || !isNonNegativeSafeInteger(reserve.minimumMemoryAvailableMb)) reasons.push(reason("reserve-not-admitted", "reserve"));
  if (!isObject(capacity) || capacity.type !== "ReleaseCapacityObservation" || capacity.version !== 1
    || capacity.machineIdentity !== machine?.machineIdentity || capacity.observationEvidenceIdentity !== machine?.observationEvidenceIdentity || capacity.observedAt !== machine?.observedAt || !isNonNegativeSafeInteger(capacity.rootAvailableBytes) || !isNonNegativeSafeInteger(capacity.memoryAvailableMb)) reasons.push(reason("capacity-not-admitted", "capacity"));
  if (!isObject(deploy) || deploy.type !== "ReleaseDeployIntent" || deploy.version !== 1 || deploy.mutation !== true) reasons.push(reason("deploy-intent-not-admitted", "deploy"));
  if (!isObject(receipt) || receipt.type !== "ReleaseReceiptRequirement" || receipt.version !== 1 || receipt.durable !== true) reasons.push(reason("receipt-requirement-not-admitted", "receipt"));

  if (isObject(reserve) && isObject(capacity) && capacity.rootAvailableBytes < reserve.minimumRootAvailableBytes) reasons.push(reason("capacity-root-below-reserve", "capacity.rootAvailableBytes"));
  if (isObject(reserve) && isObject(capacity) && capacity.memoryAvailableMb < reserve.minimumMemoryAvailableMb) reasons.push(reason("capacity-memory-below-reserve", "capacity.memoryAvailableMb"));
  return Object.freeze({
    type: "ReleaseAdmissionDecision",
    version: 1,
    admitted: reasons.length === 0,
    reasons: Object.freeze(reasons),
    evidence: Object.freeze({
      machine: machine?.type === "ReleaseMachineBinding" && machine.version === 1,
      controlCommand: controlCommand?.type === "ControlCommandAdmission" && controlCommand?.disposition === "admitted",
      resourceControl: evaluatedControl?.disposition === "admitted",
      reservationReceipt: reservationReceipt?.disposition === "attempted",
      reserve: reserve?.type === "ReleaseCapacityReserve" && reserve.version === 1,
      capacity: isObject(capacity) ? Object.freeze({ rootAvailableBytes: capacity.rootAvailableBytes ?? null, memoryAvailableMb: capacity.memoryAvailableMb ?? null }) : null,
      deploy: deploy?.type === "ReleaseDeployIntent" && deploy.mutation === true,
      receipt: receipt?.type === "ReleaseReceiptRequirement" && receipt.durable === true,
    }),
  });
}
