/**
 * html -- the two escaping gates for the two wire contexts this package writes into the page head.
 * A meta value crosses *attribute* escaping (WHATWG HTML, "serializing HTML fragments": & < > " are
 * escaped; the single quote too, for single-quoted consumers). A JSON-LD block crosses *script data*
 * escaping: `<`, `>`, `&`, U+2028 and U+2029 become \uXXXX escapes, so the JSON can never close its own
 * `</script>` or open a `<!--` (the script data state), and it still parses as the same JSON.
 */
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape an attribute value. */
export const escapeAttr = (value) => (value === null || value === undefined ? "" : String(value).replace(/[&<>"']/gu, (c) => ENTITIES[c]));

/** Make JSON text safe inside a `<script>` element without changing what it parses to. */
export const escapeScriptJson = (jsonText) => String(jsonText)
  .replace(/</gu, "\\u003c").replace(/>/gu, "\\u003e").replace(/&/gu, "\\u0026").replace(/\u2028/gu, "\\u2028").replace(/\u2029/gu, "\\u2029");

/** A `<meta>` element, or "" when the content is empty. */
export function metaTag(keyAttribute, key, content) {
  if (content === null || content === undefined || content === "") return "";
  return `<meta ${keyAttribute}="${escapeAttr(key)}" content="${escapeAttr(content)}">`;
}

/** Whether `value` is an absolute URL. */
export function isAbsoluteUrl(value) {
  if (typeof value !== "string" || value === "") return false;
  try { return Boolean(new URL(value).protocol); } catch { return false; }
}
