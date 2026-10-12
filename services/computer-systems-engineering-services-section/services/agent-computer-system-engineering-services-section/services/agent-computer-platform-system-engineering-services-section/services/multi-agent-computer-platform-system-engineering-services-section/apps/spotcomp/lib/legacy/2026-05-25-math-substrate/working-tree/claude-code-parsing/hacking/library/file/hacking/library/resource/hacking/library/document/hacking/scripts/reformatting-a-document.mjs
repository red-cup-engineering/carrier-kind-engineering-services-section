// reformatting-a-document
// Lifts an ad-hoc body ## References / ## Bibliography / ## Sources section
// into the document's frontmatter.references map (citations.md §5.1), strips
// the section, and rewrites detectable inline (Author YYYY) / Author (YYYY)
// citations to [@citekey]. Best-effort parser; unparsable entries are left
// in place and reported in findings.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const loadSchema = (alias) =>
  JSON.parse(readFileSync(fileURLToPath(import.meta.resolve(alias)), 'utf8'));

const INPUT_SCHEMA = loadSchema('#scripts/reformatting-a-document.schema.json');

const ajv = new Ajv2020({ strict: false, allowUnionTypes: true });
(addFormats.default ?? addFormats)(ajv);
const validateInput = ajv.compile(INPUT_SCHEMA);

const FORBIDDEN_HEADING_RE = /^(#{1,6})\s+(References|Bibliography|Sources|Sources\s+Read|Sources\s+Cited(\s+.*)?|Works\s+Cited|Citations)\s*#*\s*$/i;

const surnameOf = (author) => {
  const head = author.split(',')[0];
  return head
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s'.\-]/g, '');
};

const givenFirstToSurnameFirst = (name) => {
  // Preserve trailing initial periods ("M. L." stays "M. L.").
  const trimmed = name.trim();
  if (trimmed.includes(',')) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return trimmed;
  const surname = parts.pop();
  return `${surname}, ${parts.join(' ')}`;
};

const parseAuthors = (blob) => {
  // Strip only trailing whitespace/commas — NOT trailing periods (initials like "D.").
  const clean = blob.replace(/[,\s]+$/, '').trim().replace(/\s+&\s+/g, ' and ');
  const lastAndMatch = clean.match(/^(.*?),?\s+and\s+(.+)$/);
  let head = clean;
  let lastAuthor = null;
  if (lastAndMatch) {
    head = lastAndMatch[1];
    lastAuthor = lastAndMatch[2];
  }
  const tokens = head.split(/,\s*/).filter((t) => t.length > 0);
  const authors = [];
  if (tokens.length >= 2) {
    authors.push(`${tokens[0]}, ${tokens[1]}`);
    for (let i = 2; i < tokens.length; i++) authors.push(givenFirstToSurnameFirst(tokens[i]));
  } else if (tokens.length === 1) {
    authors.push(tokens[0]);
  }
  if (lastAuthor) authors.push(givenFirstToSurnameFirst(lastAuthor));
  return authors;
};

const makeCitekey = (authors, year, taken) => {
  const surnames = authors.map(surnameOf).filter((s) => s.length > 0);
  let base;
  if (surnames.length === 0) base = `unknown${year}`;
  else if (surnames.length === 1) base = `${surnames[0]}${year}`;
  else if (surnames.length === 2) base = `${surnames[0]}-${surnames[1]}${year}`;
  else base = `${surnames[0]}-et-al${year}`;
  if (!taken.has(base)) return base;
  for (const suffix of 'abcdefghijklmnopqrstuvwxyz') {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`reformatting-a-document: too many citekey collisions on ${base}`);
};

const stripWrappingPunctuation = (s) => s.replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
const passesConfidence = (entryConf, minConf) =>
  CONFIDENCE_RANK[entryConf] >= CONFIDENCE_RANK[minConf];

// ----- T2 landmark scanner -----

// Tag spans in an entry by category, with positions. Output is the structural
// skeleton the style classifier and per-style extractors operate on; no
// decisions are made here, just position-tagging. Adding a new landmark kind
// is one new regex + one collect call.

const collectMatches = (text, re, mapper) => {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push(mapper(m));
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width
  }
  return out;
};

