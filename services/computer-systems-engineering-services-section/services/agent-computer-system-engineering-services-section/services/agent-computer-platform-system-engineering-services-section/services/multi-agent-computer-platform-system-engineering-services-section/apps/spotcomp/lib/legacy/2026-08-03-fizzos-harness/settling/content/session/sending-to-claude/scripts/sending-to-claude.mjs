// sending-to-claude — the model-inference boundary morphism.
//
// Input:  { promptHtml: SHM-marked user prompt, t?: ISO-8601 }
// Output: { text: raw claude response text, t: ISO-8601 }
//
// This morphism IS the boundary between the structural-settling half (the
// markup-morphisms and chain morphisms in this directory) and the semantic-
// settling half (Claude's model inference). In real use it would dispatch
// the SHM-marked prompt to the Claude API and receive the response text;
// here it is a deterministic stub for testing the pipeline end-to-end.
//
// The stub preserves the property that the pipeline's contract holds: any
// concrete instantiation (this stub OR a real API call) takes promptHtml
// and returns text + t. The composing chain (settling-a-turn) does not
// distinguish between them.

function extractText(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default function sendingToClaude(input) {
  if (!input || typeof input.promptHtml !== 'string') {
    throw new TypeError('sending-to-claude: input.promptHtml required (string)');
  }
  const t = input.t || new Date().toISOString();
  const promptText = extractText(input.promptHtml);
  const preview = promptText.length > 120 ? promptText.substring(0, 120) + '…' : promptText;

  // Stub: acknowledge the prompt structurally. A real Claude API call would
  // produce semantic content here. The placeholder includes parentheticals
  // and a URL so receiving-a-response demonstrably fires markup-morphisms.
  const responseText =
    `Acknowledged (prompt received and structurally settled). ` +
    `The prompt's plain-text content: "${preview}". ` +
    `A real model inference would now produce semantic content; this stub returns the ` +
    `placeholder. See https://561.claude/ns/sending-to-claude for the morphism contract.`;

  return { text: responseText, t };
}
