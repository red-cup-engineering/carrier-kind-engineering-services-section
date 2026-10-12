/**
 * cognizing/discern — Meme → knowing/identity: the two derived equality predicates.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `discern` reads the
 * IDENTITY of a meme's cell through memory's two derived equalities on the
 * diagonal Δ_E = {(s,s)}: the classical truth-order equality =_E (t on the diagonal,
 * f off it) and the paraconsistent knowledge-order equality Δ_E^k (⊤ on the diagonal —
 * information-maximal — and ⊥ off it — no claim — hence stable under ≤_k knowledge-merge).
 * `onDiagonal` is whether the meme's subject and object are the SAME entity. Both
 * equalities are DERIVED (Lawvere's diagonal-Σ construction), not postulated. Total
 * over any meme. Grounded in classical-equality and paraconsistent-equality.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { knowledgeIdentityCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const MEME_CARRIER_ID = memeCarrier.id;
const IDENTITY_CARRIER_ID = "knowing/identity";

function admitMeme(input, verb) {
  if (typeof input === "object" && input !== null && isCell(input)) return input;
  throw new TypeError(`${verb}: expected a meme carrier (a SignCell)`);
}

/** Whether the meme's cell sits on the diagonal Δ_E: subject term == object term. */
function onDiagonal(meme) {
  try {
    return JSON.stringify(meme.subject) === JSON.stringify(meme.object);
  } catch {
    return false;
  }
}

/** discern — read a meme's cell-diagonal identity through the two equalities. */
export const discernAction = operation({
  verb: "discern",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Discern a meme's identity: the classical (=_E) and paraconsistent (Δ_E^k) equality of its cell's diagonal.",
  description: `Domain: a meme carrier (${MEME_CARRIER_ID}). Codomain: ${IDENTITY_CARRIER_ID} — whether the meme's subject and object are the same entity, read through the classical two-valued equality =_E (t/f) and the paraconsistent knowledge-order equality Δ_E^k (top on the diagonal, bottom off it, merge-stable). Both derived via Lawvere's diagonal construction. Grounded in classical-equality and paraconsistent-equality.`,
  domain: memeCarrier,
  codomain: knowledgeIdentityCarrier,
  run: (input) => {
    const diagonal = onDiagonal(admitMeme(input, "discern"));
    const result = {
      kind: "knowing.identity",
      onDiagonal: diagonal,
      classical: diagonal ? "t" : "f",
      paraconsistent: diagonal ? "top" : "bottom",
      mergeStable: true,
    };
    return jsonResource(result, "knowledge identity");
  },
});
