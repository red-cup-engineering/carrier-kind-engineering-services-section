#!/usr/bin/env node
/**
 * read-campaign — the campaign forest the work ledger implies.
 *
 * Folds the flat work items (campaign/project/milestone/task, linked upward by
 * contributesTo) into their tree, rolls leaf progress up each branch, and names
 * the next actionable front. This is the PULL surface for the campaign carrier:
 * the agent runs it on demand to navigate an endeavor; suit injection takes only
 * the one-line pointers, so grounding stays cheap.
 *
 *   read-campaign                         # every campaign, rolled up
 *   echo '{"campaign":"refactor"}' | read-campaign   # one campaign
 *   echo '{"session":"<id>"}'   | read-campaign      # current front for a session
 */
import { campaignRollup } from "../src/operating/planning/campaigning/library/campaign-rollup.mts";
import { isMainModule, runJsonStdioScript } from "../src/script-stdio.mts";

const morphism = (repoRoot, params) => campaignRollup(repoRoot, params);

if (isMainModule(import.meta.url)) {
  await runJsonStdioScript(import.meta.url, "read-campaign", "operations-manifold read-campaign result", morphism);
}
