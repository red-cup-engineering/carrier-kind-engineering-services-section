/**
 * offices — the accounts, offices, skills and duties agents work under on MetroPlat.
 *
 * The offices are the house's authored agency records, read across every section by
 * organizing's agency registry: offices bear duties and provide skills, duties are owed toward
 * works and need skills, skills require operation verbs, characters are the org-owned holders
 * harnesses and people mask, and incumbencies seat holders in offices.
 *
 * An ACCOUNT is the subject a process or a signed-in principal acts as. It acts under every
 * office it holds at dignitas (recognition and induction both held, socializing's double
 * settlement): by a recorded incumbency, by an incumbency claim admitted here (the
 * `office-incumbency` feed), through a character it masks (the `character-masks` feed), or as the
 * bearer it is a hand of (an authored organ naming it: a person's sign-in seats the person).
 * The verbs an office's skills require devolve onto its holders as capability grants, read
 * beside directly admitted assertions by the one `can` (a direct revocation still wins); its
 * duties, and the works they are owed toward, become the account's.
 *
 * A harness session enters as LAGOON's participation layer has it: it wears a mask over the
 * harness character its carrier is entitled to (the character whose record names that harness
 * and host), the carrier's model and the verbs its MetroPlat face serves are admitted as the
 * character's provider facts (the `harness-carriers` feed, the model-character resolver work
 * allocation reads), and its withdrawal is a denied mask. The character, not the session,
 * accrues: an office service allocated to it (organizing's work allocation, never an
 * incumbency) grants it the verbs of the allocated skill while the allocation is open.
 * MCP account entry delivers the same office context through a witnessed hook encounter;
 * it neither admits a provider carrier nor changes a named harness's session mask.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { operation, operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { each, extend, get, heads, put, readHead, walk } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { isJsonRecord } from "@red-cup-engineering/json-services-section";
import { knowledgeJoinAll, readingAs, readingSchema } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { incumbencyState, officeIncumbencyClaimCell } from "@red-cup-engineering/socializing/office";
import { AGENCY_POOLS, agencyRootFrom, bearersHandedBy, governanceOf, isToldBearer, officeCoordinationBoundary as officeBoundary, officeReading, officesOf, resolve, toldBearersOf, withSeatClaims, withToldHands } from "@red-cup-engineering/organizing/agency";
import { agencyAt, agencyMoved } from "@red-cup-engineering/organizing/agency/held";
import { castCensus, masksOf as castMasksOf, playersOf, subjectOf } from "@red-cup-engineering/organizing/agency/cast";
import { embodiedPlayers } from "@red-cup-engineering/organizing/agency/organs";
import { politicCensus } from "@red-cup-engineering/organizing/agency/politic";
import { controlCensus } from "@red-cup-engineering/organizing/agency/control";
import { juralCensus } from "@red-cup-engineering/organizing/agency/jural";
import { agencyRecord, enactAgencyRecord, recordPower } from "@red-cup-engineering/organizing/agency/records";
import { deedsOf, doersOf, recognitionRightOf } from "@red-cup-engineering/organizing/agency/governing";
import { territoriesOf, workHomesOf } from "@red-cup-engineering/organizing/enterprise";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { judgeAction, normalizeRule, rulesFor } from "@red-cup-engineering/organizing/agency/rules";
import { PUBLIC_HOLDER, can, capabilityGrant, grantAssertion, locusResource } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { modelCharacterResolverFromProviderAdmissions } from "@red-cup-engineering/organizing/work/model-character";
import { readAgentWorkDispatchReadout } from "@red-cup-engineering/feltos/work/dispatch-readout";
import { DUTY_LOCUS } from "@red-cup-engineering/feltos/work/provider-delegation-authority";
import { operationFamilyDescriptors } from "./generated/operation-family-descriptors.mjs";
import { harnessHookEventAdmissionOperation } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/service";
import { admitHookEnvelope } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/hooks/codec";
import { sessionContextImage } from "@red-cup-engineering/feltos/agents/context-image";
import { readKnowledgeOf } from "@red-cup-engineering/computer-code-development-engine/knowledge/finding-hook-delivery";
import { projectOperationAffordances } from "./operation-affordances.mjs";
import { workSourceTaskSchema } from "@red-cup-engineering/organizing/work/schema";
import { dutyWorktreeOperations, resolveDutySourceTask } from "@red-cup-engineering/computer-code-development-engine/workspace/duty-worktree";
import { bodyOperations, livedBodyAt, tellBodyRecords } from "./bodies.mjs";

/** The store types of the claims an instance keeps: one record per claim, read by their `at`. */
export const officeIncumbencyType = "office-incumbency";
export const characterMaskType = "character-mask";
export const harnessCarrierType = "harness-carrier";
/** The inbox of a character is a thread of this type named by the character: messages and the reads of them. */
export const characterInboxType = "character-inbox";
/** The capability resource every catalog grant is addressed under (`infograph#<verb>`). */
export const CATALOG_CAPABILITY_RESOURCE = "infograph";

/** Where the agency records are read from: the binding's `agencyRoot`, else organizing's `agencyRootFrom`
 *  this package (METROPLAT_AGENCY_ROOT, else the `lib` of the repository it sits in). */
export function agencyRootOf(binding = {}) {
  return binding.agencyRoot ?? agencyRootFrom(fileURLToPath(import.meta.url));
}

/** The working tree the node's sessions read: the binding's `repositoryRoot`, METROPLAT_REPOSITORY_ROOT,
 *  else the repository holding the agency records. A release copy is never it. */
export function repositoryRootOf(binding = {}) {
  return binding.repositoryRoot ?? process.env.METROPLAT_REPOSITORY_ROOT ?? path.dirname(agencyRootOf(binding));
}

/** The agency registry for a root, held and watched by organizing (see its agency/held): a re-read
 *  whose revision is unchanged keeps the held registry, so the registry's identity is its content
 *  and a consumer that built on it (the world) rebuilds only when it changed. */
export { agencyAt };

export function refreshAgency(root) { agencyMoved(root); return agencyAt(root); }

const claimContract = (id, title, properties, required) => schemaFrom({
  $id: id,
  title,
  type: "object",
  required: ["kind", ...required, "reading", "issuer", "at"],
  properties: { ...properties, reading: readingSchema("extremal"), issuer: { type: "string", minLength: 1 }, at: { type: "string", minLength: 1 } },
  additionalProperties: false,
});

export const incumbencyClaimContract = claimContract("metroplat/office-incumbency-claim", "OfficeIncumbencyClaim", {
  kind: { const: "metroplat.office-incumbency-claim" },
  office: { type: "string", minLength: 1 },
  incumbent: { type: "string", minLength: 1 },
  predicate: { enum: ["recognition", "induction"] },
  // Who told it: the office the recognition was told under (or the incumbent, for its own induction),
  // the bearer wearing it and the account it came through. Older claims carry none.
  player: { type: "object", required: ["by"], properties: { by: { type: "string", minLength: 1 }, bearer: { type: "string", minLength: 1 }, hand: { type: "string", minLength: 1 } }, additionalProperties: false },
}, ["office", "incumbent", "predicate"]);

export const characterMaskContract = claimContract("metroplat/character-mask", "CharacterMask", {
  kind: { const: "metroplat.character-mask" },
  account: { type: "string", minLength: 1 },
  character: { type: "string", minLength: 1 },
}, ["account", "character"]);

export const harnessCarrierContract = claimContract("metroplat/harness-carrier", "HarnessCarrier", {
  kind: { const: "metroplat.harness-carrier" },
  character: { type: "string", minLength: 1 },
  model: { type: "string", minLength: 1 },
  reasoningEffort: { type: "string", minLength: 1 },
  harness: { type: "string", minLength: 1 },
  session: { type: "string", minLength: 1 },
  sourceTask: workSourceTaskSchema,
  capabilities: { type: "array", items: { type: "string", minLength: 1 } },
}, ["character", "session", "capabilities"]);

function admit(dataRoot, type, claims) {
  if (claims.length === 0) return undefined;
  return Object.freeze({ appended: claims.length, addresses: Object.freeze(claims.map((claim) => put(dataRoot, type, claim))) });
}

const byAt = (left, right) => (String(left.at) < String(right.at) ? -1 : String(left.at) > String(right.at) ? 1 : 0);

/** Fail-closed reads of a claim type: a malformed or unreadable record yields none. A claim carries its
 * own `at`; the claims are read in the order they were told. */
function readClaims(dataRoot, type, contract) {
  try {
    return Object.freeze([...each(dataRoot, type)].map(({ record }) => contract.assert(record, type)).sort(byAt));
  } catch {
    return Object.freeze([]);
  }
}

export function admitIncumbencyClaims({ dataRoot, claims }) {
  return admit(dataRoot, officeIncumbencyType, claims.map((claim) => incumbencyClaimContract.assert(claim, "office incumbency claim")));
}

export function admitCharacterMasks({ dataRoot, masks }) {
  return admit(dataRoot, characterMaskType, masks.map((mask) => characterMaskContract.assert(mask, "character mask")));
}

