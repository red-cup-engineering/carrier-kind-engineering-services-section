// linting-shp — morphism: SHP HTML document → lint report.
//
// Two rule families:
//   rfc7992.*  — RFC 7992 structural requirements (Flanagan 2016).
//   shp.*      — SHP-specific requirements (morphism-identity class slugs,
//                data-* carrier elements on projection-direction spans).
//
// Input:  { "html": string }
// Output: { violations: [{ rule: string, severity: "error"|"warning", message: string }] }

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

// RFC 7992 class names are valid morphism identities — do not flag them.
const RFC7992_CLASSES = new Set([
  'RFC', 'ears', 'left', 'center', 'right', 'docInfo', 'identifiers',
  'workgroup', 'series', 'status', 'published', 'authors',
  'author', 'vcard', 'fn', 'role', 'org', 'nameRole',
  'email', 'tel', 'url', 'type',
  'adr', 'street-address', 'locality', 'region', 'postal-code', 'country-name',
  'ascii', 'non-ascii', 'alternative-contact', 'addr',
  'abstract', 'note', 'rfcEditorRemove',
  'bcp14', 'pilcrow', 'annotation', 'cref', 'crefSource', 'iref',
  'eref', 'xref', 'relref', 'selfRef',
  'artwork', 'art-text', 'art-svg',
  'sourcecode',
  'alignRight', 'alignCenter',
  'olCompact', 'olPercent', 'ulCompact', 'ulEmpty',
  'dlHanging', 'dlParallel', 'dlCompact',
  'reference', 'refInstance', 'refAuthor', 'refTitle', 'refDate', 'refContent',
  'seriesInfo',
  'indexChar', 'indexItem', 'indexSubItem',
  'irefItem', 'irefRefs', 'irefSubItem', 'indexPrimary',
  'finalized', 'rendered',
]);

export default function lintingShp(input) {
  const { html } = input;
  const violations = [];

  // rfc7992.doctype — must begin with <!DOCTYPE html>
  if (!/^\s*<!DOCTYPE\s+html>/i.test(html))
    violations.push({ rule: 'rfc7992.doctype', severity: 'error', message: 'Document must begin with <!DOCTYPE html>' });

  // rfc7992.html-lang — <html> must carry lang="en"
  if (!/<html[^>]+lang="en"/.test(html))
    violations.push({ rule: 'rfc7992.html-lang', severity: 'error', message: '<html> element must have lang="en"' });

  // rfc7992.charset — must declare <meta charset="utf-8">
  if (!/<meta\s+charset="utf-8"/i.test(html))
    violations.push({ rule: 'rfc7992.charset', severity: 'error', message: 'Document must contain <meta charset="utf-8">' });

  // rfc7992.self-contained — no external src= or stylesheet href=
  if (/<(?:img|script|iframe)[^>]+\bsrc="https?:\/\//i.test(html))
    violations.push({ rule: 'rfc7992.self-contained', severity: 'error', message: 'No external src= on img/script/iframe' });
  if (/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//i.test(html) ||
      /<link[^>]+href="https?:\/\/[^>]+rel="stylesheet"/i.test(html))
    violations.push({ rule: 'rfc7992.self-contained', severity: 'error', message: 'No external stylesheet href=' });

  // shp.class-slug — every class token must be a valid slug or RFC 7992 class name
  const classAttrRe = /\bclass="([^"]*)"/g;
  let m;
  while ((m = classAttrRe.exec(html)) !== null) {
    for (const token of m[1].split(/\s+/).filter(Boolean)) {
      if (!RFC7992_CLASSES.has(token) && !SLUG_RE.test(token))
        violations.push({
          rule: 'shp.class-slug', severity: 'error',
          message: `Class token "${token}" is not a valid morphism-identity slug and not an RFC 7992 class name`,
        });
    }
  }

  // shp.span-class — every <span> should have a class attribute
  const spanRe = /<span(?:\s[^>]*)?\s*>/g;
  while ((m = spanRe.exec(html)) !== null) {
    if (!/\bclass="/.test(m[0]))
      violations.push({ rule: 'shp.span-class', severity: 'warning',
        message: `<span> at offset ${m.index} has no class attribute; SHP spans must carry class=morphism-identity` });
  }

  // shp.projection-span — projection spans (data-e present) must also carry data-v
  const projRe = /<span\s[^>]*\bdata-e="[^"]*"[^>]*>/g;
  while ((m = projRe.exec(html)) !== null) {
    if (!/\bdata-v="/.test(m[0]))
      violations.push({ rule: 'shp.projection-span', severity: 'error',
        message: `Projection span at offset ${m.index} has data-e but is missing data-v` });
  }

  return { violations };
}

// CLI: node linting-shp.mjs <file.html>
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [,, filePath] = process.argv;
  if (!filePath) { process.stderr.write('Usage: node linting-shp.mjs <file.html>\n'); process.exit(1); }
  const { violations } = lintingShp({ html: readFileSync(filePath, 'utf8') });
  if (violations.length === 0) { process.stdout.write('OK — no violations\n'); }
  else {
    for (const v of violations) process.stdout.write(`[${v.severity}] ${v.rule}: ${v.message}\n`);
    process.exit(1);
  }
}
