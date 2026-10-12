// marking-up-code-blocks — wraps triple-backtick fenced code blocks in <pre>.
// <pre> is one of the protected tags applyMarkupInTextNodes skips, so other
// markup-morphisms won't process the code block's content. This morphism must
// run early in the chain (before content-marking morphisms).

const REGEX = /```([\s\S]*?)```/g;
const CLASS = 'marking-up-code-blocks';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function markingUpCodeBlocks(input) {
  const { html } = input;
  if (html.includes('class="marking-up-code-blocks"')) {
    return { html, novel: false };
  }
  const result = html.replace(REGEX, (match, content) =>
    `<pre class="marking-up-code-blocks">${escapeHtml(content)}</pre>`);
  return { html: result, novel: result !== html };
}