const scanLandmarks = (text) => {
  // Years — (1977), (1980a), (1980 [1969]) bracketed historical-edition
  const years = collectMatches(text, /\((\d{4}[a-z]?)(?:\s*\[(\d{4}[a-z]?)\])?\)/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[1],
    bracketed: m[2] ?? null
  }));

  // Non-year parenthesized year-slot values: (current), (latest), (n.d.)
  const yearPlaceholders = collectMatches(text, /\((current|latest|n\.d\.|forthcoming|in press)\)/gi, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[1].toLowerCase()
  }));

  // Quoted titles — straight quotes, curly quotes
  const quotedTitles = collectMatches(text, /"([^"]+?)\.?"|"([^"]+?)\.?"/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: (m[1] ?? m[2]).trim()
  }));

  // Italic spans — *...* or _..._
  const italicSpans = collectMatches(text, /\*([^*\n]+?)\*|_([^_\n]+?)_/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: (m[1] ?? m[2]).trim()
  }));

  // URLs
  const urls = collectMatches(text, /https?:\/\/[^\s)"'<>]+/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[0]
  }));

  // DOIs
  const dois = collectMatches(text, /10\.\d{4,9}\/[^\s)"'<>]+/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[0]
  }));

  // arXiv IDs — both new-style (1234.56789) and old-style (cs/0507069)
  const arxivIds = collectMatches(text, /arXiv:(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+\/\d{7}(?:v\d+)?)/gi, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[1]
  }));

  // ISBNs (rough — accept 10 or 13 digits with optional hyphens / X check)
  const isbns = collectMatches(text, /\bISBN[\s-]?:?\s*((?:97[89][-\s]?)?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?[\dX])\b/gi, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[1].replace(/[-\s]/g, '')
  }));

  // Standards markers — RFC, BCP, IEEE Std, ISO, WHATWG, W3C
  const standardsMarkers = [];
  for (const [kind, re] of [
    ['rfc', /\bRFC\s+(\d+)\b/g],
    ['bcp', /\bBCP\s+(\d+)\b/g],
    ['ieee', /\bIEEE\s+Std\s+([\d.\-:]+)/g],
    ['iso', /\bISO[\s/]+(\d+(?::\d+)?)\b/g],
    ['whatwg', /\bWHATWG\b/g],
    ['w3c', /\bW3C\b/g],
    ['ietf', /\bIETF\b/g]
  ]) {
    for (const m of collectMatches(text, re, (mm) => mm)) {
      standardsMarkers.push({
        kind,
        start: m.index,
        end: m.index + m[0].length,
        raw: m[0],
        value: m[1] ?? null
      });
    }
  }
  standardsMarkers.sort((a, b) => a.start - b.start);

  // Editor markers — (eds.), (ed.), edited by
  const editorMarkers = collectMatches(text, /\(eds?\.\)|edited\s+by/gi, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0]
  }));

  // Page ranges — "5-37", "91–116", "pp. 12-15"
  const pageRanges = collectMatches(text, /(?:pp?\.\s*)?(\d+\s*[-–—]\s*\d+)/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    value: m[1].replace(/[–—]/g, '-').replace(/\s+/g, '')
  }));

  // Volume(Issue): "11(2)", "27(1–2)"
  const volumeIssue = collectMatches(text, /\b(\d+)\((\d+(?:[-–]\d+)?)\)/g, (m) => ({
    start: m.index,
    end: m.index + m[0].length,
    raw: m[0],
    volume: m[1],
    issue: m[2].replace(/[–]/g, '-')
  }));

  return {
    years,
    yearPlaceholders,
    quotedTitles,
    italicSpans,
    urls,
    dois,
    arxivIds,
    isbns,
    standardsMarkers,
    editorMarkers,
    pageRanges,
    volumeIssue
  };
};

// ----- T1 pre-processing: annotation trim + semicolon split -----

// Find the last position of a top-level " — " / " -- " / " – " annotation delimiter
// outside italic-spans and quoted-spans. Returns -1 when no boundary is found.
const findAnnotationBoundary = (text) => {
  let italicOpen = false;
  let quoteOpen = false;
  let lastBoundary = -1;
  for (let i = 0; i < text.length - 2; i++) {
    const c = text[i];
    if (c === '*' && !quoteOpen) { italicOpen = !italicOpen; continue; }
    if ((c === '"' || c === '“' || c === '”') && !italicOpen) { quoteOpen = !quoteOpen; continue; }
    if (italicOpen || quoteOpen) continue;
    // " — " (em dash spaced) or " – " (en dash spaced)
    if (c === ' ' && (text[i + 1] === '—' || text[i + 1] === '–') && text[i + 2] === ' ') {
      lastBoundary = i;
      continue;
    }
    // " -- " (double hyphen spaced)
    if (c === ' ' && text[i + 1] === '-' && text[i + 2] === '-' && text[i + 3] === ' ') {
      lastBoundary = i;
      continue;
    }
  }
  return lastBoundary;
};

