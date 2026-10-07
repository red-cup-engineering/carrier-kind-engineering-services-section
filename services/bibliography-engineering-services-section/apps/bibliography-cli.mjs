#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { collectReferencesFrom } from "../scripts/collect-set-of-references.mjs";
import { importSetOfCslReferences } from "../scripts/import-set-of-csl-references.mjs";
import { parseSetOfCitations } from "../scripts/parse-set-of-citations.mjs";
import { projectReferencesBibtexFrom } from "../scripts/project-references-bibtex.mjs";
import { projectReferencesCslFrom } from "../scripts/project-references-csl.mjs";
import { readBibliography } from "../scripts/read-bibliography.mjs";
import { recognizeBibliographyMarkdown } from "../scripts/recognize-bibliography.mjs";
import { renderBibliographyMarkdown } from "../scripts/render-bibliography.mjs";
import { admitBibliographyMarkdown } from "../src/bibliography-carrier.mjs";
import { writeBibliography } from "../scripts/write-bibliography.mjs";
import { resolveDoi } from "../scripts/resolve-doi.mjs";
import { searchOpenAlexWorks } from "../scripts/search-openalex-works.mjs";
import { fetchOpenAlexWork } from "../scripts/fetch-openalex-work.mjs";
import { searchPubmed } from "../scripts/search-pubmed.mjs";
import { fetchPubmedSummaries } from "../scripts/fetch-pubmed-summaries.mjs";

/** @returns {string} the usage block, one verb per line, each stating what it reads on stdin */
function usage() {
  return [
    "usage: bibliography <render|read|recognize|admit|write|collect|project|parse|import-csl|project-csl|resolve-doi|search-openalex|fetch-openalex|search-pubmed|fetch-pubmed-summaries> [path]",
    "",
    "  render         renders a bibliography record to Markdown; reads a bibliography record JSON object on stdin",
    "  read           reads one admitted bibliography by path, given as argv[3]; reads nothing on stdin",
    "  recognize      parses a bibliography Markdown carrier without admitting it; reads {text, filename} JSON on stdin",
    "  admit          recognizes and semantically admits a bibliography Markdown carrier; reads {text, filename} JSON on stdin",
    "  write          admits and durably writes one bibliography carrier; reads a bibliography write request JSON object on stdin",
    "  collect        collects reference triples and bibliography carriers under a scope, given as argv[3] (default: cwd); reads nothing on stdin",
    "  project        projects a scope's reconciled reference set as BibTeX text, given as argv[3] (default: cwd); reads nothing on stdin",
    "  parse          parses free-text citation lines into a keyed references: map; reads citation text on stdin",
    "  import-csl     imports a CSL-JSON array into a keyed references: map; reads a CSL-JSON array JSON on stdin",
    "  project-csl    projects a scope's collected references as a CSL-JSON array, given as argv[3] (default: cwd); reads nothing on stdin",
    "",
    "  resolve-doi              resolves one DOI against CrossRef to a CSL-JSON item; doi argv[3], optional mailto argv[4]; reads nothing on stdin",
    "  search-openalex          searches OpenAlex works, as CSL-JSON items; query argv[3], optional mailto argv[4]; reads nothing on stdin",
    "  fetch-openalex           fetches one OpenAlex work by OpenAlex id or DOI, as a CSL-JSON item; id-or-doi argv[3], optional mailto argv[4]; reads nothing on stdin",
    "  search-pubmed            searches PubMed, returning PMIDs; query argv[3], optional email argv[4]; reads nothing on stdin",
    "  fetch-pubmed-summaries   fetches PubMed esummary records as CSL-JSON items; PMIDs from argv[3] on, any argument containing @ taken as the email; reads nothing on stdin",
    "",
    "  -h, --help     print this usage block and exit 0",
  ].join("\n");
}

const input = () => JSON.parse(readFileSync(0, "utf8"));
const rawInput = () => readFileSync(0, "utf8");
const command = process.argv[2];
if (command === undefined || command === "--help" || command === "-h") {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}
let result;
switch (command) {
  case "render": result = renderBibliographyMarkdown(input()); break;
  case "read": result = await readBibliography(process.argv[3]); break;
  case "recognize": result = recognizeBibliographyMarkdown(input()); break;
  case "admit": result = admitBibliographyMarkdown(input()); break;
  case "write": result = await writeBibliography(input()); break;
  case "collect": result = collectReferencesFrom(process.argv[3] ?? process.cwd()); break;
  case "project": result = projectReferencesBibtexFrom(process.argv[3] ?? process.cwd()); break;
  case "parse": result = parseSetOfCitations(rawInput()); break;
  case "import-csl": result = importSetOfCslReferences(input()); break;
  case "project-csl": result = projectReferencesCslFrom(process.argv[3] ?? process.cwd()); break;
  case "resolve-doi": result = await resolveDoi(process.argv[3], { mailto: process.argv[4] }); break;
  case "search-openalex": result = await searchOpenAlexWorks(process.argv[3], { mailto: process.argv[4] }); break;
  case "fetch-openalex": result = await fetchOpenAlexWork(process.argv[3], { mailto: process.argv[4] }); break;
  case "search-pubmed": result = await searchPubmed(process.argv[3], { email: process.argv[4] }); break;
  case "fetch-pubmed-summaries": {
    const rest = process.argv.slice(3);
    result = await fetchPubmedSummaries(rest.filter((arg) => !arg.includes("@")), { email: rest.find((arg) => arg.includes("@")) });
    break;
  }
  default:
    process.stderr.write(`${usage()}\n`);
    process.exit(2);
}
process.stdout.write(typeof result === "string" ? result : `${JSON.stringify(result, null, 2)}\n`);
