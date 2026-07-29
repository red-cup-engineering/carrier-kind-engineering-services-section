/**
 * surface — project the claude-infotics catalog into an MetroPlat surface.
 *
 * `projectSurface` folds the operation list into the one protocol-neutral
 * surface every transport (CLI, HTTP, MCP, LSP) projects. The app does not
 * hand-roll any of those faces.
 */
import { projectSurface, type ProjectedSurface } from "@emsenn/metroplat/surfaces";
import type { FilesystemBinding } from "@emsenn/metroplat/integrations/filesystem";

import { claudeInfoticsOperations } from "./catalog.mts";
import { claudeInfoticsGrants } from "./authorization.mts";

export function claudeInfoticsSurface(binding: FilesystemBinding, at: string): ProjectedSurface {
  return projectSurface(claudeInfoticsOperations(binding), {
    packageName: "@emsenn/claude-infotics",
    capabilityAssertions: () => claudeInfoticsGrants(at),
  });
}
