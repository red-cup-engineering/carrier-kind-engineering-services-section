/**
 * oyate — the polity scales of lakotaean becoming.
 *
 * Three nested scales of Lakota political life, each presented as a reading on the
 * @emsenn/organizing substrate (corpus: lakota/.../lakotaean-politics/concepts/
 * tiyospaye, oyate, oceti-sakowin):
 *
 *   - thiyóšpaye (tiyóšpaye) — the extended-family band, the BASIC political-and-
 *     economic unit, small enough that members know one another by name and relation.
 *     Ella Deloria's claim is load-bearing: KINSHIP IS THE POLITICAL ORGANIZATION. The
 *     naca's authority is the authority of a senior relative; the akicita's enforcement
 *     is enforcement of obligations that hold BECAUSE people are related; remove kinship
 *     and no politics is left behind. This is organizing's COMMUNITY — the shared
 *     transindividual field.
 *   - oyáte — a people / nation, intermediate between the tiyóšpaye and the Očhéthi
 *     Šakówiŋ; it has its own council (omníčiye), naca, akicita, and ceremonial life.
 *     Multiple tiyóšpaye constitute one oyáte. This is organizing's INSTITUTION — the
 *     settled order.
 *   - Očhéthi Šakówiŋ (Seven Council Fires) — the confederacy of the seven oyáte. The
 *     relation is GENUINE FEDERATION: each tiyóšpaye/oyáte retains its internal life and
 *     the RIGHT TO WITHDRAW from collective action it does not agree with
 *     (consensus-by-withdrawal). This is organizing's FEDERATION — parallel composition,
 *     where withdrawal is simply not joining the ‖.
 *
 * pte oyáte (the buffalo nation) and the four-leggeds, wingeds, and standing-ones are
 * also oyáte (mitakuye oyasin): the political category and the cosmological category are
 * CONTINUOUS, not separable. This is not metaphor — the same word names a band of people
 * and a nation of buffalo because they are the same kind of relational whole.
 *
 * This module does not posit any of these scales — it DERIVES each from the organizing
 * substrate it fibers, mounting a Lakota seed at the social boundary and reading back the
 * substrate's own community/institution/federation verdict. The mapping of scale to
 * organizing carrier is the only free choice, and it is the captain's.
 *
 * lakotaTerm: thiyóšpaye / oyáte / Očhéthi Šakówiŋ — the three nested polity scales
 * (band, people, confederacy) of Lakota political becoming.
 */
import {
  community,
  institute,
  federate,

} from "@red-cup-engineering/organizing/organizing";

/** A seed admissible at the social boundary — a newline-separated membrane, or JSON. */

// ── thiyóšpaye: the band, as community ──────────────────────────────────────────────

/**
 * The thiyóšpaye reading: the extended-family band as organizing's COMMUNITY — the
 * shared transindividual field. `kinshipIsPolitics` is the standing claim (Deloria):
 * the community IS the polity because the kinship that constitutes the community is the
 * very thing the naca's and akicita's authority runs on.
 */

/** Read a kin seed as a thiyóšpaye — the basic band, derived as an organizing community. */
export function tiyospaye(seed) {
  const boundary = { socializing: seed };
  return Object.freeze({
    kind: "organizing-as-lakota.tiyospaye",
    scale: "band",
    community: community(boundary),
    kinshipIsPolitics: true,
  });
}

// ── oyáte: the people, as institution ───────────────────────────────────────────────

/**
 * The oyáte reading: a people / nation as organizing's INSTITUTION — the settled order
 * with its own council, naca, akicita, and ceremonial life. `glued` is the substrate's
 * own verdict (institution.glued): whether the constituent bands have settled into one
 * coherent order rather than remaining a loose plurality.
 */

/** Read a seed as an oyáte — a people, derived as an organizing institution. */
export function oyate(seed) {
  const boundary = { socializing: seed };
  const institution = institute(boundary);
  return Object.freeze({
    kind: "organizing-as-lakota.oyate",
    scale: "people",
    institution,
    glued: institution.glued,
  });
}

// ── Očhéthi Šakówiŋ: the confederacy, as federation ─────────────────────────────────

/**
 * The Očhéthi Šakówiŋ reading: the Seven Council Fires as organizing's FEDERATION —
 * the parallel composition of the constituent oyáte/tiyóšpaye. `consensusByWithdrawal`
 * is the standing claim: collective action is reached not by majority compulsion but by
 * each band's RIGHT TO WITHDRAW from what it does not agree to. In the substrate this is
 * exactly the right NOT to join the ‖ — a band that withholds itself simply is not a
 * member of that particular parallel composition. `glued` is federate's own verdict on
 * whether the covers cohere into one fire.
 */

    

/**
 * Read several band seeds as the Očhéthi Šakówiŋ — the confederacy, derived as the
 * organizing federation (parallel composition) of the bands. Each band becomes a cover
 * at the social boundary; federate combines them, and the consensus-by-withdrawal
 * doctrine is the reading that membership in the ‖ is voluntary.
 */
export function ocetiSakowin(bands) {
  const covers = bands.map((band) => ({ socializing: band }));
  const federation = federate(covers);
  return Object.freeze({
    kind: "organizing-as-lakota.oceti-sakowin",
    scale: "confederacy",
    federation,
    consensusByWithdrawal: true,
    glued: federation.glued,
  });
}
