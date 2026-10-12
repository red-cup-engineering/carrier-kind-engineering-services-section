// writing-shp — morphism: structured content → SHP HTML document.
//
// Constructs an RFC 7992-conformant SHP document from a title, ordered sections,
// and optional metadata. Sections become <section> elements; their content field
// is HTML that may itself carry SHP spans. The document structure is the Yoneda
// embedding of the input structure into the document category.
//
// Input:  { title, sections: [{ id, title, content }], metadata?, t? }
// Output: string — RFC 7992-conformant SHP HTML document

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildToc(sections) {
  const items = sections.map(s =>
    `      <li><a href="#${esc(s.id)}">${escText(s.title)}</a></li>`
  );
  return [
    '  <h2 id="toc">Table of Contents</h2>',
    '  <nav class="toc">',
    '    <ul>',
    ...items,
    '    </ul>',
    '  </nav>',
  ].join('\n');
}

export default function writingShp(input) {
  const { title, sections } = input;
  const meta = input.metadata || {};
  const t = input.t || new Date().toISOString();

  const headLines = [
    '  <meta charset="utf-8">',
    `  <title>${escText(title)}</title>`,
  ];
  if (meta.author)      headLines.push(`  <meta name="author" content="${esc(meta.author)}">`);
  if (meta.description) headLines.push(`  <meta name="description" content="${esc(meta.description)}">`);
  headLines.push(`  <meta name="generator" content="${esc(meta.generator || 'semantic-hypertext-packet/hacking/library/writing-shp')}">`);
  if (meta.keywords)    headLines.push(`  <meta name="keywords" content="${esc(meta.keywords)}">`);
  if (meta.license)     headLines.push(`  <link rel="license" href="${esc(meta.license)}">`);
  headLines.push(`  <meta name="generated" content="${esc(t)}">`);

  const sectionLines = sections.map(s => [
    `  <section id="${esc(s.id)}">`,
    `    <h2>${escText(s.title)}</h2>`,
    s.content,
    `  </section>`,
  ].join('\n'));

  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    ...headLines,
    '</head>',
    '<body>',
    `  <h1 id="title">${escText(title)}</h1>`,
    buildToc(sections),
    ...sectionLines,
    '</body>',
    '</html>',
  ].join('\n');
}

// CLI: node writing-shp.mjs <input.json>
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [,, filePath] = process.argv;
  if (!filePath) { process.stderr.write('Usage: node writing-shp.mjs <input.json>\n'); process.exit(1); }
  process.stdout.write(writingShp(JSON.parse(readFileSync(filePath, 'utf8'))) + '\n');
}
