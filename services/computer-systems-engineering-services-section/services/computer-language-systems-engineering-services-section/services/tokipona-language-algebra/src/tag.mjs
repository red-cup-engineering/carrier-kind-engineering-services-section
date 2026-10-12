// Toki Pona's text codec over the language-neutral communicating substrate.
// The bundle owns isolating morphology and structural-particle data; the
// shared computer-language-systems-engineering-services-section tag
// capability owns the mechanism (compile, tokenize, per-word POS tag,
// settle).
import { createTag } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tag";
import { rawBundle } from "./bundle.mjs";

/** The compiled Toki Pona fiber, and Toki Pona's tagging surface, built
 * from the shared tag capability applied to Toki Pona's own rawBundle. */
export const { bundle, tagWordPos, tokenize, tagText } = createTag(rawBundle);
