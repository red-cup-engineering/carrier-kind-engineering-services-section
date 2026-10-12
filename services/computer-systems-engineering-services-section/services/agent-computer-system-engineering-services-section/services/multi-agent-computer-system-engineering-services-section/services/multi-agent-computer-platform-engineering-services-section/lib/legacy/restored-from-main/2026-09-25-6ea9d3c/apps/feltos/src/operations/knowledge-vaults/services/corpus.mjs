import path from "node:path";

import { operation } from "@red-cup-engineering/feltos/rpc/operation";
import { } from "@red-cup-engineering/json-services-section";
import { markdownDataform } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { siteDirectoryGrammarOf } from "@red-cup-engineering/computer-code-engineering-services-section/signchain/contracts/site-directory-grammar";
import { statementLogInformation } from "@lenticule-science/metrologic/settling/records/persistence";
import { diataxisCoverageOfDocuments } from "@red-cup-engineering/markdown-engineering-services-section/vault/diataxis";

const NOTE_INFORMATION_PRUNE_DIRS = new Set(["node_modules", ".git", "dist", ".pnpm-store"]);
const NOTE_INFORMATION_MARKDOWN_FILE = /\.(?:md|markdown)$/iu;

function operationQuery(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return undefined;
  const query = (input)["query"];
  return typeof query === "string" ? query : undefined;
}

export function readNoteInformationReadout(binding, query) {
  if (query !== undefined && query.length === 0) return undefined;
  const words = query === undefined ? undefined : query.split("-").filter((word) => word.length > 0);
  if (words !== undefined && words.length === 0) return undefined;

  const files = binding.walkFiles(binding.dataRoot, {
    pruneDirectory: (name) => NOTE_INFORMATION_PRUNE_DIRS.has(name),
    includeFile: (name) => NOTE_INFORMATION_MARKDOWN_FILE.test(name),
  });

  let bytesOnDisk = 0;
  const rows = [];
  const notes = [];
  const nonConforming = [];
  for (const filePath of files) {
    const relative = path.relative(binding.dataRoot, filePath).split(path.sep).join("/");
    const grammar = siteDirectoryGrammarOf(filePath);
    if (grammar === null) continue;
    let content;
    try {
      content = binding.readFileUtf8(filePath);
    } catch {
      continue;
    }
    let dataform;
    try {
      dataform = markdownDataform(content, { coordinate: relative });
    } catch (error) {
      nonConforming.push({ path: relative, error: (error).message });
      continue;
    }
    const matched = words === undefined
      ? dataform.assertions
      : dataform.assertions.filter((assertion) => words.every((word) => {
        const needle = word.toLowerCase();
        return assertion.a.toLowerCase().includes(needle) || JSON.stringify(assertion.v).toLowerCase().includes(needle);
      }));
    if (matched.length === 0) continue;
    bytesOnDisk += Buffer.byteLength(content, "utf8");
    rows.push(...matched);
    notes.push({ path: relative, site: grammar.site, chain: grammar.chain, assertions: matched.length });
  }

  if (rows.length === 0) {
    return Object.freeze({
      kind: "metroplat.holography.note-information-settlement",
      root: binding.dataRoot,
      ...(query === undefined ? {} : { query: words.join(" ") }),
      files: 0,
      bytesOnDisk: 0,
      assertions: 0,
      entropyUnits: 0,
      duplicateStatements: 0,
      notes: [],
      nonConforming,
    });
  }

  const information = statementLogInformation(rows);
  const bytesPerEntropyUnit = information.entropyUnits === 0 ? undefined : bytesOnDisk / information.entropyUnits;
  return Object.freeze({
    kind: "metroplat.holography.note-information-settlement",
    root: binding.dataRoot,
    ...(query === undefined ? {} : { query: words.join(" ") }),
    files: notes.length,
    bytesOnDisk,
    assertions: information.rows,
    entropyUnits: information.entropyUnits,
    duplicateStatements: information.duplicateStatements,
    ...(bytesPerEntropyUnit === undefined ? {} : { bytesPerEntropyUnit }),
    notes,
    nonConforming,
  });
}

export function readOrientationDiataxisCoverage(binding) {
  const scoped = Object.freeze([
    { path: "README.md", title: "the ecosystem orientation document" },
    { path: "AGENTS.md", title: "root AI-assistant conduct rules" },
    { path: "lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section/src/services/obsmetrologia/AGENTS.md", title: "obsmetrologia tooling/path/proof contracts" },
  ]);
  const documents = scoped
    .map((doc) => Object.freeze({ ...doc, absolute: path.join(binding.dataRoot, doc.path) }))
    .filter((doc) => binding.pathExists(doc.absolute))
    .map((doc) => Object.freeze({ path: doc.path, title: doc.title, body: binding.readFileUtf8(doc.absolute) }));
  if (documents.length === 0) return undefined;
  return diataxisCoverageOfDocuments("conurbation-orientation-docs", documents);
}

export function knowledgeVaultOperations(binding) {
  return Object.freeze([
    operation({
      verb: "note-information",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Measure markdown corpus information.",
      description: "Domain: { query? }. Folds recognized markdown notes into journal information.",
      run: (input) => readNoteInformationReadout(binding, operationQuery(input)) ?? null,
    }),
    operation({
      verb: "diataxis-coverage",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read Diataxis coverage for orientation documents.",
      description: "Domain: {}. Reads the live orientation documents and classifies their Diataxis modes.",
      run: () => readOrientationDiataxisCoverage(binding) ?? null,
    }),
  ]);
}
