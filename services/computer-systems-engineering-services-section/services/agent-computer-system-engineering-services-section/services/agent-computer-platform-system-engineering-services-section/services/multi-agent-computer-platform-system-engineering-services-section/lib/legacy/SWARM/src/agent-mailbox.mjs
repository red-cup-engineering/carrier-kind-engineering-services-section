// agent-mailbox — inter-agent inbox/outbox channels with NO message bus. The EAVT trace IS the channel.
//
// stigmergy.mjs states the corpus rule plainly: "the OS's append-only EAVT log IS an environment-trace
// field" and so swarm needs NO message bus — a worker DEPOSITS a mark by appending a {e,a,v,t} row at a
// field cell; another worker SENSES it by folding the trace at that cell (stigmergy.mjs:12-17). This
// module is the inbox/outbox surface ON that deposit/sense substrate: it invents NO channel algebra.
//
// THE CHANNEL IS NOT INVENTED HERE. players.mjs already declares each agent's CGS handedness:
// handedness.recv = 'trace:agents/<name>/inbox' and handedness.send = 'trace:agents/<name>/outbox'
// (players.mjs:13-21). A mailbox term is exactly that declared handedness with the 'trace:' prefix
// stripped to a stigmergy field name. A message is therefore a player-tuple channel FACT — a deposited
// mark on the player's declared inbox field — not an out-of-band queue.
//
// DELIVER IS A DEPOSIT, DRAIN IS A SENSE. deliver(from,to,message) DEPOSITS a message cell on the
// recipient's inbox field (stigmergy.deposit, stigmergy.mjs:37) and MIRRORS it onto the sender's outbox;
// the sender (fromAgent) rides in the deposit's `by` witness, so WHO is kept without the message being
// addressed via a bus (stigmergy.mjs:35-44). drainInbox SENSES the inbox field (stigmergy.mjs:53) and
// folds it through the swarm-sheaf canonical settle (swarm-sheaf.mjs:37) so a contested delivery stays
// DISTINCT cells, never last-writer.
//
// HELD-TOP, NOT LAST-WRITER. A message id two senders deposited with DISAGREEING content is a contested
// delivery: the (messageId, content) cell holds BOTH contents as distinct objects — it rises to held-⊤
// ("stable"), exactly as the work-board's contested claim rises when two characters claim one work
// (stigmergic-work-board.mjs:81-87). drainInbox reads that contest off the fold; it does NOT collapse it
// to a winner and does NOT silently de-queue. stigmergy's own per-cell contradictedMarks (a deposit met
// by a denial, stigmergy.mjs:60,66) are folded in too — either route surfaces as `contested`.
//
// APPEND-ONLY, NO DESTRUCTIVE DEQUEUE. ackDelivery deposits an ack mark (append-only/monotone, mirroring
// the work-board's completeWork, stigmergic-work-board.mjs:114). drainInbox filters acked messages at
// READ time — it NEVER deletes; the trace still holds the message. There is NO queue size, NO TTL, NO
// retention literal: the trace is append-only and monotone (stigmergy.mjs:14-17), so "recency" is a
// READ-TIME weighting (stigmergy.gradient's decay, stigmergy.mjs:89), governed by options.decay, never a
// destructive evaporation. The mailbox is a FOLD, bounded by what was deposited — no max-messages literal.

import { jcs } from "@561-group/computer/typed-resource-catalog/json";


import { stableId } from "./cognition.mjs";
import { deposit, sense, gradient } from "./stigmergy.mjs";
import { defaultHandedness } from "./players.mjs";

// ── channel terms: DERIVED from the player tuple's declared handedness, not invented ─────────────
// players.mjs:13 declares handedness.recv = 'trace:agents/<name>/inbox', .send = '.../outbox'. The
// stigmergy field is that declared term with the 'trace:' prefix stripped — deposit/sense add the
// 'stigmergy/fields/' location prefix themselves (stigmergy.mjs:29). The channel name is the player
// tuple fact, read off defaultHandedness; this module hardcodes NO path.
const stripTracePrefix = (term) => String(term).replace(/^trace:/, "");

// inboxTermOf(agentName) -> 'agents/<name>/inbox' (the players.mjs-declared recv term, sans 'trace:').
export function inboxTermOf(agentName) {
  return stripTracePrefix(defaultHandedness({ name: agentName }).recv);
}

// outboxTermOf(agentName) -> 'agents/<name>/outbox' (the players.mjs-declared send term, sans 'trace:').
export function outboxTermOf(agentName) {
  return stripTracePrefix(defaultHandedness({ name: agentName }).send);
}

// a message's content-address: identity is content (cognition.stableId, jcs/RFC-8785 → sha256). A caller
// may pin its own id (message.id / options.messageId); otherwise the content is the id, so two senders
// depositing the SAME content under the SAME id idempotently coincide, while DISAGREEING content under a
// pinned id stays two distinct cells (the contested case).
function messageIdOf(message, options = {}) {
  if (options.messageId !== undefined) return String(options.messageId);
  if (message && typeof message === "object" && message.id !== undefined) return String(message.id);
  return stableId([message], "msg");
}

