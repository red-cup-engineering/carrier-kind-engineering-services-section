import {
  appOpticRegistryContract,
  type AppOpticRegistry,
} from "./apps-schema.mts";
import { blueprintAppOptic } from "./blueprint/app.mts";
import { versoAppOptic } from "./verso/app.mts";

export {
  blueprintAppDocument,
  blueprintAppOptic,
  type BlueprintAppDocument,
} from "./blueprint/app.mts";
export {
  versoAppDocument,
  versoAppOptic,
  type VersoAppDocument,
} from "./verso/app.mts";

/** The package-level atlas of authored app optics assembled from apps/, not src/. */
export function appOpticRegistry(packageName = "@red-cup-engineering/metroplat"): AppOpticRegistry {
  const optics = Object.freeze([
    blueprintAppOptic(),
    versoAppOptic(),
  ]);
  return appOpticRegistryContract.assert(Object.freeze({
    kind: "metroplat.apps.optic-registry" as const,
    package: packageName,
    optics,
    evidence: Object.freeze(optics.map((optic) => optic.id)),
  }), "app optic registry") as AppOpticRegistry;
}
