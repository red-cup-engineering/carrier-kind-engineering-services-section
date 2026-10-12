/**
 * Market gaps as formal concept analysis: where do readers (or buyers) ask
 * for a combination of qualities that nothing on offer is witnessed to have?
 *
 * The supply is a formal context: each existing work is an object, each
 * quality it is witnessed to have is an attribute, and each quality it is
 * witnessed NOT to have is a denied attribute (metrologic's denial lane), so
 * "not coded" is never read as "absent". A demand is a set of wanted
 * qualities (a denied quality means the demand wants it absent, e.g.
 * ¬explicit-sex) carried by dated evidence for and against it.
 *
 * For one demand the assay reads:
 * - the works witnessed to satisfy every wanted quality (its extent);
 * - the works that could still satisfy it, because none of its qualities is
 *   denied for them; the difference is the research agenda: which works to
 *   read, for which qualities;
 * - for each wanted quality, what the supply offers when that one quality is
 *   dropped: the missing ingredient a gap is made of;
 * - two FOUR readings in the truth family. The gap reading is "true" when
 *   too few works could satisfy the demand even counting the uncoded ones,
 *   "false" when enough are witnessed to, and "neither" while the answer
 *   depends on works not yet coded. The demand reading is told true by
 *   evidence for, and told false by evidence against.
 *
 * The house's one FCA implementation is metrologic's formal context; this
 * module only asks it questions.
 */
import { NEG, extent, makeContext } from "@red-cup-engineering/metrologic/closure/formal-context";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

const QUALITY = /^[a-z0-9][a-z0-9-]*$/u;

function wanted(quality) {
  const denied = quality.startsWith(NEG);
  const base = denied ? quality.slice(NEG.length) : quality;
  if (!QUALITY.test(base)) throw new TypeError(`quality ${quality} must be a kebab-case name, optionally prefixed ${NEG}`);
  return { quality, base, denied };
}

/**
 * The supply as a formal context.
 * @param {{id: string, has: string[], lacks?: string[]}[]} works each work's witnessed and witnessed-absent qualities
 */
export function supplyContext(works) {
  const ids = new Set();
  const qualities = new Set();
  const incidence = [];
  const denials = [];
  for (const work of works) {
    if (typeof work?.id !== "string" || ids.has(work.id)) throw new TypeError("every work needs a unique id");
    ids.add(work.id);
    for (const quality of work.has ?? []) { wanted(quality); qualities.add(quality); incidence.push([work.id, quality]); }
    for (const quality of work.lacks ?? []) {
      wanted(quality); qualities.add(quality); denials.push([work.id, quality]);
      if ((work.has ?? []).includes(quality)) throw new TypeError(`${work.id} both has and lacks ${quality}`);
    }
  }
  return makeContext([...ids], [...qualities], incidence, denials);
}

// Could `work` satisfy `quality`? Only when it is not witnessed to the contrary.
function compatible(ctx, work, { base, denied }) {
  const contrary = denied ? base : `${NEG}${base}`;
  return !extent(ctx, new Set([contrary])).has(work);
}

/**
 * Read one demand against the supply.
 * @param {ReturnType<typeof supplyContext>} ctx
 * @param {{id: string, wants: string[], evidence?: {for?: object[], against?: object[]}}} demand
 * @param {{occupiedAt?: number}} [options] how many witnessed works make the supply occupied (default 2)
 */
export function readDemand(ctx, demand, { occupiedAt = 2 } = {}) {
  const wants = demand.wants.map(wanted);
  if (wants.length === 0) throw new TypeError(`${demand.id} wants nothing`);
  const attrs = new Set(wants.map((w) => w.quality));
  const witnessed = [...extent(ctx, attrs)].sort();
  const possible = ctx.G.filter((work) => wants.every((w) => compatible(ctx, work, w))).sort();
  const agenda = possible.filter((work) => !witnessed.includes(work)).map((work) => ({
    work,
    unknown: wants.filter((w) => !extent(ctx, new Set([w.quality])).has(work)).map((w) => w.quality),
  }));
  const missing = wants.map((w) => {
    const rest = new Set([...attrs].filter((quality) => quality !== w.quality));
    return { dropped: w.quality, supply: rest.size ? [...extent(ctx, rest)].sort() : [] };
  });
  const evidenceFor = demand.evidence?.for ?? [];
  const evidenceAgainst = demand.evidence?.against ?? [];
  return Object.freeze({
    id: demand.id,
    wants: demand.wants,
    witnessed,
    agenda,
    missing,
    gap: readingOfSides("truth", possible.length < occupiedAt, witnessed.length >= occupiedAt),
    demand: readingOfSides("truth", evidenceFor.length > 0, evidenceAgainst.length > 0),
    evidence: Object.freeze({ for: evidenceFor.length, against: evidenceAgainst.length }),
  });
}

/**
 * Read every demand; the candidates to write for are the demands whose gap
 * and demand both read "true".
 * @param {{works: object[], demands: object[], occupiedAt?: number}} study
 */
export function assayMarketGaps({ works, demands, occupiedAt = 2 }) {
  const ctx = supplyContext(works);
  const readings = demands.map((demand) => readDemand(ctx, demand, { occupiedAt }));
  return Object.freeze({
    works: works.length,
    readings,
    candidates: readings.filter((reading) => reading.gap === "true" && reading.demand === "true").map((reading) => reading.id),
  });
}
