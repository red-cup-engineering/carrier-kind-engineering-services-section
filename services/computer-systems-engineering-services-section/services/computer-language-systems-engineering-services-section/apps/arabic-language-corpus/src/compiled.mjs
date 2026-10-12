/**
 * The compiled Arabic bundle: the RTL, root-pattern language fiber read by the
 * base communicating machinery. `load` lives upstream; this package supplies
 * the Arabic data and its compilation.
 */
import { compiledBundleFromLanguageManifest } from "@red-cup-engineering/communicating/speaking/listening/algebra/manifest";
import { manifest } from "./manifest.mjs";

/** Compiled Arabic bundle: raw fiber data lifted into a CompiledBundle. */
export const arabic = compiledBundleFromLanguageManifest(manifest);
export default arabic;
