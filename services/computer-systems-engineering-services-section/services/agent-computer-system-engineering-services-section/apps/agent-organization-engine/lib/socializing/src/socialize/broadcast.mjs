/**
 * socialize/broadcast — speak↑: an agent fuses a meme into the field.
 *
 * broadcast is endomorphic on the Social Field (field → field) — the social lift of
 * communicating's `speak` across the messaging Channel. The `from` member emits a
 * meme; it is re-roled as in-transit on the channel(s) leaving `from` (evidence
 * `potential`, witnessed by the sender), capacity is enforced via communicating's
 * `withinCapacity`, and the in-transit meme is appended to the target member(s)'
 * `memes`. Targets default to every observer `from` has an outgoing translation to in
 * the observer category `O`; an explicit `to` index narrows to one. The section is
 * invalidated (left as-is until `converge` recomputes it).
 *
 * Reuses communicating's `withinCapacity` (the channel resource law) and relating's
 * `meme`/`evidence`/`evidenceValue`/`mark`/`witnessedPotential` — the same evidence
 * transition `speakAction` performs, applied across the social base into the field.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { evidenced, isCell } from "@red-cup-engineering/signcell/cell";
import { evidence } from "@red-cup-engineering/signcell/cell";
import { withinCapacity } from "@red-cup-engineering/communicating";

import {
  admitField,
  neighborsFrom,
  translationBetween,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** Admit the meme to broadcast, refusing a non-meme at the boundary. */
function admitMeme(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value) && isCell(value)) {
    return value;
  }
  throw new TypeError("broadcast: options.meme must be a meme (a SignCell)");
}

/** broadcast — fuse a meme from `from` across the channel(s) into the target(s). */
export const broadcastAction = operation({
  verb: "broadcast",
  inputFormat: "json",
  outputFormat: "json",
  options: ["from", "to", "meme"],
  summary: "speak↑: an agent fuses a meme into the field, re-roled as in-transit (potential, witnessed by the sender) across its channels.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The `from` member emits options.meme; it is re-roled in-transit (evidence potential, witnessed by the sender) and, after the channel's withinCapacity admits it, appended to the target member(s)' memes (default: every member from shares a base edge with; options.to narrows to one). The social lift of communicating's speak.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "broadcast");
    const from = Number(args.from ?? 0);
    if (!Number.isInteger(from) || from < 0 || from >= field.members.length) {
      throw new RangeError(`broadcast: from index ${String(args.from)} out of range`);
    }
    const sender = field.members[from];
    const senderName = String((sender.agent).identity ?? `member-${from}`);
    const payload = admitMeme(args.meme);

    // Targets: the explicit `to`, else every observer `from` has an outgoing
    // translation to (its neighbours in the observer category O).
    const explicitTo = args.to === undefined || args.to === null ? null : Number(args.to);
    const targets = explicitTo === null ? neighborsFrom(field.base, from) : [explicitTo];

    // Enforce capacity on the translation's channel from `from` to a chosen target.
    const payloadText = JSON.stringify(payload);
    for (const target of targets) {
      const arrow = translationBetween(field.base, from, target) ?? translationBetween(field.base, target, from);
      if (arrow && !withinCapacity(arrow.channel, payloadText)) {
        throw new RangeError(`broadcast: channel ${JSON.stringify((arrow.channel).medium)} cannot carry the meme`);
      }
    }

    // The in-transit meme: same cell, evidence re-rolled to potential witnessed by the sender.
    const inTransit = evidenced(payload, evidence({ for: [senderName] }));

    const targetSet = new Set(targets);
    const members = field.members.map((member, index) =>
      targetSet.has(index)
        ? Object.freeze({ ...member, memes: Object.freeze([...member.memes, inTransit]) })
        : member,
    );

    const next = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
