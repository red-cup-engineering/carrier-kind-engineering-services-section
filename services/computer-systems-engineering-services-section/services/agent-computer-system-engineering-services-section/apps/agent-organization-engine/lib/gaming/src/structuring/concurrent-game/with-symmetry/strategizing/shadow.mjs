/**
 * Shadow — the embedding of game objects into the meme apex.
 *
 * The theory-of-computing claim reads each computational paradigm as "a shadow
 * of $\mathbf{CGS}$ under the appropriate restriction."  This module makes the
 * dual fact first-class on our side: every game object is a configuration of
 * the meme apex, and its *shadow* is the meme reading it is built from.  The
 * embedding is not a lossy projection bolted on after the fact — designs ARE
 * reading valuations, polarity IS a Belnap class, interaction IS the knowledge
 * join — so the shadow maps are (almost) identities that simply forget the
 * game-theoretic vocabulary and keep the apex content.
 *
 * The naturality witness `interactionShadowCommutes` certifies the square:
 * the shadow of an interaction equals the knowledge-join of the shadows.
 */
import { designReading } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/design";
import { polarityReading } from "@red-cup-engineering/playing/structuring/polarity";
import { interact } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/strategizing/interaction";
import { knowledgeJoinReading, samePoint } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The meme shadow of a polarity: its Belnap reading value. */
export const polarityShadow = (p) => polarityReading(p);

/** The meme shadow of a design at a locus: the reading it commits there. */
export const designShadow = (d, xi) => designReading(d, xi);

/** The meme shadow of an interaction at a locus: the knowledge-join of the two designs' readings. */
export const interactionShadow = (d1, d2, xi) =>
  knowledgeJoinReading(designReading(d1, xi), designReading(d2, xi));

/**
 * Witness naturality: shadow(interact(d1, d2)) at $\xi$ equals
 * join(shadow(d1, $\xi$), shadow(d2, $\xi$)).  The game morphism and the apex
 * operation agree — game interaction is meme join, seen through the design
 * vocabulary.
 */
export function interactionShadowCommutes(d1, d2, xi) {
  const viaInteraction = designShadow(interact(d1, d2), xi);
  const viaJoin = interactionShadow(d1, d2, xi);
  return samePoint(viaInteraction, viaJoin)
    ? Object.freeze({ kind: "game.shadow.interactionCommutes:witness", locus: xi, viaInteraction, viaJoin })
    : Object.freeze({ kind: "game.shadow.interactionCommutes-obstruction", locus: xi, viaInteraction, viaJoin });
}

/**
 * A short statement of the apex relationship, carried as data so downstream
 * packages and servers can surface it.  Game sits below meme; meme is the apex.
 */
export const APEX = Object.freeze({
  kind: "game.shadow.apex",
  apexPackage: "@emsenn/meme-algebra",
  thisPackage: "@red-cup-engineering/gaming/structuring/concurrent-game/with-symmetry",
  relationship: "game is a configuration of the meme apex: designs are reading valuations, polarity is a Belnap class, interaction is the knowledge join",
});
