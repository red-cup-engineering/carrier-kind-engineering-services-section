/**
 * enterprise/root — where a micro-enterprise keeps its work, its records and its books (561 Group
 * note of 2026-09-30, "Micro-enterprises hold their own work"). Each one holds its own root: its
 * own settlement under the machine's settlements root, or the repository-relative root its record
 * names. Its book of record is a Beancount file in that root, and a legal entity's books are its
 * own holdings book consolidated with the books of the micro-enterprises it signs for.
 * @packageDocumentation
 */
import os from "node:os";
import path from "node:path";
import { dataKindDirectory } from "@red-cup-engineering/eavt-services-section/data-artifact-address";

/** Where micro-enterprises without a declared root keep their settlements on this machine. */
export function settlementsRootOf(environment = process.env) {
  if (environment.METROPLAT_SETTLEMENTS_ROOT) return path.resolve(environment.METROPLAT_SETTLEMENTS_ROOT);
  return path.join(environment.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state"), "561-group", "settlements");
}

/**
 * The root a micro-enterprise keeps its work and books in: its own settlement under the host's
 * settlements root, or the repository-relative root its record names (the Group operations
 * micro-enterprise holds the Group's older root this way).
 */
export function enterpriseRootOf(record, { settlementsRoot, repositoryRoot }) {
  if (typeof record.dataRoot === "string" && record.dataRoot !== "") return path.resolve(repositoryRoot, record.dataRoot);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(record.id)) throw new TypeError(`enterprise ${record.id}: an id names its settlement directory`);
  return path.join(settlementsRoot, record.id);
}

/** A micro-enterprise's own book of record, in its own root: a record, `data/records/ledger-records/<id>.beancount`. */
export function enterpriseBookOf(record, roots) {
  return path.join(dataKindDirectory(enterpriseRootOf(record, roots), "record", "ledger"), `${record.id}.beancount`);
}

/**
 * A legal entity's book of judged deliveries: the projection of the outcomes judged at its border
 * (enterprise/outcomes `outcomeBookOf`), kept in the node's state beside its readouts, never in the
 * working tree. Undefined on a host that keeps no web data.
 */
export function entityOutcomeBookOf(entity, { environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "books", `${entity}-judged-deliveries.beancount`) : undefined;
}

/**
 * A legal entity's book of chain movements: what its custody wallets show moving on their chains
 * that none of its other books records, projected from the node's recorded chain readings
 * (group-operations reconciliation `chainMovementsOf`) beside its book of judged deliveries.
 * Undefined on a host that keeps no web data.
 */
export function entityChainMovementBookOf(entity, { environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "books", `${entity}-chain-movements.beancount`) : undefined;
}

/**
 * The node's carrier standing from every register but received work (enterprise/outcomes
 * `standingIndexOf`), folded from the outcome journal by the acceptance readout and read by staffing.
 */
export function outcomeStandingIndexOf({ environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "records", "acceptance", "carrier-standing.json") : undefined;
}

/** The judgments of inference deliveries routing reads (enterprise/outcomes `marketJudgmentsIndexOf`), beside the standing index. */
export function outcomeMarketIndexOf({ environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "records", "acceptance", "market-judgments.json") : undefined;
}

/** The settlement receipts users' judgments captured for each micro-enterprise (enterprise/outcomes `judgedSettlementsIndexOf`). */
export function outcomeSettlementsIndexOf({ environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "records", "acceptance", "judged-settlements.json") : undefined;
}

/** The unit price of each carrier's resources the allowance registry publishes (Lane 4, resourcePriceOf's index). */
export function resourcePricesIndexOf({ environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "records", "allowances", "resource-prices.json") : undefined;
}

/**
 * A legal entity's allowance book: the projection of the host's allowance ledger (every
 * subscription pool its carriers and producers draw on, each in its own units), kept beside its
 * book of judged deliveries. Undefined on a host that keeps no web data.
 */
export function entityAllowanceBookOf(entity, { environment = process.env } = {}) {
  return environment.METROPLAT_WEB_DATA_DIR ? path.join(environment.METROPLAT_WEB_DATA_DIR, "books", `${entity}-allowances.beancount`) : undefined;
}

