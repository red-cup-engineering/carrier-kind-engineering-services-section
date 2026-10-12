// wrapping-as-user-prompt — wraps an HTML body in <article class="wrapping-as-user-prompt">
// carrying data-sender and data-t. The article element is the top-level carrier of the
// user-prompt; its contents are the sub-carrier-structure of all the marked-up elements
// the inner markup-morphisms produce.
//
// class = morphism (wrapping-as-user-prompt); data-* = input carrier-elements (sender, t);
// contents = output carrier-structure (the marked-up body).

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function wrappingAsUserPrompt(input) {
  const { html, sender, t } = input;
  if (html.includes('class="wrapping-as-user-prompt"')) {
    return { html, novel: false };
  }
  if (typeof sender !== 'string' || typeof t !== 'string') {
    return { html, novel: false };
  }
  const wrapped = `<article class="wrapping-as-user-prompt" data-sender="${escapeAttr(sender)}" data-t="${escapeAttr(t)}">\n${html}\n</article>`;
  return { html: wrapped, novel: true };
}
