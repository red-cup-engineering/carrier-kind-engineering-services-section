import { type AppOpticRegistry } from "./apps-schema.mjs";
export { blueprintAppDocument, blueprintAppOptic, type BlueprintAppDocument, } from "./blueprint/app.mjs";
export { versoAppDocument, versoAppOptic, type VersoAppDocument, } from "./verso/app.mjs";
/** The package-level atlas of authored app optics assembled from apps/, not src/. */
export declare function appOpticRegistry(packageName?: string): AppOpticRegistry;
