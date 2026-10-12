// English's text codec over the language-neutral communicating substrate.
// The bundle owns English lexicon/morphology/attachment law; the shared
// computer-language-systems-engineering-services-section tag capability
// owns the mechanism (compile, tokenize, per-word POS tag, settle).
import { createTag } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tag";
import { rawBundle } from "./bundle.mjs";

/** The compiled English fiber, and English's tagging surface, built from
 * the shared tag capability applied to English's own rawBundle. */
export const { bundle, tagWordPos, tokenize, tagText } = createTag(rawBundle);
