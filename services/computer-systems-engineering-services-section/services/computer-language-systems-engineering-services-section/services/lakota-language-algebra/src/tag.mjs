// Lakota's text codec over the language-neutral communicating substrate.
// The bundle owns postposed determiner/adjective and SOV law; the shared
// computer-language-systems-engineering-services-section tag capability
// owns the mechanism (compile, tokenize, per-word POS tag, settle).
import { createTag } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tag";
import { rawBundle } from "./bundle.mjs";

/** The compiled Lakota fiber, and Lakota's tagging surface, built from
 * the shared tag capability applied to Lakota's own rawBundle. */
export const { bundle, tagWordPos, tokenize, tagText } = createTag(rawBundle);
