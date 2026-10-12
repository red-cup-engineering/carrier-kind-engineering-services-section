/**
 * accounting/institution - economic institution and ledger action readings.
 *
 * This is organizing's economic/accounting facade over social gluing. It keeps
 * the generic desk, clearing, netting, Minsky-regime, and ledger report actions
 * in organizing while provider rails remain downstream.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { classifyRegime, closureRegimeData, cohomologyVanishesInRegime } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/value-category";
import { closureRegimeName, closureRegimeNames } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/closure";
import { firstCohomology } from "@red-cup-engineering/signcraft/settle";

import {
  adjudicate as organizingAdjudicate,
  crossArena,
  federate as organizingFederate,
  institute as organizingInstitute,

} from "../organizing.mjs";
import loadLedger, { } from "./ledger.mjs";
import {
  accountsReport,
  balanceReport,
  balanceSheetReport,
  cashflowReport,
  checkReport,
  incomeStatementReport,
  printReport,
  registerReport,
  renderAccounts,
  renderBalance,
  renderBalanceSheet,
  renderCashflow,
  renderCheck,
  renderIncomeStatement,
  renderPrint,
  renderRegister,
  renderStats,
  statsReport,
} from "./report.mjs";
import {
  debitNormalUtterance,
  induceLedgerTopology,
} from "./topology/ledger.mjs";
import {
  adjudicationCarrier,
  federationCarrier,
  institutionCarrier,
} from "../schemas.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

export function instituteEconomicBody(boundary) {
  return organizingInstitute(boundary);
}

export function clearAndSettle(boundary) {
  return organizingAdjudicate(boundary);
}

export function net(
  constituents,
) {
  const ca = crossArena(constituents);
  return Object.freeze({ nettingCost: ca.federationOnly, contested: ca.contested });
}

export function federateVenues(covers) {
  return organizingFederate(covers);
}

/** Minsky's leverage posture, read off the closure regime: hedge where the settling's H¹
 *  vanishes (unique price), else speculative while the closure is countably cofinal
 *  (transfinite-bounded) and Ponzi where it is not (aperiodic). */
export function minskyRegime(
  d,
) {
  const regime = classifyRegime(d);
  const minsky = cohomologyVanishesInRegime(regime) ? "hedge" : d.countableCofinality ? "speculative" : "ponzi";
  return Object.freeze({ regime: closureRegimeName(regime), minsky });
}

export function deskFromLedger(led, identity) {
  const accounts = [...led.balances.keys()];
  const utterances = accounts.map((path) => debitNormalUtterance(path));
  const cohomologyRank =
    utterances.length === 0
      ? 0
      : firstCohomology(induceLedgerTopology(utterances).settlement).rank;
  const name = identity.trim() !== "" ? identity.trim() : "desk";
  return Object.freeze({
    kind: "organizing.accounting.desk",
    identity: name,
    cohomologyRank,
    glued: cohomologyRank === 0,
  });
}

const SEED_SCHEMA = Object.freeze({
  title: "SocialSeed",
  description: "an inter-agent membrane: newline-separated `agent|predicate` lines, or a JSON array of `[agent, predicate]` items.",
  type: ["string", "array"],
});

const BOUNDARY_SCHEMA = Object.freeze({
  $id: "organizing/accounting/social-boundary",
  title: "SocialBoundary",
  type: "object",
  description: "the institution's three social boundary faces; any face may be omitted.",
  properties: { socializing: SEED_SCHEMA, computing: SEED_SCHEMA, gaming: SEED_SCHEMA },
});

const ENTRIES_SCHEMA = Object.freeze({
  $id: "organizing/accounting/journal-entries",
  title: "JournalEntries",
  type: "array",
  description: "a journal: an array of parsed ledger.mts Entry records (Transaction | Directive | Malformed) loaded into the adjudicated record-state via loadLedger. This is the beancount-style ledger engine's own native Entry shape (exact-number Money amounts, id/time/flag/payee/tags/links/meta/etc.), NOT the flat JSON-safe organizing/accounting-entry wire carrier used by the separate accounting-utterances/accounting-balance projection — those decimal-string amounts are a different accounting subsystem's boundary format. Kept permissive (each entry an object) since the native Entry type is not itself a JSON-schema-friendly wire shape.",
  items: { type: "object" },
});

export const socialBoundaryCarrier = schemaFrom(BOUNDARY_SCHEMA);

export const nettingRequestCarrier = schemaFrom({
  $id: "organizing/accounting/netting-request",
  title: "NettingRequest",
  type: "object",
  required: ["constituents"],
  properties: {
    constituents: {
      type: "array",
      items: {
        type: "object",
        required: ["utterances"],
        properties: {
          name: { type: "string" },
          utterances: { type: "array" },
        },
      },
    },
  },
  description: "A multilateral netting request over named constituents and their utterances.",
});

