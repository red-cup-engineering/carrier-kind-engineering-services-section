import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { mutateMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
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


/**
 * Preview one reviewed YAML newline at an exact malformed note boundary.
 * Only a top-level quoted scalar immediately followed by the named block
 * key is supported. This is syntax recovery, not schema-driven replacement.
 * The caller identifies the original line (one-based); no file is written.
 */
export function previewNoteFrontmatterLineSplit({ bytes, expectedRevision, line, key } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 4 * 1024 * 1024 ||
      !Number.isSafeInteger(line) || line < 2 ||
      typeof key !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(key))
    throw new TypeError("a bounded reviewed YAML line and block key are required");
  const sourceRevision = sha256(bytes);
  if (sourceRevision !== expectedRevision) throw new Error("note bytes do not match the reviewed source revision");
  const original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const fence = splitMarkdownFrontmatterFence(original);
  if (fence?.format !== "yaml") throw new TypeError("line split requires a closed YAML frontmatter fence");
  let parsed = false;
  try { readMarkdownFrontmatter(original); parsed = true; } catch { /* Only an unreadable original qualifies. */ }
  if (parsed) throw new TypeError("line split refuses already valid frontmatter");
  const lines = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  let saw;
  for (let n = 1; n <= line; n++) {
    saw = lines.exec(original);
    if (!saw || !saw[2] || saw.index >= fence.source.rawEnd)
      throw new TypeError("reviewed line must be inside the original YAML fence");
  }
  const body = saw[1].trimEnd(), tail = key + ":";
  const left = body.endsWith(tail) ? body.slice(0, -tail.length) : "";
  const scalar = /^([a-z][a-z0-9-]{0,63}):[ \t]+"(?:[^"\\]|\\.)*"$/u.exec(left);
  if (!scalar || scalar[1] === key || saw.index < fence.source.rawStart)
    throw new TypeError("reviewed boundary is not a quoted scalar followed by a block key");
  const offset = saw.index + left.length;
  const text = original.slice(0, offset) + saw[2] + original.slice(offset);
  const candidate = readMarkdownFrontmatter(text);
  if (candidate.format !== fence.format || candidate.body !== fence.body ||
      candidate.frontmatter.status === "relocated-research-source" ||
      typeof candidate.frontmatter[scalar[1]] !== "string" || !Object.hasOwn(candidate.frontmatter,key))
    throw new Error("line split did not retain the intended YAML fields and source body");
  const admission = admitCarrierFrontmatter("note", candidate.frontmatter);
  if (!admission.admitted) throw new TypeError("line split did not meet the note schema");
  return Object.freeze({ sourceRevision, candidateRevision: sha256(text), text });
}
