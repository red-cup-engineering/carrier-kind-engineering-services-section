#!/usr/bin/env node
/**
 * Compile each translation module's lexicon from the glossary terms that
 * carry it. A term belongs to a module's lexicon when it sits in the
 * module's glossary directory, is `part-of` the module's subject, and
 * carries `hanzi` and `gloss` (the house convention for Chinese terms).
 * The lexicon is data the translation module imports, so adding or
 * correcting a term changes the translation after one recompile; nothing
 * is typed into code. Usage: compile-translation-lexicons
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { relative } from "node:path";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";

const SECTION = new URL("..", import.meta.url).pathname;
const SERVICES = new URL("../../../../../../../../", import.meta.url).pathname;

/** Each module whose lexicon comes from glossary terms: where the terms are and which subject they are part of. */
export const TRANSLATION_LEXICON_SOURCES = Object.freeze([
  Object.freeze({
    module: "cdrama-subtitles",
    glossary: "science-services-section/services/information-science-services-section/services/communication-science-services-section/services/media-science-services-section/content/text/glossary/terms",
    partOf: "micro-drama",
  }),
]);

/** Read one module's lexicon entries from its glossary, longest source first so a compound precedes its parts. */
export function readTranslationLexicon({ glossary, partOf }, services = SERVICES) {
  const directory = `${services}${glossary}`;
  const entries = [];
  for (const file of readdirSync(directory).filter((name) => name.endsWith(".md")).sort()) {
    const { frontmatter } = readMarkdownFrontmatter(readFileSync(`${directory}/${file}`, "utf8"));
    if (frontmatter?.["part-of"] !== partOf || typeof frontmatter.hanzi !== "string" || typeof frontmatter.gloss !== "string") continue;
    const kind = Array.isArray(frontmatter.keywords) && frontmatter.keywords.includes("form-of-address") ? { kind: "form-of-address" } : {};
    entries.push({ source: frontmatter.hanzi, target: frontmatter.gloss, ...kind, term: `${glossary}/${file}` });
  }
  const sources = new Set();
  for (const entry of entries) {
    if (sources.has(entry.source)) throw new Error(`two ${partOf} terms carry ${entry.source}`);
    sources.add(entry.source);
  }
  return entries.sort((a, b) => [...b.source].length - [...a.source].length || a.source.localeCompare(b.source));
}

export function compileTranslationLexicons(sources = TRANSLATION_LEXICON_SOURCES) {
  mkdirSync(`${SECTION}data/translation-lexicons`, { recursive: true });
  return sources.map((source) => {
    const entries = readTranslationLexicon(source);
    const path = `${SECTION}data/translation-lexicons/${source.module}.json`;
    writeFileSync(path, `${JSON.stringify({ module: source.module, compiledFrom: source.glossary, partOf: source.partOf, entries }, null, 2)}\n`);
    return { module: source.module, entries: entries.length, path: relative(SECTION, path) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.stdout.write(`${JSON.stringify(compileTranslationLexicons(), null, 2)}\n`);
}
