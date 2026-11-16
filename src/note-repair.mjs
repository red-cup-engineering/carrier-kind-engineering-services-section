/**
 * Repair plans for a note's frontmatter: the edits that bring it toward the note schema, each
 * derived from what the note already says, never invented. The fold step applies them
 * byte-preserving and revision-guarded; this module only plans.
 * @packageDocumentation
 */
import { measureMarkdownDatePath } from "@red-cup-engineering/markdown-engineering-services-section/measure-markdown-date-path";

/** A keyword as the term schema spells it: lower-case words joined by hyphens. */
export function kebabKeyword(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/gu, '$1-$2')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
}

/** The date a note's own path or file name states, if it states one. */
export function datedPathOf(path) {
  const segments = path.split('/');
  for (let take = 4; take >= 2; take -= 1) {
    const measured = measureMarkdownDatePath(segments.slice(-take).join('/'));
    if (measured.observation?.precision === 'day') return measured.observation.date;
  }
  return segments.at(-1).match(/^(\d{4}-\d{2}-\d{2})[-_ ]/u)?.[1] ?? null;
}

function plainText(markdown) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, '$1')
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/gu, '$2')
    .replace(/\[@[^\]]*\]/gu, '')
    .replace(/[*_`]+/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/** The note's first heading, else its file name read as words. */
export function titleOf(path, body) {
  const heading = body.match(/^#\s+(.+?)\s*#*\s*$/mu)?.[1];
  if (heading) return plainText(heading);
  const stem = path.split('/').at(-1).replace(/\.(?:md|markdown)$/iu, '').replace(/^\d{4}-\d{2}-\d{2}[-_ ]?(?:\d{4}h?[-_ ])?/u, '').replace(/--\d+$/u, '');
  const words = stem.replace(/[-_]+/gu, ' ').trim();
  return words ? words[0].toUpperCase() + words.slice(1) : null;
}

/** The first sentence of the note's first prose paragraph, at most `limit` characters. */
export function descriptionOf(body, limit = 240) {
  for (const block of body.split(/\n\s*\n/u)) {
    const trimmed = block.trim();
    if (!trimmed || /^(#|```|~~~|>|\||- |\* |\d+\. |<|!\[|---|\$\$|:[A-Za-z]+:|\[\[)/u.test(trimmed) || /^:PROPERTIES:|^#\+/mu.test(trimmed)) continue;
    const text = plainText(trimmed);
    if (text.length < 40) continue;
    const sentence = text.match(/^.+?[.!?](?=\s|$)/u)?.[0] ?? text;
    return sentence.length <= limit ? sentence : `${sentence.slice(0, limit - 1).replace(/\s+\S*$/u, '')}…`;
  }
  return null;
}

/**
 * Suggest only additive metadata directly supported by the note. Preserve
 * every authored field, including inadmissible values and reference records.
 * A path date, generic date, or first custody observation does not establish
 * when the note was first written. Leave date-created for the source owner
 * to establish from authorship evidence, and leave unresolved admission
 * findings visible instead of deleting citation or retrieval evidence.
 *
 * @returns {{ set: Record<string, unknown>, remove: readonly string[] }}
 */
export function planNoteFrontmatterRepair({ path, frontmatter = {}, body }) {
  const set = {};
  if (!Object.hasOwn(frontmatter, "title")) {
    const title = (typeof frontmatter.name === "string" && frontmatter.name.trim()) || titleOf(path, body);
    if (title) set.title = title;
  }
  if (!Object.hasOwn(frontmatter, "description")) {
    const description = (typeof frontmatter.summary === "string" && frontmatter.summary.trim()) || descriptionOf(body);
    if (description) set.description = description;
  }
  return Object.freeze({ set: Object.freeze(set), remove: Object.freeze([]) });
}
