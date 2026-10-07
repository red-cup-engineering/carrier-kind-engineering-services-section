import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { bundleMarkdownVaultCarriers } from "../src/bundle-markdown-vault-carriers.mjs";
import { MARKDOWN_VAULT_BUNDLE_ROLES } from "../src/select-markdown-vault-carriers.mjs";
import { sha256Digest, sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";

/** This package's own root; the default semantic-record-journal custody root (writes land at data/logs/, per house data-custody law). */
export const NODE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The objectKind this section's semantic record journal uses for bundle-run records. */
export const MARKDOWN_VAULT_BUNDLE_OBJECT_KIND = "markdown-vault-bundle.run-record";

/** The journal category bundle-run records are written and queried under. */
export const MARKDOWN_VAULT_BUNDLE_CATEGORY = "markdown-vault-bundle.run";


function parseArguments(argv) {
  const options = { roles: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") options.root = argv[++index];
    else if (argument === "--output") options.output = argv[++index];
    else if (argument === "--role") options.roles.push(argv[++index]);
    else if (argument === "--word-budget") options.wordBudget = Number(argv[++index]);
    else if (argument === "--max-files") options.maxFiles = Number(argv[++index]);
    else if (argument === "--root-label") options.rootLabel = argv[++index];
    else if (argument === "--journal-root") options.journalRoot = argv[++index];
    else throw new TypeError(`unrecognized argument: ${argument}`);
  }
  if (!options.root) throw new TypeError("--root is required");
  if (!options.output) throw new TypeError("--output is required (no default is provided inside the git checkout; generated bundles are not repo state)");
  if (options.roles.length === 0) delete options.roles;
  else {
    for (const role of options.roles) {
      if (!MARKDOWN_VAULT_BUNDLE_ROLES.includes(role)) throw new TypeError(`unrecognized --role: ${role}`);
    }
  }
  return options;
}

/**
 * Bundle a Markdown vault subtree to disk: writes the aggregate bundle
 * files and manifest.json to `output`, then records a run receipt through
 * this section's semantic record journal.
 * @param {{root: string, output: string, roles?: readonly string[], wordBudget?: number, maxFiles?: number, rootLabel?: string, journalRoot?: string, recordedAt?: string}} options
 * @returns {Promise<{output: string, manifest: object, receipt: object, defects: readonly {path: string, reason: string}[]}>}
 * @throws {TypeError} when root or output is missing.
 */
export async function runBundleMarkdownVaultCarriers({
  root,
  output,
  roles,
  wordBudget,
  maxFiles,
  rootLabel,
  journalRoot = NODE_ROOT,
  recordedAt = new Date().toISOString(),
} = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  if (typeof output !== "string" || output === "") throw new TypeError("output is required");
  const resolvedRoot = resolve(root);
  const resolvedOutput = resolve(output);
  const bundle = await bundleMarkdownVaultCarriers({
    root: resolvedRoot,
    ...(roles === undefined ? {} : { roles }),
    ...(wordBudget === undefined ? {} : { wordBudget }),
    ...(maxFiles === undefined ? {} : { maxFiles }),
    ...(rootLabel === undefined ? {} : { rootLabel }),
  });
  await mkdir(resolvedOutput, { recursive: true });
  for (const file of bundle.files) {
    await writeFile(join(resolvedOutput, file.filename), file.text, "utf8");
  }
  const manifestText = `${JSON.stringify(bundle.manifest, null, 2)}\n`;
  await writeFile(join(resolvedOutput, "manifest.json"), manifestText, "utf8");
  const journal = createSemanticRecordJournal({ root: journalRoot, objectKind: MARKDOWN_VAULT_BUNDLE_OBJECT_KIND });
  const receipt = journal.record({
    category: MARKDOWN_VAULT_BUNDLE_CATEGORY,
    recordedAt,
    record: {
      root: resolvedRoot,
      output: resolvedOutput,
      roles: bundle.manifest.roles,
      wordBudget: bundle.manifest.wordBudget,
      maxFiles: bundle.manifest.maxFiles,
      scanned: bundle.scanned,
      excluded: bundle.excluded,
      carrierCount: bundle.manifest.carriers.length,
      files: bundle.manifest.files,
      defects: bundle.defects,
      manifestDigest: sha256Digest(manifestText),
    },
    told: { for: true, against: false },
  });
  return { output: resolvedOutput, manifest: bundle.manifest, receipt, defects: bundle.defects };
}

export const command = Object.freeze({
  run: async ({ argv, stderr }) => {
    const result = await runBundleMarkdownVaultCarriers(parseArguments(argv));
    if (result.defects.length > 0) {
      stderr.write(`bundle-markdown-vault-carriers: ${result.defects.length} carrier(s) excluded for malformed frontmatter:\n`);
      for (const defect of result.defects) stderr.write(`  ${defect.path}: ${defect.reason}\n`);
    }
    return result;
  },
  formatResult: (result) => `${JSON.stringify({ output: result.output, files: result.manifest.files, defects: result.defects, receiptId: result.receipt.id }, null, 2)}\n`,
  formatError: (error) => `bundle-markdown-vault-carriers: ${error.message}\n`,
  exitCode: 64,
});
