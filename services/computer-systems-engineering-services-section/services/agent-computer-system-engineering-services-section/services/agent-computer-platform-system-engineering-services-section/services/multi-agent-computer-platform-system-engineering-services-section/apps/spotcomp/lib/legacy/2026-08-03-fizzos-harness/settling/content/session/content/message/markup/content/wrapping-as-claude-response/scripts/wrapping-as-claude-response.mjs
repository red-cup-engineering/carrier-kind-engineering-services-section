// wrapping-as-claude-response — wraps an HTML body in <article class="wrapping-as-claude-response">
// carrying data-sender, data-t, and (when known) data-in-response-to-t / data-in-response-to-sender.

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function wrappingAsClaudeResponse(input) {
  const { html, sender = 'claude', t, inResponseTo } = input;
  if (html.includes('class="wrapping-as-claude-response"')) {
    return { html, novel: false };
  }
  if (typeof t !== 'string') {
    return { html, novel: false };
  }
  let attrs = `data-sender="${escapeAttr(sender)}" data-t="${escapeAttr(t)}"`;
  if (inResponseTo && typeof inResponseTo === 'object') {
    if (inResponseTo.t) attrs += ` data-in-response-to-t="${escapeAttr(inResponseTo.t)}"`;
    if (inResponseTo.sender) attrs += ` data-in-response-to-sender="${escapeAttr(inResponseTo.sender)}"`;
  }
  const wrapped = `<article class="wrapping-as-claude-response" ${attrs}>\n${html}\n</article>`;
  return { html: wrapped, novel: true };
}
