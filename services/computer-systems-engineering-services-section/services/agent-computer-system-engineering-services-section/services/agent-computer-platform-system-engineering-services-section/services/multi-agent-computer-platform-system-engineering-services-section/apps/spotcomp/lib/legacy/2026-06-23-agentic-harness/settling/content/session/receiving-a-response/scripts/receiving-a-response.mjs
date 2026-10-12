// receiving-a-response — chain morphism for the claude→user path.
//
// Input: { text, sender?, t, in-response-to? }
// Output: { html: marked-up-html, iterations }
//
// Same shape as sending-a-prompt but wraps as <article class="wrapping-as-claude-response">
// and carries the in-response-to reference back to the prompt it answers.

import applyingMarkup from '#library/message/markup/library/applying-markup/scripts/applying-markup.mjs';
import wrappingAsClaudeResponse from '#library/message/markup/library/wrapping-as-claude-response/scripts/wrapping-as-claude-response.mjs';
import markingUpAllCaps from '#library/message/markup/library/marking-up-all-caps/scripts/marking-up-all-caps.mjs';
import markingUpParentheticals from '#library/message/markup/library/marking-up-parentheticals/scripts/marking-up-parentheticals.mjs';
import markingUpCodeBlocks from '#library/message/markup/library/marking-up-code-blocks/scripts/marking-up-code-blocks.mjs';
import markingUpUrls from '#library/message/markup/library/marking-up-urls/scripts/marking-up-urls.mjs';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

function escapeText(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function receivingAResponse(input) {
  const { text, sender = 'claude', t, inResponseTo } = input;
  if (typeof text !== 'string') throw new TypeError('receiving-a-response: text must be a string');
  if (typeof t !== 'string') throw new TypeError('receiving-a-response: t must be an ISO-8601 string');

  let html = escapeText(text);
  ({ html } = wrappingAsClaudeResponse({ html, sender, t, inResponseTo }));

  const morphisms = [
    markingUpCodeBlocks,
    markingUpAllCaps,
    markingUpParentheticals,
    markingUpUrls,
  ];
  const result = applyingMarkup({ html, morphisms });

  return { html: result.html, iterations: result.iterations };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) {
  const result = receivingAResponse({
    text: 'My response (with a parenthetical). See https://example.org.',
    sender: 'claude',
    t: new Date().toISOString(),
    inResponseTo: { t: '2026-05-21T14:00:00.000Z', sender: 'emsenn' },
  });
  console.log(result.html);
}
