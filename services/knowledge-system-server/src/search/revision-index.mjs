/**
 * src/search/revision-index - CAIRN's durable archive index: every revision of every document
 * any source has held (a repository's whole history, deleted documents included; other
 * repositories and machines; transcripts), full-text searchable in one SQLite FTS5 file.
 *
 * A body is keyed by its git blob id, so the same text from any source is indexed once and a
 * later pass reads only what is new. Occurrences say where a body stood: source, path, the
 * revision that wrote or deleted it, and when.
 */
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { gitBlobReader, gitRefTips, gitRevisions } from "@red-cup-engineering/computer-code-development-engine/git/history";
import { gitBlobIdOf } from "@red-cup-engineering/git-services-section/git-object-id";
import { eavtRecord } from "@red-cup-engineering/eavt/row";
import { claudeCodeSessionChronicleFromJsonl, claudeSessionAuthoredChronicle } from "@red-cup-engineering/feltos/agents/sessions/claude-code/codec";
import { codexSessionAuthoredChronicle, codexSessionChronicleOfContent } from "@red-cup-engineering/feltos/agents/sessions/codex/codec";

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const BATCH = 500;

/** The index file a host uses unless it names another. */
export const defaultRevisionIndexFile = (environment = process.env) =>
  environment.CAIRN_REVISION_INDEX ?? path.join(environment.XDG_STATE_HOME ?? path.join(homedir(), ".local", "state"), "561-group", "cairn", "revisions.sqlite");


function titleOf(text, file) {
  const front = /^---\n([\s\S]*?)\n---/u.exec(text)?.[1];
  const declared = front && /^(?:title|name):\s*["']?(.+?)["']?\s*$/mu.exec(front)?.[1];
  return declared ?? /^#\s+(.+)$/mu.exec(text)?.[1] ?? path.posix.basename(file ?? "");
}

/** Words as quoted FTS5 terms, so punctuation ("ActivityPub++", "x402") never parses as syntax. */
function matchExpression(query) {
  return query.split(/\s+/u).filter(Boolean).map((word) => `"${word.replaceAll('"', '""')}"`).join(" ");
}

/** What was said in one session transcript, as "role: text" paragraphs, through the harness's own codec. */
export function transcriptText(harness, content) {
  const chronicle = harness === "codex"
    ? codexSessionAuthoredChronicle(codexSessionChronicleOfContent(content))
    : claudeSessionAuthoredChronicle(claudeCodeSessionChronicleFromJsonl({ content }));
  return chronicle.statements.map((row) => {
    const { v, t } = eavtRecord(row);
    return `${v.boundary?.event ?? "said"} (${t}): ${v.material.raw}`;
  }).join("\n\n");
}

function* jsonlFiles(root) {
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) yield* jsonlFiles(full);
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) yield full;
  }
}

/** node:sqlite rows have no prototype; a plain object is what JSON boundaries accept. */
const plain = (rows) => rows.map((row) => ({ ...row }));

