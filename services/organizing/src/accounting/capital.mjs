/**
 * organizing/accounting/capital — the accounting reading of capital as the
 * reseed spiral M–C–M′.
 *
 * Authority: `dev/docs/notes/2026-06-22-trading-as-settling-over-value-categories.md`
 * §4 stage 8 ("capital = the reseed spiral"): *"M–C–M′: value-in-motion that
 * returns enlarged = the agency descent that DOES NOT TERMINATE but reseeds at
 * higher scale (`reseed`). Capital is the spiral, not a thing (corpus capital
 * note: 'not a thing but a social relation that takes the form of self-expanding
 * value'). Surplus value, organic composition, TRPF = ratios = readings on the
 * circuit. Capital-as-class-relation = an asymmetry frozen into the agent-sheaf."*
 *
 * The four readings of capital this module formalizes — each DERIVED, never bare:
 *
 *  1. **circuit(seed) — M–C–M′ = the non-terminating spiral.** Simple commodity
 *     circulation C–M–C terminates: a use-value is reached and the motion stops.
 *     Capital's circuit M–C–M′ does NOT terminate — the settled money re-poses as
 *     the seed of the next, larger circuit. That is EXACTLY `@red-cup-engineering/animating`'s
 *     `reseed`: the individuated being ("settled below, open above") carries a
 *     reading of residual pre-individual potential (its `milieu`) and re-enters as
 *     the seed of a fresh descent at the next scale. So `circuit` is `reseed` read
 *     financially — value-in-motion returning to itself enlarged, `openAbove: true`,
 *     `regime: "aperiodic"` (the spiral never closes into a terminal fixed point).
 *     Capital is the `Becoming`, not a thing: the carrier holds the becoming, not a
 *     stock of money.
 *
 *  2. **surplus(invested, recovered) — surplus value & the rate of profit.** M′ − M
 *     = ΔM is surplus value: `gradedSubtract(recovered, invested)` over
 *     `@red-cup-engineering/gaming/market`'s exact
 *     `Rational`-graded arithmetic (the same commodity sector both legs live in —
 *     `gradedSubtract` THROWS on a commodity mismatch, the multi-commodity safety law).
 *     The rate of profit is the dimensionless RATIO reading on the circuit,
 *     `s / C = ΔM / M`, computed by `gradedRatio(surplus, invested)` as an exact
 *     rational — a reading on the circuit, never a free number on a
 *     thing. (TRPF — the tendency of the rate of profit to fall — and the organic
 *     composition c/(c+v) are further `gradedRatio` readings the institution layer takes
 *     over the reproduction scheme; the primitive they all collapse into is this
 *     single ratio-of-surplus-over-capital.)
 *
 *  3. **sraffaPrices(io) — prices of production = the dominant eigenvector.** Sraffa's
 *     *Production of Commodities by Means of Commodities*: prices of production are
 *     the Perron–Frobenius dominant eigenvector of the input–output matrix (the
 *     self-replacing standard system). On this substrate the eigenstructure is read
 *     SPECTRALLY and EXACTLY: `charPoly(io)` (`@red-cup-engineering/relating/analysis`, ascending
 *     degree, exact `Integer` arithmetic — Bareiss/fraction-free, never a float) is
 *     the characteristic polynomial whose dominant real root is the Perron–Frobenius
 *     eigenvalue (1 + r over the standard ratio), and `rank(io)` (count of nonzero
 *     Smith invariant factors) reports the dimension of the price system. The
 *     dominant-eigenvector reading lives in the spectral root structure of that
 *     polynomial — exposed, not approximated. This is the §2/§6 keystone: the Sraffa
 *     school is a `ValueCategory` choice ('prices-of-production'), settled by the
 *     SAME dynamics as every other school (`four_regime_v_independent`); the
 *     transformation problem (labour values ↦ prices of production) is a base-change
 *     between two `V`'s, not a refutation.
 *
 *  4. **capital-as-class-relation — a reading, not a new carrier.** Capital is "a
 *     social relation that takes the form of self-expanding value" — the M–C–M′
 *     asymmetry (one pole advances M and claims ΔM, the other sells labour-power)
 *     is an ASYMMETRY FROZEN INTO THE AGENT-SHEAF, the off-diagonal of the social
 *     gluing the institution layer (stage 9, `organizing`) settles. It is therefore
 *     a reading on the circuit's becoming and the surplus ratio, NOT a fifth carrier
 *     — the anti-fetishism law (§1): the class relation is the image of a predication
 *     among agents, never free data on a thing.
 *
 * Carriers are bare-`$id` (`organizing/accounting/capital/circuit`,
 * `organizing/accounting/capital/surplus`);
 * each verb is registered once as a relating `action` so `induceSurface` projects the
 * whole surface to every transport. No free data past `Mark`/`Articulating`: the
 * circuit is `reseed`, the surplus is `gradedSubtract` + `gradedRatio`, the Sraffa prices are
 * `charPoly`/`rank` over exact `Integer` matrices.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { charPoly, rank } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { reseed } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";

import { jsonResource } from "@red-cup-engineering/json-services-section";
import { gradeOf, gradedIsZero, gradedRatio, gradedSubtract, gradedToExactString } from "@red-cup-engineering/exact-number-data-service/graded";

/** The carrier `$id` of a capital circuit — the M–C–M′ reseed spiral. */
export const CAPITAL_CIRCUIT_ID = "organizing/accounting/capital/circuit";

