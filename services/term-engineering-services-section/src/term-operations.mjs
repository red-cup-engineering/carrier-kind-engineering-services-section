import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { readFileText } from "@red-cup-engineering/file-services/read-file";
import { writeFileText } from "@red-cup-engineering/file-services/write-file";
import { admitTermMarkdown, readTermMarkdown, recognizeTermMarkdown, renderTermMarkdown } from "./term-carrier.mjs";

export async function readTerm(path) {
  const absolutePath = resolve(path); const text = await readFileText(absolutePath);
  return Object.freeze({ path: absolutePath, text, parsed: readTermMarkdown(text), recognized: recognizeTermMarkdown({ text, filename: basename(absolutePath) }) });
}

export async function writeTerm({ termDirectory, term, semanticEvidence, knownCompoundStems = [], authorizedRelationKeys = [], overwrite = false } = {}, operations = {}) {
  if (typeof termDirectory !== "string" || termDirectory.trim() === "") throw new TypeError("termDirectory is required");
  const filename = term?.filename;
  if (typeof filename !== "string" || basename(filename) !== filename || filename === ".md" || !filename.endsWith(".md")) throw new TypeError("term.filename must be one safe Markdown basename; the filename stem is the machine identity");
  const identity = filename.slice(0, -3);
  if (term.identity !== identity) throw new TypeError("term.identity must equal the filename stem");
  const { filename: _filename, ...record } = term;
  const markdown = renderTermMarkdown(record, { authorizedRelationKeys }); const path = join(resolve(termDirectory), filename);
  const pathExists = operations.exists ?? existsSync;
  if (pathExists(path) && !overwrite) throw new Error(`term already exists; explicit overwrite required: ${path}`);
  const admitted = admitTermMarkdown({ text: markdown, filename, semanticEvidence, knownCompoundStems, authorizedRelationKeys });
  const write = operations.write ?? writeFileText;
  await write(path, markdown);
  return Object.freeze({ disposition: "written", path, filename, admitted });
}
