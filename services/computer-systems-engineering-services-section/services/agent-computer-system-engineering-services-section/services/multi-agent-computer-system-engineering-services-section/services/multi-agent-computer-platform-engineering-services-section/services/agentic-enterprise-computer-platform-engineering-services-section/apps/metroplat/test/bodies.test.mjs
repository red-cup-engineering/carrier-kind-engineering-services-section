import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { agencyAt } from "@red-cup-engineering/organizing/agency/held";
import { put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { toEavt } from "@red-cup-engineering/eavt-services-section/row";
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

test("a body's spend is the token-usage events' turns of the sessions it wore, and of no other session", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "spend-"));
  // A measured turn is a `token-usage-event` record; admitting it again is the same record.
  const feed = (_day, rows) => { for (const [e, a, v, t] of rows) put(dataRoot, "token-usage-event", { e, a, v, t }); };
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

test("reading only the sessions a body wore keeps exactly the turns the whole read keeps for them", () => {
  const dataRoot = mkdtempSync(path.join(tmpdir(), "spend-filtered-"));
  // A measured turn is a `token-usage-event` record; admitting it again is the same record.
  const feed = (_day, rows) => { for (const [e, a, v, t] of rows) put(dataRoot, "token-usage-event", { e, a, v, t }); };
  const usage = (n) => ({ inputTokens: 100 + n, cachedInputTokens: n % 3, cacheCreationInputTokens: n % 5, cacheReadInputTokens: 10 * n, outputTokens: 7 + n });
  const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"];
  for (const [d, day] of days.entries()) {
    const rows = [];
    for (let n = 0; n < 12; n += 1) rows.push(turn(`sess-${n % 4}`, d * 12 + n, usage(d * 12 + n), `${day}T10:${String(n).padStart(2, "0")}:00Z`, n % 2 ? "claude-opus" : "gpt-5"));
    // A transcript re-admitted a day later carries its earlier turns again.
    if (d > 0) rows.push(turn("sess-1", (d - 1) * 12 + 1, usage((d - 1) * 12 + 1), `${days[d - 1]}T10:01:00Z`, "claude-opus"));
    feed(day, rows);
  }
  const whole = readTokenUsageRows(dataRoot, { today: "2026-10-04" });
  for (const worn of [new Set(["sess-1"]), new Set(["sess-0", "sess-3"]), new Set(), new Set(["sess-0", "sess-1", "sess-2", "sess-3"])]) {
    assert.deepEqual(readTokenUsageRows(dataRoot, { today: "2026-10-04", sessions: worn }), whole.filter((row) => worn.has(row.session)));
  }
  assert.equal(whole.filter((row) => row.session === "sess-1").length, 12, "each re-admitted turn counts once");
});
