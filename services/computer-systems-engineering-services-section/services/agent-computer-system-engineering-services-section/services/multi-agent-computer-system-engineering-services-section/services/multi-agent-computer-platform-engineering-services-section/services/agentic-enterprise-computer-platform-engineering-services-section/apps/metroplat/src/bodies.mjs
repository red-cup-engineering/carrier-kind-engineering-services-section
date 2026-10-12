/**
 * The bodies of the house's characters at this node: what each has accrued (organizations/agency
 * lived-body), its mail and its memory, as operations any session can call as its own character.
 *
 * Mail and memory are told records of the store, one thread of type `body-record` per character (a message
 * is the thread of its first recipient): a message `{kind: "mail",
 * to, from, words}`, a read mark `{kind: "mail-read", id, character}`, a memory entry `{kind:
 * "memory", character, key, text}` and its retraction `{kind: "memory-retract", character, key}`.
 * Each is only added; a record told twice reads once.
 * @module
 */
import { createHash } from "node:crypto";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { each, extend, heads, walk, readHead } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { resolve } from "@red-cup-engineering/organizing/agency";
import { livedBodyOf, sessionsOf } from "@red-cup-engineering/organizing/agency/lived-body";
import { outcomeJournal } from "@red-cup-engineering/organizing/enterprise";