// Split a string on a single-character delimiter at top level — outside parens,
// brackets, italic-spans, and quoted-spans. Used to split semicolon-joined
// multi-source entries into their sub-citations.
const splitTopLevel = (text, delimiter) => {
  const parts = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;
  let italicOpen = false;
  let quoteOpen = false;
  for (const c of text) {
    if (c === '(') parenDepth++;
    else if (c === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (c === '[') bracketDepth++;
    else if (c === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (c === '*' && !quoteOpen) italicOpen = !italicOpen;
    else if ((c === '"' || c === '“' || c === '”') && !italicOpen) quoteOpen = !quoteOpen;
    if (c === delimiter && parenDepth === 0 && bracketDepth === 0 && !italicOpen && !quoteOpen) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.length > 0) parts.push(current);
  return parts;
};

// Pre-process one raw entry: trim a trailing annotation, then split on top-level
// semicolons. Annotation is only trimmed when the trailer doesn't itself look
// like a citation continuation (no embedded year).
const preprocessEntry = (raw) => {
  let citation = raw;
  let annotation = null;
  const boundary = findAnnotationBoundary(raw);
  if (boundary >= 0) {
    // Boundary marker is exactly one space + dash + one space; advance past it.
    const trailerStart = boundary + 3;
    const trailer = raw.slice(trailerStart).trim();
    // Only treat trailer as annotation if it doesn't contain an embedded "(YYYY)"
    // (in which case the trailer is itself a citation continuation, not commentary).
    if (!/\(\d{4}[a-z]?\)/.test(trailer)) {
      citation = raw.slice(0, boundary).trim();
      annotation = trailer.replace(/\.\s*$/, '');
    }
  }
  const fragments = splitTopLevel(citation, ';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return { fragments, annotation };
};

// ----- T3 + T4 style-table dispatcher -----
//
// Each style is a config block: { name, targetClass, classify, extract }.
// `classify(ctx)` cheaply tests landmarks; `extract(ctx)` builds the entry
// or returns null. First style whose classify fires and whose extract
// returns a non-null entry wins.
//
// Two shapes are common in the corpus:
//   • Author-Year shape: "Authors (YYYY). Title. container."
//     Styles read ctx.prefix (the result of extractAuthorYearTitle).
//   • Institution-prefix shape: "IEEE Std X-YYYY. *Title.* …"
//     Styles parse ctx.text directly using ctx.landmarks.

// Common prefix extractor for Author-Year-shaped entries.
// Year patterns accepted (canonical year is always the first 4-digit run):
//   (1977), (1977a), (1980 [1969]), (1969, 1972),
//   (1985–1995), (1991–present), (1968–2024), (1991-current)
const YEAR_PAREN_RE = /\(((?:\d{4}[a-z]?)(?:\s*\[\d{4}[a-z]?\]|\s*[-–—]\s*(?:\d{4}[a-z]?|present|current|now)|(?:,\s*\d{4}[a-z]?)+)?)\)/;

const extractAuthorYearTitle = (text) => {
  const yearMatch = text.match(new RegExp(`^(.+?)\\s+${YEAR_PAREN_RE.source}\\.\\s*(.+?)\\s*$`));
  if (!yearMatch) return null;
  const [, authorsBlob, yearBlob, rest] = yearMatch;
  const authors = parseAuthors(authorsBlob);
  if (authors.length === 0) return null;

  // Canonical year is the first 4-digit substring.
  const yearDigits = yearBlob.match(/\d{4}/);
  if (!yearDigits) return null;
  const year = Number.parseInt(yearDigits[0], 10);
  const yearLetterMatch = yearBlob.match(/^\d{4}([a-z])/);
  const yearSuffix = yearLetterMatch ? yearLetterMatch[1] : '';
  // If the year-paren had structure beyond a single year, preserve as a note hint.
  const yearComplex = yearBlob !== `${year}${yearSuffix}`;

  const quoted = rest.match(/^"([^"]+?)\.?"\s*\.?\s*(.*)$/);
  const italic = rest.match(/^\*([^*]+?)\*\.?\s*\.?\s*(.*)$/);
  let title, container, titleStyle;
  if (quoted) { title = quoted[1].trim(); container = quoted[2].trim(); titleStyle = 'quoted'; }
  else if (italic) { title = italic[1].trim(); container = italic[2].trim(); titleStyle = 'italic'; }
  else return null;

  const pagesMatch = container.match(/(?:,\s*|^pp?\.\s*)(\d+(?:[–—-]\d+)?)\s*\.?\s*$/);
  let pages = null;
  if (pagesMatch) {
    pages = pagesMatch[1].replace(/[–—]/g, '-');
    container = container.slice(0, pagesMatch.index).replace(/[,.\s]+$/, '').trim();
  }

  return {
    authors,
    year,
    yearSuffix,
    yearBlob,
    yearComplex,
    title,
    titleStyle,
    container,
    pages
  };
};

const baseEntryFromPrefix = (prefix, extras = {}) => {
  const entry = { authors: prefix.authors, year: prefix.year, title: prefix.title, ...extras };
  if (prefix.pages) entry.pages = prefix.pages;
  return entry;
};

// Confidence levels per style:
//   high   — schema-valid, all expected landmarks present, parse unambiguous.
//   medium — schema-valid, one field defaulted or relaxed (no volume, year-from-now).
//   low    — schema-valid only after substantial defaulting (fallback styles).

const STYLES = [
  {
    // arXiv preprint: detected by `arXiv:` token in the container.
    name: 'arxiv-preprint',
    targetClass: 'preprint',
    confidence: 'high',
    classify: ({ prefix }) => prefix && /arXiv:/i.test(prefix.container),
    extract: ({ prefix }) => {
      const m = prefix.container.match(/arXiv:(\d{4}\.\d{4,5}(?:v\d+)?|[a-z-]+\/\d{7}(?:v\d+)?)/i);
      if (!m) return null;
      return baseEntryFromPrefix(prefix, { repository: 'arXiv', note: m[0] });
    }
  },
  {
    // RFC: Author-Year shape with an RFC marker in the container.
    name: 'rfc',
    targetClass: 'report',
    confidence: 'high',
    classify: ({ prefix, landmarks }) =>
      prefix && landmarks.standardsMarkers.some((s) => s.kind === 'rfc'),
    extract: ({ prefix, landmarks }) => {
      const rfc = landmarks.standardsMarkers.find((s) => s.kind === 'rfc');
      const bcp = landmarks.standardsMarkers.find((s) => s.kind === 'bcp');
      const extras = { institution: 'IETF', series: `RFC ${rfc.value}` };
      if (bcp) extras.note = `BCP ${bcp.value}`;
      return baseEntryFromPrefix(prefix, extras);
    }
  },
  {
    // Chapter: container begins with "In *Book*, ..."
    name: 'chapter',
    targetClass: 'chapter',
    confidence: 'high',
    classify: ({ prefix }) => prefix && /^In\s+\*/.test(prefix.container),
    extract: ({ prefix }) => {
      const m = prefix.container.match(/^In\s+\*([^*]+)\*\s*,?\s*(.*)$/);
      if (!m) return null;
      const entry = baseEntryFromPrefix(prefix, { in: m[1].trim() });
      const tail = m[2].trim().replace(/[.\s]+$/, '');
      if (tail) {
        const editorsMatch = tail.match(/^(.+?)\s*\(eds?\.\),?\s*(.*)$/);
        if (editorsMatch) {
          entry.editors = parseAuthors(editorsMatch[1]);
          const rest = editorsMatch[2].trim().replace(/[.,\s]+$/, '');
          if (rest) {
            const [pub, ...locParts] = rest.split(/,\s*/);
            if (pub) entry.publisher = stripWrappingPunctuation(pub);
            if (locParts.length > 0) entry.location = stripWrappingPunctuation(locParts.join(', '));
          }
        } else {
          const [pub, ...locParts] = tail.split(/,\s*/);
          if (pub) entry.publisher = stripWrappingPunctuation(pub);
          if (locParts.length > 0) entry.location = stripWrappingPunctuation(locParts.join(', '));
        }
      }
      return entry;
    }
  },
  {
    // ISO Author-Year shape: "International Organization for Standardization (2010). ISO NNN — Title."
    name: 'iso-standard-author',
    targetClass: 'report',
    confidence: 'high',
    classify: ({ prefix, landmarks }) =>
      prefix && landmarks.standardsMarkers.some((s) => s.kind === 'iso'),
    extract: ({ prefix, landmarks }) => {
      const iso = landmarks.standardsMarkers.find((s) => s.kind === 'iso');
      return baseEntryFromPrefix(prefix, { institution: 'ISO', series: `ISO ${iso.value}` });
    }
  },
  {
    // Journal article (with volume): container has *Journal* followed by a volume number.
    name: 'journal-article',
    targetClass: 'article',
    confidence: 'high',
    classify: ({ prefix }) => prefix && /^\*[^*]+\*\s*,?\s*\d+/.test(prefix.container),
    extract: ({ prefix }) => {
      const m = prefix.container.match(/^\*([^*]+)\*\s*,?\s*(\d+)?(?:\s*\((\d+(?:[-–]\d+)?)\))?/);
      if (!m || !m[2]) return null;
      const entry = baseEntryFromPrefix(prefix, {
        journal: m[1].trim(),
        volume: Number.parseInt(m[2], 10)
      });
      if (m[3]) entry.issue = m[3].replace(/[–]/g, '-');
      return entry;
    }
  },
  {
    // Journal article (no volume): "*Journal Name*." or "*Journal Name*. Publisher."
    // Quoted title required so we don't shadow italic-title-book.
    name: 'journal-article-no-volume',
    targetClass: 'article',
    confidence: 'medium',
    classify: ({ prefix }) =>
      prefix && prefix.titleStyle === 'quoted' && /^\*[^*]+\*\.?\s*$|^\*[^*]+\*\s*[.,]/.test(prefix.container),
    extract: ({ prefix }) => {
      const m = prefix.container.match(/^\*([^*]+)\*/);
      if (!m) return null;
      return baseEntryFromPrefix(prefix, { journal: m[1].trim() });
    }
  },
  {
    // Italic-title book: title was italic, container is publisher / location.
    name: 'italic-title-book',
    targetClass: 'book',
    confidence: 'high',
    classify: ({ prefix }) => prefix && prefix.titleStyle === 'italic',
    extract: ({ prefix }) => {
      const entry = baseEntryFromPrefix(prefix);
      const cleanContainer = prefix.container.replace(/[.\s]+$/, '');
      if (cleanContainer) {
        const [pub, ...locParts] = cleanContainer.split(/,\s*/);
        if (pub) entry.publisher = stripWrappingPunctuation(pub);
        if (locParts.length > 0) entry.location = stripWrappingPunctuation(locParts.join(', '));
      }
      return entry;
    }
  },
  {
    // Descriptive container: Author-Year + quoted title + free-form container
    // (or empty container). Catches "Cognitect technical documentation",
    // "Lecture, …", "(Updated version.)", title-only entries, etc.
    name: 'descriptive-container',
    targetClass: 'report',
    confidence: 'low',
    classify: ({ prefix }) => prefix && prefix.titleStyle === 'quoted',
    extract: ({ prefix }) => {
      const cleanContainer = prefix.container
        .replace(/^\(|\)\.?$/g, '')
        .replace(/[.\s]+$/, '')
        .trim();
      return baseEntryFromPrefix(prefix, {
        institution: cleanContainer || 'unspecified',
        ...(cleanContainer ? { note: cleanContainer } : {})
      });
    }
  },
  {
    // IEEE standard, institution-prefix shape:
    //   "IEEE Std X-YYYY. *Title.* description."
    //   "IEEE Std X-YYYY (POSIX.1-2017). *Title.*"
    //   "IEEE Std X-YYYY (POSIX.1-2017)."  (no title)
    name: 'ieee-standard',
    targetClass: 'report',
    confidence: 'high',
    classify: ({ text, landmarks }) =>
      /^IEEE\s+Std\s+/.test(text) &&
      landmarks.standardsMarkers.some((s) => s.kind === 'ieee'),
    extract: ({ text }) => {
      const m = text.match(/^IEEE\s+Std\s+([\d.\-:]+)(?:\s*\(([^)]+)\))?\.?\s*(?:\*([^*]+?)\.?\*)?\.?\s*(.*)$/);
      if (!m) return null;
      const stdNum = m[1];
      const alias = m[2] ?? null;
      const title = m[3]?.trim() ?? alias ?? stdNum;
      const yearMatch = stdNum.match(/-(\d{4})/);
      if (!yearMatch) return null;
      const entry = {
        authors: ['Institute of Electrical and Electronics Engineers'],
        year: Number.parseInt(yearMatch[1], 10),
        title,
        institution: 'IEEE',
        series: `IEEE Std ${stdNum}`
      };
      if (alias && m[3]) entry.note = alias;
      return entry;
    }
  },
  {
    // POSIX/alias-as-author shape: "POSIX.1-2017 (IEEE Std 1003.1-2017). \"Title.\""
    // Standards alias appears as the author position with IEEE Std referenced in parens.
    name: 'standards-alias-author',
    targetClass: 'report',
    confidence: 'high',
    classify: ({ text, landmarks }) =>
      /^[A-Z][\w.\-]*\s*\(IEEE\s+Std/.test(text) &&
      landmarks.standardsMarkers.some((s) => s.kind === 'ieee'),
    extract: ({ text }) => {
      const m = text.match(/^([\w.\-]+)\s*\(IEEE\s+Std\s+([\d.\-:]+)\)\.\s*(?:"([^"]+?)\.?"|(?:\*([^*]+?)\.?\*))\.?\s*(.*)$/);
      if (!m) return null;
      const alias = m[1];
      const stdNum = m[2];
      const title = (m[3] ?? m[4])?.trim();
      if (!title) return null;
      const yearMatch = stdNum.match(/-(\d{4})/);
      if (!yearMatch) return null;
      return {
        authors: ['Institute of Electrical and Electronics Engineers'],
        year: Number.parseInt(yearMatch[1], 10),
        title,
        institution: 'IEEE',
        series: `IEEE Std ${stdNum}`,
        note: alias
      };
    }
  },
  {
    // ISO standard, institution-prefix shape: "ISO NNN:YYYY. *Title.* …"
    name: 'iso-standard-prefix',
    targetClass: 'report',
    confidence: 'high',
    classify: ({ text, landmarks }) =>
      /^ISO\s+\d+/.test(text) &&
      landmarks.standardsMarkers.some((s) => s.kind === 'iso'),
    extract: ({ text }) => {
      const m = text.match(/^ISO\s+(\d+(?::\d+)?)\.?\s*\*([^*]+?)\.?\*\.?\s*(.*)$/i);
      if (!m) return null;
      const yearMatch = m[1].match(/:(\d{4})/);
      if (!yearMatch) return null;
      return {
        authors: ['International Organization for Standardization'],
        year: Number.parseInt(yearMatch[1], 10),
        title: m[2].trim(),
        institution: 'ISO',
        series: `ISO ${m[1]}`
      };
    }
  },
  {
    // Living standard (WHATWG / W3C): "WHATWG (current). *Title.* URL"
    name: 'living-standard',
    targetClass: 'online',
    confidence: 'medium',
    classify: ({ landmarks }) =>
      landmarks.urls.length > 0 &&
      landmarks.standardsMarkers.some((s) => s.kind === 'whatwg' || s.kind === 'w3c'),
    extract: ({ landmarks, now }) => {
      const marker = landmarks.standardsMarkers.find((s) => s.kind === 'whatwg' || s.kind === 'w3c');
      const italic = landmarks.italicSpans[0];
      const url = landmarks.urls[0];
      if (!italic || !url) return null;
      const institution = marker.kind === 'whatwg' ? 'WHATWG' : 'W3C';
      const authorName = institution === 'WHATWG' ? 'WHATWG' : 'World Wide Web Consortium';
      return {
        authors: [authorName],
        year: now.getFullYear(),
        title: italic.value.replace(/\.$/, ''),
        url: url.value.replace(/\.$/, ''),
        institution,
        note: 'living standard; year is access year'
      };
    }
  },
  {
    // Corporate-online: "Corp (current). *Title.* URL"
    name: 'corporate-online',
    targetClass: 'online',
    confidence: 'medium',
    classify: ({ landmarks }) =>
      landmarks.yearPlaceholders.length > 0 && landmarks.urls.length > 0,
    extract: ({ text, now }) => {
      const m = text.match(/^(.+?)\s+\((?:current|latest|n\.d\.|forthcoming|in press)\)\.\s*\*([^*]+?)\.?\*\.?\s*(https?:\/\/\S+?)\.?\s*$/i);
      if (!m) return null;
      return {
        authors: [m[1].trim()],
        year: now.getFullYear(),
        title: m[2].trim(),
        url: m[3],
        note: 'living document; year is access year'
      };
    }
  },
  {
    // Free-form source: "Authors (YYYY[-range]). text-without-title."
    // No quoted/italic title — the post-year text becomes the title. Last-
    // resort style for legitimate-but-malformed entries (mailing lists,
    // ongoing series, etc.).
    name: 'free-form-source',
    targetClass: 'report',
    confidence: 'low',
    classify: ({ text }) => YEAR_PAREN_RE.test(text),
    extract: ({ text }) => {
      const m = text.match(new RegExp(`^(.+?)\\s+${YEAR_PAREN_RE.source}\\.\\s*(.+?)\\s*$`));
      if (!m) return null;
      const [, authorsBlob, yearBlob, rest] = m;
      const authors = parseAuthors(authorsBlob);
      if (authors.length === 0) return null;
      const yearDigits = yearBlob.match(/\d{4}/);
      if (!yearDigits) return null;
      const cleanRest = rest.replace(/[.\s]+$/, '').trim();
      if (!cleanRest) return null;
      return {
        authors,
        year: Number.parseInt(yearDigits[0], 10),
        title: cleanRest,
        institution: 'unspecified',
        note: yearBlob !== yearDigits[0] ? `original year-blob: ${yearBlob}` : undefined
      };
    }
  }
];

const parseEntry = (rawText, now = new Date()) => {
  const text = rawText.replace(/\s+/g, ' ').trim();
  const landmarks = scanLandmarks(text);
  const prefix = extractAuthorYearTitle(text);

  const ctx = { text, landmarks, prefix, now };
  for (const style of STYLES) {
    if (!style.classify(ctx)) continue;
    const filled = style.extract(ctx);
    if (filled) {
      if (filled.class == null) filled.class = style.targetClass;
      return finalize(filled, prefix?.yearSuffix ?? '', style.name, style.confidence ?? 'high');
    }
  }

  if (!prefix) {
    if (!/\((\d{4}[a-z]?)\)/.test(text)) {
      return { ok: false, reason: 'no Authors (YYYY). pattern matched', raw: text };
    }
    return { ok: false, reason: 'no quoted or italic title found', raw: text };
  }
  return { ok: false, reason: 'could not determine class from container', raw: text };
};

const finalize = (entry, yearSuffix, styleName = null, confidence = 'high') => {
  // Reorder keys: class, authors, year, title, then everything else.
  const ordered = { class: entry.class, authors: entry.authors, year: entry.year, title: entry.title };
  for (const k of ['journal', 'in', 'repository', 'institution', 'degree', 'editors', 'publisher', 'location', 'edition', 'series', 'volume', 'issue', 'pages', 'url', 'doi', 'isbn', 'note']) {
    if (entry[k] !== undefined) ordered[k] = entry[k];
  }
  return { ok: true, entry: ordered, yearSuffix, style: styleName, confidence };
};

const extractBibliographySection = (body) => {
  const lines = body.split('\n');
  let inFence = false;
  let fenceMarker = '';
  let sectionStart = -1;
  let sectionEnd = lines.length;
  let sectionLevel = 0;
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
    if (sectionStart < 0) {
      const m = line.match(FORBIDDEN_HEADING_RE);
      if (m) {
        sectionStart = i;
        sectionLevel = m[1].length;
      }
    } else {
      const h = line.match(/^(#{1,6})\s+/);
      if (h && h[1].length <= sectionLevel) {
        sectionEnd = i;
        break;
      }
    }
  }
  if (sectionStart < 0) return null;

  // Extract entries from sectionStart+1 .. sectionEnd
  const sectionLines = lines.slice(sectionStart + 1, sectionEnd);
  const entries = [];
  let current = '';
  for (const line of sectionLines) {
    if (line.match(/^\s*-\s+/)) {
      if (current.trim()) entries.push(current.trim());
      current = line.replace(/^\s*-\s+/, '');
    } else if (line.match(/^\s+\S/) && current) {
      current += ' ' + line.trim();
    } else if (line.trim() === '') {
      if (current.trim()) { entries.push(current.trim()); current = ''; }
    } else {
      // unrecognized line — fold into current or skip
      if (current) current += ' ' + line.trim();
    }
  }
  if (current.trim()) entries.push(current.trim());

  // Drop the section from body. Also drop trailing blank lines that precede the heading.
  let newSectionStart = sectionStart;
  while (newSectionStart > 0 && lines[newSectionStart - 1].trim() === '') newSectionStart--;
  const before = lines.slice(0, newSectionStart);
  const after = lines.slice(sectionEnd);
  const newBody = [...before, ...after].join('\n');

  return { entries, newBody, sectionStart: sectionStart + 1, sectionLevel };
};

const rewriteInlineCitations = (body, surnameYearIndex, findings) => {
  const lines = body.split('\n');
  let inFence = false;
  let fenceMarker = '';
  const out = [];
  for (const line of lines) {
    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[2][0];
      if (!inFence) { inFence = true; fenceMarker = marker; }
      else if (marker === fenceMarker) { inFence = false; fenceMarker = ''; }
      out.push(line);
      continue;
    }
    if (inFence) { out.push(line); continue; }
    let rewritten = line;
    // (Author YYYY) → [@citekey]
    rewritten = rewritten.replace(
      /\(([A-Z][A-Za-z'’\-]+(?:\s+(?:and|&|et\s+al\.?)\s+[A-Z][A-Za-z'’\-]+)?)\s+(\d{4}[a-z]?)\)/g,
      (match, authorBlob, year) => {
        const key = resolveByAuthorAndYear(authorBlob, year, surnameYearIndex);
        if (key) {
          findings.push({ rule: 'inline-citation-rewritten', severity: 'info', from: match, to: `[@${key}]` });
          return `[@${key}]`;
        }
        findings.push({ rule: 'inline-citation-unresolved', severity: 'warning', match, reason: 'no surname+year match in extracted bibliography' });
        return match;
      }
    );
    // Author (YYYY) → Author [@citekey]; collapse "Author [@citekey]" to "[@citekey]"
    // Use a different transformation: replace "Author (YYYY)" with "[@citekey]".
    rewritten = rewritten.replace(
      /(?<![\w@])([A-Z][A-Za-z'’\-]+(?:\s+(?:and|&|et\s+al\.?)\s+[A-Z][A-Za-z'’\-]+)?)\s+\((\d{4}[a-z]?)\)/g,
      (match, authorBlob, year) => {
        const key = resolveByAuthorAndYear(authorBlob, year, surnameYearIndex);
        if (key) {
          findings.push({ rule: 'inline-citation-rewritten', severity: 'info', from: match, to: `[@${key}]` });
          return `[@${key}]`;
        }
        return match;
      }
    );
    out.push(rewritten);
  }
  return out.join('\n');
};

