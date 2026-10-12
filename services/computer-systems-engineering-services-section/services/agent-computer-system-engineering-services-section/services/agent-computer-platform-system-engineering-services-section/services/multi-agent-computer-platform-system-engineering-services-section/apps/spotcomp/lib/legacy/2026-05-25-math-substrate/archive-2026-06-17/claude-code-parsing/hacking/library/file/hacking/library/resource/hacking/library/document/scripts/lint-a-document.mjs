import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/lint-a-document.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput = ajv.compile(INPUT_SCHEMA);

// Citation discipline per markdown-document spec §7.1:
// - The ONLY legitimate in-body citation form is bare @citekey.
// - All bracketed forms — [@key], [@k1; @k2], [@k, p. 12], [-@key], [@k {.nocite}],
//   [@key](url) — are forbidden and MUST be flagged.

// Bare @citekey: an @ that is NOT preceded by [, @, or a word character, followed by
// a citekey matching the spec pattern. Word-boundary terminator.
const BARE_CITE_RE = /(?<![@[\w])@([a-z][a-z0-9]*\d{4}[a-z]?)\b/g;

// Any [@…] form (single-key, multi-key, locator, suppress-author, nocite, link-wrapped).
// Once an open-bracket-and-@ are seen, the bracketed group is forbidden by §7.1
// regardless of inner content.
const FORBIDDEN_BRACKETED_CITE_RE = /\[\s*-?@[a-z][a-z0-9]*[^\]]*\]/g;