export const nettingResultCarrier = schemaFrom({
  $id: "organizing/accounting/netting-result",
  title: "NettingResult",
  type: "object",
  properties: {
    nettingCost: { type: "integer" },
    contested: { type: "integer" },
  },
  description: "The irreducible netting cost and contested overlap count of a multilateral netting.",
});

export const venueFederationRequestCarrier = schemaFrom({
  $id: "organizing/accounting/venue-federation-request",
  title: "VenueFederationRequest",
  type: "object",
  required: ["venues"],
  properties: { venues: { type: "array", items: BOUNDARY_SCHEMA } },
  description: "A request to federate accounting venues by parallel-composing their social boundaries.",
});

export const minskyRegimeRequestCarrier = schemaFrom({
  $id: "organizing/accounting/minsky-regime-request",
  title: "ClosureRegimeData",
  type: "object",
  required: ["scottContinuous", "finiteBase", "countableCofinality"],
  properties: {
    scottContinuous: { type: "boolean" },
    finiteBase: { type: "boolean" },
    countableCofinality: { type: "boolean" },
  },
  description: "Closure-regime data used to classify an accounting leverage settling's Minsky posture.",
});

export const minskyRegimeCarrier = schemaFrom({
  $id: "organizing/accounting/minsky",
  title: "MinskyRegime",
  type: "object",
  properties: {
    regime: { enum: closureRegimeNames },
    minsky: { enum: ["hedge", "speculative", "ponzi"] },
  },
  description: "The closure-regime reading paired with its Minsky leverage posture.",
});

export const journalEntriesCarrier = schemaFrom(ENTRIES_SCHEMA);

export const accountingDeskCarrier = schemaFrom({
  $id: "organizing/accounting/desk",
  title: "AccountingDesk",
  type: "object",
  properties: {
    kind: { const: "organizing.accounting.desk" },
    identity: { type: "string" },
    cohomologyRank: { type: "integer" },
    glued: { type: "boolean" },
  },
  description: "An accounting desk read from a loaded ledger's adjudicated record-state.",
});

export const renderedReportCarrier = schemaFrom({
  $id: "organizing/accounting/rendered-report",
  title: "RenderedAccountingReport",
  type: "string",
  description: "A rendered accounting report string.",
});

export const settleLedgerRequestCarrier = schemaFrom({
  $id: "organizing/accounting/settle-ledger-request",
  title: "SettleLedgerRequest",
  type: "object",
  required: ["transactions"],
  properties: { transactions: { type: "array" } },
  description: "A transaction set to settle into a ledger balance report.",
});

