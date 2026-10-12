// regimes.mjs — the registry of governance regimes SWARM selects among, RIDING the OS distribution
// layer it seeded.
//
// The four-valued regimes (kyriarchical / consensus-by-withdrawal / advisory / contrarian), the six
// Gov axes, the named-but-underived families, DEFAULT_REGIME, regimeNames/selectRegime/admitUnder were
// lifted verbatim-in-logic from this file into @561-group/computer/distribution (its governance.mjs
// says so, cites preserved). SWARM now imports them back rather than keep a fork: a regime is a point
// in the six-axis Gov space plus a FOUR-valued settling rule admit(ctx) -> decision; the substantive
// wolakȟota theory the consensus/contrarian regimes point at remains the corpus's, authored in Lakota
// terms only there. This module re-derives NONE of the regime content; it re-exports the OS regimes.
//
// What STAYS swarm-domain (and lives elsewhere in this package): the structuration→regime FOLD
// (structuration.mjs selectGovernanceRegime, which reads a work's observable shape), the on-disk
// decision write + cost-witness coupling (governance.mjs governAction), and the office capability test
// (offices.mjs `can`) passed in as ctx.can. The OS holds the regime ALGEBRA; swarm holds the work
// domain that selects and persists under it.

export {
  REGIMES,
  GOV_AXES,
  KNOWN_REGIME_FAMILIES,
  DEFAULT_REGIME,
  regimeNames,
  selectRegime,
  admitUnder,
} from "@561-group/computer/distribution/governance";
