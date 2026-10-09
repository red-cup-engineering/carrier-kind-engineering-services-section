/**
 * cognizing/assess — Meme → knowing/knowledge-standing: the comonad counit as a reading.
 *
 * knowing is the comonad on Meme working the knowledge order ≤_k
 * (dev/docs/notes/2026-06-21-knowing-as-comonad-on-meme.md). `cognize` extracts the
 * standing as a meme (Meme → Meme, the endo unit); `assess` extracts the SAME ≤_k
 * standing as knowing's OWN carrier, `knowing/knowledge-standing` — a knowing-owned
 * reading whose identity is its bare-descent-path `$id` and whose type is inferred
 * from `knowledgeStandingSchema` by `FromSchema` (the schema literal, not a
 * hand-written interface or generated file, is the law). The base carrier (the meme)
 * is reused from relating-experimental; this reading is knowing's own.
 *
 * The standing is read off the reading's two sides on the knowledge order:
 *   truth present / falsity present → stable    (≤_k top — the settled fixpoint)
 *   truth present / falsity absent  → potential
 *   truth absent  / falsity present → active
 *   truth absent  / falsity absent  → absurd    (≤_k bottom)
 * `settled` is standing === "stable" (the reached fixpoint — a converged reflection,
 * never a rumination); `reflexive` is whether a Token nests another meme.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { memeCarrier } from "@red-cup-engineering/relating";
import { isCell } from "@red-cup-engineering/signcell/cell";
import { standingOf } from "./section.mjs";
import { knowledgeStandingCarrier } from "./carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const MEME_CARRIER_ID = memeCarrier.id;
const STANDING_CARRIER_ID = "knowing/knowledge-standing";

/** Admit a meme from the wire, refusing a non-meme at the boundary. */
function admitMeme(input, verb) {
  if (typeof input === "object" && input !== null && isCell(input)) return input;
  throw new TypeError(`${verb}: expected a meme carrier (a SignCell)`);
}


/** Whether a Token nests another meme (knowing-that-you-know). */
const nestsMeme = (value) => typeof value === "object" && value !== null && isCell(value);

/** assess — read a meme's ≤_k standing into knowing's own knowledge-standing carrier. */
export const assessAction = operation({
  verb: "assess",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Assess a meme's knowledge-order standing into knowing's own knowledge-standing carrier.",
  description: `Domain: a meme carrier (${MEME_CARRIER_ID}). Codomain: ${STANDING_CARRIER_ID} — knowing's own carrier, the ≤_k standing of the cognized meme (standing, whether it is settled at the ≤_k fixpoint, whether it is reflexive, and the evidence depth on each side). The reading counit of knowing-as-comonad.`,
  domain: memeCarrier,
  codomain: knowledgeStandingCarrier,
  run: (input) => {
    const meme = admitMeme(input, "assess");
    const standing = standingOf(meme);
    const result = {
      kind: "knowing.knowledge-standing",
      standing,
      settled: standing === "stable",
      reflexive: nestsMeme(meme.subject) || nestsMeme(meme.object),
      positiveEvidence: meme.for.length,
      negativeEvidence: meme.against.length,
    };
    return jsonResource(result, "knowledge standing");
  },
});
