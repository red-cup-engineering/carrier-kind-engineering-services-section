// farstone-campaign — Farstone's specific long-horizon player arc, ported
// from fizzos's campaign.mts. `progression.mjs` already carries a GENERIC,
// single-cell-threshold campaign engine (`campaignStage`/`awardCampaign`)
// and a generic Thought Cabinet (`defineThought`/`beginThought`/
// `internalizeThought`); this module is Farstone-flavored content (like
// farstone-arcs.mjs/farstone-climate.mjs) whose stages need aggregates
// (top skill, top standing) and non-actor-scoped facts (the dredging
// permit) that engine can't express — hence its own view-predicate shape.

/**
 * @typedef {object} CampaignView
 * @property {number} coin - coin the player has made.
 * @property {number} topSkill - the player's highest trained skill level.
 * @property {number} faculties - faculties trained (parity with fizzos only; unused by Off-Season).
 * @property {boolean} ownsBuilt - whether the player owns a structure they raised.
 * @property {boolean} permitResolved - whether the dredging-permit dispute has been settled.
 * @property {number} topStanding - the player's highest faction standing.
 * @property {number} thoughtsFixed - Thoughts internalized. `progression.mjs` already carries a
 *   generic, tested Thought Cabinet engine (`defineThought`/`beginThought`/`internalizeThought`);
 *   this count is 0 until something wires Farstone-specific Thought content atop it and assembles
 *   this field from it — out of scope for this tranche.
 *
 * @typedef {object} Stage
 * @property {string} id
 * @property {string} title
 * @property {string} task
 * @property {number} reward
 * @property {(view: CampaignView) => boolean} done
 *
 * @typedef {object} Campaign
 * @property {string} id
 * @property {string} name
 * @property {readonly Stage[]} stages
 *
 * "The Off-Season" — arrive with nothing, find your feet, learn the working
 * waterfront's trades, win a place of your own, take a hand in the island's
 * politics, and end as someone the harbor reckons with. Each threshold is a
 * fact the player constructs through ordinary play across every other
 * system, not content authored for its own sake.
 * @type {Campaign}
 */
export const OFF_SEASON = Object.freeze({
  id: "off-season",
  name: "The Off-Season",
  stages: Object.freeze([
    Object.freeze({
      id: "feet", title: "Find Your Feet", task: "Make 60 coin on the lean waterfront — trade, fish, or work.",
      reward: 25, done: (view) => view.coin >= 60,
    }),
    Object.freeze({
      id: "trade", title: "A Trade in Hand", task: "Train any skill to apprentice (level 15) by doing the work.",
      reward: 30, done: (view) => view.topSkill >= 15,
    }),
    Object.freeze({
      id: "eye", title: "A Keener Eye", task: "Internalize a Thought — let the island reshape how you see.",
      reward: 30, done: (view) => view.thoughtsFixed >= 1,
    }),
    Object.freeze({
      id: "roof", title: "A Roof of Your Own", task: "Raise a structure of your own — gather the materials and build.",
      reward: 40, done: (view) => view.ownsBuilt,
    }),
    Object.freeze({
      id: "permit", title: "A Hand in the Dispute", task: "See the dredging-permit dispute resolved — by your petition or another's.",
      reward: 50, done: (view) => view.permitResolved,
    }),
    Object.freeze({
      id: "pillar", title: "Pillar of the Harbor", task: "Win a faction's friendship (standing 40+). Become someone the harbor reckons with.",
      reward: 80, done: (view) => view.topStanding >= 40,
    }),
  ]),
});

/**
 * The stage a player stands at, by index; past the last index means the
 * campaign is complete.
 * @param {Campaign} campaign
 * @param {number} index
 * @returns {Stage|null}
 */
export function stageAt(campaign, index) {
  return campaign.stages[index] ?? null;
}

/**
 * The campaign read for a player — progress, the current task, and what's
 * done so far.
 * @param {Campaign} campaign
 * @param {number} index
 * @param {CampaignView} view - unused by the report itself; kept for the same
 *   call shape a future stage-annotated report will want.
 * @returns {string}
 */
export function campaignReport(campaign, index, view) {
  void view;
  if (index >= campaign.stages.length) {
    return `${campaign.name}: complete. You are reckoned with — every stage of the arc is behind you.`;
  }
  const stage = campaign.stages[index];
  const lines = [`${campaign.name} — stage ${index + 1}/${campaign.stages.length}: ${stage.title}`, `  ${stage.task}`];
  for (let i = 0; i < index; i += 1) lines.push(`  ✓ ${campaign.stages[i].title}`);
  return lines.join("\n");
}
