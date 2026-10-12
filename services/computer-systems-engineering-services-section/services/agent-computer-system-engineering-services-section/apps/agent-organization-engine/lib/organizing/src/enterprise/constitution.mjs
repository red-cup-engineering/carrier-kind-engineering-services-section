/**
 * enterprise/constitution — what a micro-enterprise is and what it has contracted to, read from
 * the agency registry's `enterprises` and `contracts` pools (Rendanheyi glossary: xiaowei, sanquan,
 * duidu, yinling-mubiao, lianqun-heyue, binglian, zengzhi-fenxiang).
 *
 * A contract states terms; it binds nobody until its parties enter it. Each party (an office)
 * enters by a signature record from an account holding that office, told for (entered) or against
 * (withdrawn). A contract's standing is read from those cells: `proposed` while any party has not
 * signed, `in force` when every party has entered, `contested` when a party both entered and
 * withdrew, `withdrawn` when a party withdrew without having entered.
 * @packageDocumentation
 */
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { cell, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { checkSetting } from "./settings.mjs";
import { takingPolicyOf, WORK_AXES } from "./work-arena.mjs";

export const ENTERPRISE_KINDS = Object.freeze(["market", "node", "incubating"]);
export const CONTRACT_TYPES = Object.freeze(["value-adjustment", "chain-group"]);

function workAndSkillOf(record, field) {
  if (record[field] === undefined) return null;
  const { work, skill } = record[field] ?? {};
  if (typeof work !== "string" || work === "" || typeof skill !== "string" || skill === "") throw new TypeError(`enterprise ${record.id}: ${field} names a work and a skill`);
  return Object.freeze({ work, skill });
}

const assessmentOf = (record) => workAndSkillOf(record, "assesses");

function turnsOf(record) {
  if (record.turns === undefined) return Object.freeze([]);
  if (!Array.isArray(record.turns) || record.turns.some((verb) => typeof verb !== "string" || verb === "")) throw new TypeError(`enterprise ${record.id}: turns names operations`);
  return Object.freeze([...record.turns]);
}

// A measurement committed to the house is read at the released commit, by its repository-relative
// path; one only the node can take (its own release, its own machine) is an operation its host serves.
function derivesOf(record) {
  if (record.derives === undefined) return Object.freeze([]);
  const refused = () => new TypeError(`enterprise ${record.id}: derives names repository-relative derivation records or { operation } measurements its host serves`);
  if (!Array.isArray(record.derives)) throw refused();
  return Object.freeze(record.derives.map((entry) => {
    if (typeof entry === "string" && entry !== "" && !entry.startsWith("/") && !entry.split("/").includes("..")) return Object.freeze({ path: entry });
    if (entry !== null && typeof entry === "object" && Object.keys(entry).length === 1 && typeof entry.operation === "string" && entry.operation !== "") {
      return Object.freeze({ operation: entry.operation });
    }
    throw refused();
  }));
}

/**
 * Its grey bands: the axes its own record declares, and every work-arena axis (`WORK_AXES`), on
 * which its record may declare only its own default; the band and what it means are the arena's.
 */
function axesOf(record) {
  const own = (record.settings ?? []).map((axis) => Object.freeze({ ...axis }));
  const arena = WORK_AXES.map((axis) => {
    const declared = own.find((candidate) => candidate.axis === axis.axis);
    if (declared === undefined) return axis;
    checkSetting(axis, declared.default);
    return Object.freeze({ ...axis, default: declared.default, ...(declared.because === undefined ? {} : { because: declared.because }) });
  });
  return Object.freeze([...arena, ...own.filter((axis) => !WORK_AXES.some((candidate) => candidate.axis === axis.axis))]);
}

/** A micro-enterprise record in the business's own terms. */
export function enterpriseOf(record) {
  if (!ENTERPRISE_KINDS.includes(record.kind)) throw new TypeError(`enterprise ${record.id}: kind is one of ${ENTERPRISE_KINDS.join(", ")}`);
  return Object.freeze({
    id: record.id,
    key: record.key,
    name: record.name ?? record.id,
    kind: record.kind,
    faces: record.faces ?? null,
    entity: record.entity ?? null,
    section: record.section ?? null,
    offices: Object.freeze([...(record.offices ?? [])]),
    contracts: Object.freeze([...(record.contracts ?? [])]),
    settings: axesOf(record),
    // Its decision right: which open threads of the work arena it takes up into its own root, and by
    // which kinds of move (enterprise/work-arena).
    takes: record.takes === undefined ? undefined : takingPolicyOf(record.takes),
    // How it turns a thread it takes up into its own work: the work and skill one of its own offices
    // bears a duty for. An unrefined request, a proposal, a report or a question is assessed by each
    // taker in its own terms.
    assesses: assessmentOf(record),
    // How it judges what is delivered to it (assays and the four verifier roles): a work and skill
    // of its own, not the assessing of taken demand, so a judgment is received as a judgment, a
    // finding that the delivery fails being as complete an assay as one that it holds.
    judges: workAndSkillOf(record, "judges"),
    // Its personnel right over carriers is exercised, not authored: each piece of work's carrier and
    // effort are derived from the carriers it admits and the house's outcomes (work/staffing).
    // The operations of its own service its loop turns each turn, over its own root: a node
    // micro-enterprise's queue is run by its loop, not by whoever queued the work.
    turns: turnsOf(record),
    // The measurements whose openings it keeps standing on the work board, each { path } or
    // { operation }: each reads its latest derivation, { poster, domain, evidence?, openings:
    // [{ opening }] }, and its loop opens what the board lacks and settles what the measurement no
    // longer asks within its domain (work-arena reconcileDerivedOpenings).
    derives: derivesOf(record),
    // The host whose clock drives its loop: machine capital it uses, not a party over it.
    host: record.host ?? null,
  });
}

/** A contract record: its type, enterprise, parties (office ids) and terms. */
export function contractOf(record) {
  if (!CONTRACT_TYPES.includes(record.type)) throw new TypeError(`contract ${record.id}: type is one of ${CONTRACT_TYPES.join(", ")}`);
  const parties = [...(record.parties ?? [])].map((party) => (typeof party === "string" ? { office: party } : party));
  if (record.type === "chain-group") {
    const total = parties.reduce((sum, party) => sum + (Number.isFinite(party.share) ? party.share : 0), 0);
    if (total > 1 + 1e-9) throw new TypeError(`chain-group contract ${record.id}: shares sum to ${total}, more than the whole`);
  }
  return Object.freeze({ ...record, parties: Object.freeze(parties.map((party) => Object.freeze(party))) });
}

/** One party's entry into a contract as a SignCell cell, witnessed by its signatures. */
export function entryCell(contract, office, signatures) {
  const mine = signatures.filter((s) => s.contract === contract.id && s.office === office);
  const witness = (s) => ({ signed: s.recordedAt, by: s.by });
  return cell(office, "enters", contract.id, {
    for: mine.filter((s) => s.reading !== "denied").map(witness),
    against: mine.filter((s) => s.reading === "denied").map(witness),
  });
}

/** A contract's standing from its parties' entries. */
export function contractStanding(contract, signatures) {
  const readings = contract.parties.map((party) => ({ office: party.office, reading: readingAs("extremal", knowledgeReading(entryCell(contract, party.office, signatures))) }));
  const standing = readings.some((r) => r.reading === "contested") ? "contested"
    : readings.some((r) => r.reading === "denied") ? "withdrawn"
    : readings.length > 0 && readings.every((r) => r.reading === "held") ? "in force"
    : "proposed";
  return Object.freeze({ contract: contract.id, type: contract.type, standing, parties: Object.freeze(readings) });
}

/**
 * Value-added sharing under a chain-group contract: the pool divided among its parties by share,
 * rounded to cents; what rounding leaves stays with the last party. A pool that is not positive
 * shares nothing (the downside is shared by there being no pool).
 */
export function shareValueAdded(contract, pool) {
  if (!Number.isFinite(pool) || pool <= 0) return Object.freeze(contract.parties.map((party) => ({ office: party.office, party: party.party, amount: 0 })));
  const shares = contract.parties.map((party) => ({ office: party.office, party: party.party, amount: Math.floor(pool * (party.share ?? 0) * 100) / 100 }));
  return Object.freeze(shares);
}