const resolveByAuthorAndYear = (authorBlob, year, index) => {
  const normalized = authorBlob.split(/\s+(?:and|&|et\s+al\.?)\s+/i)[0].trim();
  const surnameLast = normalized.split(/\s+/).pop();
  const surname = surnameOf(surnameLast);
  const key = `${surname}|${year}`;
  return index.get(key) ?? null;
};

export default function reformattingADocument(input) {
  if (!validateInput(input)) {
    throw new TypeError(`reformatting-a-document: ${ajv.errorsText(validateInput.errors)}`);
  }
  const { document } = input;
  const rewriteInline = input['rewrite-inline-citations'] ?? true;
  const now = input.now ? new Date(input.now) : new Date();
  const minConfidence = input['min-confidence'] ?? 'high';
  const body = document.body ?? '';
  const frontmatter = document.frontmatter ? { ...document.frontmatter } : {};
  const findings = [];

  const extraction = extractBibliographySection(body);
  const taken = new Set(Object.keys(frontmatter.references ?? {}));
  const newReferences = { ...(frontmatter.references ?? {}) };
  const surnameYearIndex = new Map();

  // Index pre-existing frontmatter entries first (so inline rewriting can resolve them).
  for (const [key, entry] of Object.entries(newReferences)) {
    const authors = Array.isArray(entry.authors) ? entry.authors : [];
    if (authors.length > 0 && typeof entry.year === 'number') {
      surnameYearIndex.set(`${surnameOf(authors[0])}|${entry.year}`, key);
    }
  }

  let newBody = body;
  if (extraction) {
    newBody = extraction.newBody;
    for (const raw of extraction.entries) {
      const { fragments, annotation } = preprocessEntry(raw);
      const multi = fragments.length > 1;
      for (const fragment of fragments) {
        const parsed = parseEntry(fragment, now);
        if (!parsed.ok) {
          findings.push({
            rule: 'entry-unparsed',
            severity: 'warning',
            raw: fragment,
            reason: parsed.reason,
            ...(multi ? { fromMultiEntry: raw } : {})
          });
          continue;
        }
        if (annotation) parsed.entry.note = annotation;
        const entryConfidence = parsed.confidence ?? 'high';
        const citekey = makeCitekey(parsed.entry.authors, `${parsed.entry.year}${parsed.yearSuffix ?? ''}`, taken);
        if (!passesConfidence(entryConfidence, minConfidence)) {
          findings.push({
            rule: 'entry-discarded-by-confidence',
            severity: 'warning',
            citekey,
            title: parsed.entry.title,
            style: parsed.style,
            confidence: entryConfidence,
            'min-confidence': minConfidence,
            raw: fragment
          });
          continue;
        }
        taken.add(citekey);
        newReferences[citekey] = parsed.entry;
        const idxKey = `${surnameOf(parsed.entry.authors[0])}|${parsed.entry.year}`;
        if (!surnameYearIndex.has(idxKey)) surnameYearIndex.set(idxKey, citekey);
        findings.push({
          rule: 'entry-extracted',
          severity: 'info',
          citekey,
          title: parsed.entry.title,
          style: parsed.style,
          confidence: entryConfidence
        });
      }
    }
  } else {
    findings.push({ rule: 'no-bibliography-section', severity: 'info', message: 'no forbidden ## References / ## Bibliography / etc. heading found' });
  }

  if (rewriteInline) {
    newBody = rewriteInlineCitations(newBody, surnameYearIndex, findings);
  }

  if (Object.keys(newReferences).length > 0) frontmatter.references = newReferences;

  const newDocument = {
    path: document.path,
    frontmatter,
    ...(newBody === undefined ? {} : { body: newBody })
  };

  return Object.freeze({
    document: newDocument,
    findings: Object.freeze(findings.map((f) => Object.freeze(f)))
  });
}