/** The `{ $ref }` slot the circuit morphisms reference. */
export const circuitRef = Object.freeze({ $ref: CAPITAL_CIRCUIT_ID });

/** The carrier `$id` of a surplus reading — ΔM and the rate of profit over a circuit. */
export const CAPITAL_SURPLUS_ID = "organizing/accounting/capital/surplus";

/** The `{ $ref }` slot the surplus morphisms reference. */
export const surplusRef = Object.freeze({ $ref: CAPITAL_SURPLUS_ID });

export const circuitRequestCarrier = schemaFrom({
  $id: "organizing/accounting/capital/circuit-request",
  title: "CapitalCircuitRequest",
  type: "object",
  properties: {
    seed: {},
    identity: { type: "string" },
  },
  description:
    "A capital-circuit request: a seed plus optional identity to re-pose as the non-terminating reseed spiral.",
});

export const circuitCarrier = schemaFrom({
  $id: CAPITAL_CIRCUIT_ID,
  title: "CapitalCircuit",
  type: "object",
  description:
    "The M-C-M' capital circuit as animating's non-terminating reseed spiral.",
});

export const reseedCircuitRequestCarrier = schemaFrom({
  $id: "organizing/accounting/capital/reseed-request",
  title: "CapitalReseedRequest",
  type: "object",
  properties: {
    circuit: { $ref: CAPITAL_CIRCUIT_ID },
    identity: { type: "string" },
  },
  description:
    "A request to re-pose a settled capital circuit into the next scale of the spiral.",
});

export const surplusRequestCarrier = schemaFrom({
  $id: "organizing/accounting/capital/surplus-request",
  title: "CapitalSurplusRequest",
  type: "object",
  properties: {
    invested: { $ref: "gaming/market/money" },
    recovered: { $ref: "gaming/market/money" },
  },
  description:
    "A surplus-value request over invested and recovered exact graded money carriers.",
});

export const surplusCarrier = schemaFrom({
  $id: CAPITAL_SURPLUS_ID,
  title: "CapitalSurplus",
  type: "object",
  description:
    "Surplus value and optional rate of profit over a capital circuit.",
});

