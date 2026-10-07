import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { agencyAt } from "@red-cup-engineering/organizing/agency/held";
import { openJournal } from "@red-cup-engineering/computer-system-engine/journal/journal";
import { toEavt } from "@red-cup-engineering/eavt/row";
import { bodyOperations, livedBodyAt, readBodyRecords, readTokenUsageRows, WORDS_LIMIT } from "../src/bodies.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const lib = here.slice(0, here.indexOf(`${path.sep}emsenn${path.sep}services${path.sep}561-group`));
const agency = agencyAt(lib);
const codex = [...agency.characters.values()].find((character) => character.harness === "codex");
const claude = [...agency.characters.values()].find((character) => character.harness === "claude");

function node() {
  let clock = Date.parse("2026-10-04T20:00:00Z");
  const binding = { ...defaultFilesystemBinding(mkdtempSync(path.join(tmpdir(), "bodies-"))), now: () => new Date(clock += 1000).toISOString() };
  const as = (account) => ({ subject: account });
  const ops = new Map(bodyOperations(binding, {
    agency: () => agency, subjectOf: (context, fallback) => context?.subject ?? fallback,
    characterOf: (account) => [codex, claude].find((character) => character.id === account)?.id,
    officesOf: () => [], told: () => ({}),
  }).map((op) => [op.verb, op]));
  const call = (verb, input, account) => ops.get(verb).execute(input, {}, as(account));
  return { binding, call };
}

test("mail waits in a body until one of its sessions reads it, then once is enough", () => {
  const { call } = node();
  const sent = call("mail", { to: codex.name, words: "stop releasing by hand; name a candidate" }, claude.id);
  assert.ok(sent.id.startsWith("ni:///sha-256;"));
  assert.equal(call("body", {}, codex.id).mail.unread.length, 1);
  const read = call("mail-read", {}, codex.id);
  assert.deepEqual(read.messages.map((message) => [message.from, message.words]), [[claude.id, "stop releasing by hand; name a candidate"]]);
  assert.equal(call("mail-read", {}, codex.id).messages.length, 0);
  assert.equal(call("body", {}, claude.id).mail.total, 0, "mail to another body is not this body's");
});

test("a body keeps what it remembers across its sessions, one entry per key, until it forgets", () => {
  const { binding, call } = node();
  call("remember", { key: "landing", text: "land through the queue" }, codex.id);
  call("remember", { key: "landing", text: "land through the queue; never release by hand" }, codex.id);
  call("remember", { key: "scratch", text: "temporary" }, codex.id);
  call("forget", { key: "scratch" }, codex.id);
  assert.deepEqual(call("body", {}, codex.id).memory.map((entry) => [entry.key, entry.text]), [["landing", "land through the queue; never release by hand"]]);
  assert.deepEqual(call("body", {}, claude.id).memory, [], "one body's memory is its own");
  assert.equal(readBodyRecords(binding.dataRoot).length, 4);
});

test("a body's records are cards: a document is refused, and an account with no character has no body", () => {
  const { call } = node();
  assert.throws(() => call("remember", { key: "k", text: "x".repeat(WORDS_LIMIT + 1) }, codex.id), new RegExp(`${WORDS_LIMIT}`, "u"));
  assert.throws(() => call("body", {}, "account:nobody"), /no character/u);
});

const turn = (session, row, usage, at, model = "claude-opus") => toEavt({
  e: { protocol: "agent-session-token-usage", provider: "anthropic", surface: "claude-code", source: `${session}.jsonl`, row, usageKind: "turn", session },
  a: { event: "measure-token-usage", provider: "anthropic", surface: "claude-code", usageKind: "turn" },
  v: { kind: "metroplat.agent-session.token-usage-event", provider: "anthropic", surface: "claude-code", sessionId: session, source: `${session}.jsonl`, row, at, model, usageKind: "turn", usage },
  t: at,
});

test("a body's spend is the token-usage feed's turns of the sessions it wore, and of no other session", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "spend-"));
  const journal = openJournal(dataRoot);
  const feed = (day, rows) => journal.appendRows("agent-session-token-usage", rows, { at: day, subject: "agent-session-token-usage", caller: { transport: "test" } });
  const wore = [turn("sess-a", 1, { inputTokens: 10, cacheCreationInputTokens: 5, cacheReadInputTokens: 100, outputTokens: 7 }, "2026-10-04T10:00:00Z")];
  feed("2026-10-04", [...wore, turn("sess-other", 1, { inputTokens: 999, outputTokens: 999 }, "2026-10-04T10:01:00Z")]);
  feed("2026-10-03", [turn("sess-a", 2, { inputTokens: 1, cacheReadInputTokens: 2, outputTokens: 3 }, "2026-10-03T10:00:00Z")]);
  feed("2026-09-01", [turn("sess-a", 3, { inputTokens: 1_000_000, outputTokens: 1 }, "2026-09-01T10:00:00Z")]);
  feed("2026-10-04", wore);
  const masks = [{ account: "session:sess-a", character: claude.id, reading: "held", at: "2026-10-04T09:00:00Z" }];

  const rows = readTokenUsageRows(dataRoot, { today: "2026-10-04" });
  assert.equal(rows.length, 3, "re-admitted readings count once, and a day past the window is not read");
  assert.deepEqual(rows.find((row) => row.session === "sess-a" && row.output === 7), { session: "sess-a", model: "claude-opus", input: 15, cached: 100, output: 7, at: "2026-10-04T10:00:00Z" });

  const body = livedBodyAt(dataRoot, agency, claude.id, { told: { masks } });
  assert.deepEqual(body.spend.tokens, { input: 16, cached: 102, output: 10 });
  assert.deepEqual(Object.keys(body.spend.bySession), ["sess-a"]);
  assert.deepEqual(livedBodyAt(dataRoot, agency, codex.id, { told: { masks } }).spend.tokens, {}, "another body wore none of those sessions");
});
