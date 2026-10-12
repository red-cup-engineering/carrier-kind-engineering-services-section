// Latin's text codec over the language-neutral communicating substrate.
// The bundle owns the case-feature and free-word-order laws; the shared
// computer-language-systems-engineering-services-section tag capability
// owns the mechanism (compile, tokenize, per-word POS tag, settle) — same
// discipline the old stub's tagText() documented, now computed by the
// actual settlement engine instead of a flat per-word lookup. Latin's
// free word order means case features (not position) decide roles, so its
// bundle publishes a roleBy table; { includeRoleBy: true } tells the
// shared tag capability to surface it on tagText's result.
import { createTag } from "@red-cup-engineering/computer-language-systems-engineering-services-section/tag";
import { rawBundle } from "./bundle.mjs";

/** The compiled Latin fiber, and Latin's tagging surface, built from
 * the shared tag capability applied to Latin's own rawBundle. */
export const { bundle, tagWordPos, tokenize, tagText } = createTag(rawBundle, { includeRoleBy: true });
