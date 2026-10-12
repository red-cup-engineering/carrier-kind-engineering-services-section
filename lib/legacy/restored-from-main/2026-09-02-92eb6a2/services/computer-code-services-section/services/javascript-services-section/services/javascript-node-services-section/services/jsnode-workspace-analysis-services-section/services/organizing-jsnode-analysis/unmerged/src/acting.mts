import { action, type Action } from "@emsenn/relating";
import type { JsonRecord } from "@emsenn/relating/writing";

import {
  organizePackageScriptCatalog,
  type JSNodeOrganizerAdmission,
  type JSNodeOrganizerClaim,
  type JSNodeOrganizerToken,
} from "./organizing/index.mjs";
import { runNodeBinary, type PackageScript } from "./organizing/packages/index.mjs";

export type JSNodePackageActionSurface = Readonly<{
  kind: "organizing-with-jsnode.package-action-surface";
  admission: JSNodeOrganizerAdmission;
  actions: readonly Action[];
}>;

export function organizePackageActions(
  token: JSNodeOrganizerToken = {},
  claim: JSNodeOrganizerClaim = {},
): JSNodePackageActionSurface {
  const admission = organizePackageScriptCatalog(token, claim);
  const catalog = admission.reading?.kind === "organizing-with-jsnode.package-script.catalog-reading"
    ? admission.reading.catalog
    : undefined;
  return Object.freeze({
    kind: "organizing-with-jsnode.package-action-surface" as const,
    admission,
    actions: Object.freeze(catalog?.scripts.map(actionFromPackageScript) ?? []),
  });
}

function actionFromPackageScript(script: PackageScript): Action {
  const domainSchema = script.inputSchema as JsonRecord | undefined;
  const codomainSchema = script.outputSchema as JsonRecord | undefined;
  return action({
    verb: script.name,
    inputFormat: "string",
    outputFormat: "string",
    ...(script.summary === undefined ? {} : { summary: script.summary }),
    ...(script.description === undefined ? {} : { description: script.description }),
    ...(domainSchema === undefined ? {} : { domainSchema }),
    ...(codomainSchema === undefined ? {} : { codomainSchema }),
    run: async (input) => {
      const stdin = typeof input === "string" ? input : JSON.stringify(input);
      const result = await runNodeBinary(script.executable, { stdin });
      if (result.code !== 0) {
        throw new Error(`action ${script.name} exited nonzero (${result.code ?? "signal"}): ${result.stderr}`);
      }
      return result.stdout;
    },
  });
}
