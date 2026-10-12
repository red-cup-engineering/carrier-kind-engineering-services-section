// Mandarin's text codec over the language-neutral communicating substrate.
// The bundle owns preposed determiner/adjective and SVO law, plus its own
// dictionary-based `segment` hook (communicating engages it instead of the
// regex/script tokenizer — see bundle.mjs); the shared
// computer-language-systems-engineering-services-section tag capability
// owns the mechanism (compile, tokenize, per-word POS tag, settle).
import { createTag } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tag";
import { rawBundle } from "./bundle.mjs";

/** The compiled Mandarin fiber, and Mandarin's tagging surface, built from
 * the shared tag capability applied to Mandarin's own rawBundle. */
export const { bundle, tagWordPos, tokenize, tagText } = createTag(rawBundle);
