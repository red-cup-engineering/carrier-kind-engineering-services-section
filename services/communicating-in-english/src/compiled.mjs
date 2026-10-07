/**
 * The compiled English bundle: the witnessed finite vocabulary the English fiber
 * is read over. `load` (the fiber-algebra functor) lives in the base; this
 * package supplies only the language data and its compilation.
 */
import { load } from "@red-cup-engineering/communicating";
import { rawBundle } from "@lenticule-science/english-language-algebra";

/** Compiled English bundle: raw fiber data lifted into a CompiledBundle. */
export const english = load(rawBundle);
export default english;