export const sraffaRequestCarrier = schemaFrom({
  $id: "organizing/accounting/capital/sraffa-request",
  title: "SraffaPricesRequest",
  type: "object",
  properties: {
    io: { type: "array", items: { type: "array", items: { $ref: "exactNumber/integer" } } },
  },
  description:
    "An exact input-output matrix request for Sraffa prices of production.",
});

export const sraffaPricesCarrier = schemaFrom({
  $id: "organizing/accounting/capital/sraffa-prices",
  title: "SraffaPrices",
  type: "object",
  properties: {
    charPoly: { type: "array", items: { $ref: "exactNumber/integer" } },
    rank: { $ref: "exactNumber/natural" },
  },
  description:
    "The exact spectral price-system reading: characteristic polynomial plus rank.",
});

/**
 * A capital circuit: M–C–M′ read as `animating`'s non-terminating reseed spiral.
 *
 * `becoming` IS the `@red-cup-engineering/animating` `Becoming` that `reseed` re-poses the
 * settled individual into — the value-in-motion that returns to itself enlarged
 * and re-enters at the next scale (`openAbove: true`, `regime: "aperiodic"`).
 * `identity` names the circuit's re-posed agent. Capital is held HERE as the
 * becoming, not as a stock of money: capital is the spiral, not a thing.
 */

/**
 * A surplus reading on a circuit: surplus value ΔM = M′ − M and (when capital is
 * advanced, i.e. M ≠ 0) the rate of profit ΔM / M.
 *
 * `surplus` is exact graded money (`gradedSubtract(recovered, invested)`), staying in the
 * invested commodity's sector. `rateOfProfit` is the dimensionless exact
 * rational ratio `gradedRatio(surplus, invested)` — a reading on the circuit, ABSENT when no
 * capital was advanced (the ratio's denominator would be zero; the rate of profit
 * on nothing advanced is undefined, not zero — silence, not denial).
 */

/**
 * M–C–M′: the capital circuit as `animating`'s reseed spiral.
 *
 * `reseed(seed, options)` re-poses the settled individual as the next-scale
 * `Becoming` — the motion that does not terminate but re-enters enlarged. Capital is
 * that becoming: the carrier holds the re-posed spiral, not a money stock. The
 * `identity` option names the re-posed agent (the firm/capital whose circuit this is).
 */
export function circuit(seed, options = {}) {
  const becoming = reseed(seed, options);
  // The re-posed identity is the spiral's first (and only) re-seed token: the
  // settled individual "<identity>|individuated" that re-enters as the next circuit.
  const identity = options.identity ?? becoming.seed[0] ?? "capital";
  return Object.freeze({
    kind: "organizing.accounting.capital.circuit",
    identity,
    becoming,
  });
}

/**
 * Re-pose a settled circuit into the next, higher-scale circuit — the spiral does
 * not terminate. The settled circuit's becoming-seed is fed back through `reseed-circuit`:
 * M′ becomes the M of the next round, value-in-motion returning to itself enlarged.
 * This makes the non-termination operational: `reseed-circuit` of a reseed, one scale up.
 */
export function reseedCircuit(prior, options = {}) {
  // The prior circuit's re-posed seed is the next circuit's input — the spiral re-entry.
  const seed = Object.freeze([...prior.becoming.seed]);
  return circuit(seed, { identity: options.identity ?? prior.identity });
}

/**
 * The surplus reading on a circuit: ΔM = recovered − invested and the rate of
 * profit ΔM / M.
 *
 * `gradedSubtract(recovered, invested)` is the exact graded difference (THROWS on a
 * commodity mismatch — both legs must value the same sector). The rate of profit is
 * the dimensionless ratio `gradedRatio(surplus, invested)`; it is omitted when nothing
 * was advanced (the contract's optional field — no rate of profit on zero capital).
 */
export function surplus(
  invested,
  recovered,
) {
  const delta = gradedSubtract(recovered, invested);
  // With no capital advanced the rate of profit is undefined — omit it (silence ≠ zero).
  if (gradedIsZero(invested)) return Object.freeze({ surplus: delta });
  return Object.freeze({ surplus: delta, rateOfProfit: gradedRatio(delta, invested) });
}

