import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { mutateMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { admitCarrierFrontmatter } from "./carrier-kinds.mjs";

const allowed = new Set(["title", "description", "date-created"]);
const sha256 = bytes => "sha256:" + createHash("sha256").update(bytes).digest("hex");

/**
 * Prepare reviewed additive YAML metadata on one exact existing note.
 *
 * The caller supplies values it has verified against the original evidence.
 * Matching the bytes and passing the schema do not establish authorship,
 * creation date, publication rights, or authority to write any repository.
 * The function only returns a candidate; it opens and changes no files.
 *
 * @param {{bytes: Uint8Array, expectedRevision: string, additions: Record<string, string>}} input
 * @returns {{sourceRevision:string, candidateRevision:string, text:string}}
 */
export function previewNoteFrontmatterAdditions({ bytes, expectedRevision, additions } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("existing UTF-8 note bytes are required");
  const sourceRevision = sha256(bytes);
  if (sourceRevision !== expectedRevision) throw new Error("note bytes do not match the reviewed source revision");
  if (additions === null || typeof additions !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(additions))) {
    throw new TypeError("reviewed additions must be a plain record of note fields");
  }
  const entries = Reflect.ownKeys(additions).map(key => [key, Object.getOwnPropertyDescriptor(additions, key)]);
  if (entries.length === 0 || entries.some(([key, property]) =>
    !allowed.has(key) || !property.enumerable || typeof property.value !== "string" || !property.value.trim())) {
    throw new TypeError("only reviewed nonblank title, description and date-created additions are supported");
  }
  const patch = Object.fromEntries(entries.map(([key, property]) => [key, property.value]));
  const keys = Object.keys(patch);
  // ignoreBOM=true preserves a leading BOM in the decoded string. Always
  // compare the newline-sensitive source rather than normalizing line endings.
  const original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const current = readMarkdownFrontmatter(original);
  if (current.format !== "yaml") throw new TypeError("preview requires an existing YAML frontmatter block");
  if (current.frontmatter.status === "relocated-research-source") throw new TypeError("a relocation pointer is not a research note");
  for (const key of keys) {
    if (Object.hasOwn(current.frontmatter, key)) throw new TypeError(`preserving authored frontmatter key: ${key}`);
  }
  const text = mutateMarkdownFrontmatter(original, { mode: "merge", patch });
  const updated = readMarkdownFrontmatter(text);
  if (mutateMarkdownFrontmatter(text, { mode: "delete", keys }) !== original ||
      updated.format !== current.format || updated.body !== current.body ||
      !isDeepStrictEqual(updated.frontmatter, { ...current.frontmatter, ...patch })) {
    throw new Error("frontmatter preview would change source text or existing metadata");
  }
  const admission = admitCarrierFrontmatter("note", updated.frontmatter);
  if (!admission.admitted) {
    throw new TypeError("candidate note frontmatter failed admission: " + admission.findings.map(({ rule }) => rule).join(", "));
  }
  return Object.freeze({ sourceRevision, candidateRevision: sha256(text), text });
}
