/**
 * face — knowing's INSIDE boundary face, read on the KNOWLEDGE axis (≤_k).
 *
 * animating (the scale-1 holographic bulk — ONE agent over its own three faculty
 * faces) is reconstructed from three boundary faces: communicating (across / truth),
 * knowing (inside / knowledge), playing (outside / evidence). Each face is a LOCAL
 * SECTION over the agent's membrane (a `readonly UtteranceCarrier[]` log), read on its
 * agentive-triad axis; the bulk glues the three by the (coordination-free) replica
 * Mayer–Vietoris in animating's `glue`/`project`. The dependency runs BULK → FACES:
 * this module must NEVER import @red-cup-engineering/animating — knowing is a LEAF over relating
 * (the agent's own self cannot contest, so scale-1 gluing is always H¹=0). See
 * dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md.
 *
 * knowing reads the INSIDE face on the KNOWLEDGE axis (≤_k): "how much has been settled,
 * independently of which way the evidence points; accumulation is monotone, and its top
 * is 'told both', the join of the for-only and against-only values" (content/_archive …
 * predication-categories/concepts/knowledge.md). This is knowing's OWN reading — its
 * comonad on Meme working ≤_k, the cognizing surface (`foldSection`/`standingOf`/`joinK`),
 * NOT a generic relating descend-then-section: the membrane's utterances are each ABSORBED
 * as a learned increment (a meme valued on the ≤_k axis — for ↦ potential / truth side,
 * against ↦ active / falsity side, the `absorb` convention), and the comonad's held
 * CONTEXT C(Meme) is folded by the knowledge order — coincident cells joined by
 * `joinKnowledge` (the ≤_k climb). "The depth IS the memory": the inside face is exactly
 * that accumulated held section over the membrane's cells:
 *
 *   cover     = the distinct cells of the held section (the comonad's context grain)
 *   held      = cells accumulated ABOVE the ≤_k bottom ⊥ (standing ≠ absurd) — the
 *               agent settled SOMETHING (for or against) about the cell; the memory depth
 *   contested = cells that reached the ≤_k TOP ⊤ "told both" (standing = stable) — a held
 *               contradiction, where the membrane witnessed BOTH for and against the cell
 *
 * The thick reading additionally carries the folded `aggregate` ≤_k standing over EVERY
 * cell (the whole section's collective knowledge), the section `depth` (settled cells),
 * and the per-cell knowledge-axis Belnap census on FOUR, so the reading is genuinely
 * knowing's comonad accumulation — not a generic descend.
 */
import { tellMembrane } from "@red-cup-engineering/signcraft/membrane";
import { tokenValue } from "@red-cup-engineering/signcell/cell";
import { foldSection, orbitRegime, reflexiveMeme, standingOf } from "./cognizing/index.mjs";
import { census, knowledgeJoinOfCensus } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** A FOUR knowledge-order standing (the ≤_k lattice: ⊥ absurd … ⊤ stable). */

/** The knowledge-axis Belnap census of the held section's per-cell ≤_k standings (FOUR). */

        

  

  

      

/**
 * The knowing face: the INSIDE local section of animating's agent boundary, read on the
 * knowledge axis (≤_k) over the membrane's cell cover. The thin half (`cover`/`held`/
 * `contested`) is exactly animating's `Face` contract; the thick half carries the folded
 * `aggregate` ≤_k standing over all cells, the section `depth` (settled cells = the
 * memory), and the per-cell Belnap census, so the reading is genuinely knowing's comonad
 * accumulation — not a generic descend-then-section.
 */

  

        

      

    

  

  

  
    
         

/** The regime reading of a knowledge orbit and the stage it is doing (knowing's intelligence/gauge faculty). */

   
    

    

/**
 * knowingFace — knowing's OWN inside/knowledge local section over an agent membrane,
 * the face animating (the bulk) consumes instead of faking it with a generic relating
 * descend. The membrane's utterances are each told as a learned meme (relating's membrane:
 * a denial tells its claim's cell against, witnessed by the uttering token), and the
 * comonad's held context C(Meme) is FOLDED by the knowledge order (`foldSection`). The thin
 * triad is the knowledge-axis reading of that accumulated held section:
 *
 *   cover     = the held section's distinct cells (the comonad context grain)
 *   held      = cells accumulated above the ≤_k bottom ⊥ (standing ≠ absurd) — the memory
 *   contested = cells at the ≤_k TOP ⊤ ("told both", standing = stable) — the membrane
 *               witnessed BOTH for and against the cell (a held contradiction)
 *
 * The thick `aggregate` is the join (`joinK`) over EVERY cell's standing (the section's
 * collective ≤_k knowledge); `depth` is the settled-cell count ("the depth is the
 * memory"); `belnap` is the per-cell census. Pure; never imports the bulk — this is
 * knowing's comonad accumulation reading, not animating's descend-then-section.
 */
/** The settling REGIME of the knowledge orbit (knowing's gauge/intelligence faculty, lifted to
 *  the whole folded context): settled at a ≤_k extremum (⊤ stable / ⊥ absurd), otherwise climbing
 *  to ω, and ruminating when the section holds a reflexive meme (`orbitRegime`). */
function regimeOfOrbit(folded, aggregate) {
  const regime = orbitRegime(aggregate === "stable" || aggregate === "absurd", folded.some(reflexiveMeme));
  return Object.freeze({ regime, reflects: regime !== "aperiodic" });
}

export function knowingFace(membrane) {
  const folded = foldSection(tellMembrane(membrane, (carrier) => String(tokenValue(carrier))));
  // The knowledge-axis census AND the collective ≤_k aggregate are PARAMETERIZED from
  // relating's proof-tree math: `census` tallies the per-cell ≤_k standings,
  // `knowledgeJoinOfCensus` is the ∨_k join over the cover (≡ folding `joinK` over the
  // standings by associativity). `held` = accumulated above ⊥; `contested` = the ⊤ "told both".
  const standings = folded.map((m) => standingOf(m));
  const belnap = census(standings);
  const cover = folded.length;
  const held = belnap.potential + belnap.active + belnap.stable;
  const contested = belnap.stable;
  const aggregate = knowledgeJoinOfCensus(belnap);
  return Object.freeze({
    kind: "knowing.face",
    faculty: "knowing",
    direction: "inside",
    axis: "knowledge",
    cover,
    held,
    contested,
    depth: held, // "the depth is the memory" — settled cells are exactly the held memory
    aggregate,
    belnap,
    regime: regimeOfOrbit(folded, aggregate),
  });
}
