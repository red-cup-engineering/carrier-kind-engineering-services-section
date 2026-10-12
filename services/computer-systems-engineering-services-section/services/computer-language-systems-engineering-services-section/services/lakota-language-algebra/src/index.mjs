// index.ts — Lakȟótiyapi (Lakota) syntaxis bundle, compiled and ready to use.
import { load } from "@red-cup-engineering/communicating";
import { rawBundle } from "./bundle.mjs";

export { rawBundle } from "./bundle.mjs";

/** Compiled Lakota bundle — pass to articulate(), construe(), parse(). */
export const bundle = load(rawBundle);
export default bundle;
