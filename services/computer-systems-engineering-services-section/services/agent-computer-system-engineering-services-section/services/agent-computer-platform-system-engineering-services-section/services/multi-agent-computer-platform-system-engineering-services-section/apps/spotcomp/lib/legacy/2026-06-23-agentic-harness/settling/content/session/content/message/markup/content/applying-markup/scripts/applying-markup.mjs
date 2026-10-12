// applying-markup — interpretation layer firing markup-morphisms to Knaster-Tarski lfp.
//
// Math: Knaster-Tarski (Tarski 1955). Markup-morphisms are monotone (each only
// ADDS spans, never removes); the HTML strings form a poset under the subsumes-by-
// wrapping relation; the lfp is reached when no morphism produces novel output.
//
// Standards: HTML5 syntax for span/article/pre elements; regex (ECMA-262) for
// text-node matching; UTF-8 strings.

// applyMarkupInTextNodes — the shared utility every markup-morphism uses.
//
// Walks the HTML; when in plain text outside protected elements, runs the regex
// and wraps each match in a span of the given class. When inside a protected
// element (<pre>, <code>, <script>, <style>) or inside an element of the same
// own-class, skips to the matching closing tag.
//
// Idempotency: after one application, every regex match is wrapped in
// <span class="ownClass">; the next iteration skips those spans entirely and
// finds no new matches outside them.
export function applyMarkupInTextNodes(html, ownClass, regex, wrapAs) {
  let result = '';
  let i = 0;
  const PROTECTED_TAGS = new Set(['pre', 'code', 'script', 'style']);

  while (i < html.length) {
    if (html[i] === '<') {
      const closeAngle = html.indexOf('>', i);
      if (closeAngle === -1) { result += html.substring(i); break; }
      const tag = html.substring(i, closeAngle + 1);
      result += tag;
      i = closeAngle + 1;

      if (!tag.startsWith('</') && !tag.endsWith('/>')) {
        const tagNameMatch = /^<(\w+)/.exec(tag);
        const tagName = tagNameMatch ? tagNameMatch[1].toLowerCase() : '';
        const classMatch = /\sclass="([^"]+)"/.exec(tag);
        const classes = classMatch ? classMatch[1].split(/\s+/) : [];

        const isProtectedTag = PROTECTED_TAGS.has(tagName);
        const isOwnClass = classes.includes(ownClass);

        if (isProtectedTag || isOwnClass) {
          const closer = `</${tagName}>`;
          const closeIdx = html.indexOf(closer, i);
          if (closeIdx === -1) { result += html.substring(i); break; }
          result += html.substring(i, closeIdx + closer.length);
          i = closeIdx + closer.length;
        }
      }
    } else {
      const nextTag = html.indexOf('<', i);
      const textEnd = nextTag === -1 ? html.length : nextTag;
      const textChunk = html.substring(i, textEnd);
      const marked = textChunk.replace(regex, (match) =>
        `<span class="${wrapAs}">${match}</span>`);
      result += marked;
      i = textEnd;
    }
  }

  return result;
}

// applyingMarkup — fire markup-morphisms to least fixed point.
// Input: { html, morphisms: [function], context?, max-iterations? }
// Output: { html, iterations }
export default function applyingMarkup(input) {
  const html = input.html;
  const morphisms = input.morphisms || [];
  const context = input.context || {};
  const maxIterations = input['max-iterations'] || 100;

  let current = html;
  for (let i = 0; i < maxIterations; i++) {
    let novel = false;
    for (const m of morphisms) {
      const result = m({ html: current, ...context });
      if (result && result.html !== current) {
        current = result.html;
        novel = true;
      }
    }
    if (!novel) return { html: current, iterations: i };
  }
  throw new Error(`applying-markup: did not converge after ${maxIterations} iterations`);
}