export function admitHarnessCarriers({ dataRoot, carriers }) {
  return admit(dataRoot, harnessCarrierType, carriers.map((carrier) => harnessCarrierContract.assert(carrier, "harness carrier")));
}

/** The harness carriers with each admission's address, in the order they were told. A malformed record
 * yields no carriers and says how many were malformed. */
function readCarrierRows(dataRoot) {
  try {
    const rows = [...each(dataRoot, harnessCarrierType)].map(({ address, record }) => Object.freeze({ carrier: harnessCarrierContract.assert(record, harnessCarrierType), witness: address }));
    return Object.freeze({ rows: Object.freeze(rows.sort((left, right) => byAt(left.carrier, right.carrier))), malformed: 0 });
  } catch {
    return Object.freeze({ rows: Object.freeze([]), malformed: 1 });
  }
}

export const readHarnessCarriers = (dataRoot) => projected(`harness-carriers\u0000${dataRoot}`, [readCarrierRows(dataRoot)],
  () => Object.freeze(readCarrierRows(dataRoot).rows.map(({ carrier }) => carrier)));

/**
 * The one reading of what the house's harness carriers testify, held per revision of their feed:
 * of each character's admissions (the mcp transport aside), the latest per model (`byModel`, key
 * `[character, model]`), per model and effort with its witness (`byModelEffort`, key
 * `[character, model, effort|null]`), and per session (`bySession`, key `[character, session]`).
 * A later denial is never hidden by an older admission, and a different character's carrier never
 * lends one its testimony. Every reader of which carriers a character holds reads this fold.
 */
export function carrierTestimony(binding) {
  const read = readCarrierRows(binding.dataRoot);
  return projected(`carrier-testimony\u0000${binding.dataRoot}`, [read], () => {
    const byModel = new Map(), byModelEffort = new Map(), bySession = new Map();
    const later = (map, key, entry) => { const prior = map.get(key); if (prior === undefined || String(entry.carrier.at) >= String(prior.carrier.at)) map.set(key, entry); };
    for (const entry of read.rows) {
      const { carrier } = entry;
      if (carrier.harness === "mcp") continue;
      later(bySession, JSON.stringify([carrier.character, carrier.session]), entry);
      if (carrier.model === undefined) continue;
      later(byModel, JSON.stringify([carrier.character, carrier.model]), entry);
      later(byModelEffort, JSON.stringify([carrier.character, carrier.model, carrier.reasoningEffort ?? null]), entry);
    }
    return Object.freeze({ byModel, byModelEffort, bySession, malformed: read.malformed });
  });
}

/** The character a harness on a host masks: the one character record naming both. */
export function harnessCharacter(agency, { harness, host }) {
  const found = [...agency.characters.values()].filter((c) => c.kind === "harness" && c.harness === harness && c.host === host);
  if (found.length > 1) throw new TypeError(`harness ${harness} on ${host} is named by several characters`);
  return found[0];
}

/** Work allocation reads the latest admission for the exact Character and model.
 * A different Character using the same model cannot lend it capabilities, and a
 * later denied carrier cannot be hidden by an older held admission. */
export function harnessModelCharacterResolver(binding) {
  const { byModel } = carrierTestimony(binding);
  return (character) => {
    const carrier = byModel.get(JSON.stringify([character.id, character.model]))?.carrier;
    if (carrier === undefined || readingAs("extremal", carrier.reading) !== "held") {
      throw new TypeError(`Character ${character.id} has no current provider admission for model ${character.model}`);
    }
    return modelCharacterResolverFromProviderAdmissions([carrier])(character);
  };
}

/** Each Character's provider-admitted capabilities: the union over the models whose latest carrier is
 * held. A Character whose latest carriers are all denied is testified to command nothing ([]); one with
 * no carrier is absent (unknown, not refused). The body natural's actuate repertoire, read as testimony. */
export function admittedCapabilitiesOf(binding) {
  const admitted = {};
  for (const { carrier } of carrierTestimony(binding).byModel.values()) {
    const held = readingAs("extremal", carrier.reading) === "held";
    admitted[carrier.character] = [...new Set([...(admitted[carrier.character] ?? []), ...(held ? carrier.capabilities : [])])].sort();
  }
  return Object.freeze(admitted);
}

/** The registry as this node seats it: its told hands (`character-masks`) and told seats
 * (`office-incumbency`) folded in, as every account reading reads it. */
export const seatedAgencyOf = (binding, agency = agencyAt(agencyRootOf(binding))) => withSeatClaims(handedAgency(binding, agency), readIncumbencyClaims(binding.dataRoot));

/** Tell, once, that a session is a hand of the bearer it acts for: the `character-masks` testimony a
 * harness's SessionStart used to give, now given by the entrance the session's calls arrive through, so
 * every harness (Claude Code, a Codex bridge, a worker) is seated as its character's hand whether or not
 * it runs hooks. A hand already told held for that bearer is not told again. */
export function tellSessionHand(binding, hand, bearer, at = binding.now?.() ?? new Date().toISOString()) {
  if (typeof hand !== "string" || hand === "" || hand === bearer) return false;
  const told = readCharacterMasks(binding.dataRoot).some((mask) => mask.account === hand && mask.character === bearer && readingAs("extremal", mask.reading) === "held");
  if (told) return false;
  admitCharacterMasks({ dataRoot: binding.dataRoot, date: at.slice(0, 10), masks: [{ kind: "metroplat.character-mask", account: hand, character: bearer, reading: "held", issuer: "metroplat:entrance", at }] });
  return true;
}

/** Each bearer's provider testimony for qiangdan (organizing/agency governing): the capabilities its
 * held carriers admit and the model and effort of each, read from its latest carrier per model. */
export function bearerTestimonyOf(binding) {
  const latest = new Map();
  for (const carrier of readHarnessCarriers(binding.dataRoot)) {
    if (carrier.harness === "mcp" || carrier.model === undefined) continue;
    const key = JSON.stringify([carrier.character, carrier.model]);
    const prior = latest.get(key);
    if (prior === undefined || String(carrier.at) >= String(prior.at)) latest.set(key, carrier);
  }
  const told = {};
  for (const carrier of latest.values()) {
    if (readingAs("extremal", carrier.reading) !== "held") continue;
    const prior = told[carrier.character] ?? { capabilities: [], carriers: [] };
    told[carrier.character] = {
      capabilities: [...new Set([...prior.capabilities, ...carrier.capabilities])].sort(),
      carriers: [...prior.carriers, Object.freeze({ model: carrier.model, ...(carrier.reasoningEffort === undefined ? {} : { reasoningEffort: carrier.reasoningEffort }) })],
    };
  }
  return Object.freeze(told);
}

/** One work board reader per data root, held for the process: the board an enterprise's deeds are read
 *  off, opened once rather than per call (journal memory discipline: read paths index once). */
const deedBoards = new Map();

/** The deeds done in each enterprise's work, read off the house work board now (organizing/agency
 *  governing `deedsOf`): who did its work, and as which of its offices. */
export function boardDeedsOf(binding) {
  return (enterprise) => {
    // Hands told at runtime (a session is its character's hand) and seats claimed at runtime count.
    const agency = seatedAgencyOf(binding);
    let board = deedBoards.get(binding.dataRoot);
    if (board === undefined) {
      board = workBoardStore(binding, { territories: () => territoriesOf([...agencyAt(agencyRootOf(binding)).enterprises.values()]), agency: () => agencyAt(agencyRootOf(binding)), homes: workHomesOf(() => agencyAt(agencyRootOf(binding))) });
      deedBoards.set(binding.dataRoot, board);
    }
    const at = binding.now?.() ?? new Date().toISOString();
    return deedsOf(agency, enterprise, board.read(at), { at });
  };
}

export const readIncumbencyClaims = (dataRoot) => readClaims(dataRoot, officeIncumbencyType, incumbencyClaimContract);
export const readCharacterMasks = (dataRoot) => readClaims(dataRoot, characterMaskType, characterMaskContract);

/** A projection of claims, held by the identity of the folded claims it derives from: a read
 * that returns the same claims array keeps a derived view
 * computed once per revision of its inputs, not once per caller. */
const heldProjections = new Map();
function projected(name, inputs, derive) {
  const held = heldProjections.get(name);
  if (held !== undefined && held.inputs.length === inputs.length && held.inputs.every((input, i) => input === inputs[i])) return held.value;
  const value = derive();
  heldProjections.set(name, { inputs, value });
  return value;
}

/** Resolve a still-held harness session for an authenticated character. An explicit
 * session selects the caller's admitted carrier amid concurrent office workers. */
export function currentHarnessCarriers(binding, character) {
  const masks = readCharacterMasks(binding.dataRoot), testimony = carrierTestimony(binding);
  const current = projected(`current-carriers\u0000${binding.dataRoot}`, [masks, testimony], () => deriveCurrentCarriers(masks, testimony));
  return character === undefined ? current : current.filter((carrier) => carrier.character === character);
}

