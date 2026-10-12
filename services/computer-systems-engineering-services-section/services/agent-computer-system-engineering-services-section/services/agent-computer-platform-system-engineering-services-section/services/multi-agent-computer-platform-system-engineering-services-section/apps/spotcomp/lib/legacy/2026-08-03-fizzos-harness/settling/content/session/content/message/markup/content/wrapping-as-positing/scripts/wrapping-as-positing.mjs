// wrapping-as-positing — explicit cell-positing markup, invoked by chains that have
// {s, p, o} structured input. Cannot be auto-derived from prose without NLP/inference;
// this is the constructor morphism applied when the cell is already known.

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default function wrappingAsPositing(input) {
  const { html, s, p, o } = input;
  if (s === undefined || p === undefined || o === undefined) {
    return { html, novel: false };
  }
  const wrapped = `<span class="wrapping-as-positing" data-s="${escapeAttr(s)}" data-p="${escapeAttr(p)}" data-o="${escapeAttr(o)}">${html}</span>`;
  return { html: wrapped, novel: true };
}
