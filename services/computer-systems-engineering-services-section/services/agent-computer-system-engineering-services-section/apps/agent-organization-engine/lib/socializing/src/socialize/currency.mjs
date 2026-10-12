/**
 * currency - H1 coordination cost as social currency.
 *
 * This is the generalization that fell out of decide-by-market. A market price is one
 * reading of the socializing consensus limit; the residual spread-H1 is more general:
 * it is the field's coordination premium, a unit the society issues whenever a cell
 * does not glue. In ordinary market language it is spread/adverse selection. In
 * mutual-credit language it is the ledger entry the field owes itself. In Marxian
 * language it is social labor made exchangeable. In the debt/flow line running through
 * the French and Italian 1970s/1980s, it is command, subjectivation, and sign-flow made
 * measurable without collapsing the contradiction.
 *
 * The module intentionally keeps this as a reusable receipt. Today it consumes
 * decide-by-market's preference cells; institutionalization, recognition, mobilization,
 * publics, anomie, boundary-work, and legitimacy can later emit the same cell shape and
 * receive a comparable currency register.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { admitSeed, descend } from "@red-cup-engineering/animating/becoming/descending";

import {
  decideByMarket,

} from "./govern.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export const COORDINATION_CURRENCY_ID = "socializing/currency/coordination";

const LENSES = Object.freeze([
  "money-is-memory",
  "mutual-credit",
  "exchange-value",
  "debt-subjectivation",
  "semiotic-flow",
  "social-factory",
]);

const THEORY = Object.freeze({
  moneyIsMemory: "the currency receipt is a remembered H1 residue, not a commodity primitive",
  mutualCredit: "each positive issue is the field crediting a future coordination obligation to itself",
  exchangeValue: "the issued unit is social labor made comparable through the market-settled cell",
  debtSubjectivation: "nonzero spread records an obligation that organizes conduct until it is settled",
  semioticFlow: "equilibrium is the sign-direction; spread is the blocked circulation of that sign",
  socialFactory: "the total issue measures coordination labor distributed across the whole social field",
});

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isMarketGovernance = (value) =>
  isRecord(value) && value.kind === "socializing.market-governance" && Array.isArray(value.cells);

const nonnegativeInteger = (value, label) => {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new TypeError(`${label}: expected a nonnegative integer H1 spread`);
  }
  return Number(value);
};

function marketCellId(cell) {
  return `preference:${cell.a}>${cell.b}`;
}

function fromMarketCell(cell) {
  return Object.freeze({
    id: marketCellId(cell),
    source: "decide-by-market",
    spreadH1: cell.spreadH1,
    noArbitrage: cell.noArbitrage,
    coherentConsensus: cell.coherentConsensus,
    equilibrium: cell.equilibrium,
    pooled: cell.pooled,
  });
}

function normalizeCell(input, index) {
  const spreadH1 = nonnegativeInteger(input.spreadH1, `coordination-currency cells[${index}].spreadH1`);
  const noArbitrage = input.noArbitrage ?? spreadH1 === 0;
  const coherentConsensus = input.coherentConsensus ?? spreadH1 === 0;
  const status = spreadH1 === 0 ? "settled" : "contested";
  return Object.freeze({
    id: input.id ?? `cell:${index}`,
    source: input.source ?? "coordination-cell",
    spreadH1,
    issued: spreadH1,
    status,
    noArbitrage,
    coherentConsensus,
    ...(input.equilibrium === undefined ? {} : { equilibrium: input.equilibrium }),
    ...(input.pooled === undefined ? {} : { pooled: input.pooled }),
    lenses: LENSES,
  });
}

export function coordinationCurrency(
  input,
) {
  const cellsInput = isMarketGovernance(input)
    ? input.cells.map(fromMarketCell)
    : input;
  const cells = Object.freeze(cellsInput.map(normalizeCell));
  const issued = cells.reduce((sum, cell) => sum + cell.issued, 0);
  const contested = cells.filter((cell) => cell.status === "contested").length;
  return Object.freeze({
    kind: "socializing.coordination-currency",
    unit: "h1-coordination-credit",
    cells,
    issued,
    contested,
    settled: cells.length - contested,
    noArbitrage: cells.every((cell) => cell.noArbitrage),
    coherentConsensus: cells.every((cell) => cell.coherentConsensus),
    lenses: LENSES,
    theory: THEORY,
  });
}

function admitCurrencyInput(input) {
  if (isRecord(input) && input.kind === "socializing.market-governance" && Array.isArray(input.cells)) {
    return input;
  }
  if (isRecord(input) && Array.isArray(input.cells)) {
    return input.cells.map((cell, index) => {
      if (!isRecord(cell)) throw new TypeError(`coordination-currency cells[${index}]: expected an object`);
      const admitted

 = {
        spreadH1: nonnegativeInteger(cell.spreadH1, `coordination-currency cells[${index}].spreadH1`),
      };
      if (typeof cell.id === "string") admitted.id = cell.id;
      if (typeof cell.source === "string") admitted.source = cell.source;
      if (typeof cell.noArbitrage === "boolean") admitted.noArbitrage = cell.noArbitrage;
      if (typeof cell.coherentConsensus === "boolean") admitted.coherentConsensus = cell.coherentConsensus;
      if (isRecord(cell.equilibrium)) admitted.equilibrium = cell.equilibrium;
      if (isRecord(cell.pooled)) admitted.pooled = cell.pooled;
      return Object.freeze(admitted);
    });
  }
  return decideByMarket(descend(admitSeed(input)).utterances);
}

const CURRENCY_SCHEMA = Object.freeze({
  $id: COORDINATION_CURRENCY_ID,
  title: "CoordinationCurrency",
  type: "object",
  description:
    "H1 coordination cost issued as social currency. Accepts a decide-by-market receipt, { cells: [{ id, spreadH1, ... }] }, or a preference membrane; returns h1-coordination-credit issued per contested cell.",
});

const CURRENCY_INPUT_SCHEMA = Object.freeze({
  $id: "socializing/currency/coordination-input",
  title: "CoordinationCurrencyInput",
  type: ["string", "array", "object"],
  description:
    "a preference membrane, a market-governance receipt, or { cells: [{ id, source, spreadH1, noArbitrage, coherentConsensus, equilibrium, pooled }] }",
});

const currencyCarrier = schemaFrom(CURRENCY_SCHEMA);
const currencyInputCarrier = schemaFrom(CURRENCY_INPUT_SCHEMA);

export const coordinationCurrencyAction = operation({
  verb: "coordination-currency",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Issue H1 coordination credits for contested social cells.",
  description:
    "Reads residual spread-H1 as social currency: zero H1 mints nothing; every nonzero contested cell issues h1-coordination-credit equal to its obstruction. This generalizes price/no-arbitrage beyond markets so institutionalization, recognition, mobilization, publics, anomie, boundary-work, and legitimacy can all report their coordination premium in the same unit.",
  domain: currencyInputCarrier,
  codomain: currencyCarrier,
  run: (input) =>
    jsonResource(coordinationCurrency(admitCurrencyInput(jsonResource(input, "coordination-currency input"))), "coordination-currency"),
});
