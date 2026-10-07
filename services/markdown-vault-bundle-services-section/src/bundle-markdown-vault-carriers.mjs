import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { renderMarkdownVaultCarrier } from "./render-markdown-vault-carrier.mjs";
import {
  MARKDOWN_VAULT_BUNDLE_ROLES,
  roleOfMarkdownVaultCarrier,
  selectMarkdownVaultCarriers,
} from "./select-markdown-vault-carriers.mjs";

/** Default target word count per aggregate bundle file. */
export const DEFAULT_MARKDOWN_VAULT_BUNDLE_WORD_BUDGET = 200_000;

/** Gemini Notebook's free-tier per-notebook source cap; a hard file-count ceiling. */
export const MAX_MARKDOWN_VAULT_BUNDLE_FILES = 50;

const ROLE_ORDER = Object.freeze(["glossary-terms", "glossary-topics", "glossary-concepts", "articles"]);
const ROLE_LABELS = Object.freeze({
  "glossary-terms": "Glossary Terms",
  "glossary-topics": "Glossary Topics",
  "glossary-concepts": "Glossary Concepts",
});

const ARTICLES_MARKER = "content/text/documents/articles/";

function articleGroup(path, rootLabel) {
  if (path.startsWith(ARTICLES_MARKER)) return Object.freeze({ key: "articles::", label: `Articles — ${rootLabel}` });
  const index = path.indexOf(`/${ARTICLES_MARKER}`);
  const prefix = index === -1 ? "" : path.slice(0, index);
  if (prefix === "") return Object.freeze({ key: "articles::", label: `Articles — ${rootLabel}` });
  const segments = prefix.split("/");
  return Object.freeze({ key: `articles::${prefix}`, label: `Articles — ${segments[segments.length - 1]}` });
}

/**
 * Group rendered carriers into deterministic sections: one group per
 * glossary role, and articles grouped by their owning subsection directory.
 * @param {readonly {path: string}[]} carriers
 * @param {{rootLabel?: string}} [options]
 * @returns {readonly {key: string, label: string, carriers: readonly object[]}[]}
 */
export function groupMarkdownVaultCarriers(carriers, { rootLabel = "root" } = {}) {
  const groups = new Map();
  for (const carrier of carriers) {
    const role = roleOfMarkdownVaultCarrier(carrier.path);
    const { key, label } = role === "articles"
      ? articleGroup(carrier.path, rootLabel)
      : { key: role, label: ROLE_LABELS[role] };
    if (!groups.has(key)) groups.set(key, { key, label, carriers: [] });
    groups.get(key).carriers.push(carrier);
  }
  const ordered = [...groups.values()].sort((left, right) => {
    const leftRole = ROLE_ORDER.indexOf(left.key.split("::")[0]);
    const rightRole = ROLE_ORDER.indexOf(right.key.split("::")[0]);
    return leftRole - rightRole || left.key.localeCompare(right.key, "en");
  });
  for (const group of ordered) group.carriers.sort((left, right) => left.path.localeCompare(right.path, "en"));
  return Object.freeze(ordered.map((group) => Object.freeze({ ...group, carriers: Object.freeze(group.carriers) })));
}

/**
 * Pack grouped, rendered carriers into files bounded by a word budget and a
 * hard file-count cap. Never splits a single carrier across files.
 * @throws {Error} when the corpus cannot fit within maxFiles at wordBudget.
 */
export function packMarkdownVaultBundleFiles(groups, {
  wordBudget = DEFAULT_MARKDOWN_VAULT_BUNDLE_WORD_BUDGET,
  maxFiles = MAX_MARKDOWN_VAULT_BUNDLE_FILES,
} = {}) {
  if (!Number.isInteger(wordBudget) || wordBudget < 1) throw new TypeError("wordBudget must be a positive integer");
  if (!Number.isInteger(maxFiles) || maxFiles < 1) throw new TypeError("maxFiles must be a positive integer");
  const files = [];
  let current = null;
  let lastGroupKey = null;
  const startFile = () => {
    if (files.length >= maxFiles) {
      throw new Error(`markdown vault bundle: corpus exceeds the ${maxFiles}-file cap at a ${wordBudget}-word budget; raise wordBudget or narrow roles`);
    }
    current = { index: files.length, entries: [], wordCount: 0 };
    files.push(current);
    lastGroupKey = null;
  };
  for (const group of groups) {
    for (const carrier of group.carriers) {
      if (current === null) startFile();
      else if (current.wordCount > 0 && current.wordCount + carrier.wordCount > wordBudget) startFile();
      const headerNeeded = lastGroupKey !== group.key;
      current.entries.push({ path: carrier.path, digest: carrier.digest, groupLabel: group.label, text: carrier.text, wordCount: carrier.wordCount, headerNeeded });
      current.wordCount += carrier.wordCount;
      lastGroupKey = group.key;
    }
  }
  return Object.freeze(files.map((file) => Object.freeze({ ...file, entries: Object.freeze(file.entries) })));
}

