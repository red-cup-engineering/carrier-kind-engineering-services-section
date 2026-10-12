// repo-memory — the fact-manifold ingest. Read the repository's own files THROUGH @561-group/computer
// posix-holography (the fs<->voidmath membrane) into EAVT predication cells in a memory root, so the
// repo BECOMES the swarm's settled memory. Incremental and governed: walk the tree honoring a path
// allow-list and a .gitignore-derived ignore set, skip files over a byte cap, and write ONE EAVT doc
// per file via TTMS write — gating each write on a content-hash so an unchanged file does not re-append.
//
// READ-ONLY. This module never mutates the repo. Every byte read goes through posix-holography
// read-text/stat (the only filesystem byte-touch is the membrane); node:fs is touched ONLY to ENUMERATE
// directory entries (posix-holography exposes no recursive walker), never to read or write a file's bytes.
//
// THE HELD-⊤ IS THE POINT. TTMS write is append-only and monotone: it only ever ADDS an affirmation. So
// when a file's bytes change, the new content-hash writes a NEW cell BESIDE the old one — two distinct
// objects for one (subject, predicate=content-hash). That is a held-⊤ on content-hash, and it is the
// CORRECT held-contradiction: the manifold remembers that this term once hashed H1 and now hashes H2,
// surfaced through settledSection (both cells present), never collapsed to last-writer. The content-hash
// gate only suppresses a re-append of the SAME hash (idempotence); a genuine change is preserved.

import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";          // ENUMERATION ONLY — never a byte read/write
import { extname, join, relative, sep } from "node:path";

import readTextDefault from "@561-group/computer/posix-holography/read-text";
import { attributesOf as statDefault } from "@561-group/computer/posix-holography/stat";
import writeDefault from "@561-group/computer/typed-term-memory-system/writing";

import { memoryRootOf } from "./memory.mjs";
import { settledSection } from "./swarm-sheaf.mjs";

// The repo cells sit in a sibling root under the swarm's memory, never colliding with the
// agents/<name>/messages cells memory.mjs records. memoryRootOf is reused so the two roots share a
// parent by construction rather than by a duplicated literal.
export function repoMemoryRootOf(swarmRoot) {
  return join(memoryRootOf(swarmRoot), "repo");
}

// Every bound is a NAMED default, never a magic literal buried in the walk.
//   allow   — path prefixes / globs a file must match to be ingested (mirrors the CLAUDE.md layer list).
//   ignore  — extra ignore patterns, MERGED with the .gitignore-derived set.
//   sizeCap — a file larger than this many bytes is skipped (a byte budget, not a count).
//   excerpt — the doc's `text` is the file's bytes sliced to this many characters (a byte budget).
export const DEFAULT_INGEST = {
  allow: ["math/", "computer/", "apps/", "theories/", "internal/", "*.md"],
  ignore: [],
  sizeCap: 65536,
  excerpt: 4000,
};