// ----- CLI -----
// Walks a file or directory of markdown files, applies the morphism, writes the
// result back. Use --recursive to walk subdirectories; use --dry-run to print
// findings without writing.

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const SKIP_DIRS = new Set(['.git', 'node_modules', '.claude']);

const parseMarkdown = (path, text) => {
  const m = text.match(FRONTMATTER_RE);
  if (!m) return { path, frontmatter: {}, body: text };
  let fm = {};
  try { fm = yaml.load(m[1]) ?? {}; } catch { fm = {}; }
  return { path, frontmatter: fm, body: text.slice(m[0].length) };
};

const serializeMarkdown = (document) => {
  const fmYaml = yaml.dump(document.frontmatter ?? {}, { lineWidth: -1, noRefs: true, sortKeys: false });
  return `---\n${fmYaml}---\n${document.body ?? ''}`;
};

function* walkMarkdown(root, { recursive }) {
  const stat = statSync(root);
  if (stat.isFile()) {
    if (root.endsWith('.md')) yield root;
    return;
  }
  if (!stat.isDirectory()) return;
  if (!recursive) {
    for (const ent of readdirSync(root, { withFileTypes: true })) {
      if (ent.isFile() && ent.name.endsWith('.md')) yield join(root, ent.name);
    }
    return;
  }
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        stack.push(full);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        yield full;
      }
    }
  }
}

