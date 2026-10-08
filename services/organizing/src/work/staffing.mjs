/**
 * work/staffing — who and what carries a piece of work is the promiser's strategy, derived inside
 * its own root, never prescribed by whoever asked for the work and never authored as a table of
 * model names (note 2026-10-01 "The work arena's third edition"; Theorem 10: delegation is
 * dispatched by authority, the provider is chosen by the market).
 *
 * Nothing here is stored. The carriers are the ones the machine currently admits (a harness
 * carrier held by the worker); each carrier's standing is a read of the house's own outcomes, a
 * Beta(1,1) posterior acceptance (accepted + 1) / (attempts + 2) — the same estimator the inference
 * market prices external lots with (computer-inference-engine decide-work-placement). Attempts at
 * the responsibility in hand update that prior: a miss on a carrier lowers its posterior for this
 * responsibility and raises the effort the next attempt on it runs at. A carrier whose every effort
 * has missed this responsibility is exhausted for it; when every admitted carrier is exhausted,
 * automatic reallocation stops and the responsibility is a finding, not a retry loop.
 *
 * A carrier is a ribosome (note 2026-07-24 "The Central Dogma of Code Fabrication"): it makes what
 * the order says and is blind to intent the order did not carry, so the corrective for a miss is a
 * more complete order, never a more capable carrier. Carriers of different models are independent
 * channels (kinetic proofreading: two passes by one model on one prompt are one channel); once
 * `orderChannels` of them have missed one responsibility, the misses are the order's, and staffing
 * stops escalating: it reads `orderIncomplete`, which the taker reports as an `information`
 * obstacle and the order's opener answers by completing it (enterprise/work-arena). How many is
 * the staffing enterprise's own point on its `order-channels` axis (enterprise/work-arena
 * `WORK_AXES`); `ORDER_CHANNELS` is that axis's default.
 * @packageDocumentation
 */

import { hashSeed } from "@red-cup-engineering/computer-data-services-section/randomization/hash-seed";
import { mulberry32 } from "@red-cup-engineering/computer-data-services-section/randomization/mulberry32";

/** The efforts a carrier can be run at, cheapest first. */
export const EFFORTS = Object.freeze(["medium", "high", "xhigh"]);

const isMiss = (attempt) => attempt?.outcome === "failed" || attempt?.outcome === "rejected";

/**
 * How many independent carriers missing one responsibility show its order incomplete: the default
 * of the `order-channels` axis, for staffing whose enterprise holds no other point.
 */
export const ORDER_CHANNELS = 2;

/**
 * The independent channels that missed a responsibility: the distinct carriers its missed attempts
 * recorded. A miss whose carrier went unrecorded is no channel, since nothing shows it independent.
 */
export function missedChannelsOf(attempts = []) {
  return Object.freeze([...new Set(attempts.filter((attempt) => isMiss(attempt) && typeof attempt.carrier === "string" && attempt.carrier !== "")
    .map((attempt) => attempt.carrier))].sort());
}

/**
 * The house's standing of each carrier, from its outcomes `[{carrier, outcome}]` (outcome
 * "accepted", "failed" or "rejected"; other outcomes are still open and do not count).
 * Returns a Map carrier → {accepted, attempts}.
 */
export function carrierStandingOf(outcomes = []) {
  const standing = new Map();
  for (const { carrier, outcome } of outcomes) {
    if (typeof carrier !== "string" || carrier === "") continue;
    if (outcome !== "accepted" && !isMiss({ outcome })) continue;
    const prior = standing.get(carrier) ?? { accepted: 0, attempts: 0 };
    standing.set(carrier, { accepted: prior.accepted + (outcome === "accepted" ? 1 : 0), attempts: prior.attempts + 1 });
  }
  return standing;
}

/**
 * Standings read from different registers of one house's outcomes, joined: each carrier's
 * accepted and attempts summed. A register counted twice would count its judgments twice, so each
 * standing passed must come from judgments the others do not hold (the work queue's own receipts,
 * the outcome journal's other registers: enterprise/outcomes `standingOf`).
 * @param {...(Map<string, {accepted: number, attempts: number}> | undefined)} standings
 */
export function joinStandings(...standings) {
  const joined = new Map();
  for (const standing of standings) {
    for (const [carrier, { accepted, attempts }] of standing ?? []) {
      const prior = joined.get(carrier) ?? { accepted: 0, attempts: 0 };
      joined.set(carrier, { accepted: prior.accepted + accepted, attempts: prior.attempts + attempts });
    }
  }
  return joined;
}

