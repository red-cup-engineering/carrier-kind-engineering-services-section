// sending-a-prompt — chain morphism for the user→claude path.
//
// Input: { text, sender, t, session-context? }
// Output: { html: marked-up-html, iterations }
//
// 1. HTML-escape the raw text.
// 2. Wrap as <article class="wrapping-as-user-prompt"> with data-sender/data-t.
// 3. Fire structural markup-morphisms (code-blocks first, then all-caps,
//    parentheticals, URLs) to Knaster-Tarski lfp via applying-markup.
// 4. Return the marked-up HTML.

import applyingMarkup from '#library/message/markup/library/applying-markup/scripts/applying-markup.mjs';
import wrappingAsUserPrompt from '#library/message/markup/library/wrapping-as-user-prompt/scripts/wrapping-as-user-prompt.mjs';
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

export default function sendingAPrompt(input) {
  const { text, sender, t } = input;
  if (typeof text !== 'string') throw new TypeError('sending-a-prompt: text must be a string');
  if (typeof sender !== 'string') throw new TypeError('sending-a-prompt: sender must be a string');
  if (typeof t !== 'string') throw new TypeError('sending-a-prompt: t must be an ISO-8601 string');

  let html = escapeText(text);
  ({ html } = wrappingAsUserPrompt({ html, sender, t }));

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
  const result = sendingAPrompt({
    text: 'Hello (this is a test). STOP doing that. Visit https://example.com — and see ```const x = 1;``` end.',
    sender: 'emsenn',
    t: new Date().toISOString(),
  });
  console.log(result.html);
  console.log(`\n(converged in ${result.iterations} iterations)`);
}
