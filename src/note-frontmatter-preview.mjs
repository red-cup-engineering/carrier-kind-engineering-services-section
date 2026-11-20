import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { projectMarkdownStructure, readMarkdownSource } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-structure";
import { applyMarkdownEdit, markdownEditRequestKind } from "@red-cup-engineering/markdown-engineering-services-section/apply-markdown-edit";
import { dumpMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/dump-markdown-frontmatter";
import { mutateMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/mutate-markdown-frontmatter";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { splitMarkdownFrontmatterFence } from "@red-cup-engineering/markdown-engineering-services-section/split-markdown-frontmatter-fence";
import { validateCarrierFrontmatter } from "./carrier-kinds.mjs";

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
  const validation = validateCarrierFrontmatter("note", updated.frontmatter);
  if (!validation.admitted) {
    throw new TypeError("candidate note frontmatter failed admission: " + validation.findings.map(({ rule }) => rule).join(", "));
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
  const validation = validateCarrierFrontmatter("note", candidate.frontmatter);
  if (!validation.admitted) throw new TypeError("line split did not meet the note schema");
  return Object.freeze({ sourceRevision, candidateRevision: sha256(text), text });
}

/**
 * Preview one narrow recovery from a separately reviewed Markdown witness.
 * An original TOML header whose title is the section label "Abstract" can
 * receive the distinct authored witness title only if body, identifier,
 * author list and explicit authored creation date agree. This establishes
 * content agreement, not the witness's authority or permission to write.
 */
export function previewWitnessedNoteTitle({ bytes, expectedRevision, witnessBytes, expectedWitnessRevision } = {}) {
  const bounded = value => value instanceof Uint8Array && value.byteLength <= 4 * 1024 * 1024;
  if (!bounded(bytes) || !bounded(witnessBytes)) throw new TypeError("two bounded original Markdown byte sources are required");
  const sourceRevision = sha256(bytes), witnessRevision = sha256(witnessBytes);
  if (sourceRevision !== expectedRevision || witnessRevision !== expectedWitnessRevision)
    throw new Error("original or witness bytes differ from the reviewed revisions");
  const decode = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  const original = decode.decode(bytes), witness = decode.decode(witnessBytes);
  const current = readMarkdownFrontmatter(original), held = readMarkdownFrontmatter(witness);
  if (current.format !== "toml" || held.format !== "toml" || current.body !== held.body || !current.body.trim())
    throw new TypeError("both TOML notes must have the same nonempty original body");
  const a = current.frontmatter, b = held.frontmatter;
  const dayOf = f => {
    if (Object.hasOwn(f, "date-created") && Object.hasOwn(f, "date_created") && f["date-created"] !== f.date_created) return undefined;
    return f["date-created"] ?? f.date_created;
  };
  const day = dayOf(a);
  const dayMillis = typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(day) ? Date.parse(day + "T00:00:00Z") : NaN;
  if (typeof a.id !== "string" || !a.id.trim() || a.id !== b.id ||
      !Array.isArray(a.authors) || !a.authors.length || a.authors.some(x => typeof x !== "string" || !x.trim()) ||
      !isDeepStrictEqual(a.authors, b.authors) || !Number.isFinite(dayMillis) || new Date(dayMillis).toISOString().slice(0, 10) !== day || day !== dayOf(b))
    throw new TypeError("the witness must agree on manuscript identifier, authors and explicit creation day");
  const title = b.title;
  if (a.title !== "Abstract" || typeof title !== "string" || !title.trim() || title === a.title || !title.isWellFormed() ||
      /[\p{Cc}\p{Zl}\p{Zp}]/u.test(title) || a.status === "relocated-research-source" || b.status === "relocated-research-source")
    throw new TypeError("only a distinct authored replacement for an Abstract placeholder is supported");
  const fence = splitMarkdownFrontmatterFence(original);
  const raw = original.slice(fence.source.rawStart, fence.source.rawEnd);
  const placeholder = 'title = "Abstract"';
  const offset = raw.indexOf(placeholder);
  if (offset < 0 || original.split(placeholder).length !== 2 ||
      (offset !== 0 && raw[offset - 1] !== "\n") || !/^(?:\r?\n|$)/u.test(raw.slice(offset + placeholder.length)))
    throw new TypeError("the original title must be one exact bare root assignment line");
  const replacement = "title = " + JSON.stringify(title);
  // The incumbent literal edit uses String.replace; protect literal dollars.
  const { text } = applyMarkdownEdit(original, { kind: markdownEditRequestKind, operations: [
    { operation: "replace-text", search: placeholder, replacement: replacement.replaceAll("$", "$$$$"), required: true },
  ] });
  const at = fence.source.rawStart + offset;
  const updated = readMarkdownFrontmatter(text);
  if (text.slice(0, at) + placeholder + text.slice(at + replacement.length) !== original ||
      updated.format !== current.format || updated.body !== current.body || !isDeepStrictEqual(updated.frontmatter, { ...a, title }))
    throw new Error("title recovery would change source text or metadata outside the exact title");
  const validation = validateCarrierFrontmatter("note", updated.frontmatter);
  if (!validation.admitted) throw new TypeError("recovered candidate does not meet the original note admission contract");
  return Object.freeze({ sourceRevision, witnessRevision, candidateRevision: sha256(text), text });
}

/**
 * Replace an evidenced self-echo of a draft note's TOML header with one
 * owner-reviewed, complete prose line from its opening abstract. The label
 * makes the new description an excerpt, not recovered original metadata.
 * This checks source identity and editorial scope; it does not prove claims
 * in the selected excerpt or authorize writing the returned bytes.
 */
export function previewNoteDescriptionExcerpt({ bytes, expectedRevision, excerpt } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 4 * 1024 * 1024)
    throw new TypeError("reviewed note source must be at most four MiB");
  const sourceRevision = sha256(bytes);
  if (sourceRevision !== expectedRevision) throw new Error("note bytes do not match the reviewed source revision");
  if (typeof excerpt !== "string" || excerpt !== excerpt.trim() || excerpt.length < 40 || excerpt.length > 210 ||
      !/^\p{Lu}/u.test(excerpt) || !/[.!?]$/u.test(excerpt) ||
      /[\p{Cc}\p{Zl}\p{Zp}\x60$\\<>\[\]]|NO_ITEM_DATA/iu.test(excerpt))
    throw new TypeError("reviewed abstract excerpt must be a complete, citation-placeholder-free prose line");
  const original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const current = readMarkdownFrontmatter(original);
  const fields = current.frontmatter;
  if (current.format !== "toml" || fields.status !== "draft" || fields.published !== false ||
      typeof fields.id !== "string" || !/^[a-z0-9-]+$/u.test(fields.id) ||
      typeof fields.description !== "string" ||
      !fields.description.startsWith(`+++ id = ${JSON.stringify(fields.id)} title = "Abstract" authors = [`) ||
      !fields.description.endsWith("…"))
    throw new TypeError("only a witnessed truncated TOML header echo in an unpublished draft can be replaced");
  const source = readMarkdownSource(current.body, { frontmatter: false });
  const headings = projectMarkdownStructure(source).headings;
  const abstract = headings[0];
  if (abstract?.level !== 1 || abstract.title !== "Abstract" ||
      !source.lines.slice(0, abstract.startLine - 1).every(line => !line.trim()))
    throw new TypeError("reviewed excerpt requires an opening Abstract heading");
  const last = headings[1]?.startLine ?? source.lines.length + 1;
  const matches = [];
  for (let line = abstract.bodyStartLine; line < last; line++) {
    const raw = source.lines[line - 1];
    if (!raw || /^\s/u.test(raw) || raw.trimEnd() !== excerpt) continue;
    if (source.codeRanges.some(range => range.type === "fenced-code" && range.startLine <= line && line <= range.endLine)) continue;
    if (/^\s*(?:\(NO_ITEM_DATA:|\[@)/iu.test(source.lines[line] ?? "")) continue;
    matches.push(line);
  }
  if (matches.length !== 1) throw new TypeError("reviewed excerpt must match one exact prose line of the opening abstract");
  const fence = splitMarkdownFrontmatterFence(original);
  const raw = original.slice(fence.source.rawStart, fence.source.rawEnd);
  const assignments = [...raw.matchAll(/^description = "(?:[^"\\\r\n]|\\[^\r\n])*"(?=\r?$)/gmu)];
  if (assignments.length !== 1 || original.split(assignments[0][0]).length !== 2)
    throw new TypeError("description must be one exact bare root assignment");
  const [hit] = assignments, previous = hit[0];
  const description = `Abstract excerpt: ${excerpt}`;
  const replacement = "description = " + JSON.stringify(description);
  const { text } = applyMarkdownEdit(original, { kind: markdownEditRequestKind, operations: [
    { operation: "replace-text", search: previous, replacement: replacement, required: true },
  ] });
  const at = fence.source.rawStart + hit.index;
  const updated = readMarkdownFrontmatter(text);
  if (text.slice(0, at) + previous + text.slice(at + replacement.length) !== original ||
      updated.format !== current.format || updated.body !== current.body ||
      !isDeepStrictEqual(updated.frontmatter, { ...fields, description }))
    throw new Error("excerpt would change source text or metadata outside the exact description");
  if (!validateCarrierFrontmatter("note", updated.frontmatter).admitted)
    throw new TypeError("excerpt candidate does not meet the original note admission contract");
  return Object.freeze({ sourceRevision, candidateRevision: sha256(text), abstractBodyLine: matches[0], text });
}

/**
 * Preview a partial record for an existing headerless note, without claiming
 * a creation date. The title comes only from the original opening Markdown H1;
 * the caller reviews the editorial description separately. This preview
 * requires that the only remaining admission failure is the missing date.
 * It does not move the document, assert completeness, or write a file.
 */
export function previewHeaderlessNoteMetadata({ bytes, expectedRevision, description } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 4 * 1024 * 1024)
    throw new TypeError("headerless note preview requires at most four MiB of original UTF-8");
  const sourceRevision = sha256(bytes);
  if (sourceRevision !== expectedRevision) throw new Error("note bytes do not match the reviewed source revision");
  if (typeof description !== "string" || description !== description.trim() || description.length < 30 ||
      description.length > 210 || !description.isWellFormed() || /[\p{Cc}\p{Zl}\p{Zp}]/u.test(description) ||
      !/[.!?]$/u.test(description))
    throw new TypeError("reviewed editorial summary must be one nonblank prose line");
  const original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const bom = original.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = original.slice(bom.length);
  // A missing closing fence is not an absent header. Refuse the opener
  // independently of the incumbent parser's complete-fence recognizer.
  if (/^(?:---|\+\+\+)[ \t]*(?:\r\n|\r|\n|$)/u.test(body) || splitMarkdownFrontmatterFence(original) !== null)
    throw new TypeError("headerless preview refuses existing or incomplete frontmatter");
  const source = readMarkdownSource(body, { frontmatter: false });
  const [heading] = projectMarkdownStructure(source).headings;
  if (heading?.level !== 1 || !heading.title.trim() ||
      !source.lines.slice(0, heading.startLine - 1).every(line => !line.trim()))
    throw new TypeError("headerless note must start with a witnessed level-one title");
  const metadata = { title: heading.title, description: `Editorial summary: ${description}` };
  const newline = /\r\n|\n|\r/u.exec(body)?.[0] ?? "\n";
  const header = dumpMarkdownFrontmatter(metadata, "", "yaml").replaceAll("\n", newline);
  const text = bom + header + body;
  const candidate = readMarkdownFrontmatter(text);
  if (candidate.format !== "yaml" || !isDeepStrictEqual(candidate.frontmatter, metadata) ||
      candidate.body !== body || (bom + candidate.body) !== original)
    throw new Error("header insertion does not preserve the exact original note body");
  const validation = validateCarrierFrontmatter("note", candidate.frontmatter);
  if (validation.admitted || validation.findings.length !== 1 || validation.findings[0].rule !== "required:date-created")
    throw new Error("partial note must remain refused only for the unwitnessed creation date");
  return Object.freeze({
    sourceRevision, candidateRevision: sha256(text), admission: validation, bodyTitleLine: heading.startLine, text,
  });
}

/**
 * Preview a lossless change from a YAML mapping of authored bibliography
 * records to a local-ID list. No title or identifier is created or resolved.
 * Plain, indented map keys become explicit IDs, while original record field
 * lines, remaining header and body are unchanged. Existing IDs, scalar
 * locators and ambiguous layouts refuse rather than changing citation meaning.
 */
export function previewNoteReferenceList({ bytes, expectedRevision } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength > 4 * 1024 * 1024)
    throw new TypeError("reviewed note source must be at most four MiB");
  const sourceRevision = sha256(bytes);
  if (sourceRevision !== expectedRevision) throw new Error("note bytes do not match the reviewed source revision");
  const original = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  const current = readMarkdownFrontmatter(original);
  const fence = splitMarkdownFrontmatterFence(original);
  const records = current.frontmatter.references;
  if (current.format !== "yaml" || fence?.format !== "yaml" || current.frontmatter.status === "relocated-research-source" ||
      records === null || typeof records !== "object" || Array.isArray(records))
    throw new TypeError("only original YAML note maps of authored reference records qualify");
  const entries = Object.entries(records);
  if (!entries.length || entries.length > 200 || entries.some(([id, data]) =>
      !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(id) || data === null || typeof data !== "object" ||
      Array.isArray(data) || Object.hasOwn(data, "id") || typeof data.title !== "string" || !data.title.trim()))
    throw new TypeError("each reference needs its original plain map key and its own nonblank title, with no competing ID");
  const raw = original.slice(fence.source.rawStart, fence.source.rawEnd);
  const headers = [...raw.matchAll(/^references:(?:\r\n|\n)/gmu)];
  if (headers.length !== 1) throw new TypeError("one exact YAML references block is required");
  const h = headers[0], begin = h.index + h[0].length;
  const tail = raw.slice(begin);
  const next = /^[^ \t\r\n]/mu.exec(tail);
  const end = begin + (next?.index ?? tail.length);
  const content = raw.slice(begin, end);
  const seen = new Set();
  const replacement = content.replace(/^  ([A-Za-z0-9][A-Za-z0-9_.:-]{0,127}):(?=\r?$)/gmu, (line, id) => {
    if (!Object.hasOwn(records, id) || seen.has(id)) throw new TypeError("ambiguous reference map key");
    seen.add(id);
    return "  - id: " + JSON.stringify(id);
  });
  if (seen.size !== entries.length) throw new TypeError("reference keys must each occupy their own plain block line");
  const text = original.slice(0, fence.source.rawStart + begin) + replacement + original.slice(fence.source.rawStart + end);
  const updated = readMarkdownFrontmatter(text);
  const expected = { ...current.frontmatter, references: entries.map(([id, data]) => ({ id, ...data })) };
  if (updated.format !== current.format || updated.body !== current.body || !isDeepStrictEqual(updated.frontmatter, expected))
    throw new TypeError("reference conversion would change authored content or citation identity");
  const validation = validateCarrierFrontmatter("note", updated.frontmatter);
  if (!validation.admitted) throw new TypeError("candidate note frontmatter failed admission: " + validation.findings.map(({rule}) => rule).join(", "));
  return Object.freeze({ sourceRevision, candidateRevision: sha256(text), text });
}
