/**
 * Carrier observation and derived routing role.
 *
 * Availability never changes canonicality. Callers report what carrier surface
 * they are actually using plus sourced control-path observations; this module
 * derives whether that surface is canonical, intrinsic source, artifact,
 * provider-native, transient, or an admissible degraded projection.
 */
import { agentVisibilityReading } from "./visibility.mjs";

export const AGENT_CARRIER_SURFACES = Object.freeze([
  "semioverse",
  "github",
  "drive",
  "chatgpt-local",
  "provider",
]);

export const AGENT_CARRIER_ROLES = Object.freeze([
  "canonical",
  "degraded-projection",
  "intrinsic-source",
  "artifact",
  "transient",
  "provider-native",
]);

export const AGENT_CARRIER_DOMAINS = Object.freeze([
  "organizational-state",
  "source",
  "artifact",
  "provider-effect",
  "local-transient",
]);

function nonempty(value) {
  return value !== undefined && value.trim().length > 0;
}

export function hasCompleteSyncBack(sync) {
  return sync !== undefined
    && nonempty(sync.intendedReceiver)
    && nonempty(sync.work)
    && nonempty(sync.blocker)
    && nonempty(sync.wake)
    && nonempty(sync.acceptance);
}

function semioverseControlObstructed(reading) {
  return [
    "inaccessible",
    "unenumerable",
    "unsupported",
    "filtered-partial",
    "error-degraded",
  ].includes(reading.classification);
}

function expectedObservationMode(role) {
  if (role === "canonical") return "canonical";
  if (role === "degraded-projection") return "degraded-projection";
  return "provider-native";
}

/**
 * Derive the carrier role valid for one effect domain.
 *
 * Organizational state is canonical only on Semioverse. GitHub may host it only
 * as a degraded projection when a sourced Semioverse control-path obstruction
 * and a complete sync-back obligation both exist. Other lower tiers never become
 * organizationally canonical by availability.
 */
export function agentCarrierReading(
  observation,
  domain,
) {
  const reasons = [];
  if (!nonempty(observation.sourceRef)) reasons.push("carrier-source-unbound");

  let role;
  let semioverseControl;

  switch (domain) {
    case "organizational-state":
      if (observation.actual === "semioverse") {
        role = "canonical";
      } else if (observation.actual === "github") {
        role = "degraded-projection";
        if (observation.semioverseControl === undefined) {
          reasons.push("degraded-cause-unbound");
        } else {
          semioverseControl = agentVisibilityReading(observation.semioverseControl);
          if (!semioverseControlObstructed(semioverseControl)) {
            reasons.push("degraded-cause-not-obstructed");
          }
        }
        if (!hasCompleteSyncBack(observation.syncBack)) {
          reasons.push("degraded-projection-missing-sync-back");
        }
      } else {
        reasons.push("carrier-domain-surface-mismatch");
      }
      break;

    case "source":
      if (observation.actual === "github") role = "intrinsic-source";
      else reasons.push("carrier-domain-surface-mismatch");
      break;

    case "artifact":
      if (observation.actual === "drive") role = "artifact";
      else reasons.push("carrier-domain-surface-mismatch");
      break;

    case "provider-effect":
      if (observation.actual === "provider") role = "provider-native";
      else reasons.push("carrier-domain-surface-mismatch");
      break;

    case "local-transient":
      if (observation.actual === "chatgpt-local") role = "transient";
      else reasons.push("carrier-domain-surface-mismatch");
      break;
  }

  if (
    role !== undefined
    && observation.sourceMode !== expectedObservationMode(role)
  ) {
    reasons.push("carrier-source-mode-mismatch");
  }

  const unique = Object.freeze([...new Set(reasons)]);
  return Object.freeze({
    kind: "organizing.cell.carrier-reading",
    domain,
    actual: observation.actual,
    ...(role === undefined ? {} : { role }),
    valid: unique.length === 0 && role !== undefined,
    reasons: unique,
    ...(semioverseControl === undefined ? {} : { semioverseControl }),
    evidence: Object.freeze([
      ...observation.evidence,
      "carrier-source:" + observation.sourceRef,
      "carrier-source-mode:" + observation.sourceMode,
      "carrier-actual:" + observation.actual,
      "carrier-domain:" + domain,
      ...(role === undefined ? [] : ["carrier-role:" + role]),
      ...(semioverseControl === undefined ? [] : semioverseControl.evidence),
    ]),
  });
}

