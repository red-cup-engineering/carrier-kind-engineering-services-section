// marking-up-all-caps — wraps runs of 3+ consecutive uppercase letters.
// Regex pattern; no NLP. Per emsenn's prompt.jsonl: ALL-CAPS in a prompt
// marks a correction emsenn keeps re-issuing because the prior turn missed it.

import { applyMarkupInTextNodes } from '#library/applying-markup/scripts/applying-markup.mjs';

const REGEX = /[A-Z]{3,}/g;
const CLASS = 'marking-up-all-caps';

export default function markingUpAllCaps(input) {
  const { html } = input;
  const result = applyMarkupInTextNodes(html, CLASS, REGEX, CLASS);
  return { html: result, novel: result !== html };
}