/**
 * The staffing of one admitted carrier for the next attempt at a responsibility. `attempts` are
 * the earlier attempts at this exact responsibility, `{outcome, carrier?}`; a miss whose carrier
 * went unrecorded counts against every carrier (the record cannot clear any of them). `carrier`
 * undefined means the machine's default carrier: every miss counts and only effort is derived.
 * `price` is the carrier's exchange rate per attempt (Theorem 10's market-mediated ρ*): 0 for a
 * carrier drawing no premium subscription quota, 1 for a unit of premium subscription quota. A carrier with one effort is
 * exhausted by its first miss, which is how bounded work falls through to the premium residual.
 * `orderChannels` is how many independent carriers missing it show its order incomplete.
 */
export function staffingFor({ carrier, attempts = [], standing = new Map(), efforts = EFFORTS, price = 1, orderChannels = ORDER_CHANNELS, draw }) {
  const misses = attempts.filter((attempt) => isMiss(attempt) && (carrier === undefined || attempt.carrier === undefined || attempt.carrier === carrier)).length;
  const house = standing.get(carrier) ?? { accepted: 0, attempts: 0 };
  const alpha = house.accepted + 1;
  const beta = Math.max(0, house.attempts + misses - house.accepted) + 1;
  const acceptance = alpha / (alpha + beta);
  // Ranked by a draw from the posterior when one is given (`thompsonDraw`), else by its mean.
  const drawn = draw === undefined ? acceptance : draw(alpha, beta);
  const channels = missedChannelsOf(attempts);
  const orderIncomplete = channels.length >= orderChannels;
  const exhausted = orderIncomplete || misses >= efforts.length;
  const effort = efforts[Math.min(misses, efforts.length - 1)];
  return Object.freeze({
    ...(carrier === undefined ? {} : { carrier }), effort, misses, exhausted, acceptance, price, expectedCost: price / drawn,
    ...(draw === undefined ? {} : { drawnAcceptance: drawn }),
    ...(orderIncomplete ? { orderIncomplete, channels } : {}),
    reason: `${carrier ?? "default carrier"}: posterior acceptance ${acceptance.toFixed(3)}${draw === undefined ? "" : ` (drawn ${drawn.toFixed(3)})`} at price ${price} (house ${house.accepted}/${house.attempts}`
      + `${misses === 0 ? "" : `, ${misses} miss(es) here`}); effort ${effort}`
      + (orderIncomplete ? `; carriers ${channels.join(", ")} each missed this responsibility, so its order is incomplete` : exhausted ? "; every effort missed this responsibility" : ""),
  });
}

/** Better staffing first: unexhausted, then least expected cost per accepted result (price over
 * posterior acceptance, so at one price the higher acceptance), then higher acceptance, then
 * cheaper effort, then name (stable). */
export const byStaffing = (left, right) => Number(left.exhausted) - Number(right.exhausted)
  || (left.expectedCost ?? 1 / left.acceptance) - (right.expectedCost ?? 1 / right.acceptance)
  || right.acceptance - left.acceptance
  || EFFORTS.indexOf(left.effort) - EFFORTS.indexOf(right.effort)
  || String(left.carrier ?? "").localeCompare(String(right.carrier ?? ""));

/** The best staffing among the admitted carriers (or the default carrier when none is known). */
export function bestStaffing({ carriers = [], attempts = [], standing = new Map(), efforts = EFFORTS, price = 1, orderChannels = ORDER_CHANNELS, draw }) {
  const options = (carriers.length === 0 ? [undefined] : [...new Set(carriers)])
    .map((carrier) => staffingFor({ carrier, attempts, standing, efforts, price, orderChannels, draw }));
  return options.sort(byStaffing)[0];
}

/**
 * A Thompson draw (Thompson 1933; Chapelle and Li 2011): a carrier's acceptance sampled from its
 * Beta posterior instead of read at its mean. Ranking by the mean always picks the carrier whose
 * evidence already looks best, so a carrier with little evidence beside a cheaper incumbent is never
 * tried and its posterior never moves (on 2026-10-04/05 Antigravity carried nothing for fifteen hours
 * beside Codex). A draw tries each carrier about as often as it may be the best. `seed` names the
 * decision, so one decision always draws the same. Returns `(alpha, beta) => sample`.
 */
export function thompsonDraw(seed) {
  const random = mulberry32(hashSeed(String(seed)));
  const open = () => { let u = random(); while (u === 0) u = random(); return u; };
  const normal = () => Math.sqrt(-2 * Math.log(open())) * Math.cos(2 * Math.PI * random());
  // Marsaglia and Tsang (2000) for shape ≥ 1; a smaller shape is boosted by U^(1/shape).
  const gamma = (shape) => {
    if (shape < 1) return gamma(shape + 1) * open() ** (1 / shape);
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x;
      let v;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v ** 3;
      const u = open();
      if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  return (alpha, beta) => {
    const a = gamma(alpha);
    return a / (a + gamma(beta));
  };
}
