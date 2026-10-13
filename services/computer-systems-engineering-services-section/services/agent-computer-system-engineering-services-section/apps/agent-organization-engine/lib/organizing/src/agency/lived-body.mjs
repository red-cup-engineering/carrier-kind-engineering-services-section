/**
 * The lived body: a character's body natural with its history. An inference endpoint steps into
 * offices and serves as them (an office borrows its incumbent's body, ./organs.mjs), and it stays
 * itself between sessions through what is told about it: the sessions it wore, the judgments of its
 * work, what its work spent, the mail addressed to it and the memory it keeps.
 *
 * Everything here is a pure fold over told records the caller reads (the node's journals, or two
 * nodes' journals joined), so the same character reads as one body wherever its records are. Each
 * record is content-addressed and only added; a read mark or a retraction is its own record.
 *
 * A session is runtime testimony (a held mask), never the body: what the body accrues is joined to
 * it through the sessions it wore, or named directly (an outcome's `player.bearer`).
 * @module
 */
import { organsOf, bodyNatural } from "./organs.mjs";
import { resolve } from "./index.mjs";

const text = (value) => typeof value === "string" && value.length > 0;
const SESSION = /^session:(.+)$/u;

/** The character `ref` names, read from the registry, with the names mail may address it by. */
function characterOf(agency, ref) {
  const record = resolve(agency, "characters", ref);
  if (record === undefined) throw new TypeError(`lived body: no character ${JSON.stringify(ref)}`);
  return record;
}

/**
 * The sessions a character wore: each held mask (`{account: "session:<id>", character, reading, at}`)
 * with what its carrier testimony adds (harness, model, effort), newest reading winning. A session
 * whose latest reading is `denied` has ended.
 */
export function sessionsOf(character, { masks = [], carriers = [] } = {}) {
  const sessions = new Map();
  const ids = new Set([character.id, character.key].filter(text));
  for (const mask of [...masks].sort((left, right) => String(left.at).localeCompare(String(right.at)))) {
    const session = SESSION.exec(String(mask.account ?? ""))?.[1];
    if (session === undefined || !ids.has(mask.character)) continue;
    const prior = sessions.get(session);
    sessions.set(session, { session, since: prior?.since ?? mask.at, last: mask.at, held: mask.reading === "held" });
  }
  for (const carrier of carriers) {
    if (!ids.has(carrier.character) || !sessions.has(carrier.session)) continue;
    const entry = sessions.get(carrier.session);
    for (const field of ["harness", "model", "reasoningEffort"]) if (text(carrier[field])) entry[field] = carrier[field];
  }
  return Object.freeze([...sessions.values()].map((entry) => Object.freeze(entry)));
}

const addTokens = (into, usage) => {
  for (const field of ["input", "cached", "output"]) into[field] = (into[field] ?? 0) + (Number(usage[field]) || 0);
  return into;
};

/**
 * Whether a message is addressed to this body: by its character id, key or name, or to an office
 * it holds (`office:<id or key>`), or to every body (`*`).
 */
export function addressedTo(message, character, offices = []) {
  const to = [message.to].flat().filter(text);
  const names = new Set([character.id, character.key, character.name].filter(text));
  const held = new Set(offices.filter(text));
  return to.some((address) => address === "*" || names.has(address) || (address.startsWith("office:") && held.has(address.slice(7))));
}

/**
 * A character's lived body.
 * @param {object} agency the registry (./index.mjs agencyOf)
 * @param {string} ref the character
 * @param {object} told the records told about it, each list optional:
 *   masks `{account, character, reading, at}`; carriers (harness-carrier testimony);
 *   outcomes (enterprise/outcomes `outcomeOf` records); usage `{session, model?, input, cached, output, at}`;
 *   mail `{kind: "mail", id, to, from, words, at}` and `{kind: "mail-read", id, session, at}`;
 *   memory `{kind: "memory", id, key, text, at}` and `{kind: "memory-retract", key, at}`;
 *   offices, the office ids or keys the body holds now (for office-addressed mail).
 */
export function livedBodyOf(agency, ref, told = {}) {
  const character = characterOf(agency, ref);
  const ids = new Set([character.id, character.key].filter(text));
  const sessions = sessionsOf(character, told);
  const wore = new Set(sessions.map((entry) => entry.session));
  const admitted = {};
  for (const carrier of told.carriers ?? []) {
    if (ids.has(carrier.character) && carrier.reading === "held") admitted[character.id] = [...new Set([...(admitted[character.id] ?? []), ...(carrier.capabilities ?? [])])];
  }

  // Standing: every judgment of work this body played, named by its bearer or carried by its session.
  const standing = { accepted: 0, rejected: 0, voided: 0, byOffice: {}, byCarrier: {} };
  for (const outcome of told.outcomes ?? []) {
    const bearer = outcome.player?.bearer;
    const hand = SESSION.exec(String(outcome.player?.hand ?? ""))?.[1] ?? outcome.player?.hand;
    if (!(ids.has(bearer) || (text(hand) && wore.has(hand)))) continue;
    const verdict = outcome.verdict === "accepted" ? "accepted" : outcome.verdict === "rejected" ? "rejected" : "voided";
    standing[verdict] += 1;
    for (const [axis, key] of [["byOffice", outcome.player?.by], ["byCarrier", outcome.carrier]]) {
      if (!text(key)) continue;
      standing[axis][key] ??= { accepted: 0, rejected: 0, voided: 0 };
      standing[axis][key][verdict] += 1;
    }
  }

  // Spend: the tokens its sessions used.
  const spend = { tokens: {}, bySession: {}, byModel: {} };
  for (const usage of told.usage ?? []) {
    if (!wore.has(usage.session)) continue;
    addTokens(spend.tokens, usage);
    addTokens(spend.bySession[usage.session] ??= {}, usage);
    if (text(usage.model)) addTokens(spend.byModel[usage.model] ??= {}, usage);
  }

  // Mail: what is addressed to it, and what no session of it has read.
  const read = new Set((told.mail ?? []).filter((entry) => entry.kind === "mail-read" && (wore.has(entry.session) || ids.has(entry.character))).map((entry) => entry.id));
  const mine = (told.mail ?? []).filter((entry) => entry.kind === "mail" && addressedTo(entry, character, told.offices))
    .sort((left, right) => String(left.at).localeCompare(String(right.at)));

  // Memory: the latest entry under each key, unless retracted after it.
  const memory = new Map();
  for (const entry of [...(told.memory ?? [])].sort((left, right) => String(left.at).localeCompare(String(right.at)))) {
    if (entry.kind === "memory" && text(entry.key)) memory.set(entry.key, entry);
    if (entry.kind === "memory-retract" && text(entry.key)) memory.delete(entry.key);
  }

  return Object.freeze({
    kind: "organizing.agency.lived-body",
    character: Object.freeze({ id: character.id, key: character.key, name: character.name, ...(text(character.harness) ? { harness: character.harness } : {}), ...(text(character.host) ? { host: character.host } : {}) }),
    organs: organsOf(agency, character.key, { admitted }),
    natural: bodyNatural(agency, character.key, { admitted }),
    sessions,
    present: Object.freeze(sessions.filter((entry) => entry.held).map((entry) => entry.session)),
    standing: Object.freeze(standing),
    spend: Object.freeze(spend),
    mail: Object.freeze({ total: mine.length, messages: Object.freeze(mine), unread: Object.freeze(mine.filter((entry) => !read.has(entry.id))) }),
    memory: Object.freeze([...memory.values()].map(({ key, text: said, at }) => Object.freeze({ key, text: said, at }))),
  });
}
