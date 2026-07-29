/**
 * catalog — the claude-infotics operation catalog.
 *
 * Gathers this app's own Claude operations together with the MetroPlat
 * operations it REUSES directly, exactly as the reference app `infograph/catalog`
 * composes `xOperations(binding)`. The surface, CLI, HTTP, and MCP faces are all
 * derived from this one operation list by the platform.
 *
 * Reused platform operations (no re-implementation): transcript + fleet reading
 * (`claudeSessionOperations`, `claudeFleetOperations`) and git worktree change
 * (`gitWorkspaceOperations`, the change-half of the #15 impact capability).
 */
import type { Operation } from "@emsenn/metroplat/operations";
import type { FilesystemBinding } from "@emsenn/metroplat/integrations/filesystem";
import { claudeSessionOperations, claudeFleetOperations } from "@emsenn/metroplat/integrations/anthropic";
import { gitWorkspaceOperations } from "@emsenn/metroplat/integrations/git";
import { agentTokenUsageOperations } from "@emsenn/metroplat/integrations/token-usage";

import { claudeRunOperations } from "./operations/run.mts";
import { claudeMessagesOperations } from "./operations/messages.mts";
import { claudeHarnessOperations } from "./operations/harness.mts";
import { claudeCapsuleOperations } from "./operations/capsule.mts";
import { claudeSessionComputerOperations } from "./operations/session.mts";
import { claudeProjectOperations } from "./operations/project.mts";

/** Every operation claude-infotics exposes, over a filesystem binding. */
export function claudeInfoticsOperations(binding: FilesystemBinding): readonly Operation[] {
  return Object.freeze([
    // Authored here (claude-specific, no platform home):
    ...claudeRunOperations(binding),
    ...claudeMessagesOperations(binding),
    ...claudeHarnessOperations(binding),
    ...claudeCapsuleOperations(binding),
    ...claudeSessionComputerOperations(binding),
    ...claudeProjectOperations(binding),
    // Reused from the platform (genuinely downstream):
    ...claudeSessionOperations(binding),
    ...claudeFleetOperations(binding),
    ...gitWorkspaceOperations(binding),
    ...agentTokenUsageOperations(binding),
  ]);
}