// Parse the repository's root .gitignore (through posix-holography read-text — never node:fs) into a
// Set of ignore patterns, merged with DEFAULT_INGEST.ignore. Comments (# …) and blank lines are
// dropped; a trailing-slash directory marker and a leading slash are normalized off so the walk's
// matcher sees a bare name/glob. A missing .gitignore yields just the DEFAULT_INGEST.ignore patterns.
export function gitignoreSet(repoRoot, readText = readTextDefault) {
  const out = new Set(DEFAULT_INGEST.ignore);
  let text = "";
  try {
    text = readText(join(repoRoot, ".gitignore"));
  } catch {
    return out; // no .gitignore -> only the declared defaults
  }
  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    // normalize a leading "/" (root-anchored) and a trailing "/" (directory marker) off the pattern;
    // the walk matcher tests each path SEGMENT, so the bare token is what it needs.
    out.add(line.replace(/^\//, "").replace(/\/$/, ""));
  }
  return out;
}

// A path SEGMENT matches an ignore pattern when it equals the pattern, or — for a "*.ext" glob — when
// its extension matches. Conservative on purpose: the gitignore mini-language is not fully reimplemented
// (no **, no nested-path anchoring); the common forms (a bare name, a "*.ext" glob, a dir name) cover
// the survey's 57-line root file, and over-ingesting a benign file is read-only and harmless.
function segmentIgnored(segment, ignore) {
  if (ignore.has(segment)) return true;
  for (const pat of ignore) {
    if (pat.startsWith("*.")) {
      const ext = pat.slice(1); // "*.tmp" -> ".tmp"
      if (segment.endsWith(ext)) return true;
    }
  }
  return false;
}

// Any segment of the relative path ignored -> the whole path is ignored (a `.venv/` anywhere prunes).
function pathIgnored(rel, ignore) {
  return rel.split(sep).some((segment) => segmentIgnored(segment, ignore));
}

// The allow-list gate: a relative path is kept iff it matches at least one allow entry. A "*.ext" entry
// is an extension glob (matches ANY depth); any other entry is a path PREFIX (e.g. "apps/").
function pathAllowed(rel, allow) {
  const posix = rel.split(sep).join("/"); // compare in posix form so prefixes read the same on any OS
  for (const entry of allow) {
    if (entry.startsWith("*.")) {
      if (posix.endsWith(entry.slice(1))) return true;
    } else if (posix.startsWith(entry)) {
      return true;
    }
  }
  return false;
}

// content-hash: a sha256 over the file's bytes. A DERIVED structural value (the identity of the
// content), never a literal. Same bytes -> same hash -> the skip-guard fires.
function hashOf(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

// Does the term's settled section already assert this exact content-hash? Read the canonical fold (the
// ONLY read surface — never a hand-parse of the jsonl) and look for ANY content-hash cell whose object
// equals `hash`. Because distinct objects stay distinct cells, a prior H1 and a current H2 are BOTH
// present; we match on the specific hash, so an unchanged file (its hash already a cell) is skipped
// while a changed file (a new hash, no matching cell) writes a new cell beside the old held-⊤.
function alreadyHas(section, hash) {
  for (const { cell } of section.assignments) {
    const predicate = cell?.predicate?.const ?? cell?.predicate;
    if (predicate !== "content-hash") continue;
    const object = cell?.object?.const ?? cell?.object;
    if (object === hash) return true;
  }
  return false;
}

// Enumerate the repo's files (relative paths, posix-joined for stable terms), pruning any directory
// whose name is ignored so we never descend into .venv/ / node_modules/ etc. readdirSync is ENUMERATION
// ONLY; the file's bytes are read later through read-text.
function* walkFiles(dir, ignore, base = dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (segmentIgnored(entry.name, ignore)) continue; // prune ignored dirs/files by name early
    if (entry.isDirectory()) {
      yield* walkFiles(full, ignore, base);
    } else if (entry.isFile()) {
      yield relative(base, full);
    }
  }
}

// ingestRepo(swarmRoot, repoRoot, opts) -> { ingested:[{path,term,hash,skipped}], scanned, written }.
// Every collaborator is INJECTABLE (readText, stat, write, settled, now) so a test runs against a temp
// dir with a fake clock and needs no network, no port, no key, no live filesystem-of-record.
export function ingestRepo(swarmRoot, repoRoot, opts = {}) {
  const allow = opts.allow ?? DEFAULT_INGEST.allow;
  const sizeCap = opts.sizeCap ?? DEFAULT_INGEST.sizeCap;
  const excerpt = opts.excerpt ?? DEFAULT_INGEST.excerpt;
  const readText = opts.readText ?? readTextDefault;
  const stat = opts.stat ?? statDefault;
  const write = opts.write ?? writeDefault;
  const settled = opts.settled ?? settledSection;
  const now = opts.now ?? (() => new Date().toISOString());

  // the ignore set: the .gitignore-derived patterns merged with any caller-supplied extra patterns.
  const ignore = gitignoreSet(repoRoot, readText);
  for (const extra of opts.ignore ?? []) ignore.add(extra);

  const repoMemRoot = repoMemoryRootOf(swarmRoot);
  const ingested = [];
  let scanned = 0;
  let written = 0;

  for (const rel of walkFiles(repoRoot, ignore)) {
    scanned += 1;
    const term = rel.split(sep).join("/"); // the term IS the relative path, in posix form
    if (!pathAllowed(rel, allow)) continue; // not on the allow-list -> not memory
    if (pathIgnored(rel, ignore)) continue; // a nested ignored segment (belt-and-suspenders)

    const full = join(repoRoot, rel);
    const attrs = stat(full); // {size, mtime, …} — through the membrane, never node:fs here
    if (typeof attrs?.size === "number" && attrs.size > sizeCap) {
      ingested.push({ path: rel, term, hash: null, skipped: "oversized" });
      continue;
    }

    const text = readText(full); // the file's bytes, decoded — the only byte-touch, via the membrane
    const hash = hashOf(text);

    const section = settled(repoMemRoot, term);
    if (alreadyHas(section, hash)) {
      // idempotent: this exact content-hash is already a settled cell on this term — do not re-append.
      ingested.push({ path: rel, term, hash, skipped: "unchanged" });
      continue;
    }

    const doc = {
      kind: "repo.file",
      path: rel,
      ext: extname(rel),
      size: typeof attrs?.size === "number" ? attrs.size : String(text).length,
      "content-hash": hash,
      text: String(text).slice(0, excerpt),
      mtime: attrs?.mtime ?? null,
    };
    // t is the transaction/witness mark. now() is injectable so the test pins provenance.
    write(repoMemRoot, term, doc, { t: now() });
    written += 1;
    ingested.push({ path: rel, term, hash, skipped: false });
  }

  return { ingested, scanned, written };
}
