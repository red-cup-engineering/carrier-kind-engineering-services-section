/**
 * socialize/attend — listen↑: a member residuates the field.
 *
 * attend is endomorphic on the Social Field (field → field) — the social lift of
 * communicating's `listen`. The `member` takes up its in-transit memes (evidence
 * `potential`): each such meme's evidence moves to the uptake side (`active`),
 * witnessed by the attending member. Linearity is enforced — an already-`active`
 * meme is a spent resource and is REFUSED (the listen residuum consumes once).
 *
 * Reuses relating's `valueOf`/`meme`/`evidence`/`readingValue`/`mark` — the exact
 * `listenAction` uptake transition, ranged over the field's edges into `member`.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { evidenced, isCell, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { evidence } from "@red-cup-engineering/signcell/cell";

import {
  admitField,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** A meme's knowledge evidence (potential in transit, active taken up). */
const readingName = (meme) => knowledgeReading(meme);

/** attend — take up the member's in-transit memes, moving each to active. */
export const attendAction = operation({
  verb: "attend",
  inputFormat: "json",
  outputFormat: "json",
  options: ["member"],
  summary: "listen↑: the member takes up its in-transit (potential) memes, moving each to active (witnessed by the attender); spent (active) memes are refused.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The options.member takes up its in-transit memes: each potential meme's evidence becomes active, witnessed by the attending member; an already-active meme is a spent resource and is refused (linearity). The social lift of communicating's listen.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "attend");
    const index = Number(args.member ?? 0);
    if (!Number.isInteger(index) || index < 0 || index >= field.members.length) {
      throw new RangeError(`attend: member index ${String(args.member)} out of range`);
    }
    const member = field.members[index];
    const attenderName = String((member.agent).identity ?? `member-${index}`);
    const witness = attenderName;

    const taken = member.memes.map((meme) => {
      if (!isCell(meme)) return meme;
      const name = readingName(meme);
      if (name === "active") {
        throw new TypeError("attend: this meme is a spent resource (already taken up / active)");
      }
      if (name !== "potential") return meme; // only in-transit memes are taken up
      return evidenced(meme, evidence({ against: [witness] }));
    });

    const members = field.members.map((m, i) =>
      i === index ? Object.freeze({ ...m, memes: Object.freeze(taken) }) : m,
    );

    const next = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