const MEANINGFUL_RULES = new Set(['entry-extracted', 'inline-citation-rewritten']);

const processFile = (path, { dryRun, rewriteInline, minConfidence }) => {
  const before = readFileSync(path, 'utf8');
  const document = parseMarkdown(path, before);
  const result = reformattingADocument({
    document,
    'rewrite-inline-citations': rewriteInline,
    'min-confidence': minConfidence
  });
  // "Changed" only when the morphism actually transformed content — re-serializing
  // a clean file under a fresh YAML dumper will differ from the original whitespace
  // even when nothing categorical changed. Base the decision on findings.
  const changed = result.findings.some((f) => MEANINGFUL_RULES.has(f.rule));
  let written = false;
  if (changed && !dryRun) {
    const after = serializeMarkdown(result.document);
    writeFileSync(path, after);
    written = true;
  }
  return { path, changed, written, findings: result.findings };
};

const main = (argv) => {
  const args = argv.slice(2);
  let target = null;
  let recursive = false;
  let dryRun = false;
  let asJson = false;
  let rewriteInline = true;
  let minConfidence = 'high';
  for (const a of args) {
    if (a === '--recursive' || a === '-r') recursive = true;
    else if (a === '--dry-run' || a === '-n') dryRun = true;
    else if (a === '--json') asJson = true;
    else if (a === '--no-rewrite-inline') rewriteInline = false;
    else if (a === '--include-medium') minConfidence = 'medium';
    else if (a === '--include-all') minConfidence = 'low';
    else if (a === '-h' || a === '--help') {
      process.stdout.write(
        'reformatting-a-document.mjs <path> [options]\n' +
        '  <path>                   file or directory of .md files\n' +
        '  --recursive, -r          walk subdirectories (default: off)\n' +
        '  --dry-run, -n            print findings without writing\n' +
        '  --no-rewrite-inline      skip Author(YYYY) -> [@citekey] rewriting in body\n' +
        '  --include-medium         write medium-confidence entries too\n' +
        '                           (no-volume articles, living-document year-defaulted)\n' +
        '  --include-all            write all extracted entries including low-confidence\n' +
        '                           (descriptive-container, free-form-source fallbacks)\n' +
        '  --json                   emit per-file results as JSON\n' +
        '\n' +
        'Default min-confidence is \'high\': only unambiguous parses become frontmatter.\n' +
        'Lower-confidence parses are reported in findings as entry-discarded-by-confidence.\n'
      );
      process.exit(0);
    } else if (!target) target = resolve(a);
    else { process.stderr.write(`unexpected arg: ${a}\n`); process.exit(2); }
  }
  if (!target) {
    process.stderr.write('usage: reformatting-a-document.mjs <path> [options]\n');
    process.exit(2);
  }

  const results = [];
  for (const file of walkMarkdown(target, { recursive })) {
    try {
      const result = processFile(file, { dryRun, rewriteInline, minConfidence });
      results.push(result);
    } catch (err) {
      results.push({ path: file, changed: false, written: false, error: err.message, findings: [] });
    }
  }

  if (asJson) {
    process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  } else {
    const filesChanged = results.filter((r) => r.changed).length;
    const filesWritten = results.filter((r) => r.written).length;
    for (const r of results) {
      const rel = relative(process.cwd(), r.path) || r.path;
      const counts = {
        high: 0,
        medium: 0,
        low: 0,
        discarded: 0,
        unparsed: 0,
        rewritten: 0,
        unresolved: 0
      };
      for (const f of r.findings ?? []) {
        if (f.rule === 'entry-extracted') counts[f.confidence ?? 'high']++;
        else if (f.rule === 'entry-discarded-by-confidence') counts.discarded++;
        else if (f.rule === 'entry-unparsed') counts.unparsed++;
        else if (f.rule === 'inline-citation-rewritten') counts.rewritten++;
        else if (f.rule === 'inline-citation-unresolved') counts.unresolved++;
      }
      const extracted = counts.high + counts.medium + counts.low;
      const status = r.error ? `ERROR ${r.error}`
        : r.changed ? (r.written ? 'wrote' : 'would-write')
        : 'unchanged';
      const realWork = extracted > 0 || counts.rewritten > 0;
      const summary = [
        counts.high > 0 ? `${counts.high} high` : null,
        counts.medium > 0 ? `${counts.medium} medium` : null,
        counts.low > 0 ? `${counts.low} low` : null,
        counts.discarded > 0 ? `${counts.discarded} DISCARDED` : null,
        counts.unparsed > 0 ? `${counts.unparsed} UNPARSED` : null,
        counts.rewritten > 0 ? `${counts.rewritten} inline-rewritten` : null,
        realWork && counts.unresolved > 0 ? `${counts.unresolved} unresolved` : null
      ].filter(Boolean).join(', ');
      process.stdout.write(`${rel}: ${status}${summary ? ` (${summary})` : ''}\n`);
      for (const f of r.findings ?? []) {
        if (f.rule === 'entry-unparsed') process.stdout.write(`  UNPARSED (${f.reason}): ${f.raw}\n`);
        else if (f.rule === 'entry-discarded-by-confidence') process.stdout.write(`  DISCARDED [${f.confidence} < ${f['min-confidence']}]: ${f.raw}\n`);
        else if (realWork && f.rule === 'inline-citation-unresolved') process.stdout.write(`  unresolved inline: ${f.match} — ${f.reason}\n`);
      }
    }
    process.stderr.write(`\n${results.length} file(s) scanned; ${filesChanged} changed; ${filesWritten} written${dryRun ? ' (dry-run)' : ''}.\n`);
  }
  process.exit(0);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv);
}