/**
 * Build the full surplus carrier on a circuit's invested/recovered legs: the
 * surplus money, and the rate of profit when capital was advanced.
 */
export function surplusReading(invested, recovered) {
  const { surplus: delta, rateOfProfit } = surplus(invested, recovered);
  return Object.freeze({
    kind: "organizing.accounting.capital.surplus",
    invested,
    recovered,
    surplus: delta,
    ...(rateOfProfit === undefined ? {} : { rateOfProfit }),
  });
}

/**
 * Sraffa prices of production: the characteristic-polynomial spectral structure of
 * the input–output matrix, the substrate of the Perron–Frobenius dominant eigenvector.
 *
 * `charPoly(io)` (`@red-cup-engineering/relating/analysis`, ascending degree, exact `Integer`
 * arithmetic — fraction-free, never a float) is the polynomial whose dominant real
 * root is the Perron–Frobenius eigenvalue of the self-replacing standard system; the
 * prices of production ARE that dominant eigenvector. `rank(io)` (count of nonzero
 * Smith invariant factors) reports the dimension of the resolved price system. The
 * prices-of-production school is a `ValueCategory` choice settled by the same
 * dynamics as every other (§2 keystone); the transformation problem is a base-change.
 */
export function sraffaPrices(io) {
  return Object.freeze({
    charPoly: charPoly(io),
    rank: rank(io),
  });
}

// — boundary admission helpers (carriers reconstructed from JSON at the action edge) —

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Admit a money carrier from args, refusing anything that is not graded exact money. */
function admitMoney(value, slot) {
  if (isRecord(value) && value.kind === "exactNumber.gradedRational") {
    return value;
  }
  throw new TypeError(`capital: ${slot} must be a money carrier (exactNumber.gradedRational)`);
}

/** Admit one exact integer carrier, refusing anything that is not one. */
function admitInteger(value, slot) {
  if (isRecord(value) && value.kind === "exactNumber.integer") {
    return value;
  }
  throw new TypeError(`capital: ${slot} must be an exact integer carrier (exactNumber.integer)`);
}

/**
 * Admit an input–output matrix from args: a JSON array of rows, each a JSON array
 * of exact `Integer` carriers. No float ever enters — the Sraffa eigenstructure is
 * read over exact arithmetic, per the no-free-data / no-float doctrine.
 */
function admitMatrix(value, slot) {
  if (!Array.isArray(value)) {
    throw new TypeError(`capital: ${slot} must be a matrix (array of integer rows)`);
  }
  return Object.freeze(
    value.map((row, r) => {
      if (!Array.isArray(row)) {
        throw new TypeError(`capital: ${slot} row ${r} must be an array of exact integers`);
      }
      return Object.freeze(row.map((cell, c) => admitInteger(cell, `${slot}[${r}][${c}]`)));
    }),
  );
}

/** circuit — M–C–M′: re-pose a seed as the non-terminating reseed spiral. */
export const circuitAction = operation({
  verb: "circuit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["seed", "identity"],
  summary: "M–C–M′: re-pose a seed as the animating reseed spiral — value-in-motion that does not terminate.",
  description:
    "Domain: a JSON seed (+ optional identity). Codomain: a circuit carrier holding the animating Becoming " +
    "that reseed re-poses the settled individual into. Capital is the spiral, not a thing: the carrier holds " +
    "the non-terminating becoming (openAbove, aperiodic regime), the value-in-motion that returns enlarged.",
  domain: circuitRequestCarrier,
  codomain: circuitCarrier,
  run: (input, args = {}) => {
    const seed = (args.seed ?? input);
    const identity = typeof args.identity === "string" ? args.identity : undefined;
    return jsonResource(circuit(seed, identity !== undefined ? { identity } : {}), "circuit");
  },
});

