/**
 * The compiled Latin bundle: the witnessed finite vocabulary the Latin fiber is
 * read over. `load` (the fiber-algebra functor) lives in the base; this package
 * supplies only the language data and its compilation.
 */
import { compiledBundleFromLanguageManifest } from "@red-cup-engineering/communicating/speaking/listening/algebra/manifest";
import { manifest } from "./manifest.mjs";

/** Compiled Latin bundle: raw fiber data lifted into a CompiledBundle. */
export const latin = compiledBundleFromLanguageManifest(manifest);
export default latin;