// the deposited object cell rides the content as-is when it is an object (TTMS rides objects bare); a
// scalar rides bare too. The mark (predicate) is the messageId; the object is the content.
function contentOf(message) {
  return message;
}

// ── deliver: a DEPOSIT onto the recipient's inbox, mirrored onto the sender's outbox ─────────────
// deliver(root, fromAgent, toAgent, message, options) -> { value, term, traceLog, contested }
// The sender (fromAgent) rides in the deposit `by` witness (stigmergy.mjs:35) so the trace keeps WHO
// without addressing the message TO anyone via a bus. The message is deposited on the recipient's inbox
// field AND mirrored onto the sender's outbox (an append-only sent-record). Returns the recipient-inbox
// read after deposit, and whether THIS delivery is already contested (a prior sender disagrees on its id).
export function deliver(root, fromAgent, toAgent, message, options = {}) {
  const messageId = messageIdOf(message, options);
  const inboxField = inboxTermOf(toAgent);
  const outboxField = outboxTermOf(fromAgent);
  const content = contentOf(message);
  // a monotone, witness-distinct t: the message id, the sender, and the supplied tick. Re-delivering the
  // SAME content by the SAME sender is idempotent; a disagreeing content stays a distinct cell.
  const t = options.t ?? `${messageId}:from:${fromAgent}`;
  // DEPOSIT onto the recipient inbox (stigmergy.deposit, stigmergy.mjs:37). The mark is the messageId,
  // the object is the content, the depositor is fromAgent.
  const inboxWrite = deposit(root, inboxField, messageId, content, fromAgent, { ...options, t });
  // MIRROR onto the sender's own outbox — an append-only record of what was sent (no second channel
  // algebra; the same deposit surface).
  const outboxWrite = deposit(root, outboxField, messageId, content, fromAgent, {
    ...options,
    t: `${messageId}:sent:${fromAgent}`,
  });
  // read the recipient inbox back: is this message id already contested (two senders, disagreeing
  // content)? Surfaced now so a delivery into a contested slot is visible at the deposit site.
  const folded = foldInbox(root, toAgent, options);
  const slot = folded.byId.get(messageId);
  const contested = slot && slot.contested ? slot : null;
  return Object.freeze({
    value: contested ? "stable" : "potential",
    term: inboxField,
    traceLog: [inboxWrite.log, outboxWrite.log],
    contested,
  });
}

// ── sendOutbox: a DEPOSIT on the agent's OWN outbox (a broadcast/sent mark, no recipient) ────────
// sendOutbox(root, agentName, message, options) -> { value, term }
// The stigmergic "post to the environment" with no addressee — a later agent SENSES the outbox if it
// cares. No recipient is named; the trace is the channel.
export function sendOutbox(root, agentName, message, options = {}) {
  const messageId = messageIdOf(message, options);
  const outboxField = outboxTermOf(agentName);
  const content = contentOf(message);
  const t = options.t ?? `${messageId}:out:${agentName}`;
  const write = deposit(root, outboxField, messageId, content, agentName, { ...options, t });
  return Object.freeze({ value: "potential", term: outboxField, traceLog: [write.log] });
}

// ── the fold: SENSE the inbox field, group by message id, settle to messages ─────────────────────
// foldInbox folds the inbox field (stigmergy.sense, stigmergy.mjs:53) the way the work-board's
// claimGradient folds claims (stigmergic-work-board.mjs:81-87): group every deposited mark by its id;
// a message id holding ONE distinct content is settled (consensus); a message id holding MORE THAN ONE
// distinct content is CONTESTED — held-⊤, both contents kept distinct, NOT last-writer. ack marks
// (predicate 'ack:<id>') and the deposit's witness rows are read off the same fold.
function foldInbox(root, agentName, options = {}) {
  const inboxField = inboxTermOf(agentName);
  const sensed = sense(root, inboxField, options);
  // collect, per message id, the distinct contents deposited and which senders deposited them, plus the
  // set of ack marks. The depositor witness is carried on the deposit's own 'depositedBy' mark; we read
  // it off the settled section's witnesses below.
  const byId = new Map();
  const acks = new Map(); // messageId -> [ackBy...]
  for (const m of sensed.marks) {
    const mark = String(m.mark);
    if (mark === "depositedBy" || mark === "depositedAt") continue; // stigmergy's own witness rows
    if (mark.startsWith("ack:")) {
      const id = mark.slice("ack:".length);
      const list = acks.get(id) ?? [];
      list.push(m.object);
      acks.set(id, list);
      continue;
    }
    // a message-content mark: predicate is the message id, object is the content.
    const id = mark;
    const slot = byId.get(id) ?? { id, contents: [], contradicted: false };
    // canonical-content key so two depositors of the SAME content coincide and DISAGREEING content stays
    // distinct (the contested case). jcs/RFC-8785 is the same canonicalization stableId rides on.
    const key = jcs(jsonSafe(m.object));
    if (!slot.contents.some((c) => c.key === key)) {
      slot.contents.push({ key, content: m.object, value: m.value });
    }
    // stigmergy's own per-cell contradiction (a deposit met by a denial, stigmergy.mjs:60) is held too.
    if (m.contradicted) slot.contradicted = true;
    byId.set(id, slot);
  }
  // a message id is CONTESTED when two senders disagree on its content (more than one distinct content)
  // OR a per-cell contradiction stands — held-⊤, exactly like the work-board's contested claim.
  for (const slot of byId.values()) {
    slot.contested = slot.contents.length > 1 || slot.contradicted;
  }
  return { byId, acks, field: inboxField, sensed };
}

