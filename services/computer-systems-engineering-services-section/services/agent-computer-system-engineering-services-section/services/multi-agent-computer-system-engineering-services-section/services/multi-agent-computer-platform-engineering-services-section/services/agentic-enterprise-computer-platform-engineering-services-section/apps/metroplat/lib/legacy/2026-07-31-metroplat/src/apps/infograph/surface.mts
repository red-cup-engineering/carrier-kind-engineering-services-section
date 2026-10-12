import { assembleDefaultService } from "./catalog.mts";
import { defaultFilesystemBinding } from "../../integrations/filesystem/services/read-write.mts";
import { agentReadinessResourceUri, type AgentReadinessReport, type ProjectedSurface } from "../../presentation/index.mts";

export function projectCliService(binding: ReturnType<typeof defaultFilesystemBinding>): ProjectedSurface {
  return assembleDefaultService(binding).apex;
}

export function projectCliServiceWithReadiness(binding: ReturnType<typeof defaultFilesystemBinding>): ProjectedSurface {
  const firstPass = projectCliService(binding);
  const readiness = readAgentReadiness(firstPass);
  return readiness === undefined
    ? firstPass
    : projectCliService(Object.freeze({ ...binding, readiness }));
}

function readAgentReadiness(induced: ProjectedSurface): AgentReadinessReport | undefined {
  const uri = agentReadinessResourceUri(induced.discovery.package);
  const readiness = induced.resources.find((res) => res.uri === uri);
  if (readiness === undefined) return undefined;
  try {
    const value = JSON.parse(readiness.read()) as unknown;
    if (value !== null && typeof value === "object" && (value as { readonly kind?: unknown }).kind === "metroplat.agent-readiness") {
      return value as AgentReadinessReport;
    }
  } catch {}
  return undefined;
}
