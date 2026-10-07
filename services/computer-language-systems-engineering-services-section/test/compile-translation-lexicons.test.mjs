import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";

import { readTranslationLexicon } from "../scripts/compile-translation-lexicons.mjs";

function glossary(terms) {
  const root = mkdtempSync(`${tmpdir()}/lexicon-`);
  mkdirSync(`${root}/g`);
  for (const [file, frontmatter] of Object.entries(terms)) writeFileSync(`${root}/g/${file}`, `---\n${frontmatter}\n---\nbody\n`);
  return `${root}/`;
}

test("a lexicon is the module's terms with hanzi and gloss, longest source first", () => {
  const root = glossary({
    "a.md": "hanzi: 总裁\ngloss: CEO\npart-of: micro-drama",
    "b.md": "hanzi: 霸道总裁\ngloss: domineering CEO\npart-of: micro-drama",
    "c.md": "hanzi: 你好\ngloss: hello\npart-of: mandarin",
    "d.md": "name: no hanzi\npart-of: micro-drama",
  });
  assert.deepEqual(readTranslationLexicon({ glossary: "g", partOf: "micro-drama" }, root).map(({ source, target, term }) => [source, target, term]), [
    ["霸道总裁", "domineering CEO", "g/b.md"],
    ["总裁", "CEO", "g/a.md"],
  ]);
});

test("two terms with the same hanzi are refused", () => {
  const root = glossary({ "a.md": "hanzi: 总裁\ngloss: CEO\npart-of: micro-drama", "b.md": "hanzi: 总裁\ngloss: president\npart-of: micro-drama" });
  assert.throws(() => readTranslationLexicon({ glossary: "g", partOf: "micro-drama" }, root), /two micro-drama terms/u);
});