// jsonSafe-lite: fold undefined → null so jcs (no `undefined` encoding) content-addresses faithfully,
// mirroring cognition.stableId's own fold. Local so the mailbox adds no import beyond jcs.
function jsonSafe(value) {
  return value === undefined ? null : JSON.parse(JSON.stringify(value ?? null));
}

// ── drainInbox: the read fold — settled messages + held-⊤ contested, acked filtered at READ time ─
// drainInbox(root, agentName, options) -> { messages, contested, term }
// A SENSE + fold (no destructive dequeue). messages = the settled, un-acked deliveries (each a single
// agreed content). contested = the message ids two senders disagree on (held-⊤, both contents kept).
// Acked messages are filtered HERE, at read time, never deleted — the trace still holds them.
export function drainInbox(root, agentName, options = {}) {
  const folded = foldInbox(root, agentName, options);
  const messages = [];
  const contested = [];
  for (const slot of folded.byId.values()) {
    const acked = (folded.acks.get(slot.id) ?? []).length > 0;
    if (slot.contested) {
      // held-⊤: keep BOTH contents distinct; do NOT collapse to last-writer. A contested delivery is
      // surfaced even if acked (an ack does not resolve a disagreement; the contest stands).
      contested.push(Object.freeze({
        id: slot.id,
        value: "stable",
        contents: slot.contents.map((c) => c.content),
        acked,
      }));
      continue;
    }
    if (acked && !options.includeAcked) continue; // filtered at READ time — the trace still holds it
    const only = slot.contents[0];
    messages.push(Object.freeze({
      id: slot.id,
      value: only ? only.value : "absurd",
      content: only ? only.content : undefined,
      acked,
    }));
  }
  return Object.freeze({
    messages,
    contested,
    term: folded.field,
    value: contested.length ? "stable" : "potential",
  });
}

// ── peekInbox: a read-only fold (sense without marking) ──────────────────────────────────────────
// peekInbox(root, agentName, options) -> messages
// The same fold drainInbox does, but returns the message list WITHOUT marking anything — a read-only
// sense (the trace is unchanged either way; "peek" names the intent: it deposits nothing). Includes
// acked and contested entries so a reader sees the whole field. Honors options.decay as a read-time
// recency weighting (stigmergy.gradient, stigmergy.mjs:89) — never a destructive write.
export function peekInbox(root, agentName, options = {}) {
  const folded = foldInbox(root, agentName, options);
  return folded.byId.size
    ? [...folded.byId.values()].map((slot) =>
        Object.freeze({
          id: slot.id,
          value: slot.contested ? "stable" : (slot.contents[0]?.value ?? "absurd"),
          content: slot.contested ? undefined : slot.contents[0]?.content,
          contents: slot.contested ? slot.contents.map((c) => c.content) : undefined,
          contested: slot.contested,
          acked: (folded.acks.get(slot.id) ?? []).length > 0,
        }),
      )
    : [];
}

// ── ackDelivery: an APPEND-ONLY ack mark — no destructive dequeue ────────────────────────────────
// ackDelivery(root, agentName, messageId, by, options) -> { value, term }
// Deposits an 'ack:<messageId>' mark on the agent's inbox field (append-only/monotone, mirroring the
// work-board's completeWork, stigmergic-work-board.mjs:114). drainInbox filters acked messages at READ
// time — this NEVER deletes the message; the trace still holds it. The ack's depositor (`by`) rides the
// witness, so WHO acked is kept.
export function ackDelivery(root, agentName, messageId, by, options = {}) {
  const inboxField = inboxTermOf(agentName);
  const ackMark = `ack:${messageId}`;
  const t = options.t ?? `${messageId}:ack:${by}`;
  const write = deposit(root, inboxField, ackMark, by, by, { ...options, t });
  return Object.freeze({ value: "potential", term: inboxField, traceLog: [write.log] });
}

// inboxGradient(root, agentName, messageId, options) — the QUANTITATIVE read for one message id: the
// aggregate support across every deposit of that id (stigmergy.gradient, stigmergy.mjs:75), honoring
// options.decay as a read-time recency weighting. Exposed so a reader can weight a contested slot by
// how many senders stand behind each side without any destructive write. (Kept thin; not in the
// required exports but rides the same substrate.)
export function inboxGradient(root, agentName, messageId, options = {}) {
  return gradient(root, inboxTermOf(agentName), messageId, options);
}