export function openRevisionIndex(file = defaultRevisionIndexFile()) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS body (id TEXT PRIMARY KEY, title TEXT, bytes INTEGER);
    CREATE VIRTUAL TABLE IF NOT EXISTS body_text USING fts5 (id UNINDEXED, title, text, tokenize = 'unicode61 remove_diacritics 2');
    CREATE TABLE IF NOT EXISTS occurrence (id TEXT, source TEXT, path TEXT, revision TEXT, at TEXT, deleted INTEGER, PRIMARY KEY (id, source, path, revision));
    CREATE INDEX IF NOT EXISTS occurrence_place ON occurrence (source, path, at);
    CREATE TABLE IF NOT EXISTS cursor (source TEXT, tip TEXT, PRIMARY KEY (source, tip));`);
  const has = db.prepare("SELECT 1 FROM body WHERE id = ?");
  const putBody = db.prepare("INSERT OR IGNORE INTO body (id, title, bytes) VALUES (?, ?, ?)");
  const putText = db.prepare("INSERT INTO body_text (id, title, text) VALUES (?, ?, ?)");
  const putOccurrence = db.prepare("INSERT OR IGNORE INTO occurrence (id, source, path, revision, at, deleted) VALUES (?, ?, ?, ?, ?, ?)");
  const occurrencesOf = db.prepare(`SELECT source, path, MIN(at) AS first, MAX(at) AS last, MAX(deleted) AS deleted
    FROM occurrence WHERE id = ? GROUP BY source, path ORDER BY last DESC`);

  function admitBody(id, bytes, file) {
    if (has.get(id) !== undefined || bytes.length > MAX_BODY_BYTES || bytes.includes(0)) return false;
    const text = bytes.toString("utf8");
    const title = titleOf(text, file);
    putBody.run(id, title, bytes.length);
    putText.run(id, title, text);
    return true;
  }

  const index = Object.freeze({
    file,
    /** Read one repository's history since its last pass, as `source`. */
    async ingestGit(repository, { source = repository, pathspecs = ["*.md"], onProgress } = {}) {
      const reader = gitBlobReader(repository);
      const tips = await gitRefTips(repository);
      const known = db.prepare("SELECT tip FROM cursor WHERE source = ?").all(source).map((row) => row.tip);
      const exclude = [];
      for (const tip of known) if (await reader.read(tip) !== undefined) exclude.push(tip);
      let revisions = 0, bodies = 0;
      db.exec("BEGIN");
      try {
        for await (const revision of gitRevisions(repository, { pathspecs, exclude })) {
          putOccurrence.run(revision.blob, source, revision.path, revision.commit, revision.at, revision.deleted ? 1 : 0);
          if (!revision.deleted && has.get(revision.blob) === undefined) {
            const bytes = await reader.read(revision.blob);
            if (bytes !== undefined && admitBody(revision.blob, bytes, revision.path)) bodies += 1;
          }
          if (++revisions % BATCH === 0) { db.exec("COMMIT; BEGIN"); onProgress?.({ source, revisions, bodies }); }
        }
        db.prepare("DELETE FROM cursor WHERE source = ?").run(source);
        const putTip = db.prepare("INSERT OR IGNORE INTO cursor (source, tip) VALUES (?, ?)");
        for (const tip of tips) putTip.run(source, tip);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      } finally {
        await reader.close();
      }
      return Object.freeze({ source, revisions, bodies });
    },
    /** Admit documents that live outside git (transcripts, exports), each `{ source, path, revision, at, text }`. */
    admitDocuments(documents) {
      let bodies = 0;
      db.exec("BEGIN");
      try {
        for (const document of documents) {
          const bytes = Buffer.from(document.text, "utf8");
          const id = gitBlobIdOf(bytes);
          putOccurrence.run(id, document.source, document.path, document.revision ?? id, document.at ?? null, 0);
          if (admitBody(id, bytes, document.path)) bodies += 1;
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return Object.freeze({ bodies });
    },
    /** Admit every session transcript under a root not yet read at its current size, as `source`. */
    admitTranscripts(root, { harness, source = `${harness}:${root}` }) {
      const seen = db.prepare("SELECT 1 FROM occurrence WHERE source = ? AND path = ? AND revision = ?");
      let sessions = 0, bodies = 0;
      for (const file of jsonlFiles(root)) {
        const { size, mtime } = statSync(file);
        const relative = path.relative(root, file), revision = `size:${size}`;
        if (seen.get(source, relative, revision) !== undefined) continue;
        let text;
        try { text = transcriptText(harness, readFileSync(file, "utf8")); } catch { continue; }
        if (text.length === 0) continue;
        bodies += index.admitDocuments([{ source, path: relative, revision, at: mtime.toISOString(), text }]).bodies;
        sessions += 1;
      }
      return Object.freeze({ source, sessions, bodies });
    },
    /** The best-matching bodies for a query, each with where it stood and whether it was deleted there. */
    search(query, { limit = 20, raw = false } = {}) {
      const expression = raw ? query : matchExpression(query);
      const wanted = Math.min(Math.max(1, limit), 200);
      // Words the tokenizer would split ("ActivityPub++", "x402-v2") must also appear verbatim.
      const verbatim = raw ? [] : query.split(/\s+/u).filter((word) => /[^\p{L}\p{N}]/u.test(word)).map((word) => word.replace(/^"|"$/gu, ""));
      const rows = db.prepare(`SELECT id, title, bm25(body_text) AS score, snippet(body_text, 2, '«', '»', '…', 24) AS snippet
        FROM body_text WHERE body_text MATCH ? ${verbatim.map(() => "AND instr(text, ?) > 0").join(" ")} ORDER BY score LIMIT ?`)
        .all(expression, ...verbatim, wanted * 10).map((row) => ({ ...row }));
      // One hit per document: its revisions share a title and a latest file name.
      const documents = new Map();
      for (const row of rows) {
        const occurrences = plain(occurrencesOf.all(row.id));
        const key = `${row.title}\u0000${path.posix.basename(occurrences[0]?.path ?? row.id)}`;
        const known = documents.get(key);
        if (known === undefined) documents.set(key, { ...row, revisions: 1, occurrences });
        else known.revisions += 1;
        if (documents.size === wanted && known === undefined) break;
      }
      return Object.freeze([...documents.values()].slice(0, wanted).map((hit) => Object.freeze(hit)));
    },
    /** One body's text and occurrences. */
    read(id) {
      const row = db.prepare("SELECT id, title, text FROM body_text WHERE id = ?").get(id);
      return row === undefined ? undefined : Object.freeze({ ...row, occurrences: plain(occurrencesOf.all(id)) });
    },
    /** How much the index holds, per source. */
    summary() {
      return Object.freeze({ file, bodies: db.prepare("SELECT COUNT(*) AS n FROM body").get().n,
        sources: plain(db.prepare("SELECT source, COUNT(*) AS occurrences, MAX(at) AS latest FROM occurrence GROUP BY source").all()) });
    },
    close: () => db.close(),
  });
  return index;
}

/** The index's verbs for the one node's catalog: archive-search, archive-read, archive-summary, archive-ingest-git, archive-ingest-transcripts. */
export function revisionIndexOperations(binding = {}) {
  let opened;
  const index = () => (opened ??= openRevisionIndex(binding.revisionIndexFile ?? defaultRevisionIndexFile()));
  const record = (input) => (input !== null && typeof input === "object" && !Array.isArray(input) ? input : {});
  return Object.freeze([
    operation({
      verb: "archive-search", inputFormat: "json", outputFormat: "json",
      summary: "Search every revision of every document the archive has held, deleted ones included.",
      description: "Domain: { query, limit?, raw? }. Words match exactly as given; raw passes FTS5 syntax through.",
      run: (input) => index().search(String(record(input).query ?? ""), { limit: record(input).limit, raw: record(input).raw === true }),
    }),
    operation({
      verb: "archive-read", inputFormat: "json", outputFormat: "json",
      summary: "Read one archived body by its blob id, with every place it stood.",
      description: "Domain: { id }.",
      run: (input) => index().read(String(record(input).id ?? "")) ?? null,
    }),
    operation({
      verb: "archive-summary", inputFormat: "json", outputFormat: "json",
      summary: "How many bodies the archive index holds, per source.",
      description: "Domain: {}.",
      run: () => index().summary(),
    }),
    operation({
      verb: "archive-ingest-git", inputFormat: "json", outputFormat: "json",
      summary: "Read a repository's history into the archive index since its last pass.",
      description: "Domain: { repository, source?, pathspecs? }.",
      run: (input) => index().ingestGit(String(record(input).repository ?? binding.dataRoot), {
        ...(typeof record(input).source === "string" ? { source: record(input).source } : {}),
        ...(Array.isArray(record(input).pathspecs) ? { pathspecs: record(input).pathspecs } : {}),
      }),
    }),
    operation({
      verb: "archive-ingest-transcripts", inputFormat: "json", outputFormat: "json",
      summary: "Read what was said in every agent session transcript under a root into the archive index.",
      description: "Domain: { root, harness: \"codex\" | \"claude\", source? }.",
      run: (input) => index().admitTranscripts(String(record(input).root ?? ""), {
        harness: record(input).harness === "codex" ? "codex" : "claude",
        ...(typeof record(input).source === "string" ? { source: record(input).source } : {}),
      }),
    }),
  ]);
}