/** The working tree state is kept in, and the agency's `lib` as it sits in that tree. */
const workingTreeOf = (agency, repositoryRoot) => repositoryRoot ?? path.dirname(agency.root);
const workingAgencyRoot = (agency, repositoryRoot) => path.join(workingTreeOf(agency, repositoryRoot), path.basename(agency.root));

/**
 * The roots and books of an agency's micro-enterprises on this machine, read from the agency as it
 * stands at each call.
 * @param {object | (() => object)} agency the agency registry, or how to read it
 * @param {{ environment?: object, repositoryRoot?: string }} [options] `repositoryRoot` is the working
 *   tree enterprises keep their state in. A released node reads its agency from its release, so it
 *   names the working tree; it defaults to the agency's own repository only for an agency read there.
 */
export function enterpriseRoots(agency, { environment = process.env, repositoryRoot } = {}) {
  const current = typeof agency === "function" ? agency : () => agency;
  const settlementsRoot = settlementsRootOf(environment);
  const rootsNow = () => ({ settlementsRoot, repositoryRoot: workingTreeOf(current(), repositoryRoot) });
  const records = () => [...current().enterprises.values()];
  const recordOf = (id) => {
    const record = records().find((candidate) => candidate.id === id);
    if (!record) throw new TypeError(`no enterprise ${id}: the enterprises are ${records().map((candidate) => candidate.id).join(", ")}`);
    return record;
  };
  return Object.freeze({
    settlementsRoot,
    ids: () => records().map((record) => record.id),
    rootOf: (id) => enterpriseRootOf(recordOf(id), rootsNow()),
    bookOf: (id) => enterpriseBookOf(recordOf(id), rootsNow()),
    /** The micro-enterprises a legal entity signs for, whose books its consolidation takes in. */
    membersOf: (entity) => records().filter((record) => record.entity === entity).map((record) => record.id),
  });
}

/**
 * A legal entity's books: its own holdings book (named by its record, in its section), the book
 * each micro-enterprise it signs for keeps in its own root, and, where the node keeps them, its books
 * of judged deliveries (`entityOutcomeBookOf`), chain movements (`entityChainMovementBookOf`) and
 * allowances (`entityAllowanceBookOf`).
 * @param {object} agency the agency registry
 * @param {string} entity the legal entity's id
 * @param {{ environment?: object, repositoryRoot?: string }} [options]
 * @returns {{ entity: string, holdings?: string, members: { book: string, path: string }[] }}
 */
export function entityBooks(agency, entity, options = {}) {
  const record = [...(agency.entities?.values() ?? [])].find((candidate) => candidate.id === entity);
  if (!record) throw new TypeError(`no legal entity ${entity}`);
  const roots = enterpriseRoots(agency, options);
  const judged = entityOutcomeBookOf(entity, options);
  const moved = entityChainMovementBookOf(entity, options);
  const allowances = entityAllowanceBookOf(entity, options);
  return Object.freeze({
    entity,
    ...(record.book ? { holdings: path.join(workingAgencyRoot(agency, options.repositoryRoot), record.sectionPath ?? "", record.book) } : {}),
    members: Object.freeze([
      ...roots.membersOf(entity).map((id) => Object.freeze({ book: id, path: roots.bookOf(id) })),
      ...(judged === undefined ? [] : [Object.freeze({ book: `${entity}-judged-deliveries`, path: judged })]),
      ...(moved === undefined ? [] : [Object.freeze({ book: `${entity}-chain-movements`, path: moved })]),
      ...(allowances === undefined ? [] : [Object.freeze({ book: `${entity}-allowances`, path: allowances })]),
    ]),
  });
}

/** The legal entity whose holdings book is at a path, if one names it. */
export function entityOfBook(agency, book, { repositoryRoot } = {}) {
  const held = path.resolve(book);
  return [...(agency.entities?.values() ?? [])].find((record) => record.book && path.join(workingAgencyRoot(agency, repositoryRoot), record.sectionPath ?? "", record.book) === held)?.id;
}
