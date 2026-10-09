/**
 * cognizing/know-possibly — { meme, worlds } → knowing/modal-standing: POSSIBILITY (diamond).
 *
 * MODAL knowing lifts the comonad on Meme across a WORLD-SET W: each world is a held
 * knowledge-state (a fiber of the knowledge presheaf indexed by W), and the four-valued
 * bilattice-accessibility-relation defaults to total (S5). The meme's modal standing is
 * bigraded — possibility (diamond) is the ≤_k JOIN of its standing taken across every
 * accessible world, the ≤_k bottom (absurd) vacuously over no worlds; necessity (box) is
 * the dual ≤_k MEET. This morphism is the diamond: the meme is known possibly iff it holds
 * in SOME accessible world. Pure, total, no I/O.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { admitState, lookupStanding, joinK } from "./section.mjs";
import { modalStandingCarrier, modalWorldSetCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** know-possibly — diamond: the ≤_k join of the meme standing across accessible worlds. */
export const knowPossiblyAction = operation({
  verb: "know-possibly",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Diamond: the knowledge-order join of the meme standing across accessible worlds.",
  description:
    "diamond = the knowledge-order join of the meme standing across accessible worlds. Domain: { meme, worlds } where each world is a knowing/knowledge-state fiber over the world-set W. Codomain: knowing/modal-standing. The meme is known possibly iff it holds in SOME accessible world; value is the ≤_k JOIN of its per-world standings, which is the ≤_k bottom (absurd) vacuously over no worlds (S5, total bilattice-accessibility-relation). The dual bigraded operator is box (≤_k meet).",
  domain: modalWorldSetCarrier,
  codomain: modalStandingCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("know-possibly: expected { meme, worlds }");
    }
    const rec = input;
    const meme = rec.meme;
    if (typeof meme !== "object" || meme === null || !isCell(meme)) {
      throw new TypeError("know-possibly: meme must be a meme carrier");
    }
    const rawWorlds = Array.isArray(rec.worlds) ? rec.worlds : [];
    const worlds = rawWorlds.map((w) => admitState(w, "know-possibly.world"));
    const standings = worlds.map((w) => lookupStanding(w, meme));
    const value = standings.reduce((acc, s) => joinK(acc, s), "absurd");
    const heldIn = standings.filter((s) => s !== "absurd").length;
    const result = {
      kind: "knowing.modal-standing",
      modality: "possibility",
      value,
      worlds: worlds.length,
      heldIn,
    };
    return jsonResource(result, "modal standing");
  },
});
