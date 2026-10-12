import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { walkPosixPaths } from "@red-cup-engineering/path-walking-service";
import { RELATION_KEYS } from "../convention.mjs";
import { FrontmatterError, makeFlatfile, parseFrontmatter } from "./flatfile.mjs";
import { parseLinks } from "./markdown-links.mjs";
import { makePredication, slugOf } from "./predication.mjs";

// Vendored/build/draft dirs and the never-a-note README.md sentinel, skipped
// at any depth. A caller with a narrower or wider corpus convention passes
// its own excludes.
export const DEFAULT_EXCLUDES = Object.freeze([
  ".git", "node_modules", "public", ".lake", ".venv", "__pycache__",
  "build", "dist", "archetypes", "triage", "README.md",
]);

function singularize(s) {
  return s.length > 1 && s.endsWith("s") ? s.slice(0, -1) : s;
}

// A note's slug is the file stem, except for sentinel filenames whose stem
// is the same in every directory: "_index.md" (section index) and
// "SKILL.md" (per-skill marker) — those take "<parent>-<stem>" so each
// occurrence gets a unique, path-derived slug.
function deriveSlug(fileName, parentName) {
  if (fileName === "_index.md") return `${parentName}-index`;
  if (fileName === "SKILL.md") return `${parentName}-skill`;
  return fileName.slice(0, -3);
}

function deriveKind(fm, parentName) {
  return fm.kind ? String(fm.kind) : singularize(parentName);
}

// Walks root with path-walking-service's walkPosixPaths for deterministic
// discovery, reads every ".md" file, and parses each with frontmatter into
// a Flatfile. Files without a frontmatter block are silently skipped — that
// is a non-note markdown file, not an error. A file whose frontmatter block
// exists but fails to parse is reported as a diagnostic and skipped.
export async function loadFlatfiles(root, { excludes = DEFAULT_EXCLUDES } = {}) {
  const walk = await walkPosixPaths({ root, excludes });
  const notes = [];
  const diagnostics = [];
  for (const entry of walk.files) {
    if (entry.kind !== "file" || !entry.path.endsWith(".md")) continue;
    const absolutePath = join(root, entry.path);
    let text;
    try {
      text = await readFile(absolutePath, "utf8");
    } catch (err) {
      diagnostics.push({ code: "file-read-error", path: entry.path, message: err.message });
      continue;
    }
    let fm;
    let body;
    try {
      ({ fm, body } = parseFrontmatter(text));
    } catch (err) {
      if (!(err instanceof FrontmatterError)) throw err;
      diagnostics.push({ code: "frontmatter-parse", path: entry.path, message: err.message });
      continue;
    }
    if (fm === null) continue;
    const segments = entry.path.split("/");
    const fileName = segments.at(-1);
    const parentName = segments.length >= 2 ? segments.at(-2) : "";
    const mtime = (await stat(absolutePath)).mtimeMs / 1000;
    notes.push(makeFlatfile({
      slug: deriveSlug(fileName, parentName),
      dir: parentName,
      kind: deriveKind(fm, parentName),
      fm,
      body,
      path: entry.path,
      mtime,
    }));
  }
  return { notes, diagnostics };
}

// Frontmatter relations (depends-on, see-also, ...) become Predications
// with source "fm" and kind = the relation name. Body markdown links to
// ".md" targets become Predications with source "body" and kind "link".
// Visits notes in their given order; within each note, its fm-relation
// edges precede its body-link edges.
export function buildEdges(notes, { sources = ["fm", "body"], relationKeys = RELATION_KEYS } = {}) {
  const wantFm = sources.includes("fm");
  const wantBody = sources.includes("body");
  const out = [];
  for (const note of notes) {
    if (wantFm) {
      for (const key of relationKeys) {
        const value = note.fm[key];
        const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        for (const item of items) {
          if (typeof item !== "string") continue;
          const dst = slugOf(item);
          if (dst === null) continue;
          out.push(makePredication({ src: note.slug, dst, kind: key, source: "fm" }));
        }
      }
    }
    if (wantBody) {
      for (const link of parseLinks(note.body)) {
        if (link.kind !== "relative" && link.kind !== "absolute") continue;
        const dst = slugOf(link.targetRaw, { requireMd: true });
        if (dst === null) continue;
        out.push(makePredication({ src: note.slug, dst, kind: "link", source: "body", line: link.line }));
      }
    }
  }
  return out;
}
