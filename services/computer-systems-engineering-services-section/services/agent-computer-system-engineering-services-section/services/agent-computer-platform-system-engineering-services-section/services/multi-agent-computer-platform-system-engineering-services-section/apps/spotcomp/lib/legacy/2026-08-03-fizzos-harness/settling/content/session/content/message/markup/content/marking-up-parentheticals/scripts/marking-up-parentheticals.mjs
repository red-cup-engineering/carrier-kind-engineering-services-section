// marking-up-parentheticals — wraps parenthesized phrases.
// Per emsenn's prompt.jsonl: parentheticals in a prompt are intentional and
// load-bearing, not throwaway. Matches non-nested innermost parens.

import { applyMarkupInTextNodes } from '#library/applying-markup/scripts/applying-markup.mjs';

const REGEX = /\([^()]*\)/g;
const CLASS = 'marking-up-parentheticals';

export default function markingUpParentheticals(input) {
  const { html } = input;
  const result = applyMarkupInTextNodes(html, CLASS, REGEX, CLASS);
  return { html: result, novel: result !== html };
}