function admitBoundary(input, verb) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a { socializing?, computing?, gaming? } boundary object`);
  }
  const record = input;
  return {
    ...(record["socializing"] === undefined ? {} : { socializing: record["socializing"] }),
    ...(record["computing"] === undefined ? {} : { computing: record["computing"] }),
    ...(record["gaming"] === undefined ? {} : { gaming: record["gaming"] }),
  };
}

function admitConstituents(input, verb) {
  const raw = input !== null && typeof input === "object" && !Array.isArray(input)
    ? (input)["constituents"]
    : input;
  if (!Array.isArray(raw)) {
    throw new TypeError(`${verb}: expected { constituents: [{ name, utterances }...] } or an array`);
  }
  return raw.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item) || !Array.isArray((item)["utterances"])) {
      throw new TypeError(`${verb}: constituents[${index}] must be a { name, utterances } object`);
    }
    const rec = item;
    return {
      name: typeof rec["name"] === "string" ? rec["name"] : `participant-${index}`,
      utterances: rec["utterances"],
    };
  });
}

function admitLedger(input, verb) {
  if (!Array.isArray(input)) {
    throw new TypeError(`${verb}: expected a JSON array of journal entries`);
  }
  return loadLedger(input);
}

function reportOpts(
  args,
) {
  const account = typeof args["account"] === "string" && args["account"].trim() !== "" ? args["account"].trim() : null;
  const depthRaw = args["depth"];
  const depth = typeof depthRaw === "number" ? depthRaw : typeof depthRaw === "string" && depthRaw.trim() !== "" ? Number(depthRaw) : null;
  const begin = typeof args["begin"] === "string" && args["begin"].trim() !== "" ? args["begin"].trim() : null;
  const end = typeof args["end"] === "string" && args["end"].trim() !== "" ? args["end"].trim() : null;
  return { account, depth, begin, end };
}

const stringResource = (value) => jsonResource(value);
const inputJson = (input, context) => jsonResource(input, context);
const argsJson = (args) => jsonResource(args, "action args");

export const institutionAction = operation({
  verb: "institution",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Institute an economic body: glue a plurality of agents into one institution.",
  description: "Domain: a social boundary. Codomain: the organizing institution carrier read as an economic body.",
  domain: socialBoundaryCarrier,
  codomain: institutionCarrier,
  run: (input) => jsonResource(instituteEconomicBody(admitBoundary(inputJson(input, "institution input"), "institution")), "institution"),
});

export const instituteAction = operation({
  verb: "institute",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Institute the economic body over a social boundary.",
  description: "Legacy accounting/economic alias of organizing's canonical institute action.",
  domain: socialBoundaryCarrier,
  codomain: institutionCarrier,
  run: (input) => jsonResource(instituteEconomicBody(admitBoundary(inputJson(input, "institute input"), "institute")), "institution"),
});

export const adjudicateAction = operation({
  verb: "adjudicate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Clear and settle a social boundary into one adjudicated record-state.",
  description: "Legacy accounting/economic alias of organizing's canonical adjudicate action.",
  domain: socialBoundaryCarrier,
  codomain: adjudicationCarrier,
  run: (input) => jsonResource(clearAndSettle(admitBoundary(inputJson(input, "adjudicate input"), "adjudicate")), "adjudication"),
});

export const clearAndSettleAction = operation({
  verb: "clear-and-settle",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Clear and settle a social boundary into one adjudicated record-state.",
  description: "The financial clearing verb read as organizing adjudication.",
  domain: socialBoundaryCarrier,
  codomain: adjudicationCarrier,
  run: (input) => jsonResource(clearAndSettle(admitBoundary(inputJson(input, "clear-and-settle input"), "clear-and-settle")), "adjudication"),
});

export const netAction = operation({
  verb: "net",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Multilaterally net participants and report the irreducible netting cost.",
  description: "Domain: `{ constituents: [{ name, utterances }...] }`. Codomain: `{ nettingCost, contested }`.",
  domain: nettingRequestCarrier,
  codomain: nettingResultCarrier,
  run: (input) => jsonResource(net(admitConstituents(inputJson(input, "net input"), "net"))),
});

export const federateVenuesAction = operation({
  verb: "federate-venues",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Federate economic venues by parallel-composing their social boundaries.",
  description: "Domain: `{ venues: [<social boundary>...] }`. Codomain: the organizing federation carrier.",
  domain: venueFederationRequestCarrier,
  codomain: federationCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input)["venues"])) {
      throw new TypeError("federate-venues: expected a { venues: [...] } object");
    }
    const venues = ((input)["venues"]).map((cover, index) =>
      admitBoundary(cover, `federate-venues: venues[${index}]`));
    return jsonResource(federateVenues(venues), "federation");
  },
});

export const federateAction = operation({
  verb: "federate",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Federate venues/circuits, legacy accounting alias.",
  description: "Legacy accounting/economic alias. Organizing's canonical registry uses `federate`; this subpath also exposes the historical `{ venues }` wire.",
  domain: venueFederationRequestCarrier,
  codomain: federationCarrier,
  run: federateVenuesAction.execute,
});

export const minskyRegimeAction = operation({
  verb: "minsky-regime",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Classify the leverage settling's Minsky posture.",
  description: "Domain: `{ scottContinuous, finiteBase, countableCofinality }`. Codomain: `{ regime, minsky }`.",
  domain: minskyRegimeRequestCarrier,
  codomain: minskyRegimeCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("minsky-regime: expected { scottContinuous, finiteBase, countableCofinality }");
    }
    const admitted = closureRegimeData(input["scottContinuous"] === true, input["finiteBase"] === true, input["countableCofinality"] === true);
    if (admitted.kind !== "settling.closureRegimeData:witness") {
      throw new TypeError(`minsky-regime: regime data violates ${admitted.constraint}`);
    }
    const d = admitted.data;
    return jsonResource(minskyRegime(d));
  },
});

export const ledgerLoadAction = operation({
  verb: "ledger-load",
  inputFormat: "json",
  outputFormat: "json",
  options: ["identity"],
  summary: "Load a journal into the adjudicated accounting record-state and read its desk.",
  description: "Domain: a journal array. Codomain: organizing.accounting.desk.",
  domain: journalEntriesCarrier,
  codomain: accountingDeskCarrier,
  run: (input, args) => {
    const identity = typeof args["identity"] === "string" ? args["identity"] : "desk";
    return jsonResource(deskFromLedger(admitLedger(inputJson(input, "ledger-load input"), "ledger-load"), identity), "accounting-desk");
  },
});

export const balanceAction = operation({
  verb: "balance",
  inputFormat: "json",
  outputFormat: "string",
  options: ["account", "depth", "end"],
  summary: "Balance report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered balance report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    const led = admitLedger(inputJson(input, "balance input"), "balance");
    return stringResource(renderBalance(balanceReport(led, reportOpts(argsJson(args))), led));
  },
});

export const balsheetAction = operation({
  verb: "balsheet",
  inputFormat: "json",
  outputFormat: "string",
  options: ["end"],
  summary: "Balance-sheet report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered balance-sheet report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    const led = admitLedger(inputJson(input, "balsheet input"), "balsheet");
    return stringResource(renderBalanceSheet(balanceSheetReport(led, reportOpts(argsJson(args))), led));
  },
});

export const incomestmtAction = operation({
  verb: "incomestmt",
  inputFormat: "json",
  outputFormat: "string",
  options: ["begin", "end"],
  summary: "Income-statement report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered income-statement report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    const led = admitLedger(inputJson(input, "incomestmt input"), "incomestmt");
    return stringResource(renderIncomeStatement(incomeStatementReport(led, reportOpts(argsJson(args))), led));
  },
});

export const cashflowAction = operation({
  verb: "cashflow",
  inputFormat: "json",
  outputFormat: "string",
  options: ["begin", "end"],
  summary: "Cashflow report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered cashflow report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    const led = admitLedger(inputJson(input, "cashflow input"), "cashflow");
    return stringResource(renderCashflow(cashflowReport(led, reportOpts(argsJson(args))), led));
  },
});

export const registerAction = operation({
  verb: "register",
  inputFormat: "json",
  outputFormat: "string",
  options: ["account", "begin", "end"],
  summary: "Register report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered register report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    const led = admitLedger(inputJson(input, "register input"), "register");
    return stringResource(renderRegister(registerReport(led, reportOpts(argsJson(args))), led));
  },
});

export const accountsAction = operation({
  verb: "accounts",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Accounts listing over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered accounts listing.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input) => {
    const led = admitLedger(inputJson(input, "accounts input"), "accounts");
    return stringResource(renderAccounts(accountsReport(led)));
  },
});

export const statsAction = operation({
  verb: "stats",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Statistics report over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered statistics report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input) => stringResource(renderStats(statsReport(admitLedger(inputJson(input, "stats input"), "stats")))),
});

export const checkAction = operation({
  verb: "check",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Integrity check over the adjudicated accounting record-state.",
  description: "Domain: a journal array. Codomain: rendered no-halt check report.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input) => stringResource(renderCheck(checkReport(admitLedger(inputJson(input, "check input"), "check")))),
});

export const printAction = operation({
  verb: "print",
  inputFormat: "json",
  outputFormat: "string",
  options: ["format"],
  summary: "Print journal entries in a target accounting format.",
  description: "Domain: a journal array; --format selects beancount or hledger.",
  domain: journalEntriesCarrier,
  codomain: renderedReportCarrier,
  run: (input, args) => {
    if (!Array.isArray(input)) throw new TypeError("print: expected a JSON array of journal entries");
    const format = typeof args["format"] === "string" ? args["format"] : undefined;
    return stringResource(renderPrint(printReport(input, format === undefined ? {} : { format })));
  },
});

export const settleLedgerAction = operation({
  verb: "settle-ledger",
  inputFormat: "json",
  outputFormat: "string",
  summary: "Settle a transaction set into a ledger balance report.",
  description: "Domain: `{ transactions }`. Codomain: rendered balance report over the loaded record-state.",
  domain: settleLedgerRequestCarrier,
  codomain: renderedReportCarrier,
  run: (input) => {
    if (input === null || typeof input !== "object" || Array.isArray(input) || !Array.isArray((input)["transactions"])) {
      throw new TypeError("settle-ledger: expected a { transactions: [...] } object");
    }
    const led = loadLedger((input)["transactions"]);
    return stringResource(renderBalance(balanceReport(led, {}), led));
  },
});

export const legacyAccountingInstitutionActions = Object.freeze([
  institutionAction,
  instituteAction,
  adjudicateAction,
  clearAndSettleAction,
  netAction,
  federateAction,
  minskyRegimeAction,
  ledgerLoadAction,
  balanceAction,
  balsheetAction,
  incomestmtAction,
  cashflowAction,
  registerAction,
  accountsAction,
  statsAction,
  checkAction,
  printAction,
  settleLedgerAction,
]);

export const accountingInstitutionActions = Object.freeze([
  institutionAction,
  clearAndSettleAction,
  netAction,
  federateVenuesAction,
  minskyRegimeAction,
  ledgerLoadAction,
  balanceAction,
  balsheetAction,
  incomestmtAction,
  cashflowAction,
  registerAction,
  accountsAction,
  statsAction,
  checkAction,
  printAction,
  settleLedgerAction,
]);
