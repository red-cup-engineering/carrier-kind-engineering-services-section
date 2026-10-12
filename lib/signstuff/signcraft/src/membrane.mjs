/**
 * membrane — how a faculty's membrane of utterances tells SignCells.
 *
 * An utterance is a token and a claim, each hand carrying a Mark (SignCell's one
 * utterance carrier); the cell it tells is over the hands' data. A claim's surface negation markers
 * (`!`, `¬`, `-`, `not `, `no `, `never `, or the payload `false`) are parsed
 * once, here: an odd number of markers tells the bare claim against, an even
 * number tells it for (negation is an involution). When the token packs a
 * relation pair `{ subject, object }`, the utterance is about the cell
 * (subject, claim, object); otherwise about the reflexive (token, claim, token).
 * Reading a membrane joins its tellings: "p" and "not p" together read
 * told-both on the one cell of p.
 *
 * Every faculty reads its membrane through this one telling; the faculties
 * differ in the order they read the cells in, not in what was told.
 */
import { cell, cellSet, claimValue, tokenValue, utterance } from "@red-cup-engineering/signcell/cell";
import { settleCells } from "@red-cup-engineering/signcraft/settle";

/** A leading negation marker. */
export const NEGATION = /^\s*(?:!|¬|-|not\s+|no\s+|never\s+)/i;

/** A claim's bare label and the side it tells: surface negation markers read by parity. */
export function denialOf(claim) {
  if (claim === false) return Object.freeze({ against: true, label: "false" });
  if (typeof claim !== "string") return Object.freeze({ against: false, label: claim });
  let text = claim.trim(), flips = 0;
  while (NEGATION.test(text) && text.replace(NEGATION, "").trim() !== "") { text = text.replace(NEGATION, "").trim(); flips += 1; }
  return Object.freeze({ against: flips % 2 === 1, label: text });
}

/** The {subject, object} pair an utterance's token packs, when it packs one. */
export function relationPairOf(token) {
  if (typeof token !== "object" || token === null || Array.isArray(token)) return undefined;
  if (Object.keys(token).length !== 2 || token.subject === undefined || token.object === undefined) return undefined;
  return token;
}

/** The cell an utterance is about (its claim as given): the packed relation, else the reflexive cell. */
export function cellOfUtterance(carrier) {
  const [token, claim] = [tokenValue(carrier), claimValue(carrier)];
  const pair = relationPairOf(token);
  return pair === undefined ? cell(token, claim, token) : cell(pair.subject, claim, pair.object);
}

/** One utterance's telling: its bare claim's cell, told for or against, witnessed by `witness` (by default
 *  the utterance itself). */
export function tellingOf(carrier, witness = utterance(tokenValue(carrier), claimValue(carrier))) {
  const { against, label } = denialOf(claimValue(carrier));
  const at = cellOfUtterance(utterance(tokenValue(carrier), label));
  return cell(at.subject, at.predicate, at.object, { [against ? "against" : "for"]: [witness] });
}

/** A membrane read: its tellings joined, one cell per claim told either way. */
export const tellMembrane = (membrane, witnessOf) => cellSet(membrane.map((carrier) => tellingOf(carrier, witnessOf?.(carrier))));

/** Settle a membrane: its tellings posited over the site they generate and settled under that site's
 *  specialization transport (SignCraft). The settlement carries the site; its `settled` is the section. */
export const settleMembrane = (membrane, witnessOf) => settleCells(tellMembrane(membrane, witnessOf));
