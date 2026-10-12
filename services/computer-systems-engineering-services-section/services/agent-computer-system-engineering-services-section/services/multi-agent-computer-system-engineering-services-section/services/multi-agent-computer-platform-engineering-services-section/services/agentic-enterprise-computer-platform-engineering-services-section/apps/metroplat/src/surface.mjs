import { assembleDefaultService } from "./catalog.mjs";
import { agentReadinessResourceUri } from "@red-cup-engineering/metroplat/presentation/surface";

export function projectCliService(
  binding,
  trustedOperationSources = [],
  rootName = "@red-cup-engineering/metroplat",
  descriptorFamilies,
  workOptions = {},
) {
  return assembleDefaultService(binding, rootName, trustedOperationSources, workOptions, descriptorFamilies).apex;
}

export function projectCliServiceWithReadiness(
  binding,
  trustedOperationSources = [],
  rootName = "@red-cup-engineering/metroplat",
  descriptorFamilies,
  workOptions = {},
) {
  const firstPass = projectCliService(binding, trustedOperationSources, rootName, descriptorFamilies, workOptions);
  const readiness = readAgentReadiness(firstPass);
  return readiness === undefined
    ? firstPass
    : projectCliService(Object.freeze({ ...binding, readiness }), trustedOperationSources, rootName, descriptorFamilies, workOptions);
}

function readAgentReadiness(induced) {
  const uri = agentReadinessResourceUri(induced.discovery.package);
  const readiness = induced.resources.find((res) => res.uri === uri);
  if (readiness === undefined) return undefined;
  try {
    const value = JSON.parse(readiness.read());
    if (value !== null && typeof value === "object" && (value).kind === "metroplat.agent-readiness") {
      return value;
    }
  } catch {}
  return undefined;
}