function deriveCurrentCarriers(masks, testimony) {
  const latestMasks = new Map();
  for (const mask of masks) {
    if (!mask.account.startsWith("session:")) continue;
    const session = mask.account.slice("session:".length);
    const key = JSON.stringify([mask.character, session]);
    const prior = latestMasks.get(key);
    if (prior === undefined || String(mask.at) >= String(prior.at)) latestMasks.set(key, mask);
  }
  return Object.freeze([...testimony.bySession.values()].map(({ carrier }) => carrier).filter((carrier) => {
    const mask = latestMasks.get(JSON.stringify([carrier.character, carrier.session]));
    return mask !== undefined && readingAs("extremal", carrier.reading) === "held"
      && readingAs("extremal", mask.reading) === "held";
  })
    .sort((left, right) => String(right.at).localeCompare(String(left.at)) || left.session.localeCompare(right.session)));
}

export function currentHarnessCarrier(binding, character, session) {
  const active = currentHarnessCarriers(binding, character);
  if (session !== undefined) {
    const selected = active.find((carrier) => carrier.session === session);
    if (selected === undefined) throw new TypeError(`Character ${character} has no currently held harness session ${session}`);
    return selected;
  }
  if (active.length === 0) throw new TypeError(`Character ${character} has no currently held harness session`);
  return active[0];
}

/** Fold told-for/told-against testimony into one knowledge-order reading. */
const settle = (readings) => knowledgeJoinAll(readings.map((reading) => readingAs("knowledge", reading)), "knowledge");

/** The registry with this node's told hands folded in: each `character-masks` testimony that an account
 *  is a hand of a character is an organ (organizing's `withToldHands`), so an account's bearers are read
 *  by the one `bearersHandedBy`, whether the hand is authored or told. */
export const handedAgency = (binding, agency = agencyAt(agencyRootOf(binding))) => withToldHands(agency, readCharacterMasks(binding.dataRoot));

/** The characters an account is a told hand of. */
const masksOf = (binding, account, agency) => toldBearersOf(handedAgency(binding, agency), account);

/** The bearers an account acts for: the characters it is a told hand of, then each it is an authored hand of. */
function bearersOfAccount(binding, account, agency = agencyAt(agencyRootOf(binding))) {
  const face=binding.resolveActorSubject?.(account);
  if(face!==undefined&&(typeof face!=='string'||!agency.characters.has(face)&&![...agency.characters.values()].some(record=>record.id===face)))throw new TypeError('network face names no current authored character');
  return [...new Set([...bearersHandedBy(handedAgency(binding, agency), account),...(face===undefined?[]:[face])])].filter((bearer) => bearer !== account);
}

/** Who an authenticated account can provide work as: itself and every bearer it acts for. */
export function providersOfAccount(binding, account) {
  return Object.freeze([account, ...bearersOfAccount(binding, account)]);
}

/** A connected provider is a character some account is a told hand of: the durable
 *  locus that answers for the work, whichever session carries it. */
export function isMaskedCharacter(binding, character) {
  return isToldBearer(handedAgency(binding), character);
}

/** Offices (registry keys) a holder holds at dignitas by incumbency claims admitted here. */
function claimedOffices(agency, claims, holder) {
  const byOffice = new Map();
  for (const claim of claims.filter((c) => c.incumbent === holder)) {
    const office = resolve(agency, "offices", claim.office);
    if (office === undefined) continue;
    const entry = byOffice.get(office.key) ?? { recognition: [], induction: [] };
    entry[claim.predicate].push(claim.reading);
    byOffice.set(office.key, entry);
  }
  return [...byOffice].filter(([, e]) => incumbencyState(settle(e.recognition), settle(e.induction)) === "dignitas").map(([key]) => key);
}

/** Every office an account acts under, and how: its own seat, a masked character's, or its bearer's. */
export function officesOfAccount(binding, account, agency = agencyAt(agencyRootOf(binding))) {
  const claims = readIncumbencyClaims(binding.dataRoot), masks = readCharacterMasks(binding.dataRoot);
  return projected(`offices-of\u0000${binding.dataRoot}\u0000${account}`, [claims, masks, agency, binding.resolveActorSubject?.(account)],
    () => deriveOfficesOfAccount(binding, account, agency, claims));
}

function deriveOfficesOfAccount(binding, account, agency, claims) {
  const masked = new Set(masksOf(binding, account, agency));
  const held = new Map();
  for (const holder of [account, ...bearersOfAccount(binding, account, agency)]) {
    for (const key of [...officesOf(agency, holder), ...claimedOffices(agency, claims, holder)]) {
      if (!held.has(key)) held.set(key, holder === account ? "incumbency" : masked.has(holder) ? `character:${holder}` : `bearer:${holder}`);
    }
  }
  return Object.freeze([...held].map(([office, via]) => Object.freeze({ office, via })));
}

/** The office powers held by the subject of this invocation. */
export function officeGrants(binding, subject, agency = agencyAt(agencyRootOf(binding))) {
  const grants = [];
  for (const { office } of officesOfAccount(binding, subject, agency)) {
    for (const verb of officeReading(agency, office).verbs ?? []) {
      grants.push(grantAssertion(`office:${office}`, subject, `${CATALOG_CAPABILITY_RESOURCE}#${verb}`, "1970-01-01T00:00:00.000Z"));
    }
  }
  return Object.freeze(grants);
}

/** Office capability fibres for provider delegation. This deliberately reuses
 * the same incumbency and office-reading path as catalog standing; callers do
 * not independently reinterpret authored agency records. */
export function providerDelegationOffices(binding, holder, agency = agencyAt(agencyRootOf(binding))) {
  return Object.freeze(officesOfAccount(binding, holder, agency).map(({ office }) => delegatingOffice(binding, office, agency)));
}

/** One office as a delegator: its charter and the powers it can delegate (the verbs its skills
 * require), or undefined when the reference names no single office. */
export function delegatingOffice(binding, officeRef, agency = agencyAt(agencyRootOf(binding))) {
  const record = resolve(agency, "offices", officeRef);
  if (record === undefined) return undefined;
  const reading = officeReading(agency, record.key);
  return Object.freeze({
    office: reading.office,
    charter: typeof record.charter === "string" && record.charter.length > 0 ? record.charter : record.source ?? reading.office,
    powers: Object.freeze([...(reading.verbs ?? [])]),
  });
}

/** Qualification for an allocated office service is separate from appointment.
 * The work rail supplies the exact allocation; this resolves its actual carrier
 * and the office's coordination boundaries. An offering may constrain model and
 * effort; staffing still selects the actual compatible session. */
export function officeServiceSession(binding, character, officeRef, session) {
  const agency = agencyAt(agencyRootOf(binding));
  const boundary = officeBoundary(agency, officeRef);
  const carrier = carrierOf(binding, character, session);
  requireOfficeServiceCarrier(agency, officeRef, carrier);
  return Object.freeze({ ...carrier, ...boundary });
}

function carrierOf(binding, character, session) {
  const carrier = currentHarnessCarrier(binding, character, session);
  if (typeof carrier.model !== "string" || carrier.model.length === 0) {
    throw new TypeError("office service: admitted session names no carrier model");
  }
  return carrier;
}

/** A current held office or bounded allocated office service can coordinate its
 * work. Neither qualification alone nor an unrelated allocation grants this. Coordination is the
 * character's standing in the office; which admitted session carries it does not bear on it. */
