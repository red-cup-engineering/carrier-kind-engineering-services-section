/**
 * @packageDocumentation
 *
 * bins/script-catalog - package-phase `package.json#scripts` reading.
 *
 * Distinct from `bins/index.mts`'s `bin` map: a script is an author-declared
 * command with no process-entrypoint commitment (nothing resolves it as a
 * published executable, and it carries no compatibility guarantee to
 * callers). Reading it is still package-phase material — running one
 * is a services/ process binding, not owned here.
 */
import type { PackageManifestAdmission } from "../schemas/admission.mts";
import {
  packageScriptCatalogContract,
  type PackageScriptCatalog,
  type PackageScriptCatalogEntry,
} from "../schemas/bins.mts";

/** Read an admitted package manifest's `scripts` map as package material. */
export function packageScriptCatalogOfPackageManifest(admission: PackageManifestAdmission): PackageScriptCatalog {
  const scriptsValue = admission.manifest["scripts"];
  const entries: PackageScriptCatalogEntry[] = [];
  if (scriptsValue !== null && typeof scriptsValue === "object" && !Array.isArray(scriptsValue)) {
    for (const [name, command] of Object.entries(scriptsValue as Record<string, unknown>)) {
      if (typeof command === "string" && command.length > 0) {
        entries.push({ kind: "metroplat.bins.script-entry" as const, name, command });
      }
    }
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));

  return packageScriptCatalogContract.assert({
    kind: "metroplat.bins.script-catalog" as const,
    source: admission.source,
    packageName: admission.manifest.name,
    entries,
  }, "package script catalog") as PackageScriptCatalog;
}