function slugOf(text) {
  return slugify(text);
}

function titleOf(text) {
  return text.split(/[-_\s]+/u).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function bundleFilename(label, index, total) {
  const width = Math.max(2, String(total).length);
  const n = String(index + 1).padStart(width, "0");
  const t = String(total).padStart(width, "0");
  return `${slugOf(label)}-${n}-of-${t}.md`;
}

/**
 * Render one packed file's full aggregate Markdown text.
 * @param {{file: object, totalFiles: number, title: string}} options
 * @returns {string}
 */
export function renderMarkdownVaultBundleFile({ file, totalFiles, title }) {
  const lines = [`# ${title} — Part ${file.index + 1} of ${totalFiles}`, ""];
  for (const entry of file.entries) {
    if (entry.headerNeeded) lines.push(`## ${entry.groupLabel}`, "");
    lines.push(entry.text.trimEnd(), "", "---", "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/**
 * Collect, render, group, and pack a Markdown vault subtree into a
 * deterministic set of aggregate bundle files plus a manifest.
 *
 * Byte-identical for unchanged input: every ordering step sorts explicitly
 * and no run-varying value (timestamps, host paths) enters bundle text or
 * the manifest.
 *
 * A carrier whose frontmatter fails to parse is excluded from the bundle and
 * reported in `defects` (and in the manifest) rather than aborting the run;
 * only the file-count cap failure is fatal.
 * @param {{root: string, roles?: readonly string[], excludes?: readonly string[], wordBudget?: number, maxFiles?: number, rootLabel?: string}} options
 * @returns {Promise<{files: readonly {filename: string, text: string, wordCount: number, carrierCount: number}[], manifest: object, scanned: number, excluded: number, defects: readonly {path: string, reason: string}[]}>}
 */
export async function bundleMarkdownVaultCarriers({
  root,
  roles = MARKDOWN_VAULT_BUNDLE_ROLES,
  excludes,
  wordBudget = DEFAULT_MARKDOWN_VAULT_BUNDLE_WORD_BUDGET,
  maxFiles = MAX_MARKDOWN_VAULT_BUNDLE_FILES,
  rootLabel,
} = {}) {
  if (typeof root !== "string" || root === "") throw new TypeError("root is required");
  const label = typeof rootLabel === "string" && rootLabel !== "" ? rootLabel : root.split("/").filter(Boolean).pop() ?? "corpus";
  const selection = await selectMarkdownVaultCarriers({ root, roles, ...(excludes === undefined ? {} : { excludes }) });
  const rendered = [];
  const defects = [];
  for (const carrier of selection.carriers) {
    const markdown = await readFile(join(root, carrier.path), "utf8");
    try {
      rendered.push(renderMarkdownVaultCarrier({ path: carrier.path, markdown }));
    } catch (error) {
      defects.push(Object.freeze({ path: carrier.path, reason: error.message }));
    }
  }
  const groups = groupMarkdownVaultCarriers(rendered, { rootLabel: label });
  const packed = packMarkdownVaultBundleFiles(groups, { wordBudget, maxFiles });
  const title = titleOf(label);
  const files = packed.map((file) => Object.freeze({
    filename: bundleFilename(label, file.index, packed.length),
    text: renderMarkdownVaultBundleFile({ file, totalFiles: packed.length, title }),
    wordCount: file.wordCount,
    carrierCount: file.entries.length,
  }));
  const carriers = files
    .flatMap((file, index) => packed[index].entries.map((entry) => ({ path: entry.path, bundleFile: file.filename, digest: entry.digest })))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const manifest = Object.freeze({
    root,
    rootLabel: label,
    roles: selection.roles,
    wordBudget,
    maxFiles,
    files: Object.freeze(files.map((file) => Object.freeze({ filename: file.filename, wordCount: file.wordCount, carrierCount: file.carrierCount }))),
    carriers: Object.freeze(carriers),
    defects: Object.freeze(defects),
  });
  return Object.freeze({ files: Object.freeze(files), manifest, scanned: selection.scanned, excluded: selection.excluded, defects: Object.freeze(defects) });
}