// Bracketed author-year citation: [Author YYYY] / [Author and Other YYYY] / etc.
const FORBIDDEN_BRACKETED_AUTHOR_RE = /\[([A-Z][A-Za-z'’.\-]+(?:\s+(?:and|&|et\s+al\.?)\s+[A-Z][A-Za-z'’.\-]+)?(?:\s+[A-Z][A-Za-z'’.\-]+)?)\s+(\d{4}[a-z]?)\]/g;

// Parenthetical author-year citation: (Author YYYY).
const FORBIDDEN_PAREN_AUTHOR_RE = /\(([A-Z][A-Za-z'’.\-]+(?:\s+(?:and|&|et\s+al\.?)\s+[A-Z][A-Za-z'’.\-]+)?(?:\s+[A-Z][A-Za-z'’.\-]+)?)\s+(\d{4}[a-z]?)\)/g;

const FORBIDDEN_HEADINGS = [
  /^references$/i,
  /^bibliography$/i,
  /^sources$/i,
  /^sources\s+read$/i,
  /^sources\s+cited(\s+.*)?$/i,
  /^works\s+cited$/i,
  /^citations$/i
];

// Citekey pattern per markdown-document spec §6.5: surnameYYYY with optional
// single trailing lowercase disambiguator. No hyphens permitted.
const CITEKEY_FORMAT_RE = /^[a-z][a-z0-9]*\d{4}[a-z]?$/;

// Build a mask of body positions that are inside code blocks or inline code spans;
// citation rules don't apply inside code.
const buildMask = (body) => {
  const mask = new Uint8Array(body.length);
  const lines = body.split('\n');
  let inFence = false;
  let fenceMarker = '';
  let cursor = 0;
  for (const line of lines) {
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    let toggled = false;
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) { inFence = true; fenceMarker = marker; toggled = true; }
      else if (marker === fenceMarker) { inFence = false; fenceMarker = ''; toggled = true; }
    }
    const lineLen = line.length;
    if (inFence || (toggled && fenceMarker === '')) {
      for (let i = 0; i < lineLen; i++) mask[cursor + i] = 1;
    }
    cursor += lineLen + 1;
  }
  let inInline = false;
  for (let i = 0; i < body.length; i++) {
    if (mask[i]) { inInline = false; continue; }
    if (body[i] === '`') { inInline = !inInline; mask[i] = 1; continue; }
    if (inInline) mask[i] = 1;
    if (body[i] === '\n') inInline = false;
  }
  return mask;
};

const isMasked = (mask, start, end) => {
  for (let i = start; i < end; i++) if (mask[i]) return true;
  return false;
};

const lineOf = (body, index) => {
  let line = 1;
  for (let i = 0; i < index && i < body.length; i++) if (body[i] === '\n') line++;
  return line;
};

const lintBody = (body, refKeys) => {
  const hits = [];
  const mask = buildMask(body);
  let m;

  // §7.1: forbidden bracketed @citekey forms (any [@...] is non-conformant).
  FORBIDDEN_BRACKETED_CITE_RE.lastIndex = 0;
  while ((m = FORBIDDEN_BRACKETED_CITE_RE.exec(body)) !== null) {
    const start = m.index, end = m.index + m[0].length;
    if (isMasked(mask, start, end)) continue;
    hits.push({
      rule: 'forbidden-bracketed-citation',
      severity: 'error',
      message: 'bracketed citation forms are forbidden by markdown-document §7.1; use bare @citekey',
      line: lineOf(body, start),
      match: m[0]
    });
  }

  // §7.1: forbidden bracketed author-year (e.g., [Author 1977]).
  FORBIDDEN_BRACKETED_AUTHOR_RE.lastIndex = 0;
  while ((m = FORBIDDEN_BRACKETED_AUTHOR_RE.exec(body)) !== null) {
    const start = m.index, end = m.index + m[0].length;
    if (isMasked(mask, start, end)) continue;
    hits.push({
      rule: 'forbidden-bracketed-author-year',
      severity: 'error',
      message: 'bracketed author-year citation is forbidden by markdown-document §7.1; convert to bare @citekey and add a references entry',
      line: lineOf(body, start),
      match: m[0]
    });
  }

  // §7.1: forbidden parenthetical author-year (e.g., (Author 1977)).
  FORBIDDEN_PAREN_AUTHOR_RE.lastIndex = 0;
  while ((m = FORBIDDEN_PAREN_AUTHOR_RE.exec(body)) !== null) {
    const start = m.index, end = m.index + m[0].length;
    if (isMasked(mask, start, end)) continue;
    hits.push({
      rule: 'forbidden-parenthetical-author-year',
      severity: 'error',
      message: 'parenthetical author-year citation is forbidden by markdown-document §7.1; convert to bare @citekey and add a references entry',
      line: lineOf(body, start),
      match: m[0]
    });
  }

  // §7.2: every bare @citekey marker must resolve to a references entry's id.
  BARE_CITE_RE.lastIndex = 0;
  while ((m = BARE_CITE_RE.exec(body)) !== null) {
    const start = m.index, end = m.index + m[0].length;
    if (isMasked(mask, start, end)) continue;
    if (!refKeys.has(m[1])) {
      hits.push({
        rule: 'unresolved-citekey',
        severity: 'error',
        message: `citekey @${m[1]} does not appear as an id in frontmatter.references (markdown-document §7.2)`,
        line: lineOf(body, start),
        match: m[0],
        citekey: m[1]
      });
    }
  }

  // §7.7: forbidden bibliography headings.
  const lines = body.split('\n');
  let inFence = false;
  let fenceMarker = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) { inFence = true; fenceMarker = marker; }
      else if (marker === fenceMarker) { inFence = false; fenceMarker = ''; }
      continue;
    }
    if (inFence) continue;
    const hMatch = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!hMatch) continue;
    const text = hMatch[2].trim();
    for (const re of FORBIDDEN_HEADINGS) {
      if (re.test(text)) {
        hits.push({
          rule: 'forbidden-bibliography-heading',
          severity: 'error',
          message: 'body bibliography section is forbidden by markdown-document §7.7; the bibliography is renderer output from frontmatter references',
          line: i + 1,
          match: line.trim()
        });
        break;
      }
    }
  }

  return hits;
};

const isValidCslName = (name) => {
  if (typeof name !== 'object' || name === null) return false;
  if (typeof name.family === 'string' && name.family.length > 0) return true;
  if (typeof name.literal === 'string' && name.literal.length > 0) return true;
  return false;
};