/** reseed-circuit — re-pose a settled circuit into the next, higher-scale circuit. */
export const reseedAction = operation({
  verb: "reseed-circuit",
  inputFormat: "json",
  outputFormat: "json",
  options: ["circuit", "identity"],
  summary: "Re-pose a settled circuit into the next-scale circuit — the spiral does not terminate.",
  description:
    "Domain: a circuit carrier (+ optional identity). Codomain: the next circuit carrier. The prior circuit's " +
    "re-posed becoming-seed becomes the input of the next round — M′ becomes the M of the next circuit, " +
    "value returning to itself enlarged one scale up. This makes M–C–M′'s non-termination operational.",
  domain: reseedCircuitRequestCarrier,
  codomain: circuitCarrier,
  run: (input, args = {}) => {
    const priorValue = (args.circuit ?? input);
    if (!isRecord(priorValue) || priorValue.kind !== "organizing.accounting.capital.circuit") {
      throw new TypeError("capital: circuit must be a circuit carrier (organizing.accounting.capital.circuit)");
    }
    const prior = priorValue;
    const identity = typeof args.identity === "string" ? args.identity : undefined;
    return jsonResource(reseedCircuit(prior, identity !== undefined ? { identity } : {}), "circuit");
  },
});

/** surplus — ΔM = recovered − invested and the rate of profit ΔM / M (a ratio reading). */
export const surplusAction = operation({
  verb: "surplus",
  inputFormat: "json",
  outputFormat: "json",
  options: ["invested", "recovered"],
  summary: "Surplus value ΔM = recovered − invested, with the rate of profit ΔM / M as a ratio reading.",
  description:
    "Domain: an invested money carrier x a recovered money carrier (same commodity sector). Codomain: a " +
    "surplus carrier. surplus = gradedSubtract(recovered, invested) over exact graded money; rateOfProfit = " +
    "gradedRatio(surplus, invested) as a dimensionless exact rational — omitted when no capital was advanced " +
    "(no rate of profit on zero advance — silence, not zero). Derived, never bare.",
  domain: surplusRequestCarrier,
  codomain: surplusCarrier,
  run: (input, args = {}) => {
    const invested = admitMoney((args.invested ?? input), "invested");
    const recovered = admitMoney(args.recovered, "recovered");
    // gradeOf / gradedToExactString touch the money surface so the reading is named by the
    // exact sector it lives in (anti-fetishism: surplus is graded, never a free number).
    void gradeOf(invested);
    void gradedToExactString(recovered);
    return jsonResource(surplusReading(invested, recovered), "surplus");
  },
});

/** sraffa — prices of production = the dominant eigenvector: charPoly + rank of the I–O matrix. */
export const sraffaAction = operation({
  verb: "sraffa",
  inputFormat: "json",
  outputFormat: "json",
  options: ["io"],
  summary: "Sraffa prices of production: charPoly (ascending degree) + rank of the exact-Integer I–O matrix.",
  description:
    "Domain: an input–output matrix (array of rows of exact Integer carriers). Codomain: a record with " +
    "charPoly (the characteristic polynomial, ascending degree, whose dominant real root is the " +
    "Perron–Frobenius eigenvalue — the prices of production are its dominant eigenvector) and rank (the " +
    "price-system dimension, count of nonzero Smith invariant factors). Exact Integer arithmetic — never a float.",
  domain: sraffaRequestCarrier,
  codomain: sraffaPricesCarrier,
  run: (input, args = {}) => {
    const io = admitMatrix((args.io ?? input), "io");
    return jsonResource(sraffaPrices(io), "sraffa-prices");
  },
});

/** The capital module's verbs: the reseed spiral, its re-entry, the surplus ratio, and Sraffa prices. */
export const capitalActions = Object.freeze([
  circuitAction,
  reseedAction,
  surplusAction,
  sraffaAction,
]);
