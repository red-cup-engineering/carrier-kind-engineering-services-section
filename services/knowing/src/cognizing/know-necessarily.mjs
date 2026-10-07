/**
 * cognizing/know-necessarily — { meme, worlds } → knowing/modal-standing: NECESSITY (box).
 *
 * MODAL knowing lifts the comonad on Meme across a WORLD-SET W: each world is a held
 * knowledge-state (a fiber of the knowledge presheaf indexed by W), and the four-valued
 * bilattice-accessibility-relation defaults to total (S5). The meme's modal standing is
 * bigraded — necessity (box) is the ≤_k MEET of its standing taken across every accessible
 * world, the ≤_k top (stable) vacuously over no worlds; possibility (diamond) is the dual
 * ≤_k JOIN. This morphism is the box: the meme is known necessarily iff it holds across ALL
 * accessible worlds. Pure, total, no I/O.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { admitState, lookupStanding, meetK } from "./section.mjs";
import { modalStandingCarrier, modalWorldSetCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** know-necessarily — box: the ≤_k meet of the meme standing across accessible worlds. */
export const knowNecessarilyAction = operation({
  verb: "know-necessarily",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Box: the knowledge-order meet of the meme standing across accessible worlds.",
  description:
    "box = the knowledge-order meet of the meme standing across accessible worlds. Domain: { meme, worlds } where each world is a knowing/knowledge-state fiber over the world-set W. Codomain: knowing/modal-standing. The meme is known necessarily iff it holds across ALL accessible worlds; value is the ≤_k MEET of its per-world standings, which is the ≤_k top (stable) vacuously over no worlds (S5, total bilattice-accessibility-relation). The dual bigraded operator is diamond (≤_k join).",
  domain: modalWorldSetCarrier,
  codomain: modalStandingCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("know-necessarily: expected { meme, worlds }");
    }
    const rec = input;
    const meme = rec.meme;
    if (typeof meme !== "object" || meme === null || !isCell(meme)) {
      throw new TypeError("know-necessarily: meme must be a meme carrier");
    }
    const rawWorlds = Array.isArray(rec.worlds) ? rec.worlds : [];
    const worlds = rawWorlds.map((w) => admitState(w, "know-necessarily.world"));
    const standings = worlds.map((w) => lookupStanding(w, meme));
    const value = standings.reduce((acc, s) => meetK(acc, s), "stable");
    const heldIn = standings.filter((s) => s !== "absurd").length;
    const result = {
      kind: "knowing.modal-standing",
      modality: "necessity",
      value,
      worlds: worlds.length,
      heldIn,
    };
    return jsonResource(result, "modal standing");
  },
});