export function coordinatingOffice(binding, character, officeRef, verb, workBinding = binding, served = []) {
  const agency = agencyAt(agencyRootOf(binding));
  const qualified = officeBoundary(agency, officeRef);
  if (!qualified.verbs.includes(verb)) throw new TypeError("office service: the office method does not grant this coordination operation");
  if (officesOfAccount(binding, character, agency).some((held) => held.office === qualified.officeKey)) return qualified;
  // A carrier's deployment declares the offices it serves by service without holding a seat
  // (the host's own declaration, the authority that admits the carrier): the same standing as an allocation's.
  if (served.some((ref) => resolve(agency, "offices", ref)?.key === qualified.officeKey)) return qualified;
  const date = (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
  const service = readAgentWorkDispatchReadout(workBinding, date, character)?.queue.find((entry) =>
    entry.agent === character && resolve(agency, "offices", entry.office)?.key === qualified.officeKey
    && ["ready", "in-flight"].includes(entry.state) && entry.requiresCapabilities?.includes(verb));
  if (service === undefined) throw new TypeError("office service: no held office or current authorized coordinating service allocation");
  return Object.freeze({ ...qualified, allocation: service.allocation, scope: service.scope });
}

/** A coordinating office carried by one of the character's admitted sessions. */
export function coordinatingOfficeSession(binding, character, officeRef, session, verb, workBinding = binding, served = []) {
  const carrier = carrierOf(binding, character, session);
  const agency = agencyAt(agencyRootOf(binding));
  requireOfficeServiceCarrier(agency, officeRef, carrier);
  return Object.freeze({ ...carrier, ...coordinatingOffice(binding, character, officeRef, verb, workBinding, served) });
}

/** A service offering's required carrier qualifies every session that carries
 * that authored office service. This is checked against the admitted harness
 * testimony selected above; caller input and posterior staffing preference do
 * not qualify a session. A future office with multiple distinct carrier-bound
 * offerings must select one through its exact allocation before it can serve. */
function requireOfficeServiceCarrier(agency, officeRef, carrier) {
  const record = resolve(agency, "offices", officeRef);
  const offerings = Array.isArray(record?.["service-offerings"]) ? record["service-offerings"] : [];
  const requirements = offerings.map((offering) => offering?.requiredCarrier).filter((required) => required !== undefined);
  const distinct = new Map(requirements.map((required) => [JSON.stringify(required), required]));
  if (distinct.size === 0) return;
  if (distinct.size !== 1 || requirements.length !== offerings.length) {
    throw new TypeError("office service: select an exact offering before resolving its required carrier");
  }
  const required = distinct.values().next().value;
  if (typeof required?.model !== "string" || typeof required?.reasoningEffort !== "string") {
    throw new TypeError("office service: authored requiredCarrier must name model and reasoningEffort");
  }
  if (carrier.model !== required.model || carrier.reasoningEffort !== required.reasoningEffort) {
    throw new TypeError(`office service: admitted ${carrier.model}/${carrier.reasoningEffort ?? "unknown"} session does not satisfy ${required.model}/${required.reasoningEffort}`);
  }
}

/** What an office readout's `resources` were observed from: the operation catalog of the instance
 * that was queried, together with the caller's standing there. */
export const CURRENT_INSTANCE_RESOURCE_OBSERVATION = Object.freeze({
  scope: "current-installed-instance",
  installationBasis: "queried-instance-operation-catalog",
  availabilityBasis: "queried-instance-operation-catalog+caller-standing",
});

/** A usable office readout: canonical methods and source, plus the installed
 * operation resources that those methods require for this actual caller. */
export function officeResourceReading(binding, sources, officeRef, account) {
  const agency = seatedAgencyOf(binding);
  const reading = officeReading(agency, officeRef);
  if (reading.kind !== "organizing.agency.office") return reading;
  const operations = sources.flatMap((source) => source.operations);
  const required = operations.filter((entry) => reading.verbs.includes(entry.verb));
  const available = required.flatMap((operation) => Object.values(projectOperationAffordances([operation],
    readStanding(binding, account, { operation }), account)).flat());
  const resources = reading.verbs.map((verb) => {
    const installed = operations.filter((entry) => entry.verb === verb);
    return {
      verb, installed: installed.length > 0,
      available: available.some((entry) => entry.verb === verb),
      operations: installed.map((entry) => {
        const { ref, summary, domain, codomain } = operationDescriptor(entry);
        return { ref, summary, input: domain, output: codomain,
          ...(entry.locus === undefined ? {} : { locus: entry.locus }) };
      }),
    };
  });
  const claims = readIncumbencyClaims(binding.dataRoot);
  const memberships = new Map();
  for (const holder of new Set(claims.map((claim) => claim.incumbent)))
    for (const key of claimedOffices(agency, claims, holder)) memberships.set(key, [...(memberships.get(key) ?? []), holder]);
  const route = (officeKey) => {
    const role = officeReading(agency, officeKey);
    const installed = role.verbs.filter((verb) => operations.some((op) => op.verb === verb));
    return { office: role.office, id: role.id, source: role.source, revision: role.revision,
      jurisdiction: role.jurisdiction, normativeStructure: role.normativeStructure,
      serviceOfferings: role.serviceOfferings, duties: role.duties, works: role.works,
      seats: [...role.seats, ...(memberships.get(officeKey) ?? []).filter((holder) => !role.seats.some((seat) => seat.holder === holder)).map((holder) => ({ holder, state: "dignitas", source: "office-incumbency" }))],
      unservedVerbs: role.verbs.filter((verb) => !installed.includes(verb)), unresolved: role.unresolved,
    };
  };
  const organization = Object.fromEntries(Object.entries(reading.relationships).map(([relation, entries]) =>
    [relation, entries.map((entry) => entry.unresolved ? entry : route(entry.office))]));
  const direct = [...agency.offices.values()].filter((office) => resolve(agency, "offices", office.reportsTo, office.sectionPath)?.key === reading.office);
  organization["direct-reports"] = direct.map((office) => route(office.key));
  return JSON.parse(JSON.stringify({ ...reading, resourceObservation: CURRENT_INSTANCE_RESOURCE_OBSERVATION,
    resources, organization, serviceStanding: route(reading.office) }));
}

/** The liberties every subject holds on the platform: entering the world, speaking in it,
 *  hearing what is told in it and reading its own journal there (what `tellings` and `journal`
 *  say in a turn, as data for a client drawing the city), playing on the work board under its
 *  own identity (opening requests, reports, proposals and questions, and the moves its role in a
 *  thread allows), admitting only the hook events of the harness character it already is, reading
 *  its own standing and the offices it could hold, reading the archive of everything the Group has
 *  written, so no one re-derives what is already known, and reading and answering the duties
 *  delegated to the characters it masks (the delegation itself is the holder office's grant), and
 *  keeping its own body: reading it, sending and reading mail, and remembering and forgetting
 *  (each acts only on the caller's own body, or tells a message to another, as work-open does). */
export const PUBLIC_VERBS = Object.freeze(["world-connect", "world-command", "world-atlas", "world-tellings", "world-journal", "work-board", "work-open", "work-move", "seat-brief", "harness-hook-event-admit", "account", "office", "offices", "agency", "agency-record", "operations", "knowledge-claims", "archive-search", "archive-read", "archive-summary", "agency-work-delegated", "agency-work-propose", "body", "mail", "mail-read", "remember", "forget"]);

/** Every public liberty of this enterprise catalog. Network peers are admitted by the host. */
export const publicVerbs = () => PUBLIC_VERBS;

const publicGrants = () => publicVerbs().map((verb) => grantAssertion("metroplat", PUBLIC_HOLDER, `${CATALOG_CAPABILITY_RESOURCE}#${verb}`, "1970-01-01T00:00:00.000Z"));

/** An account's standing on this data root: directly admitted capability assertions, the grants
 *  its offices devolve, and the platform's public liberties. The one assertion list catalog
 *  authorization reads. */
/** The store type of an admitted rule: a thread per rule id, its head the latest admission; a retired rule closes its thread. */
export const ruleType = "rule";

/** The rules admitted at runtime (`rule-admit`), the latest record per id, retired ones dropped. */
export function admittedRules(binding) {
  const rules = [];
  for (const { name, head } of heads(binding.dataRoot, ruleType)) {
    if (head.closed === true) continue;
    const latest = head.frontier.map((address) => get(binding.dataRoot, ruleType, address)).filter((held) => held !== undefined)
      .sort((left, right) => (String(left.admittedAt) < String(right.admittedAt) ? -1 : 1)).at(-1);
    if (latest !== undefined && !latest.retired) { const { causes: _causes, ...rule } = latest; rules.push({ ...rule, id: rule.id ?? name }); }
  }
  return rules.map((rule) => ({ ...normalizeRule(rule.id, rule), key: `admitted#${rule.id}`, section: "admitted", admittedBy: rule.admittedBy }));
}

/** The registry's rules with the admitted ones beside them, as one registry for judging. */
function withAdmittedRules(binding, registry) {
  const rules = new Map(registry.rules ?? []);
  for (const rule of admittedRules(binding)) rules.set(rule.key, rule);
  return { ...registry, rules };
}

/** The judge every dispatch consults before an operation runs: the intended action read against
 *  the rules the agency records state and the rules admitted on MetroPlat (organizing's rules). */
export function rulesJudge(binding) {
  return (action) => judgeAction(withAdmittedRules(binding, agencyAt(agencyRootOf(binding))), action);
}

/** Open work allocations grant only the invoked harness character its required verbs. */
export function allocationGrants(binding, subject, agency = agencyAt(agencyRootOf(binding))) {
  const character = [...agency.characters.values()].find((candidate) => candidate.id === subject && candidate.kind === "harness");
  if (character === undefined) return Object.freeze([]);
  const date = (binding.now?.()??new Date().toISOString()).slice(0,10);
  const grants = [];
  let dispatch;
  try { dispatch = readAgentWorkDispatchReadout(binding, date, character.id); } catch { dispatch = undefined; }
  for (const item of dispatch?.queue??[]) {
    if (item.agent !== character.id || item.skill === undefined||!['ready','in-flight'].includes(item.state)) continue;
    for (const verb of resolve(agency, "skills", item.skill)?.requiresCapabilities ?? []) {
      grants.push(grantAssertion(`allocation:${item.scope}`, subject, `${CATALOG_CAPABILITY_RESOURCE}#${verb}`, "1970-01-01T00:00:00.000Z"));
    }
  }
  return Object.freeze(grants);
}

let catalogVerbs;
/** The verb a catalog operation reference names, read from the catalog's generated projection
 *  (the release checks that projection against the live catalog). */
const verbOfOperation = (ref) => (catalogVerbs ??= new Map(Object.values(operationFamilyDescriptors).flat().map((d) => [d.ref, d.verb]))).get(ref);

/** The ready duties on this root: each one's scope and, when its holder delegated it, the
 * provider and the verbs of the operations delegated. The native work fold already
 * caches by journal revision; elapsed-time caches would retain withdrawn authority. */
function readyDuties(binding) {
  let dispatch;
  try { dispatch = readAgentWorkDispatchReadout(binding, (binding.now?.() ?? new Date().toISOString()).slice(0, 10), undefined); } catch { dispatch = undefined; }
  const duties = Object.freeze((dispatch?.queue ?? []).filter(item => item.state === "ready" || item.state === "in-flight").map((item) => Object.freeze({
    scope: item.scope,
    ...(item.delegation === undefined ? {} : { delegation: Object.freeze({
      provider: item.delegation.provider,
      verbs: Object.freeze(item.delegation.operations.map(verbOfOperation).filter((verb) => verb !== undefined)),
    }) }),
  })));
  return duties;
}

/** Whether the duty `scope` names is ready on this root: the only duties a worktree is opened for. */
export const isReadyDuty = (binding, scope) => readyDuties(binding).some((duty) => duty.scope === scope);

/** Install the source resource with this node's actual repository and duty readiness. */
export function dutyWorkspaceOperations(binding) {
  return dutyWorktreeOperations({
    repository: repositoryRootOf(binding),
    dataRoot: binding.dataRoot,
    sourceTaskOf: async (input, execution, verb) => {
      const task = await resolveDutySourceTask(binding, input, execution, verb);
      if (task !== undefined) return task;
      const read = readAgentWorkDispatchReadout(binding, (binding.now?.() ?? new Date().toISOString()).slice(0, 10), undefined);
      if (read?.queue.some(item => item.scope === input.duty && item.execution?.sourceBinding !== undefined)) throw new TypeError("source task: original native task binding is unavailable");
      return undefined;
    },
    // Assignment removes a worker from the dispatch frontier, but its allocated
    // source resource must remain usable while that worker is in flight.
    isReadyDuty: (scope) => {
      const date = (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
      const dispatch = readAgentWorkDispatchReadout(binding, date, undefined);
      return dispatch?.queue.some((item) => item.scope === scope
        && (item.state === "ready" || item.state === "in-flight")) ?? false;
    },
  });
}

const delegationsOfAccount = (binding, account, workBinding=binding) => {
  const providers = new Set(providersOfAccount(binding, account));
  return readyDuties(workBinding).filter((duty) => duty.delegation !== undefined && providers.has(duty.delegation.provider))
    .map((duty) => Object.freeze({ scope: duty.scope, verbs: duty.delegation.verbs }));
};

/** The powers delegated to an account, or to a character it masks, by the ready duties it performs. */
export function delegatedVerbs(binding, account) {
  return Object.freeze([...new Set(delegationsOfAccount(binding, account).flatMap((d) => d.verbs))].sort());
}

/** Standing for exactly the operations a holder delegated to this account's provider, only while
 *  that duty is ready, and attenuated to the duty: each grant is on the duty's own resource
 *  (`infograph/duty/<scope>#<verb>`), so it reaches an operation only where the invocation's
 *  `duty` names that scope. The holder's office still answers for the outcome. */
export function delegationGrants(binding, subject, workBinding=binding) {
  return Object.freeze(delegationsOfAccount(binding, subject,workBinding).flatMap((d) =>
    d.verbs.map((verb) => grantAssertion(`delegation:${d.scope}`, subject, capabilityGrant(locusResource(CATALOG_CAPABILITY_RESOURCE, DUTY_LOCUS, d.scope), verb), "1970-01-01T00:00:00.000Z"))));
}

export function readStanding(binding, subject, action) {
  if (typeof subject !== "string" || subject.length === 0) throw new TypeError("readStanding requires the invocation subject");
  const agency = agencyAt(agencyRootOf(binding));
  const standing = [...readCapabilityAssertions(binding.dataRoot), ...officeGrants(binding, subject, agency), ...publicGrants()];
  if (action?.operation !== undefined) {
    const { operation, input } = action;
    const scope = operation.locus === undefined ? undefined : input?.[operation.locus];
    const resource = typeof scope === "string" && scope !== ""
      ? locusResource(CATALOG_CAPABILITY_RESOURCE, operation.locus, scope) : CATALOG_CAPABILITY_RESOURCE;
    // Allocation and delegation add only affirmative grants. They cannot alter a
    // permission already held by the current direct/office/public assertions;
    // explicit revocations have already participated in this same can reading.
    // Allocation-only permissions still resolve the full current work boundary.
    if (readingAs("knowledge", can(standing, subject, capabilityGrant(resource, operation.verb)).value) === "potential") {
      return Object.freeze(standing);
    }
  }
  const workBindings=binding.workBindings?.()??[binding];
  return Object.freeze([...standing,...workBindings.flatMap(workBinding=>[
    ...allocationGrants(workBinding,subject,agency),...delegationGrants(binding,subject,workBinding),
  ])]);
}

/** What one account works under: the characters it bears (masks it wears and organs that hand it
 *  to a character), the characters it masks, the players it may play as (itself and
 *  each masked character, wearing an office, a persona, or a body's face: organizing's cast), each
 *  player embodied (its mask's face met with its bearer's body natural, actuate read from the provider
 *  admissions — what the account's hands can actually do as that player), its
 *  offices, their skills and the verbs those grant (marking verbs the catalog does not serve), its
 *  duties and their works, and its directly admitted grants. */
export function accountReading(binding, sources, account) {
  const agency = agencyAt(agencyRootOf(binding));
  const operations = sources.flatMap((source) => source.operations);
  const affordances = projectOperationAffordances(operations, readStanding(binding, account), account);
  const catalogVerbs = new Set(operations.map((operation) => operation.verb));
  const offices = officesOfAccount(binding, account, agency).map(({ office, via }) => ({ via, reading: officeReading(agency, office) }));
  const verbs = [...new Set(offices.flatMap((o) => o.reading.verbs))].sort();
  const admitted = admittedCapabilitiesOf(binding);
  // Seats told here at runtime seat through the registry's own reading (organizing withSeatClaims).
  const seated = withSeatClaims(handedAgency(binding, agency), readIncumbencyClaims(binding.dataRoot));
  // Agency records leave optional fields unset; the reading carries only what they state.
  return JSON.parse(JSON.stringify({
    kind: "metroplat.account",
    account,
    bearers: Object.freeze(providersOfAccount(binding, account).slice(1)),
    masks: masksOf(binding, account, agency),
    players: Object.freeze(providersOfAccount(binding, account).flatMap((bearer) => playersOf(seated, bearer))),
    embodied: Object.freeze(providersOfAccount(binding, account).flatMap((bearer) => embodiedPlayers(seated, bearer, castMasksOf(seated, bearer), { admitted })
      .map(({ by, mask, kind, handedness, sides }) => ({ bearer, by, mask, kind, handedness, sides })))),
    offices: Object.freeze(offices.map(({ via, reading }) => ({ office: reading.office, id: reading.id, name: reading.name, section: reading.section, via }))),
    skills: Object.freeze([...new Set(offices.flatMap((o) => o.reading.skills.map((s) => s.id)))].sort()),
    verbs: Object.freeze(verbs),
    unservedVerbs: Object.freeze(verbs.filter((v) => !catalogVerbs.has(v))),
    operationAffordances: affordances,
    duties: Object.freeze(offices.flatMap(({ reading }) => reading.duties.map((d) => ({ ...d, office: reading.office })))),
    works: Object.freeze(offices.flatMap(({ reading }) => reading.works.map((w) => ({ ...w, office: reading.office })))),
    grants: [...new Set(readCapabilityAssertions(binding.dataRoot).filter((a) => a.holder === account && a.assertion !== "revoke").map((a) => a.grants))].sort(),
  }));
}

const accountOutputContract = schemaFrom({
  $id: "metroplat/account/output",
  title: "Account",
  type: "object",
  required: ["kind", "account", "masks", "offices", "skills", "verbs", "unservedVerbs", "operationAffordances", "duties", "works", "grants"],
  properties: {
    kind: { const: "metroplat.account" },
    account: { type: "string" },
    bearers: { type: "array", items: { type: "string" } },
    operationAffordances: {
      type: "object",
      required: ["direct", "public", "office", "allocation", "delegation"],
      properties: Object.fromEntries(["direct", "public", "office", "allocation", "delegation"].map((category) => [category, {
        type: "array",
        items: { type: "object", required: ["ref", "verb"], properties: { ref: { type: "string" }, verb: { type: "string" }, input: { type: "object" }, output: { type: "object" }, locus: { type: "string" }, scope: { type: "string" }, summary: { type: "string" } } },
      }])) ,
    },
  },
});
const recordContract = (id, title) => schemaFrom({ $id: id, title, type: "object", required: ["kind"] });
const READ = Object.freeze({ class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" });
const WRITE = Object.freeze({ class: "journal-write", replay: "idempotency-key", coordination: "coordination-free", deterministic: true, totality: "schema-bounded" });
const HARNESS_HOSPITALITY_ISSUER = "metroplat:hospitality";
const KNOWLEDGE_STANDING = "Knowledge: a Read of a house file arrives with the fleet's live findings about it; the first whole Read of a large file may be answered with its finding alone, and reading it again loads the file. What reading teaches you that no finding holds, admit with knowledge_admit at its proof-path address (path, section, or path#symbol), anchored to the files you learned it from: it stays live until they change, and no agent pays to learn it again.";

/** The admitted session's suit: its bearer, recognized offices and skills,
 *  its inbox, and the exact native reading of its allocated duties. Entry records
 * participation without rebuilding unrelated work to produce welcome text. */
function openingContext(binding, character, session, inbox, body) {
  const agency = agencyAt(agencyRootOf(binding));
  const offices = officesOfAccount(binding, character.id, agency).map((entry) => officeReading(agency, entry.office));
  // The rule store as settled now (§5.11): the agency's rules with rule-admit's beside them, so a
  // rule admitted between projections binds the next session's entry without a reprojection.
  const rules = rulesFor(withAdmittedRules(binding, agency), character.id).filter((rule) => rule.statement);
  const standing = body === undefined ? undefined : body.standing;
  const tokens = body?.spend.tokens ?? {};

  return sessionContextImage({
    identity: [character.harness === "mcp"
      ? `This MCP client session participates as the authenticated account ${character.id} in the 561 Group's MetroPlat. Its recognized offices govern its authority; participation does not attest an inference model.`
      : `This session wears a mask over the character ${character.name} (${character.id}) in the 561 Group's MetroPlat; its acts and witnesses accrue to that character. MetroPlat's metroplat MCP server acts as the character.`],
    capabilities: [
      ...(character.harness === "mcp" ? [] : [KNOWLEDGE_STANDING]),
      "Historical context is loaded only when requested. Use the relevant authored sources and their live findings through knowledge_read; current user intent and corrections govern.",
      "MetroPlat carries native governing and knowledge acts. Discover installed contracts with operations, complete institutions with agency and agency-record, and sourced evidence with knowledge-claims. Enact scoped institutional changes with agency-record-admit and admit testimony with knowledge-claim-admit. Work allocation applies to remaining execution obligations.",
      `Recognized offices: ${offices.map((office) => office.name).join("; ") || "none"}.`,
      `Office skills: ${[...new Set(offices.flatMap((office) => office.skills.map((skill) => skill.id)))].join(", ") || "none"}. Enter with world-connect; load a relevant authored method with read <skill>. Reading grants no execution authority.`,
    ],
    // The body's own memory, kept with remember and retracted with forget: every session of it starts here.
    memory: [
      ...(rules.length === 0 ? [] : [
        `Rules ${character.name} acts under — the settled rule store (agency rules and rule-admit's). Every dispatch is judged against them; rule-check judges an intended act, rule-admit states or retires one:`,
        ...rules.map((rule) => `- ${rule.statement} (${rule.id})`),
      ]),
      ...(body?.memory ?? []).map((entry) => `${entry.key}: ${entry.text}`),
    ],
    perception: [
      ...(body === undefined ? [] : [`Body: ${body.present.length} session(s) present; judged ${standing.accepted} accepted, ${standing.rejected} rejected; spent ${tokens.input ?? 0} input (${tokens.cached ?? 0} cached) and ${tokens.output ?? 0} output tokens. Read it whole with body; keep what later sessions need with remember.`]),
      ...(body === undefined || body.mail.unread.length === 0 ? ["No unread mail. Send with mail {to, words}."]
        : [`Unread mail (now marked read for this body):\n${body.mail.unread.map((message) => `- from ${message.from}: ${message.words}`).join("\n")}`]),
      ...(inbox.length === 0 ? [] : [`Unread ActivityPub messages (now marked read by this session):\n${inbox.map((message) => `- from ${message.sender}: ${message.objectKind} ${JSON.stringify(message.value)}`).join("\n")}`]),
    ],
    mission: [
      `Read current allocated duties, execution readiness and receiving conditions with agent-work-dispatch {"id":${JSON.stringify(character.id)}}. The explicit current read remains authoritative; this session entry does not assert readiness or the absence of work.`,
      `Session ${session}.`,
    ],
  }).text;
}

/** Admit one node arrival into a character's mailbox: the next record of the character's inbox thread. */
export function admitCharacterInboxMessage({ dataRoot, character, id, sender, objectKind, value, message, at }) {
  const record = Object.freeze({ kind: "metroplat.character-inbox-message", id, character, sender, objectKind, value, message, at });
  return extend(dataRoot, characterInboxType, character, record);
}

/** A character's inbox thread read causes first: its messages and the reads of them. */
function inboxRecords(dataRoot, character) {
  const found = [];
  for (const step of walk(dataRoot, characterInboxType, readHead(dataRoot, characterInboxType, character)?.frontier ?? [], { limit: 4096 })) {
    if (step.record !== undefined) found.push(step.record);
  }
  return found.reverse();
}

export function characterInbox(dataRoot, character, { unread = true } = {}) {
  const messages = new Map(), read = new Set();
  for (const value of inboxRecords(dataRoot, character)) {
    if (value?.kind === "metroplat.character-inbox-message" && value.character === character) messages.set(value.id, value);
    if (value?.kind === "metroplat.character-inbox-read" && value.character === character) read.add(value.id);
  }
  return [...messages.values()].filter((message) => !unread || !read.has(message.id)).sort((left, right) => left.at.localeCompare(right.at));
}

export function readCharacterInbox(dataRoot, character, session, at) {
  const messages = characterInbox(dataRoot, character);
  if (messages.length === 0) return messages;
  for (const message of messages) {
    extend(dataRoot, characterInboxType, character, Object.freeze({ kind: "metroplat.character-inbox-read", id: message.id, character, session, at }));
  }
  return messages;
}

/** A public caller can admit only the events of the harness character it already is. */
function recognizeHarnessCaller(binding, agency, { harness, subject, payload }) {
  if (harness === "mcp") {
    if (subject === "anonymous" || officesOfAccount(binding, subject, agency).length === 0) throw new TypeError("MCP session participation requires the authenticated account's recognized office");
    const envelope = admitHookEnvelope(payload, { harness });
    if (!["SessionStart", "SessionEnd"].includes(envelope.hookEventName) || envelope.sessionId === undefined) throw new TypeError("MCP participation requires SessionStart or SessionEnd and the actual client session id");
    return Object.freeze({ id: subject, name: subject, kind: "account", harness });
  }
  const characters = [...agency.characters.values()].filter((character) => character.kind === "harness" && character.harness === harness && character.id === subject);
  if (characters.length !== 1) throw new TypeError(`harness-hook-event-admit: ${subject} is not the character named by harness ${harness}`);
  return characters[0];
}

function participateHarnessHookEvent(binding, sources, { payload, subject, participant: character, at }) {
  const envelope = admitHookEnvelope(payload, { harness: character.harness });
  const event = envelope.hookEventName;
  if (event === "PreToolUse") return readKnowledgeOf({ ...binding, root: repositoryRootOf(binding) }, payload);
  if (event !== "SessionStart" && event !== "SessionEnd") return undefined;
  const session = envelope.sessionId;
  if (typeof session !== "string" || session.length === 0) return undefined;
  const date = at.slice(0, 10);
  const accountParticipation = character.harness === "mcp";
  const mask = (reading) => ({ kind: "metroplat.character-mask", account: `session:${session}`, character: character.id, reading, issuer: subject, at });
  if (event === "SessionEnd") {
    if (!accountParticipation) admitCharacterMasks({ dataRoot: binding.dataRoot, date, masks: [mask("denied")] });
    return accountParticipation ? Object.freeze({ participation: { character: character.id, session, harness: character.harness, reading: "denied" } }) : undefined;
  }
  // The hook service already witnesses account entry/exit. It needs no duplicate
  // provider admission or mask: those carry the named harness's execution facts.
  if (!accountParticipation) {
    const verbs = [...new Set(sources().flatMap((source) => source.operations.map((entry) => entry.verb)))].sort();
    const model = envelope.model;
    const reasoningEffort = envelope.reasoningEffort;
    admitHarnessCarriers({ dataRoot: binding.dataRoot, date, carriers: [{ kind: "metroplat.harness-carrier", character: character.id, harness: character.harness, ...(model === undefined ? {} : { model }), ...(reasoningEffort === undefined ? {} : { reasoningEffort }), session, capabilities: verbs, reading: "held", issuer: HARNESS_HOSPITALITY_ISSUER, at }] });
    admitCharacterMasks({ dataRoot: binding.dataRoot, date, masks: [mask("held")] });
  }
  const inbox = readCharacterInbox(binding.dataRoot, character.id, session, at);
  let body;
  if (!accountParticipation) {
    try {
      body = livedBodyAt(binding.dataRoot, agencyAt(agencyRootOf(binding)), character.id, { told: { masks: readCharacterMasks(binding.dataRoot), carriers: readHarnessCarriers(binding.dataRoot) }, offices: officesOfAccount(binding, character.id).map((entry) => entry.office) });
      if (body.mail.unread.length > 0) tellBodyRecords(binding.dataRoot, body.mail.unread.map((message) => ({ kind: "mail-read", id: message.id, character: character.id, session, at })), { at, caller: { transport: "harness-session-start", session } });
    } catch { body = undefined; /* a body that cannot be read leaves the suit without it, never the session without a suit */ }
  }
  return Object.freeze({
    ...(accountParticipation ? { participation: { character: character.id, session, harness: character.harness, reading: "held" } } : {}),
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: openingContext(binding, character, session, inbox, body) },
  });
}

/** A JSON-safe projection of one agency record for broad readout. */
export function agencyRecordProjection(pool, record) {
  return { pool, key: record.key, id: record.id,
    ...(record.name === undefined ? {} : { name: record.name }),
    source: record.source, revision: record.revision };
}

/** The offices family. `sources` is read lazily: this family is itself one of the catalog's. */
export function officeOperations(binding, sources) {
  const agency = () => agencyAt(agencyRootOf(binding));
  return Object.freeze([
    operation({
      verb: "operations", summary: "Discover the complete installed enterprise surface and contracts, with current availability separate from existence.",
      domain: schemaFrom({ $id: "metroplat/operations/query", type: "object", properties: { verb: { type: "string" }, module: { type: "string" } }, additionalProperties: false }),
      codomain: recordContract("metroplat/operations/output", "InstalledOperations"), effects: READ,
      run: (input = {}, _args, context) => {
        const all = sources();
        const subject = subjectOf(context, "anonymous");
        const selected = all.filter((source) => !input.module || source.module === input.module)
          .flatMap((source) => source.operations.filter((operation) => !input.verb || operation.verb === input.verb));
        const available = input.verb === undefined
          ? Object.values(projectOperationAffordances(selected, readStanding(binding, subject), subject)).flat()
          : selected.flatMap((operation) => Object.values(projectOperationAffordances([operation],
            readStanding(binding, subject, { operation }), subject)).flat());
        return { kind: "metroplat.operations", operations: all.filter((s) => !input.module || s.module === input.module)
          .flatMap((s) => s.operations.filter((op) => !input.verb || op.verb === input.verb).map((op) => ({ module: s.module,
            ...operationDescriptor(op), available: available.some((a) => a.ref === op.ref) }))) };
      },
    }),
    operation({
      verb: "agency", summary: "Discover canonical records by pool or section; omit both filters for complete institutional ontology, powers, norms and census.",
      domain: schemaFrom({ $id: "metroplat/agency/query", type: "object", properties: { pool: { enum: AGENCY_POOLS }, section: { type: "string" } }, additionalProperties: false }),
      codomain: recordContract("metroplat/agency/output", "Agency"), effects: READ,
      run: (input = {}) => {
        const a = agency();
        const reading = { kind: "metroplat.agency", pools: Object.fromEntries(AGENCY_POOLS.map((pool) => [pool, a[pool].size])),
          records: (input.pool ? [input.pool] : AGENCY_POOLS).flatMap((pool) => [...a[pool].values()]
            .filter((r) => !input.section || r.sectionPath === input.section)
            .map((r) => agencyRecordProjection(pool, r))),
          problems: a.problems };
        // Public operation results cross a JSON transport boundary. Agency records may contain
        // optional JavaScript fields; omit them exactly as JSON does before receipt validation.
        if (input.pool !== undefined || input.section !== undefined) return JSON.parse(JSON.stringify(reading));
        const model = governanceOf(a);
        const claims = readIncumbencyClaims(binding.dataRoot), seated = withSeatClaims(handedAgency(binding, a), claims);
        const members = new Map();
        for (const holder of new Set(claims.map((claim) => claim.incumbent)))
          for (const key of claimedOffices(a, claims, holder)) members.set(key, [...(members.get(key) ?? []), holder]);
        return JSON.parse(JSON.stringify({ ...reading,
          governance: { collectives: [...model.collectives.values()].map((c) => ({ ...c, members: [...new Set([...c.members, ...(members.get(c.id) ?? [])])] })),
            norms: [...model.norms.values()], acts: AGENCY_POOLS.flatMap((pool) => [...a[pool].values()]
              .filter((r) => r["last-governance-act"]).map((r) => ({ pool, key: r.key, revision: r.revision, ...r["last-governance-act"] }))) },
          cast: castCensus(seated), politic: politicCensus(seated, { admitted: admittedCapabilitiesOf(binding) }),
          control: controlCensus(seated), jural: juralCensus(seated) }));
      },
    }),
    operation({
      verb: "agency-record", summary: "Read a complete authored institutional record and its revision for a subsequent governing act.",
      domain: schemaFrom({ $id: "metroplat/agency-record/query", type: "object", required: ["pool", "id"], properties: { pool: { enum: AGENCY_POOLS }, id: { type: "string" }, section: { type: "string" } }, additionalProperties: false }),
      codomain: recordContract("metroplat/agency-record/output", "AgencyRecord"), effects: READ,
      run: (input) => ({ kind: "metroplat.agency-record", record: agencyRecord(agency(), input.pool, input.id, input.section) ?? null }),
    }),
    operation({
      verb: "agency-record-admit", summary: "Enact a scoped office, duty, work, skill, or requirement change in its canonical carrier, under an existing deontic power.",
      domain: schemaFrom({ $id: "metroplat/agency-record/admission", type: "object", required: ["pool", "id", "section", "expectedRevision", "record", "office", "session", "evidence"],
        properties: { pool: { enum: AGENCY_POOLS }, id: { type: "string" }, section: { type: "string" }, expectedRevision: { type: ["string", "null"] }, record: { type: "object" },
          office: { type: "string" }, session: { type: "string" }, evidence: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } } }, additionalProperties: false }),
      codomain: recordContract("metroplat/agency-record/enacted", "EnactedRecord"),
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: true, totality: "schema-bounded" },
      run: (input, _args, context) => {
        const subject = subjectOf(context, "anonymous");
        const character = providersOfAccount(binding, subject)[1] ?? subject;
        const service = coordinatingOfficeSession(binding, character, input.office, input.session, "agency-record-admit");
        let power;
        const record = enactAgencyRecord({ root: agencyRootOf(binding), ...input,
          act: { actor: subject, character, office: service.officeKey, session: input.session, evidence: input.evidence, at: binding.now() },
          authorize: ({ agency: a, pool, source, existing }) => {
            const office = resolve(a, "offices", service.officeKey);
            power = recordPower(a, office, pool, `lib/${source}`);
            if (!power) throw new TypeError("agency-record-admit: no held power over this pool and source");
            if (pool === "offices" && (existing?.key === office.key || officeReading(a, office.key).reportsTo.includes(existing?.key)))
              throw new TypeError("agency-record-admit: cannot amend own or superior office authority");
            const permitted = new Set([...service.verbs, ...(power.capabilities ?? [])]);
            const prior = existing?.authored ?? {};
            const next = input.record;
            if (pool === "skills") {
              for (const verb of next["requires-capabilities"] ?? []) if (!(prior["requires-capabilities"] ?? []).includes(verb) && !permitted.has(verb))
                throw new TypeError(`agency-record-admit: power does not convey operation ${verb}`);
            }
            if (pool === "offices") {
              for (const field of ["jurisdiction", "authority-scope"])
                if (existing && JSON.stringify(next[field]) !== JSON.stringify(prior[field])) throw new TypeError(`agency-record-admit: changing ${field} requires separate authority`);
              for (const [position, kind] of Object.entries(next["deontic-profile"] ?? {}))
                if (kind !== "duty" && prior["deontic-profile"]?.[position] !== kind) throw new TypeError("agency-record-admit: cannot convey new powers or override immunities");
              for (const skillId of next["provides-skill"] ?? []) {
                if ((prior["provides-skill"] ?? []).includes(skillId)) continue;
                const skill = resolve(a, "skills", skillId, input.section);
                if (!skill || skill.requiresCapabilities.some((verb) => !permitted.has(verb))) throw new TypeError("agency-record-admit: added skill exceeds the held power");
              }
            }
            return power.key;
          } });
        refreshAgency(agencyRootOf(binding));
        return { kind: "metroplat.agency-record-enacted", record, power: power.key };
      },
    }),
    harnessHookEventAdmissionOperation({
      binding,
      recognize: (request) => recognizeHarnessCaller(binding, agency(), request),
      participate: (request) => participateHarnessHookEvent(binding, sources, request),
    }),
    operation({
      verb: "account",
      inputFormat: "json",
      outputFormat: "json",
      summary: "The characters, offices, skills, verbs, duties and works of an account (by default, the caller's).",
      domain: schemaFrom({ $id: "metroplat/account/input", title: "AccountRequest", type: "object", properties: { account: { type: "string", minLength: 1 } }, additionalProperties: false }),
      codomain: accountOutputContract,
      relation: "boundary",
      effects: READ,
      run: (input, _args, context) => accountReading(binding, sources(), input?.account ?? subjectOf(context, "anonymous")),
    }),
    operation({
      verb: "offices",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Every office seated in the house's agency records, with its section, verbs and seats.",
      domain: schemaFrom({ $id: "metroplat/offices/input", title: "OfficesRequest", type: "object", additionalProperties: false }),
      codomain: recordContract("metroplat/offices/output", "Offices"),
      relation: "boundary",
      effects: READ,
      run: () => {
        const a = seatedAgencyOf(binding, agency());
        return Object.freeze({
          kind: "metroplat.offices",
          offices: Object.freeze([...a.offices.keys()].map((key) => {
            const r = officeReading(a, key);
            return { office: r.office, id: r.id, name: r.name, section: r.section, verbs: r.verbs, duties: r.duties.length, seats: r.seats, unresolved: r.unresolved };
          })),
          shared: a.shared,
        });
      },
    }),
    operation({
      verb: "office",
      inputFormat: "json",
      outputFormat: "json",
      summary: "One office through its duties, works, skills, verbs, authority chain and seats. Discover enterprises with agency pool enterprises, then read their canonical records with agency-record.",
      domain: schemaFrom({
        $id: "metroplat/office/input",
        title: "OfficeRequest",
        description: "An office by id (when seated in one section) or by section-qualified key.",
        type: "object",
        required: ["office"],
        properties: { office: { type: "string", minLength: 1 } },
        additionalProperties: false,
      }),
      codomain: recordContract("metroplat/office/output", "Office"),
      relation: "boundary",
      effects: READ,
      run: (input, _args, context) => officeResourceReading(binding, sources(), input.office, subjectOf(context, "anonymous")),
    }),
    operation({
      verb: "rules",
      summary: "The rules (BCP 14 statements) binding an account, or every rule the agency records state.",
      domain: schemaFrom({ $id: "metroplat/rules/input", title: "RulesRequest", type: "object", properties: { actor: { type: "string" } }, additionalProperties: false }),
      effects: READ,
      run: (input = {}, _args, context) => {
        const registry = withAdmittedRules(binding, agency());
        const actor = input.actor ?? subjectOf(context, "anonymous");
        const rules = input.actor === undefined && actor === "anonymous" ? [...(registry.rules?.values() ?? [])] : rulesFor(registry, actor);
        return JSON.parse(JSON.stringify({ kind: "metroplat.rules", actor, rules: rules.map(({ key, id, statement, keyword, subject, action, when, require, because, section }) => ({ key, id, statement, keyword, subject, action, when, require, because, section })) }));
      },
    }),
    operation({
      verb: "rule-check",
      summary: "Judge an intended action against the rules before doing it: the findings, their FOUR reading, and whether it may proceed.",
      domain: schemaFrom({ $id: "metroplat/rule-check/input", title: "RuleCheckRequest", type: "object", required: ["verb"], properties: { actor: { type: "string" }, verb: { type: "string", minLength: 1 }, input: {} }, additionalProperties: false }),
      effects: READ,
      run: (input, _args, context) => judgeAction(withAdmittedRules(binding, agency()), { actor: input.actor ?? subjectOf(context, "anonymous"), verb: input.verb, input: input.input }),
    }),
    operation({
      verb: "rule-admit",
      summary: "State a rule (a BCP 14 statement) that accounts act under from now on, or retire one.",
      description: "The statement carries its key word (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY); subject and action are glob patterns (hive:*, hive:transfer_to_savings, land-deal-record); when and require are conditions over the action's input. Every dispatch and the Hive signer judge actions against it.",
      domain: schemaFrom({
        $id: "metroplat/rule-admit/input", title: "RuleAdmission", type: "object", required: ["id", "statement"],
        properties: {
          id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" }, statement: { type: "string", minLength: 1 },
          subject: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          action: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
          when: {}, require: { type: "object" }, because: { type: "string" }, retired: { type: "boolean" },
        },
        additionalProperties: false,
      }),
      effects: WRITE,
      run: (input, _args, context) => {
        const rule = normalizeRule(input.id, input);
        if (!rule.keyword && !input.retired) throw new TypeError("rule-admit: the statement names no BCP 14 key word (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY)");
        const admittedAt = binding.now();
        const record = { ...input, admittedAt, admittedBy: subjectOf(context, "anonymous") };
        extend(binding.dataRoot, ruleType, input.id, record, { closed: input.retired === true });
        return JSON.parse(JSON.stringify({ kind: "metroplat.rule", ...rule, retired: input.retired === true, admittedAt, admittedBy: record.admittedBy }));
      },
    }),
    operation({
      verb: "office-incumbency-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Tell a recognition or an induction of a bearer into an office of the agency records.",
      description: "An account holds an office once both its recognition and its induction are told held (socializing office: honor and munus); the verbs the office's skills require then devolve onto it and its duties become the account's. Each axis is told only by its own party: the induction by the incumbent or its hand, the recognition by whoever's personnel right reaches the seat (an enterprise's own office by one who does that enterprise's work, by record or by deed on the work board; any other office under an office it reports up to), and never by the bearer being seated. Doing an enterprise office's work seats its bearer without either act.",
      domain: schemaFrom({
        $id: "metroplat/office-incumbency-admit/input",
        title: "OfficeIncumbencyAdmission",
        type: "object",
        required: ["office", "incumbent", "predicate"],
        properties: { office: { type: "string", minLength: 1 }, incumbent: { type: "string", minLength: 1 }, predicate: { enum: ["recognition", "induction"] }, reading: { enum: ["held", "denied"] } },
        additionalProperties: false,
      }),
      codomain: accountOutputContract,
      relation: "boundary",
      effects: WRITE,
      run: (input, _args, context) => {
        const office = resolve(agency(), "offices", input.office);
        if (office === undefined) throw new TypeError(`office-incumbency-admit: ${input.office} is not one office of the agency records (name it by section#id when seated in several)`);
        const at = binding.now();
        const subject = subjectOf(context, "anonymous");
        const hands = providersOfAccount(binding, subject);
        const character = hands[1] ?? subject;
        let player;
        if (input.predicate === "induction") {
          if (!hands.includes(input.incumbent)) throw new TypeError(`office-incumbency-admit: an induction is told by its incumbent or its hand; ${subject} is no hand of ${input.incumbent}`);
          player = { by: input.incumbent, bearer: input.incumbent, hand: subject };
        } else {
          const held = officesOfAccount(binding, subject).map((entry) => entry.office);
          const deeds = boardDeedsOf(binding);
          const right = recognitionRightOf(agency(), office.key, { held, bearer: character, incumbent: input.incumbent, doersOf: (enterprise) => doersOf(agency(), enterprise, { deeds: deeds(enterprise) }) });
          player = { by: right.office, bearer: character, hand: subject };
        }
        admitIncumbencyClaims({ dataRoot: binding.dataRoot, date: at.slice(0, 10), claims: [{ kind: "metroplat.office-incumbency-claim", office: office.key, incumbent: input.incumbent, predicate: input.predicate, reading: input.reading ?? "held", issuer: subject, player, at }] });
        return accountReading(binding, sources(), input.incumbent);
      },
    }),
    operation({
      verb: "character-mask-admit",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Admit that an account masks one of the house's characters, and so acts under that character's offices.",
      domain: schemaFrom({
        $id: "metroplat/character-mask-admit/input",
        title: "CharacterMaskAdmission",
        type: "object",
        required: ["account", "character"],
        properties: { account: { type: "string", minLength: 1 }, character: { type: "string", minLength: 1 }, reading: { enum: ["held", "denied"] } },
        additionalProperties: false,
      }),
      codomain: accountOutputContract,
      relation: "boundary",
      effects: WRITE,
      run: (input, _args, context) => {
        const character = resolve(agency(), "characters", input.character);
        if (character === undefined) throw new TypeError(`character-mask-admit: ${input.character} is not one character of the agency records`);
        const at = binding.now();
        admitCharacterMasks({ dataRoot: binding.dataRoot, date: at.slice(0, 10), masks: [{ kind: "metroplat.character-mask", account: input.account, character: character.id, reading: input.reading ?? "held", issuer: subjectOf(context, "anonymous"), at }] });
        return accountReading(binding, sources(), input.account);
      },
    }),
    ...bodyOperations(binding, {
      agency, subjectOf,
      characterOf: (account) => providersOfAccount(binding, account).map((ref) => resolve(agency(), "characters", ref)).find((record) => record !== undefined)?.id,
      officesOf: (account) => officesOfAccount(binding, account).map((entry) => entry.office),
      told: (dataRoot) => ({ masks: readCharacterMasks(dataRoot), carriers: readHarnessCarriers(dataRoot) }),
    }),
  ]);
}
