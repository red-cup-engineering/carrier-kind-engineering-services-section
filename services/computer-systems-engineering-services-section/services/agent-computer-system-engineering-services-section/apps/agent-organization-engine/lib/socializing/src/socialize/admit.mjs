/**
 * socialize/admit — the initial-object inclusion `communicating ↪ socializing`, and
 * one of socializing's two SCALE-2-NATIVE morphisms (a lone agent has no one to be
 * admitted into a society with).
 *
 * admit is endomorphic on the Social Field (field → field): append a new `Member` (an
 * observer — an `agent`, reused from animating, carrying its local `memes`, reused from
 * relating) to `members`, and grow the OBSERVER CATEGORY `O` to connect the new
 * observer to the rest (default: `completeTranslations` over the new observer count —
 * the maximally-connected category, a translation morphism in each direction between
 * every pair). Admitting the FIRST observer is the one-agent society — a DISCRETE `O`
 * with no non-identity translations, exactly communicating's single-agent meme surface,
 * included as the initial object.
 *
 * The admitted agent is built/validated through animating's `agent` constructor (when
 * given a seed) or accepted as an already-built agent carrier; each admitted meme is
 * validated through relating's `isMeme`. The new section is left ungrounded; `converge`
 * (re)computes it.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { agent as buildInteriorAgent } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";

import {
  admitField,
  ungroundedSection,
  completeTranslations,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** Admit the agent from args: an already-built agent carrier, else a seed for `agent`. */
function admitMemberAgent(value) {
  if (typeof value === "object" && value !== null && !Array.isArray(value) &&
    (value).kind === "animating.agent") {
    return value;
  }
  // Build a fresh interior agent from the seed (string, record, or array).
  return buildInteriorAgent(value === undefined ? [] : value);
}

/** Admit the local memes from args, refusing a non-meme at the boundary. */
function admitMemberMemes(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => {
    if (typeof item === "object" && item !== null && !Array.isArray(item) && isCell(item)) {
      return item;
    }
    throw new TypeError("admit: each meme must be a meme (a SignCell)");
  });
}

/** admit — append an observer (agent + local memes) and grow the observer category. */
export const admitAction = operation({
  verb: "admit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["agent", "memes"],
  summary: "Admit an observer (an agent + its local memes) into the Social Field; the one-observer case is the single-agent society (a discrete O) = communicating.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Appends a Member (observer: agent reused from animating, memes reused from relating) to members and grows the observer category O to connect it (default: completeTranslations over the new observer count — a translation morphism in each direction between every pair). The section is left ungrounded; converge recomputes it.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "admit");
    const member = Object.freeze({
      kind: "socializing.member",
      agent: admitMemberAgent(args.agent),
      memes: admitMemberMemes(args.memes),
    });
    const members = Object.freeze([...field.members, member]);
    const next = Object.freeze({
      kind: "socializing.social-field",
      members,
      base: Object.freeze({
        kind: "socializing.social-base",
        translations: completeTranslations(members.length),
      }),
      section: ungroundedSection(),
    });
    return jsonResource(next, "social-field");
  },
});
