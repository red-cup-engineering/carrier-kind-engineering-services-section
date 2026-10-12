// settling-a-turn — the full settling of a prompt with a Claude.
//
//   (raw user text + sender + t) → (prompt SHM + response SHM)
//
// Composition:
//   sendingAPrompt       : (raw user text) → SHM user prompt
//   sendingToClaude      : (SHM user prompt) → raw claude text  (semantic; stubbed)
//   receivingAResponse   : (raw claude text) → SHM claude response
//
// This morphism realizes the full settling-of-a-prompt-with-a-Claude as
// Yoneda + Curry-Howard-Lambek would have it: the morphism IS its hom-
// functor; the morphism IS the input-output pair under the standards-
// conformant chain. The structural-settling halves at each end use only
// math (Knaster-Tarski lfp under monotone markup-morphisms) and standards
// (HTML5, JSON Schema 2020-12, ECMA-262 regex, ISO-8601, POSIX). The
// semantic middle is the model boundary; the stub at sending-to-claude
// is replaceable with a real API call without changing the contract.

import sendingAPrompt from '#sending-a-prompt/scripts/sending-a-prompt.mjs';
import sendingToClaude from '#sending-to-claude/scripts/sending-to-claude.mjs';
import receivingAResponse from '#receiving-a-response/scripts/receiving-a-response.mjs';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

export default function settlingATurn(input) {
  if (!input) throw new TypeError('settling-a-turn: input required');
  const { text, sender, t } = input;
  if (typeof text !== 'string') throw new TypeError('settling-a-turn: text must be a string');
  if (typeof sender !== 'string') throw new TypeError('settling-a-turn: sender must be a string');
  if (typeof t !== 'string') throw new TypeError('settling-a-turn: t must be an ISO-8601 string');

  // 1. Structural settling of the user prompt.
  const { html: promptHtml, iterations: promptIterations } = sendingAPrompt({ text, sender, t });

  // 2. Semantic settling (model inference; stubbed).
  const responseRaw = sendingToClaude({ promptHtml });

  // 3. Structural settling of the claude response.
  const { html: responseHtml, iterations: responseIterations } = receivingAResponse({
    text: responseRaw.text,
    sender: 'claude',
    t: responseRaw.t,
    inResponseTo: { t, sender },
  });

  return {
    promptHtml,
    responseHtml,
    promptText: text,
    responseText: responseRaw.text,
    'prompt-iterations': promptIterations,
    'response-iterations': responseIterations,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolvePath(process.argv[1])) {
  const result = settlingATurn({
    text: 'Hello (a test). STOP doing that. Visit https://example.com — and see ```code``` end.',
    sender: 'emsenn',
    t: new Date().toISOString(),
  });
  console.log('=== PROMPT (SHM) ===\n');
  console.log(result.promptHtml);
  console.log('\n=== RESPONSE (SHM) ===\n');
  console.log(result.responseHtml);
}
