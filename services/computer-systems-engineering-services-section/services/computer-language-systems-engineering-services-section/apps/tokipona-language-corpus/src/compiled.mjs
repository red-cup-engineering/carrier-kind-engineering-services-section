/**
 * The compiled Tokipona bundle: the witnessed finite vocabulary the Tokipona fiber is
 * read over. `load` (the fiber-algebra functor) lives in the base; this package
 * supplies only the language data and its compilation.
 */
import { compiledBundleFromLanguageManifest } from "@red-cup-engineering/communicating/speaking/listening/algebra/manifest";
import { manifest } from "./manifest.mjs";

/** Compiled Tokipona bundle: raw fiber data lifted into a CompiledBundle. */
export const tokipona = compiledBundleFromLanguageManifest(manifest);
export default tokipona;
