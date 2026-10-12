// marking-up-urls — wraps HTTP/HTTPS URLs.
// Simple pattern matching common URLs; not full RFC 3986 (which is complex).

import { applyMarkupInTextNodes } from '#library/applying-markup/scripts/applying-markup.mjs';

const REGEX = /https?:\/\/[^\s<>"'`]+/g;
const CLASS = 'marking-up-urls';

export default function markingUpUrls(input) {
  const { html } = input;
  const result = applyMarkupInTextNodes(html, CLASS, REGEX, CLASS);
  return { html: result, novel: result !== html };
}