/** The store type of a body record: a thread per character. */
export const bodyRecordType = "body-record";
/** The store type of one measured token-usage event (feltos agents/sessions/token-usage): a record `{ e, a, v, t }`. */
export const tokenUsageType = "token-usage-event";
/** How many days of token-usage feeds a lived body's spend reads. */
export const SPEND_DAYS = 14;
const KINDS = new Set(["mail", "mail-read", "memory", "memory-retract"]);
const READ = Object.freeze({ class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" });
const WRITE = Object.freeze({ class: "journal-write", replay: "idempotency-key", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" });
/** The most a message or a memory entry says: a body's records are cards, never documents. */
export const WORDS_LIMIT = 2000;

const text = (value) => typeof value === "string" && value.trim().length > 0;
const addressOf = (record) => `ni:///sha-256;${createHash("sha256").update(JSON.stringify(record)).digest("base64url")}`;

/** Every body record at a data root, each thread causes first and each record once. */
export function readBodyRecords(dataRoot) {
  try {
    const records = [], seen = new Set();
    for (const { name } of heads(dataRoot, bodyRecordType)) {
      const thread = [];
      for (const step of walk(dataRoot, bodyRecordType, readHead(dataRoot, bodyRecordType, name)?.frontier ?? [], { limit: 4096 })) {
        if (step.record !== undefined) thread.push(step.record);
      }
      for (const { causes: _causes, ...record } of thread.reverse()) {
        const key = `${record.kind}\u0000${record.id}\u0000${record.kind === "mail-read" ? record.character : ""}`;
        if (KINDS.has(record.kind) && !seen.has(key)) { seen.add(key); records.push(record); }
      }
    }
    return Object.freeze(records);
  } catch {
    return Object.freeze([]);
  }
}

/** Tell body records: each gets its content address as its id, and the store reads it once. */
export function tellBodyRecords(dataRoot, records) {
  const told = records.map((record) => {
    if (!KINDS.has(record.kind)) throw new TypeError(`body records are ${[...KINDS].join(", ")}`);
    const { id: _id, ...said } = record;
    return Object.freeze({ ...said, id: record.kind === "mail-read" ? record.id : addressOf(said) });
  });
  for (const record of told) extend(dataRoot, bodyRecordType, String(record.character ?? [record.to].flat()[0]), record);
  return Object.freeze(told);
}

const count = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0);

/**
 * The token usage the node's journal holds for the last `days` days (today included), as the rows
 * a lived body folds into its spend: `{session, model, input, cached, output, at}`. One streaming
 * pass over the `token-usage-event` records keeps only the `turn` events of those days, each once
 * (a transcript admitted again writes the same records). `input` is the uncached
 * input (OpenAI counts its cached input within `inputTokens`, so that is taken out; cache writes
 * count here), `cached` is the cache reads.
 *
 * Computed on demand and held by nothing afterwards: a read keeps only the rows (and their keys) of
 * `sessions` when given, the sessions the asking body wore, so what it holds is that body's own
 * turns, never every session's turns of every day.
 */
export function readTokenUsageRows(dataRoot, { days = SPEND_DAYS, today = new Date().toISOString().slice(0, 10), sessions } = {}) {
  const seen = new Set();
  const rows = [];
  const first = new Date(new Date(`${today}T00:00:00Z`).getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  try {
    for (const { record } of each(dataRoot, tokenUsageType)) {
      const event = record.v;
      if (event?.kind !== "metroplat.agent-session.token-usage-event" || event.usageKind !== "turn" || !text(event.sessionId)) continue;
      if (sessions !== undefined && !sessions.has(event.sessionId)) continue;
      const date = String(text(event.at) ? event.at : record.t).slice(0, 10);
      if (date < first || date > today) continue;
      const key = `${event.provider}\n${event.sessionId}\n${event.source}\n${event.row}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const usage = event.usage ?? {};
      const cached = count(usage.cachedInputTokens);
      rows.push(Object.freeze({
        session: event.sessionId,
        ...(text(event.model) ? { model: event.model } : {}),
        input: Math.max(0, count(usage.inputTokens) - cached) + count(usage.cacheCreationInputTokens),
        cached: cached + count(usage.cacheReadInputTokens),
        output: count(usage.outputTokens),
        at: text(event.at) ? event.at : date,
      }));
    }
  } catch { /* a store that cannot be read adds no spend */ }
  return Object.freeze(rows);
}

/**
 * A character's lived body from what this data root holds: its body records, the outcome journal,
 * and the masks and carrier testimony the caller passes as `told`.
 */
export function livedBodyAt(dataRoot, agency, characterRef, { told = {}, offices = [], spendDays = SPEND_DAYS } = {}) {
  const records = readBodyRecords(dataRoot);
  const character = resolve(agency, "characters", characterRef);
  const key = character?.key;
  let outcomes = [];
  try { outcomes = outcomeJournal(dataRoot).read(); } catch { /* a node with no outcome journal judges nothing */ }
  // Spend counts only the sessions the body wore, so only theirs are read.
  const wore = character === undefined ? new Set() : new Set(sessionsOf(character, told).map((entry) => entry.session));
  return livedBodyOf(agency, characterRef, {
    usage: told.usage ?? readTokenUsageRows(dataRoot, { days: spendDays, sessions: wore }), ...told, outcomes, offices,
    mail: records.filter((record) => record.kind === "mail" || record.kind === "mail-read"),
    memory: records.filter((record) => (record.kind === "memory" || record.kind === "memory-retract") && resolve(agency, "characters", record.character)?.key === key),
  });
}

const words = (value, what) => {
  if (!text(value)) throw new TypeError(`${what} says something`);
  if (value.length > WORDS_LIMIT) throw new TypeError(`${what} says at most ${WORDS_LIMIT} characters; a longer text is a document, and a card names where it is`);
  return value.trim();
};

/**
 * The body operations. `characterOf(account)` names the character an account plays (undefined when
 * it plays none), `officesOf(account)` the offices it holds now, `told(dataRoot)` the masks and
 * carrier testimony this node holds.
 */
export function bodyOperations(binding, { agency, subjectOf, characterOf, officesOf, told }) {
  const caller = (context) => {
    const account = subjectOf(context, "anonymous");
    const character = characterOf(account);
    if (character === undefined) throw new TypeError(`${account} plays no character of the agency records, so it has no body here`);
    return { account, character };
  };
  const bodyOf = (characterRef, account) => livedBodyAt(binding.dataRoot, agency(), characterRef, { told: told(binding.dataRoot), offices: account === undefined ? [] : officesOf(account) });
  return Object.freeze([
    operation({
      verb: "body", inputFormat: "json", outputFormat: "json",
      summary: "A character's lived body here: its sessions, organs, standing, spend, mail and memory (by default, the caller's).",
      domain: schemaFrom({ $id: "metroplat/body/input", title: "BodyRequest", type: "object", properties: { character: { type: "string", minLength: 1 } }, additionalProperties: false }),
      codomain: schemaFrom({ $id: "metroplat/body/output", title: "LivedBody", type: "object", required: ["kind", "character"] }),
      relation: "boundary", effects: READ,
      run: (input, _args, context) => {
        if (text(input?.character)) return bodyOf(input.character);
        const { account, character } = caller(context);
        return bodyOf(character, account);
      },
    }),
    operation({
      verb: "mail", inputFormat: "json", outputFormat: "json",
      summary: "Send a message to a character (by id or name), to whoever holds an office (office:<id>), or to everyone (*): it waits in each body's mail until one of its sessions reads it.",
      domain: schemaFrom({ $id: "metroplat/mail/input", title: "MailRequest", type: "object", required: ["to", "words"], properties: {
        to: { oneOf: [{ type: "string", minLength: 1 }, { type: "array", minItems: 1, items: { type: "string", minLength: 1 } }] },
        words: { type: "string", minLength: 1, maxLength: WORDS_LIMIT },
      }, additionalProperties: false }),
      codomain: schemaFrom({ $id: "metroplat/mail/output", title: "MailSent", type: "object", required: ["kind", "id"] }),
      relation: "boundary", effects: WRITE,
      run: (input, _args, context) => {
        const at = binding.now();
        const from = characterOf(subjectOf(context, "anonymous")) ?? subjectOf(context, "anonymous");
        const [sent] = tellBodyRecords(binding.dataRoot, [{ kind: "mail", to: [input.to].flat(), from, words: words(input.words, "a message"), at }], { at, caller: { transport: "mail", from } });
        return Object.freeze({ kind: "metroplat.mail-sent", id: sent.id, to: sent.to, at });
      },
    }),
    operation({
      verb: "mail-read", inputFormat: "json", outputFormat: "json",
      summary: "Read the caller's unread mail, marking it read for its body (every session of it).",
      domain: schemaFrom({ $id: "metroplat/mail-read/input", title: "MailReadRequest", type: "object", additionalProperties: false }),
      codomain: schemaFrom({ $id: "metroplat/mail-read/output", title: "MailRead", type: "object", required: ["kind", "messages"] }),
      relation: "boundary", effects: WRITE,
      run: (_input, _args, context) => {
        const { account, character } = caller(context);
        const body = bodyOf(character, account);
        const at = binding.now();
        if (body.mail.unread.length > 0) tellBodyRecords(binding.dataRoot, body.mail.unread.map((message) => ({ kind: "mail-read", id: message.id, character: body.character.id, at })), { at, caller: { transport: "mail-read", account } });
        return Object.freeze({ kind: "metroplat.mail-read", messages: body.mail.unread.map(({ id, from, words: said, at: sentAt }) => Object.freeze({ id, from, words: said, at: sentAt })) });
      },
    }),
    operation({
      verb: "remember", inputFormat: "json", outputFormat: "json",
      summary: "Keep one memory under a key in the caller's body: every later session of it starts with it. The same key again replaces it.",
      domain: schemaFrom({ $id: "metroplat/remember/input", title: "RememberRequest", type: "object", required: ["key", "text"], properties: {
        key: { type: "string", minLength: 1, maxLength: 120 }, text: { type: "string", minLength: 1, maxLength: WORDS_LIMIT },
      }, additionalProperties: false }),
      codomain: schemaFrom({ $id: "metroplat/remember/output", title: "Remembered", type: "object", required: ["kind", "key"] }),
      relation: "boundary", effects: WRITE,
      run: (input, _args, context) => {
        const { character } = caller(context);
        const at = binding.now();
        tellBodyRecords(binding.dataRoot, [{ kind: "memory", character, key: input.key.trim(), text: words(input.text, "a memory"), at }], { at, caller: { transport: "remember", character } });
        return Object.freeze({ kind: "metroplat.remembered", key: input.key.trim(), at });
      },
    }),
    operation({
      verb: "forget", inputFormat: "json", outputFormat: "json",
      summary: "Retract the caller's body's memory under a key.",
      domain: schemaFrom({ $id: "metroplat/forget/input", title: "ForgetRequest", type: "object", required: ["key"], properties: { key: { type: "string", minLength: 1, maxLength: 120 } }, additionalProperties: false }),
      codomain: schemaFrom({ $id: "metroplat/forget/output", title: "Forgotten", type: "object", required: ["kind", "key"] }),
      relation: "boundary", effects: WRITE,
      run: (input, _args, context) => {
        const { character } = caller(context);
        const at = binding.now();
        tellBodyRecords(binding.dataRoot, [{ kind: "memory-retract", character, key: input.key.trim(), at }], { at, caller: { transport: "forget", character } });
        return Object.freeze({ kind: "metroplat.forgotten", key: input.key.trim(), at });
      },
    }),
  ]);
}
