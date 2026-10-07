/**
 * cognizing/morphisms/absorb — the learning step of the comonad on Meme.
 *
 * absorb is the LEARNING generator of knowing-as-the-comonad-on-Meme
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md): meme in, meme out,
 * the cell preserved IDENTICALLY while the reading climbs the KNOWLEDGE order ≤_k.
 * Where communicating's `ground` takes up a PARTNER's evidence, absorb takes up the
 * knower's OWN first-person observation — the same `joinKnowledge` mechanism, but
 * the witness is self-supplied. It is one firing of the settlement filtration: a
 * single ≤_k increment `v_τ <_k v_{τ+1}`, a knowledge increment, a lesson. The
 * orbit of absorb is the settling-coalgebra orbit — reflecting is the run that
 * converges, ruminating the run that never settles.
 *
 * The knower's increment is the side it witnesses for itself:
 *   for     → potential, witness on the TRUTH side   (observed in support)
 *   against → active,    witness on the FALSITY side  (observed against)
 *
 * Total (any meme, any evidence string, any side) and faithful (the witness joins
 * the cell's evidence on that side — both sides only grow, ≤_k climbs).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { isCell, witnessAgainst, witnessFor } from "@red-cup-engineering/signcell/cell";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** Admit a meme from the wire, refusing a non-meme at the boundary. */
function admitMeme(input, verb) {
  if (typeof input === "object" && input !== null && isCell(input)) return input;
  throw new TypeError(`${verb}: expected a meme carrier (a SignCell)`);
}

/** absorb — the learning step: join the knower's
 *  own observation; one ≤_k increment of the settling orbit. */
export const absorbAction = operation({
  verb: "absorb",
  inputFormat: "json",
  outputFormat: "json",
  options: ["evidence", "side"],
  summary: "Take up the knower's own observation as evidence and join it onto the meme's evidence — one ≤_k increment, a lesson.",
  description: "Domain: a meme carrier. Codomain: a meme carrier. The LEARNING step of the comonad on Meme — one firing of the settlement filtration, a single ≤_k increment (v_τ <_k v_{τ+1}), a knowledge increment / a lesson. The cell is preserved identically; the observation joins the cell's evidence, where the observation is the knower's OWN first-person observation (for witnesses truth as potential, against witnesses falsity as active). Same mechanism as communicating's ground, but the evidence is first-person, not a partner's.",
  domain: memeCarrier,
  codomain: memeCarrier,
  run: (input, args = {}) => {
    const prior = admitMeme(input, "absorb");
    const e = String(args.evidence ?? "observation");
    const side = args.side === "against" ? "against" : "for";
    const learned = side === "against" ? witnessAgainst(prior, e) : witnessFor(prior, e);
    return jsonResource(learned, "meme");
  },
});
