import { appOpticRegistryContract, } from "./apps-schema.mjs";
import { blueprintAppOptic } from "./blueprint/app.mjs";
import { versoAppOptic } from "./verso/app.mjs";
export { blueprintAppDocument, blueprintAppOptic, } from "./blueprint/app.mjs";
export { versoAppDocument, versoAppOptic, } from "./verso/app.mjs";
/** The package-level atlas of authored app optics assembled from apps/, not src/. */
export function appOpticRegistry(packageName = "@red-cup-engineering/metroplat") {
    const optics = Object.freeze([
        blueprintAppOptic(),
        versoAppOptic(),
    ]);
    return appOpticRegistryContract.assert(Object.freeze({
        kind: "metroplat.apps.optic-registry",
        package: packageName,
        optics,
        evidence: Object.freeze(optics.map((optic) => optic.id)),
    }), "app optic registry");
}
