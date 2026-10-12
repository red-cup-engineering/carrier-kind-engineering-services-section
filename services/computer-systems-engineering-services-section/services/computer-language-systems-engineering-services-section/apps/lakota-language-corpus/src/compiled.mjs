/**
 * The compiled Lakota bundle: the witnessed finite vocabulary the Lakota fiber is
 * read over. `load` (the fiber-algebra functor) lives in the base; this package
 * supplies only the language data and its compilation.
 */
import { compiledBundleFromLanguageManifest } from "@red-cup-engineering/communicating/speaking/listening/algebra/manifest";
import { manifest } from "./manifest.mjs";

/** Compiled Lakota bundle: raw fiber data lifted into a CompiledBundle. */
export const lakota = compiledBundleFromLanguageManifest(manifest);
export default lakota;
