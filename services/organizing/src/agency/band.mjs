/**
 * band — the grouping above offices and how it coordinates: membership by recognition, head standing,
 * the council's close, fission and confederacy, as obsmetrologia-computing's
 * `ObsmetrologiaComputing.Band` specifies them (Lane 7, 2026-10-03) and its golden vectors judge them
 * (./band-realization.mjs).
 *
 * A band is held together by recognition, never by a roster. Its members are the least fixpoint of
 * recognition by recognized members: the founders, then whoever a member recognizes, unless they
 * withdrew. Records seed only the founding, and a denial never removes anyone. Its head stands on the
 * knowledge meet of every member's recognition cell, so one withdrawn recognition brings it down; nothing
 * reads "the head says so". Its council closes on the knowledge join of the engaged members who have not
 * withdrawn from the question: silence never blocks (the join's identity), a dissenter withdraws rather
 * than outvotes, and a held contradiction stays held. A subset that withdraws together founds its own
 * band, nobody is lost, and the two camp together. Bands confederate by parallel composition: their
 * settlements glue when no one band tells for what another tells against, and the obstruction is the
 * conflicting pairs. A council over k bands reconciles at most k(k−1)/2 conflicts, whatever the bands
 * hold: that is how many agents coordinate at a cost bounded per level.
 *
 * Recognition and denial are tellings (monotone, coordination-free); withdrawal and fission retract
 * (coordinated). Agents are any comparable keys; readings are FOUR's points (four.mjs).
 */
import { knowledgeJoinAll, knowledgeMeetReading, knowledgeTop, readingOfSides, sidesOfReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const told = (t = {}) => ({ recognitions: t.recognitions ?? [], denials: t.denials ?? [], withdrawn: t.withdrawn ?? [] });
const setOf = (agents) => [...new Set(agents)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

/**
 * The band's members: the least fixpoint of recognition by recognized members, from the founders who
 * have not withdrawn, as a set (sorted, each once).
 * @param {ReadonlyArray<any>} founders
 * @param {{ recognitions?: ReadonlyArray<[any, any]>, denials?: ReadonlyArray<[any, any]>, withdrawn?: ReadonlyArray<any> }} t
 */
export function bandMembers(founders, t) {
  const { recognitions, withdrawn } = told(t);
  const out = new Set(withdrawn);
  const members = new Set(founders.filter((agent) => !out.has(agent)));
  for (let grown = true; grown;) {
    grown = false;
    for (const [by, of] of recognitions) {
      if (members.has(by) && !members.has(of) && !out.has(of)) { members.add(of); grown = true; }
    }
  }
  return setOf([...members]);
}

/** A candidate's standing: for when a member, against when a member denies it, both when both, unknown
 *  once it has withdrawn (withdrawal retracts the engagement and keeps the relation; never against). */
export function memberReading(founders, t, candidate) {
  const { denials, withdrawn } = told(t);
  if (withdrawn.includes(candidate)) return readingOfSides("knowledge", false, false);
  const members = new Set(bandMembers(founders, t));
  return readingOfSides("knowledge", members.has(candidate), denials.some(([by, of]) => members.has(by) && of === candidate));
}

/** The head's standing: the knowledge meet of every member's recognition cell for it; unknown for a band
 *  with no members. The head stands when the meet carries the for side. */
export function headStanding(members, { recognizes = [], denies = [] } = {}, head) {
  if (members.length === 0) return readingOfSides("knowledge", false, false);
  const cell = (member) => readingOfSides("knowledge", recognizes.some(([a, h]) => a === member && h === head), denies.some(([a, h]) => a === member && h === head));
  return members.reduce((standing, member) => knowledgeMeetReading(standing, cell(member)), knowledgeTop("knowledge"));
}

/** The engaged members' merged reading on one question: the knowledge join of the readings of those who
 *  have not withdrawn from it. */
export const councilMerged = (engaged, withdrawn = []) => knowledgeJoinAll(engaged.filter(([agent]) => !withdrawn.includes(agent)).map(([, reading]) => reading), "knowledge");

/** The council's close: consensus for or against, contested (held, never exploded) or unresolved. */
export function councilClose(engaged, withdrawn = []) {
  const [forSide, againstSide] = sidesOfReading(councilMerged(engaged, withdrawn));
  if (forSide && againstSide) return Object.freeze({ close: "contested" });
  if (forSide || againstSide) return Object.freeze({ close: "consensus", side: forSide });
  return Object.freeze({ close: "unresolved" });
}

/** A fission: the subset `subset` withdraws together and founds its own band. The parent is the band
 *  with them withdrawn; the child is everyone they reach who does not stay in the parent. */
export function fission(founders, t, subset) {
  const base = told(t);
  const parent = bandMembers(founders, { ...base, withdrawn: [...base.withdrawn, ...subset] });
  const stays = new Set(parent);
  return Object.freeze({ parent, child: bandMembers(subset, base).filter((agent) => !stays.has(agent)), campsWith: true });
}

/** The pairs of bands whose settlements conflict: one told for what the other told against (a band
 *  holding both conflicts with itself), in the order the bands are given. */
export function conflictsOf(settlements) {
  return settlements.flatMap(([band, reading]) => {
    if (!sidesOfReading(reading)[0]) return [];
    return settlements.filter(([, other]) => sidesOfReading(other)[1]).map(([other]) => [band, other]);
  });
}

/** Bands' settlements confederated: glued (their knowledge join) when no pair conflicts, else obstructed
 *  by the conflicting pairs. A band that withdrew from the question is simply not among them. */
export function confederate(settlements) {
  const conflicts = conflictsOf(settlements);
  return conflicts.length === 0
    ? Object.freeze({ glued: knowledgeJoinAll(settlements.map(([, reading]) => reading), "knowledge") })
    : Object.freeze({ obstructed: conflicts });
}

/** What a council over child bands pays to coordinate: the unordered pairs of children that conflict. */
export function councilCost(settlements) {
  let cost = 0;
  for (let i = 0; i < settlements.length; i += 1) {
    for (let j = i + 1; j < settlements.length; j += 1) {
      const [pf, pa] = sidesOfReading(settlements[i][1]);
      const [qf, qa] = sidesOfReading(settlements[j][1]);
      if ((pf && qa) || (pa && qf)) cost += 1;
    }
  }
  return cost;
}