const lintFrontmatter = (frontmatter) => {
  const hits = [];
  const references = frontmatter?.references;
  if (references === undefined) return hits;

  // §6: references when present is a CSL-JSON array.
  if (!Array.isArray(references)) {
    hits.push({
      rule: 'references-shape',
      severity: 'error',
      message: 'frontmatter.references must be an array of CSL-JSON entries (markdown-document §6.1)'
    });
    return hits;
  }

  const seenIds = new Set();
  let prevId = null;
  let outOfOrder = false;
  let duplicateId = null;

  for (let i = 0; i < references.length; i++) {
    const entry = references[i];
    if (typeof entry !== 'object' || entry === null) {
      hits.push({
        rule: 'reference-entry-shape',
        severity: 'error',
        message: `references[${i}] must be an object (CSL-JSON entry)`,
        index: i
      });
      continue;
    }

    // §6.5: citekey (entry.id) pattern.
    const id = entry.id;
    if (typeof id !== 'string' || id.length === 0) {
      hits.push({
        rule: 'reference-id-missing',
        severity: 'error',
        message: `references[${i}] is missing required string field "id"`,
        index: i
      });
      continue;
    }
    if (!CITEKEY_FORMAT_RE.test(id)) {
      hits.push({
        rule: 'citekey-format',
        severity: 'error',
        message: `citekey ${JSON.stringify(id)} does not match the spec pattern ^[a-z][a-z0-9]*\\d{4}[a-z]?$ (markdown-document §6.5)`,
        index: i,
        citekey: id
      });
    }

    // §6.7: ids unique within the document.
    if (seenIds.has(id)) {
      duplicateId = id;
      hits.push({
        rule: 'citekey-duplicate',
        severity: 'error',
        message: `citekey ${JSON.stringify(id)} appears more than once in references (markdown-document §6.7)`,
        index: i,
        citekey: id
      });
    } else {
      seenIds.add(id);
    }

    // §6.6: references sorted by id ASCII order.
    if (prevId !== null && id < prevId) outOfOrder = true;
    prevId = id;

    // §6.4: author (and editor) entries are CSL name objects.
    for (const role of ['author', 'editor', 'translator']) {
      const list = entry[role];
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        hits.push({
          rule: `${role}-shape`,
          severity: 'error',
          message: `references[${i}].${role} must be an array of CSL name objects {family, given}|{literal} (markdown-document §6.3, §6.4)`,
          index: i,
          citekey: id
        });
        continue;
      }
      for (let j = 0; j < list.length; j++) {
        if (!isValidCslName(list[j])) {
          hits.push({
            rule: `${role}-format`,
            severity: 'error',
            message: `references[${i}].${role}[${j}] is not a valid CSL name object — expected {family, given}|{literal}; got ${JSON.stringify(list[j])} (markdown-document §6.3)`,
            index: i,
            citekey: id
          });
        }
      }
    }

    // §6.8: URL implies accessed.
    if (typeof entry.URL === 'string' && entry.accessed === undefined) {
      hits.push({
        rule: 'naked-url',
        severity: 'error',
        message: `references[${i}] has URL without accessed date (markdown-document §6.8)`,
        index: i,
        citekey: id
      });
    }
  }

  if (outOfOrder) {
    hits.push({
      rule: 'references-sort-order',
      severity: 'error',
      message: 'references must be sorted by id in ASCII order (markdown-document §6.6)'
    });
  }

  return hits;
};

export default function lintADocument(input) {
  if (!validateInput(input)) {
    throw new TypeError(`lint-a-document: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { document } = input;
  const frontmatter = document.frontmatter ?? {};
  const body = document.body ?? '';
  const references = Array.isArray(frontmatter.references) ? frontmatter.references : [];
  const refKeys = new Set(
    references
      .filter((e) => typeof e === 'object' && e !== null && typeof e.id === 'string')
      .map((e) => e.id)
  );
  const findings = [...lintFrontmatter(frontmatter), ...lintBody(body, refKeys)];
  return Object.freeze({ findings: Object.freeze(findings.map((f) => Object.freeze(f))) });
}
