/**
 * communicate/face — communicating's ACROSS / TRUTH local section over an agent
 * membrane, the boundary face animating (the bulk) reads instead of faking the across
 * face with a generic relating `descend`.
 *
 * animating is a holographic BULK over three boundary FACES (communicating = across,
 * knowing = inside, playing = outside; dev/docs/notes/2026-06-21-bulk-over-faces-
 * local-section-threading.md). Each face is a LOCAL SECTION over the agent's membrane
 * (a `readonly UtteranceCarrier[]` log), read on one of the three transverse
 * agentive-triad bilattice axes. communicating supplies the ACROSS face on the TRUTH
 * axis (`≤_t` — which way it leans; negation antitone): the across reading is the
 * agent's settled truth-DIRECTION over its own membrane. At scale 1 the bulk is a
 * single agent over its own three faces, so this gluing is always coordination-free
 * (one self cannot contest itself across filtrations) — but the truth axis can still
 * carry a HELD contradiction when the same membrane both asserts and denies one
 * subject; that stable cell is the across face's `contested` reading.
 *
 * Crucially this is communicating's OWN meme reading, NOT a copy of animating's generic
 * descend-then-section. communicating WORKS OVER relating's meme carrier (its core morphisms are
 * meme → meme; the ≤_t semiotic structure is a description, not a definition — see
 * dev/docs/notes/2026-06-21-communicating-as-end-meme-semiotics.md). The membrane is
 * settled into communicating's own MEMES — one meme per utterance, evidenced by its
 * truth-DIRECTION — and same-subject memes are POOLED along the bilattice so the across
 * direction reads off the pooled evidence of each subject cell, not off a bare descent
 * state:
 *
 *   cover     = the distinct subject cells the membrane settles into memes (each a cell
 *               of this local section over the agent's membrane)
 *   held      = the cells whose pooled evidence carries a settled truth DIRECTION
 *               (a definite potential/active lean, or a stable held-contradiction) —
 *               the cells the agent settles which way it leans
 *   contested = the cells pooled to `stable` (`⊤`) — HELD truth contradictions where
 *               the membrane both asserts and denies the SAME subject (paraconsistent,
 *               both witnesses retained) — the across face's contested cells
 *
 * The TRUTH axis enters in how a claim becomes a evidence: an assertion leans `potential`
 * (positive, `≤_t`-up — `witnessedPotential`); a denial/negation leans `active`
 * (negative, `≤_t`-down) — and a denial is read by applying communicating's OWN polarity
 * involution `negate` (the meme `negate` morphism's evidence operator, the truth-axis
 * antitone generator `~`) to the asserted evidence. So an assertion and a denial on the
 * same subject become OPPOSED on the truth axis (negation antitone); pooling them
 * (`knowledgeJoin`, the bilattice accumulation that retains both witnesses) lands on
 * `stable` — the across face's held-contradiction. Grounded in the agentive-triad's
 * truth axis (content/_archive predication-categories truth.md; Avron twist-product;
 * negation acts antitonely on `≤_t`) and communicating's own meme/negate surface.
 *
 * Dependency (the DAG): this is a LEAF over relating + the package's own meme surface.
 * It does NOT import @red-cup-engineering/animating (the bulk). animating imports THIS.
 */
import { knowledgeJoin } from "@red-cup-engineering/signchain/bilattice";
import { cell, evidenceOf, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { denialOf } from "@red-cup-engineering/signcraft/membrane";
import { census, truthJoinOfCensus } from "@red-cup-engineering/computer-data-engineering-services-section/four";


/** The axis this face reads — the agentive-triad TRUTH axis (`≤_t`, negation antitone). */
export const COMMUNICATING_FACE_AXIS = "truth";

/** The truth-axis Belnap census of the pooled truth-direction of each subject cell. */

    

    

    

    

/**
 * communicating's ACROSS / TRUTH local section over an agent membrane. The thin triple
 * { cover, held, contested } is exactly animating's `Face` contract (integers ≥ 0); the
 * thick fields expose the meme reading it was projected from (the per-cell truth-axis
 * Belnap census) so the across direction is inspectable — a genuine meme reading, not a
 * generic descend.
 */

  

  

  

  
      

/**
 * The meme a membrane utterance tells: the cell (claim, claim, utterer) — the claim's bare label
 * as subject and predicate, the utterer as object — told for by an assertion and against by a
 * denial (relating's membrane parses the negation), witnessed by the utterer. The memes form a
 * speaker↔subject channel graph for the relational readings; the face pools by the bare label,
 * so an assertion and its denial of one claim meet told-both there.
 */
export function membraneMeme(carrier) {
  const token = carrier.token.mark.value;
  const { against, label } = denialOf(carrier.claim.mark.value);
  return cell(label, label, token, { [against ? "against" : "for"]: [token] });
}

/**
 * communicatingFace — communicating's OWN across/truth local section over an agent
 * membrane, the face animating (the bulk) consumes instead of faking it with a generic
 * relating descend. Each membrane utterance is settled into a communicating MEME evidenced
 * by its truth-DIRECTION (assertion `potential`, denial the `negate` of it — the
 * polarity involution on the truth axis); memes are grouped by their subject cell and
 * the same-subject evidence POOLED along the bilattice (`knowledgeJoin`, retaining both
 * witnesses). The thin triad is the truth-axis reading of that pooled cover:
 *
 *   cover     = the distinct subject cells (memes) the membrane settles
 *   held      = cells whose pooled evidence carries a truth direction (not absurd)
 *   contested = cells pooled to `stable` (`⊤`) — both asserted AND denied (held
 *               contradiction; negation antitone on the truth axis)
 *
 * The thick `belnap` is the per-cell truth-axis Belnap census. Pure; never imports the
 * bulk — this is communicating's meme/negate reading, not animating's generic descend.
 * The empty membrane is the empty across face (all zero).
 */
export function communicatingFace(membrane) {
  // Pool same-subject memes along the bilattice: an assertion and a denial of one
  // subject accumulate (both witnesses retained) to a stable held-contradiction.
  const pooled = new Map();
  const order = [];
  for (const carrier of membrane) {
    const m = membraneMeme(carrier);
    const key = JSON.stringify(m.subject);
    const prior = pooled.get(key);
    if (prior === undefined) {
      pooled.set(key, evidenceOf(m));
      order.push(key);
    } else {
      pooled.set(key, knowledgeJoin(prior, evidenceOf(m)));
    }
  }

  // The truth-axis FOUR census is PARAMETERIZED from relating's proof-tree `census`: the
  // pooled per-subject evidence mapped to bilattice values and tallied. `held` = the settled
  // truth directions (non-absurd); `contested` = the held contradictions (stable ⊤).
  const belnap = census(order.map((key) => knowledgeReading(pooled.get(key))));
  const held = belnap.potential + belnap.active + belnap.stable;
  const contested = belnap.stable;

  return Object.freeze({
    kind: "communicating.face",
    faculty: "communicating",
    direction: "across",
    axis: COMMUNICATING_FACE_AXIS,
    cover: order.length,
    held,
    contested,
    utterances: membrane.length,
    belnap,
    // the collective LEAN: the ≤_t join over the pooled subjects — which way the membrane leans.
    lean: truthJoinOfCensus(belnap),
  });
}
