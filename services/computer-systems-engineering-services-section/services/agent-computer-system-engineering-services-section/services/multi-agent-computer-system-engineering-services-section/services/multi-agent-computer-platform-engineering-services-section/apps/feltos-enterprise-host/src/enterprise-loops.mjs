/**
 * The micro-enterprise loops seated on this host, and the settlement work board they play on
 * (561 Group notes of 2026-09-30, "Micro-enterprises hold their own work", and 2026-10-01, "Work
 * between micro-enterprises is a concurrent game"). The host lends its clock
 * and its node services (Codex, inference) to every loop seated on it; each loop decides what it
 * takes, keeps its work in its own root and staffs it from its own offices.
 * @packageDocumentation
 */
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setImmediate } from "node:timers/promises";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { workCoordinationOperations } from "@red-cup-engineering/feltos/work/service";
import { workBoardStore } from "@red-cup-engineering/feltos/work/work-board";
import { enterpriseOfficeKeys, seatedEnterprises, staffedByOwnOffices, standingTakingSubjectsOf, turnEnterpriseLoop, workResourcesUnder } from "@red-cup-engineering/feltos/work/enterprise-loop";
import { activeTakingOf, foundByDemand, unheldGroundOf, agendaOf, CLOSED_STANDINGS, crossingBookText, crossingsOf, currentSettings, derivedJudgmentsOf, economyOf, enterpriseBookOf, enterpriseOf, enterpriseRootOf, enterpriseStore, enterpriseWorkSettingsOf, governanceFindingsOf, hasCurrentTakingObligation, seatBriefOf, takingOrderOf, verifierSeatingOf, horizonOf, houseSectionOf, OPENING_MOVES, owesOf, RESPONSE_MOVES, sectionsOf, settingValues, stepOf, takersOf, territoriesOf, threadSummary, workSubjectMatchesThread, partyOf } from "@red-cup-engineering/organizing/enterprise";
import { deedsOf, doersOf, enterpriseRecord, governingRight, incumbentsOf, openSeatsOf, qiangdan, seatingOf } from "@red-cup-engineering/organizing/agency/governing";
import { enactAgencyRecords } from "@red-cup-engineering/organizing/agency/records";
import { firmPoolAuthorityResolver } from "@red-cup-engineering/metroplat/firm-pool-authority";
import { canonicalPlayer, resolve as resolveAgency } from "@red-cup-engineering/organizing/agency";
import { playerOfAct, subjectOf } from "@red-cup-engineering/organizing/agency/cast";
import { agencyAt, bearerTestimonyOf, handedAgency, officeServiceSession, officesOfAccount, seatedAgencyOf, tellSessionHand } from "@red-cup-engineering/metroplat/offices";
import { readAgentWorkDispatchReadout } from "@red-cup-engineering/feltos/work/dispatch-readout";
import { workHomesOf } from "./federated-work.mjs";
import { workBoardSourceLocators } from "./work-board-source-locators.mjs";

const ENTERPRISE_TURN_SECONDS = 120;

/** Derive clock jobs from the actual seated records, never from a second enterprise inventory. */
export function enterpriseLoopSchedules({ agency, host, account }) {
  return Object.freeze(seatedEnterprises(agency, host).flatMap(record => [
    { id: `enterprise-loop-${record.id}`, verb: "enterprise-loop-run" },
    { id: `enterprise-work-${record.id}`, verb: "enterprise-work-run" },
  ].map(job => Object.freeze({ ...job, input: { enterprise: record.id }, account,
    firstDueAt: "1970-01-01T00:00:00Z", everySeconds: ENTERPRISE_TURN_SECONDS, maxAttempts: 1,
  }))));
}

const invoker = (context) => {
  const subject = subjectOf(context);
  if (typeof subject !== "string" || subject.trim() === "" || subject === "anonymous") throw new TypeError("work-board moves require an authenticated invocation");
  return subject;
};

/** A section path (or office key) as the Group's registry spells it, whichever agency root it was read from (`houseSectionOf`). */
const groupSection = (section) => houseSectionOf(section) ?? section;
/** The section an office registry key sits in (`<section>#<office>`). */
const sectionOfOffice = (office) => groupSection(office.split("#")[0]);

/**
 * Whose assay a seated micro-enterprise plays (acceptance is derived, as delivery is): its own, and
 * that of each office it staffs which no other seated enterprise seated deeper over the office's
 * section also staffs, so each office's deliveries are assayed by one loop, the one nearest it. An
 * office no seated enterprise staffs is assayed from its home: the seated enterprise whose territory
 * holds the office's section most deeply (a Board secretariat office by Group operations). An
 * assayer that is neither an office nor an enterprise (a package or a sensor that opened the
 * request) cannot judge, so the enterprise the thread is at home with assays for it: the level
 * that took the work into its territory verifies it.
 */
export function judgesOf(agency, seated, record) {
  const staffing = new Map(seated.map((candidate) => [candidate.id, enterpriseOfficeKeys(agency, candidate)]));
  const depth = (candidate, office) => {
    const own = sectionOfOffice(office);
    const at = groupSection(candidate.sectionPath ?? "");
    return at !== "" && (own === at || own.startsWith(`${at}/`)) ? at.length : -1;
  };
  const judged = new Set([...(staffing.get(record.id) ?? [])].filter((office) => !seated.some((other) => other.id !== record.id
    && staffing.get(other.id).has(office) && depth(other, office) > depth(record, office))));
  const homed = (office) => {
    if (!office.includes("#") || seated.some((candidate) => staffing.get(candidate.id).has(office))) return false;
    const deepest = Math.max(-1, ...seated.map((candidate) => depth(candidate, office)));
    return deepest >= 0 && depth(record, office) === deepest
      && seated.filter((candidate) => depth(candidate, office) === deepest).length === 1;
  };
  const enterprises = new Set([...agency.enterprises.values()].map((candidate) => candidate.id));
  const unjudgeable = (key) => !key.includes("#") && !enterprises.has(key);
  return (assayer, thread) => {
    const key = canonicalPlayer(agency, assayer);
    return key === record.id || judged.has(key) || homed(key) || (unjudgeable(key) && thread?.home === record.id);
  };
}

const boundary = { class: "external", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" };

/** Resolve authority ownership from the unique current taking record, not the thread's territory. */
export function currentTakingOwner(thread, subject, agency) {
  if (thread === undefined || !hasCurrentTakingObligation(thread)) return undefined;
  const identity = (player) => canonicalPlayer(agency, player);
  const owners = [...new Set(takersOf(thread))]
    .filter((player) => activeTakingOf(thread, player, identity).some((entry) => entry.subject === subject))
    .map(identity);
  const unique = [...new Set(owners)];
  if (unique.length > 1) throw new TypeError("work-board officeService taking subject has ambiguous current players");
  return unique[0];
}

/**
 * @param {object} host
 * @param {object} host.binding the host settlement's root binding, where its board lives
 * @param {string} host.host the host name enterprise records seat their loops on
 * @param {string} host.agencyRoot
 * @param {string} host.repositoryRoot
 * @param {string} host.releaseRoot the released tree, where committed derivations are read at the released commit
 * @param {string} host.settlementsRoot
 * @param {() => object|undefined} host.workOptions the host's work options, once MetroPlat opened them
 * @param {() => object[]} host.operations the host's operations, once MetroPlat opened them
 * @param {(opening: object) => Promise<object>} [host.open] the host's opening port (plays, then hands to a peer)
 * @param {(move: object) => object|Promise<object>} [host.tell] the host's response port (plays or hands on a telling, forwards a coordinated move to its thread's home); the enterprise loop plays its responses through it
 */
/** A clock outcome carries the native allocation admission unchanged. The admission
 * contract has no receipt field; synthesizing one makes a successful effect unreturnable. */
export const allocationTurnReadout = allocated => ({ counts: allocated.counts, reasons: allocated.reasons,
        examined: allocated.examined, remaining: allocated.remaining,
        // The work subject and, where staffing is obstructed, what stood in each carrier's way:
        // the loop reads the obstacles it reports on the board from these (work-arena `obstacleMovesOfAllocation`).
        items: allocated.items.map(item => ({ scope: item.scope, state: item.state,
          ...((item.subject ?? item.admission?.subject) === undefined ? {} : { subject: item.subject ?? item.admission.subject }),
          ...(item.state !== "obstructed" || (item.candidates ?? []).length === 0 ? {} : {
            candidates: [{ reasons: [...new Set(item.candidates.flatMap(candidate => candidate.reasons))] }] }),
          // Demand the root holds untaken names its sources, so the loop can find it on the board.
          ...(!(item.reasons ?? []).includes("taking-absent") ? {} : { sources: (item.evidence ?? [])
            .filter(entry => typeof entry === "string" && entry.startsWith("source-url:")).map(entry => entry.slice("source-url:".length)) }),
          ...(item.admission === undefined ? { reasons: item.reasons } : {
            admission: item.admission,
            dispatch: item.dispatch,
          }) })),
  });

export function enterpriseLoopOperations({ binding, host, agencyRoot, repositoryRoot, releaseRoot, settlementsRoot, workOptions, operations: hostOperations, open, tell, executeIsolatedWork }) {
  // Territory is derived from where each micro-enterprise's record sits in the house.
  const territories = () => territoriesOf([...agencyAt(agencyRoot).enterprises.values()]);
  const board = workBoardStore(binding, { territories, agency: () => agencyAt(agencyRoot), homes: workHomesOf(() => agencyAt(agencyRoot)) });
  const played = (input, context, operationVerb) => {
    const account = invoker(context);
    const { as, hand: _hand, officeService, ...move } = input;
    // A response is about what its thread is about; an opening about its own scope.
    const about = OPENING_MOVES.includes(move.move) ? sectionsOf(move) : (() => { try { return sectionsOf(board.find(move.thread)); } catch { return []; } })();
    const agency = agencyAt(agencyRoot);
    if (officeService === undefined) {
      // The session the call came through is the move's hand (organizing agency cast); the account it
      // authenticated as stands for the bearer, and the session is told as that bearer's hand.
      // Who answers for the move is the office the account plays it as, never a session or an account standing in
      // for an office (work arena, third edition): the one reading of the player (organizing agency cast).
      const player = playerOfAct(handedAgency(binding, agency), { invocation: context.invocation, held: officesOfAccount(binding, account, agency), as, sections: about });
      if (player.hand !== account) tellSessionHand(binding, player.hand, player.bearer);
      return { ...move, by: player.by, hand: player.hand };
    }
    if (as !== undefined || officeService === null || typeof officeService !== "object" || Array.isArray(officeService)) {
      throw new TypeError("work-board officeService must be the sole administrative actor selection");
    }
    const fields = ["allocation", "office", "scope", "session", "subject"];
    if (Object.keys(officeService).some((key) => !fields.includes(key))
      || fields.some((key) => typeof officeService[key] !== "string" || officeService[key].trim() === "")) {
      throw new TypeError("work-board officeService requires exact allocation, office, scope, subject, and session");
    }
    let target;
    if (OPENING_MOVES.includes(move.move)) {
      const served = typeof move.serves === "string" ? [move.serves] : move.serves;
      if (!Array.isArray(served) || served.length !== 1) {
        throw new TypeError("work-board officeService opening must serve one current taking of its enterprise");
      }
      target = board.find(served[0]);
    } else {
      target = board.find(move.thread);
    }
    let taking = target;
    if (OPENING_MOVES.includes(move.move)) {
      // A service opening must serve the exact thread whose current enterprise
      // taking this allocation carries. That thread may be an aim, report,
      // proposal, request or question, according to board semantics.
      taking = target;
    } else if (currentTakingOwner(target, officeService.subject, agency) === undefined) {
      // A request opened by the service elsewhere can be followed only through
      // its one exact serving edge back to the same current taking.
      const served = typeof target.opening.serves === "string" ? [target.opening.serves] : target.opening.serves;
      if (target.opening.move !== "request" || !Array.isArray(served) || served.length !== 1) {
        throw new TypeError("work-board officeService follow-up must target its current taking or one request serving it");
      }
      taking = board.find(served[0]);
    }
    if (taking === undefined || !hasCurrentTakingObligation(taking)) {
      throw new TypeError("work-board officeService target is not a current enterprise taking");
    }
    const owner = currentTakingOwner(taking, officeService.subject, agency);
    if (owner === undefined) {
      throw new TypeError("work-board officeService is not the exact current taking for its original subject");
    }
    const enterprises = [...agency.enterprises.values()].filter((candidate) => canonicalPlayer(agency, candidate.id) === owner);
    if (enterprises.length !== 1) throw new TypeError("work-board officeService taking has no unique seated enterprise owner");
    const enterprise = enterprises[0];
    if (!OPENING_MOVES.includes(move.move) && taking.id !== target.id
      && canonicalPlayer(agency, target.opening.by) !== owner) {
      throw new TypeError("work-board officeService follow-up was not opened by the taking's enterprise");
    }
    const authorityBinding = bindingOf(enterprise);
    // Session identity is admitted by the execution node; work entitlement is
    // read below from the taking enterprise's own root. Neither substitutes for
    // the other and no carrier/mask records are copied into enterprise journals.
    const service = officeServiceSession({ ...binding, agencyRoot }, account, officeService.office, officeService.session);
    const date = authorityBinding.now().slice(0, 10);
    const operation = hostOperations?.().find((candidate) => candidate.verb === operationVerb);
    if (operation === undefined || typeof operation.ref !== "string") {
      throw new TypeError(`work-board officeService operation ${operationVerb} is not currently installed`);
    }
    const currentAllocations = readAgentWorkDispatchReadout(authorityBinding, date, account)?.queue.filter((entry) =>
      entry.agent === account && entry.delegation?.provider === account
      && entry.allocation === officeService.allocation
      && entry.scope === officeService.scope && entry.subject === officeService.subject
      && resolveAgency(agency, "offices", entry.office)?.key === service.officeKey
      && entry.state === "in-flight"
      && (entry.assignment === undefined || entry.assignment.state === "started"
        && entry.assignment.workerThread === officeService.session)
      && entry.execution?.state === "started" && entry.execution.session === officeService.session
      && typeof entry.execution.receipt === "string" && entry.execution.receipt.length > 0
      && entry.allocatedModel === service.model
      && Array.isArray(entry.requiresCapabilities)
      && entry.requiresCapabilities.every((capability) => service.capabilities?.includes(capability))
      && entry.delegation.operations?.includes(operation.ref));
    if (!service.verbs.includes(operationVerb) || currentAllocations?.length !== 1) {
      throw new TypeError("work-board officeService is not the exact current in-flight qualified allocation, execution, session, office, subject, scope, and verb");
    }
    const office = resolveAgency(agency, "offices", service.office);
    if (office === undefined || !enterpriseOfficeKeys(agency, enterprise).has(office.key)) {
      throw new TypeError("work-board officeService is not staffed by the original taking enterprise");
    }
    // The service worker's qualified office authorizes the bounded act; the board
    // continues to record the enterprise that owns the taking as its player, played
    // through the worker's admitted session (its hand, told by the execution node).
    return { ...move, by: owner, hand: `session:${officeService.session}` };
  };
  const opened = open ?? (async (opening) => board.play(opening));
  const told = tell ?? ((move) => board.play(move));
  const bindingOf = (record) => {
    const root = enterpriseRootOf(record, { settlementsRoot, repositoryRoot });
    return root === binding.dataRoot ? binding : defaultFilesystemBinding(root, { repositoryRoot });
  };
  // Each enterprise's calibrations are the points it holds on its grey bands, read from its own
  // dated setting records (organizing/enterprise/settings), never fixed in the loop.
  const enterpriseRecords = () => [...agencyAt(agencyRoot).enterprises.values()];
  const records = enterpriseStore(binding, { roots: Object.freeze({
    ids: () => enterpriseRecords().map((record) => record.id),
    rootOf: (id) => enterpriseRootOf(enterpriseRecords().find((record) => record.id === id), { settlementsRoot, repositoryRoot }),
  }) });
  const settingsOf = (record) => settingValues(enterpriseOf(record), records.read("setting", { enterprise: record.id }));
  // A node micro-enterprise's loop turns its own service: the operations its record names, which
  // keep their state in its own root (the codex node starts its queued tasks this way). Each is
  // given the node's calibrations, its own points (`enterpriseWorkSettingsOf`), to staff by.
  const serviceOf = async (record) => {
    const enterprise = enterpriseOf(record);
    if (enterprise.turns.length === 0) return undefined;
    const calibrated = enterpriseWorkSettingsOf(enterprise, settingsOf(record));
    const served = hostOperations?.() ?? [];
    const turned = {};
    for (const verb of enterprise.turns) {
      await setImmediate();
      const found = served.find((candidate) => candidate.verb === verb);
      if (found === undefined) throw new TypeError(`${record.id} turns ${verb}, which this host does not serve`);
      turned[verb] = await found.execute({ ...calibrated }, {}, undefined);
    }
    return Object.freeze(turned);
  };
  // A committed derivation is read at the released commit; a measurement only the node can take is
  // an operation it serves, run for the enterprise that posts what it derives.
  const derivationOf = (record) => async (source) => {
    if (source.path !== undefined) return JSON.parse(readFileSync(resolve(releaseRoot, source.path), "utf8"));
    const found = (hostOperations?.() ?? []).find((candidate) => candidate.verb === source.operation);
    if (found === undefined) throw new TypeError(`${record.id} derives from ${source.operation}, which this host does not serve`);
    return found.execute({ poster: record.id }, {}, undefined);
  };
  // Every enterprise runs allocation and execution in its own root, staffed
  // only from its own offices, including an enterprise holding the host root.
  const workOf = async (record, own, phase, turn = Math.floor(Date.parse(binding.now()) / (ENTERPRISE_TURN_SECONDS * 1000))) => {
    const installedWork = workOptions();
    const realm = installedWork?.resolveWorkRealm?.(record.id);
    if (realm !== undefined && realm.binding.dataRoot !== own.dataRoot) throw new TypeError("enterprise work: intake and execution must use the same owning settlement");
    const hosted = realm?.options ?? installedWork;
    if (hosted === undefined) return undefined;
    const { admitWorkIntent: _intake, demandAssessment: _hostAssessment, readAllocationAuthorities, resolveAgencyWorkAuthority, ...shared } = hosted;
    const { orderChannels } = enterpriseWorkSettingsOf(enterpriseOf(record), settingsOf(record));
    const operations = workCoordinationOperations(own, {
      ...shared,
      knowledgeBinding: binding,
      // How many carriers missing a responsibility make the miss its order's is its own
      // `order-channels` point (organizing/enterprise), read once a pass, never fixed in staffing.
      ...(shared.resolveAllocationStaffing === undefined ? {} : {
        resolveAllocationStaffing: (input) => shared.resolveAllocationStaffing({ ...input, orderChannels }) }),
      // Its own assessing duty, staffed through the same qualified carrier selection.
      demandAssessment: record.assesses,
      // It assesses only demand its standing takings hold (allocation `taking-absent`).
      readStandingTakings: () => standingTakingSubjectsOf(board.read(), record.id, (player) => canonicalPlayer(agencyAt(agencyRoot), player)),
      readAllocationAuthorities: staffedByOwnOffices(readAllocationAuthorities, enterpriseOfficeKeys(agencyAt(agencyRoot), record)),
      resolveAgencyWorkAuthority: resolveAgencyWorkAuthority ?? ((allocation) => firmPoolAuthorityResolver({ firmPoolRoot: agencyRoot }, own)(allocation)),
    });
    const run = async (verb, input) => {
      await setImmediate();
      return operations.find((candidate) => candidate.verb === verb).execute(input, {}, undefined);
    };
    const allocated = phase === "intake" ? await run("agency-work-allocation-reconcile", {}) : undefined;
    const pumped = phase === "execution" ? await run("agency-work-pump", {}) : undefined;
    // Clock outcomes name the effects and their native receipts. Full candidate
    // qualifications and producer results remain at their own read boundaries.
    return Object.freeze({
      ...(allocated === undefined ? {} : { allocation: allocationTurnReadout(allocated) }),
      ...(pumped === undefined ? {} : { pump: { at: pumped.at, skipped: pumped.skipped,
        ran: pumped.ran.map(item => ({ provider: item.provider, actor: item.actor, scope: item.scope,
          ...(item.proposal === undefined ? {} : { proposal: { execution: item.proposal.execution, receipt: item.proposal.receipt } }),
          ...(item.receiving === undefined ? {} : { receiving: { receipt: item.receiving.receipt, task: item.receiving.task } }),
        })),
      } }),
    });
  };
  const executeOf = async (record, own) => {
    const service = await serviceOf(record);
    const work = await workOf(record, own, "execution");
    return service === undefined && work === undefined ? undefined : Object.freeze({ ...work, ...(service === undefined ? {} : { service }) });
  };

  // A micro-enterprise's book is a projection of the crossings it is party to on the board,
  // rewritten whole by its own turn and never edited (organizing/enterprise/crossings).
  // What a crossing consumed is read from its provider's own root: the resources its work-result
  // proposals under the crossing's subject witnessed (organizing/enterprise/resources).
  const costOf = () => workOptions()?.crossingCostOf;
  const consumedOf = () => {
    const records = new Map([...agencyAt(agencyRoot).enterprises.values()].map((record) => [record.id, record]));
    return (crossing) => {
      const record = crossing.subject === undefined ? undefined : records.get(crossing.provider.enterprise);
      return record === undefined ? undefined : workResourcesUnder(bindingOf(record), crossing.subject);
    };
  };
  // The models that carried a delivery, read from its provider's own root as a crossing's
  // consumption is: what the work-result proposals under the provider's taking of the thread
  // witnessed consuming. Allocation never staffs the delivery's assay with any of them.
  const carriersOfDeliveryOf = () => {
    const records = new Map([...agencyAt(agencyRoot).enterprises.values()].map((record) => [record.id, record]));
    const held = territories();
    return (thread, delivery) => {
      const record = records.get(partyOf(delivery.player, held).enterprise);
      const taking = [...thread.promisers, ...(thread.releases ?? [])].filter((entry) => entry.player === delivery.player && entry.subject !== undefined).at(-1);
      if (record === undefined || taking === undefined) return [];
      try { return [...new Set(workResourcesUnder(bindingOf(record), taking.subject).map((resource) => resource.carrier).filter((carrier) => typeof carrier === "string" && carrier !== ""))]; }
      catch { return []; }
    };
  };
  // The Group's crossings are one projection per turn, shared by every enterprise's book that
  // turn; each enterprise's turn re-deriving them all re-scanned every provider root once per seat.
  let crossingsHeld;
  const crossingsAt = (turn, at) => {
    if (crossingsHeld?.turn !== turn) crossingsHeld = { turn, crossings: crossingsOf(board.read(at), { territories: territories(), costOf: costOf(), consumedOf: consumedOf() }) };
    return crossingsHeld.crossings;
  };
  const projectBook = (record, at, turn) => {
    const crossings = crossingsAt(turn, at);
    const text = crossingBookText(record.id, crossings);
    const path = enterpriseBookOf(record, { settlementsRoot, repositoryRoot });
    let held;
    try { held = readFileSync(path, "utf8"); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    if (held !== text) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(`${path}.tmp`, text);
      renameSync(`${path}.tmp`, path);
    }
    const own = crossings.filter((crossing) => crossing.provider.enterprise === record.id || crossing.requester.enterprise === record.id);
    return Object.freeze({ path, rewritten: held !== text, crossings: own.length, settled: own.filter((crossing) => crossing.stage === "settled").length });
  };

  // The enterprise's own governing, each turn (organizing/agency governing): nobody owns it, so nothing
  // waits on a seat. Who did its work is read off the board (deeds), which seats them in the offices they
  // played as and makes them its doers; each grey-band point that is due is judged by the turn itself on
  // its measured flow (settings `derivedJudgmentsOf`), played as the enterprise, until a doer chooses
  // otherwise; and a commitment made ahead of any deed for a seat no one is in is recognized by qiangdan.
  const judgeOf = (record, enterprise, read, at) => {
    const own = enterpriseOf(record);
    const current = currentSettings(own, records.read("setting", { enterprise: record.id }), { now: Date.parse(at) });
    if (!current.some((setting) => setting.due)) return [];
    const windowDays = current.find((setting) => setting.axis === "flow-window")?.value ?? 14;
    const since = Date.parse(at) - windowDays * 86_400_000;
    const home = read.threads.filter((thread) => thread.home === record.id);
    const open = home.filter((thread) => !CLOSED_STANDINGS.includes(thread.standing) && thread.standing !== "delivered");
    const held = open.filter((thread) => thread.holders.length + thread.promisers.length > 0).length;
    const order = takingOrderOf(own, read, { territories: territories(), at, settings: settingValues(own, records.read("setting", { enterprise: record.id })) });
    const flow = { windowDays, delivered: home.filter((thread) => thread.deliveries.some((delivery) => Date.parse(delivery.at) >= since)).length, open: open.length, held, unheld: open.length - held, capacity: order.capacity, limit: order.limit };
    return derivedJudgmentsOf(own, current, flow, { at }).map((judgment) => {
      records.setting({ ...judgment, player: playerOfAct(undefined, { player: { by: record.id, bearer: record.id, hand: `${host}:enterprise-loop` } }) });
      return Object.freeze({ axis: judgment.axis, value: judgment.value, revisitBy: judgment.revisitBy });
    });
  };
  // Demand founds, by act (organizing/enterprise founding): a verifier refusal at home with the enterprise,
  // or unhomed ground that names the colour it asks for, obliges its own turn to found the missing office
  // by its decision right (`governingRight` rule `demand`), recorded on the act chain with the demand's
  // threads as evidence and the turn as its player. It never seats: the seat fills by deed or qiangdan.
  const foundOf = (record, read, at) => foundByDemand({
    root: agencyRoot, read: () => agencyAt(agencyRoot), enterprise: record.id, board: read,
    ground: unheldGroundOf(read, territories()).get(record.id) ?? [],
    player: playerOfAct(undefined, { player: { by: record.id, bearer: record.id, hand: `${host}:enterprise-loop` } }), at,
  });
  const governOf = (record, at) => {
    let agency = agencyAt(agencyRoot);
    let enterprise = enterpriseRecord(agency, record.id);
    const read = board.read(at);
    // Hands told at runtime (a session is its character's hand) and seats claimed at runtime count.
    const seatedAgency = seatedAgencyOf({ ...binding, agencyRoot }, agency);
    const deeds = deedsOf(seatedAgency, enterprise, read, { at });
    const doers = doersOf(seatedAgency, enterprise, { deeds });
    const byDeed = incumbentsOf(seatedAgency, enterprise, { deeds }).filter((office) => office.seated.length > 0).map((office) => ({ office: office.key, seated: office.seated }));
    let judged;
    try { judged = judgeOf(record, enterprise, read, at); } catch (error) { judged = { refused: error instanceof Error ? error.message : String(error) }; }
    let founded;
    try { founded = foundOf(record, read, at); } catch (error) { founded = { refused: error instanceof Error ? error.message : String(error) }; }
    if (founded.length > 0) { agency = agencyAt(agencyRoot); enterprise = enterpriseRecord(agency, record.id); }
    const open = openSeatsOf(agency, enterprise, { deeds });
    const bids = open.length === 0 ? [] : records.read("bid", { enterprise: record.id });
    const said = { doers, seats: byDeed, judged, founded };
    if (bids.length === 0) return Object.freeze({ ...said, open: open.length, seated: [], refused: [] });
    const testimony = bearerTestimonyOf(binding);
    const seated = [];
    const refused = [];
    for (const office of open) {
      const read = qiangdan(agency, enterprise, office.key, { bids, testimony, deeds });
      if (read.winner === undefined) {
        if (read.bids.length > 0) refused.push({ office: office.key, bids: read.bids.map((entry) => ({ bearer: entry.bearer, reasons: entry.reasons })) });
        continue;
      }
      try {
        enactAgencyRecords({
          root: agencyRoot, entries: [seatingOf(agency, enterprise, office.key, read.winner, { at })],
          act: { kind: "enterprise-seat", enterprise: record.id, rule: "qiangdan", player: playerOfAct(undefined, { player: { by: record.id, bearer: record.id, hand: `${host}:enterprise-loop` } }),
            evidence: [`bid:${read.winner.bid.by}@${read.winner.bid.recordedAt}`], at },
          authorize: ({ agency: before, pool, source, existing, record: next }) => {
            const held = governingRight(before, enterpriseRecord(before, record.id), { pool, source, record: next, existing }, { rule: "qiangdan" });
            return `${held.right}:${held.enterprise}`;
          },
        });
        seated.push({ office: office.key, holder: read.winner.bearer });
      } catch (error) {
        refused.push({ office: office.key, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return Object.freeze({ ...said, open: open.length, seated, refused });
  };

  const recordOf = (input) => {
    if (typeof input?.enterprise !== "string") throw new TypeError("enterprise clock attempt requires an enterprise id");
    const record = seatedEnterprises(agencyAt(agencyRoot), host).find(record => record.id === input.enterprise);
    if (record === undefined) throw new TypeError(`${input.enterprise} is not seated on ${host}`);
    return record;
  };

  return Object.freeze([
    operation({
      verb: "enterprise-loop-run",
      inputFormat: "json", outputFormat: "json",
      summary: "Take and allocate one seated micro-enterprise's work.",
      description: "Domain: { enterprise: id }. The named enterprise must be seated on this host. It maintains its derived openings, takes threads under its own policy into its own root, then allocates from its own offices, and rewrites its own book from the crossings it is party to (a projection: settled crossings double-booked on pairwise credit lines). Each enterprise has independent intake and execution clock attempts, so running work does not prevent new intake. A refused thread does not suppress other intake or allocation.",
      relation: "boundary",
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: async (input, arguments_, context) => {
        if (executeIsolatedWork !== undefined && context?.kind === "metroplat.rpc.execution-context") {
          return executeIsolatedWork({ operation: "enterprise-loop-run", input, arguments: arguments_, context });
        }
        const record = recordOf(input);
        const agency = agencyAt(agencyRoot);
        const turn = Math.floor(Date.parse(binding.now()) / (ENTERPRISE_TURN_SECONDS * 1000));
        const turned = await turnEnterpriseLoop({ board, play: told, record, bindingOf, allocateOf: (record, own) => workOf(record, own, "intake"), at: binding.now(),
          judges: judgesOf(agency, seatedEnterprises(agency, host), record),
          // Who verifies a delivery is read off the offices' `verifies` roles (organizing verifierOfficesOf), never listed on the enterprise's record.
          verifiersOf: (producer) => verifierSeatingOf(agency, { enterprise: record.id, producer }),
          playerIdentity: (player) => canonicalPlayer(agencyAt(agencyRoot), player),
          resolveOfficeSession: (character, office, session) => officeServiceSession(binding, character, office, session),
          knowledgeBinding: binding,
          turn, territories: territories(), settings: settingsOf(record),
          readDerivation: derivationOf(record), carriersOfDelivery: carriersOfDeliveryOf() });
        return Object.freeze({ ...turned, governed: governOf(record, binding.now()), book: projectBook(record, binding.now(), turn) });
      },
    }),
    operation({
      verb: "enterprise-work-run",
      inputFormat: "json", outputFormat: "json",
      summary: "Run one seated micro-enterprise's service and allocated work.",
      description: "Domain: { enterprise: id }. Turns the named enterprise's own services, receives pending proposals and executes allocated duties in its own root. Its independent native clock reservation prevents overlapping attempts; other enterprises and this enterprise's intake continue while it works. Returns scopes and native receipts, with provider and authority refusals explicit.",
      relation: "boundary",
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: async (input, arguments_, context) => {
        if (executeIsolatedWork !== undefined && context?.kind === "metroplat.rpc.execution-context") {
          return executeIsolatedWork({ operation: "enterprise-work-run", input, arguments: arguments_, context });
        }
        const record = recordOf(input);
        const own = bindingOf(record);
        return Object.freeze({ kind: "feltos.work.enterprise-execution-turn", at: binding.now(),
          enterprise: record.id, root: own.dataRoot, executed: await executeOf(record, own) });
      },
    }),
    operation({
      verb: "seat-brief",
      inputFormat: "json", outputFormat: "json",
      summary: "Your seat brief, read off the registry and the work board: the offices you hold, each one's charge, the work awaiting its move, the aims that work serves and how it is judged.",
      description: "Domain: { account?, hand?, whole?, limit?: positive integer (default: all) }. The account (by default the caller) is read as the bearer it is a hand of, its character; the work is narrowed to the hand's own lane (by default the caller's hand: the threads it held, promised or adopted, and those serving them) unless whole is true. Returns { kind: organizing.enterprise.seat-brief, bearer, name, seats: [{ office, name, section, reportsTo, authorityScope, duties, skills, receivesFrom, assignsTo, enterprises, work: [{ thread, move, step, owes, roles, horizon, gist, opener, assayer, aims, doneWhen }] }], text }: what a session of that character is for, derived rather than written, the same for every session of it.",
      relation: "projection",
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" },
      run: (input, _args, context) => {
        const account = input?.account ?? invoker(context);
        // Without a caller-accounted limit the brief lists every piece of work awaiting a move.
        const limit = input?.limit ?? Infinity;
        if (limit !== Infinity && (!Number.isInteger(limit) || limit < 1)) throw new TypeError("seat-brief limit is a positive integer");
        const bearer = playerOfAct(handedAgency(binding), { invocation: { subject: account } })?.bearer ?? account;
        // A session reads its own lane: the caller's hand, unless another account's brief is asked for.
        const hand = input?.hand ?? (input?.account === undefined ? context?.invocation?.caller?.hand : undefined);
        return seatBriefOf(seatedAgencyOf({ ...binding, agencyRoot }), board.read(binding.now()), bearer, { limit, ...(hand === undefined || input?.whole === true ? {} : { hand }) });
      },
    }),
    operation({
      verb: "governance-findings",
      inputFormat: "json", outputFormat: "json",
      summary: "What the board and each seated micro-enterprise's settings find against the two governance laws, as a derivation by poster.",
      description: "Domain: { poster }. One report per seated enterprise per law it does not keep: its grey bands are held judgments (each arena axis carries a point it chose, by its own turn on its measured flow or by one who does its work, with a date to revisit it), and it holds its own ground (no open thread standing over its territory owes the market). Each report's subject is enterprise:<id>, so it is at home with that enterprise even when the poster is that enterprise. Returns { kind: enterprise-governance-findings.v1, poster, domain: { laws }, evidence, openings: [{ enterprise, law, opening }] }. An enterprise derives from it by naming { operation: \"governance-findings\" } among its derives.",
      relation: "projection",
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" },
      run: (input) => {
        const at = binding.now();
        const agency = agencyAt(agencyRoot);
        const enterprises = seatedEnterprises(agency, host).map((record) => ({
          id: record.id, sectionPath: groupSection(record.sectionPath),
          settings: currentSettings(enterpriseOf(record), records.read("setting", { enterprise: record.id }), { now: Date.parse(at) }),
        }));
        return governanceFindingsOf({ poster: input?.poster, board: board.read(at), enterprises, territories: territories(), at });
      },
    }),
    operation({
      verb: "work-board",
      inputFormat: "json", outputFormat: "json",
      summary: "Read this settlement's work board: its aims, requests, proposals, reports, questions and declarations.",
      description: "Domain: { kind?: aim|request|propose|report|ask|declare, standing?: string, step?: string, open?: boolean, ready?: boolean, owes?: player|market, agenda?: player|market, horizon?: now|soon|later|eventually, by?: player, home?: enterprise, tag?: string, law?: string, subject?: string, serves?: thread, source?: locator (up to 4096 characters), sources?: locator[1..200] (each up to 4096 characters), thread?: id, full?: boolean, limit?: 1..200 (default 50), after?: id }. subject matches the opening's subject or a current taking's canonical admitted work subject; source matches one exact cited locator; sources matches any of its 1..200 exact locators for one bounded selection; source and sources combine by union. owes=<player> keeps the threads awaiting that player's move (owes=market: work at home nowhere, which no micro-enterprise is seated for); horizon reads each thread's modality (now: committed and unblocked; soon: necessary; later: possible; eventually: cannot proceed as it stands), derived, never stated. step=<step> keeps threads at that derived protocol step (request: unrefined, refined, promised, obstructed, delivered, declined; report: open, obstacle, adopted; propose: open, adopted; aim: open, held; ask: open, answered). agenda=<player> is that player's agenda: the threads whose protocol step awaits a move of its (as opener, assayer, addressee, taker or home), nearest horizon first and oldest first within one. A listing returns one summary per thread (its gist, standing, horizon, whose move it owes, opener, tags, addressee or award, home territory, what it serves and comes after, what still blocks it, how many requirements and conditions its contract states and which must-requirements no condition verifies, the moves it awaits from whoever owes it (awaits: refine, promise, deliver, accept, adopt, resolve, answer, hold, …), what it still lacks to be worked (gaps: no-requirements, no-conditions, unverified:<id>, ambiguous:<id>, unscoped), how many of its requirements are allocated to requests serving it, offer, holders/promisers/adopters/answerers, counter-offers, corroborations, children), oldest first, with next to page after; thread=<id> returns that thread whole (an id the board has never held is refused as not found), and full: true returns whole threads in the listing. serves=<id> lists the threads serving that request or aim (its decomposition). ready: true keeps threads nothing unsettled holds back and, for requests, whose contract is refined and whose must-requirements use no unverifiable term. A whole thread is its opening, standing (aim: open, held, withdrawn, superseded; request: open, declined, promised, delivered, accepted, withdrawn, superseded; propose: open, adopted, ...; report: open, adopted, resolved, ...; ask: open, answered, accepted, ...; declare: in-force, withdrawn, superseded), holders and those who left, promisers and the work subject each holds it under, refinements, counter-offers, deliveries and their verdicts, adoptions, corroborations, answers, and a request's operative contract and current offer. open: true keeps only threads not yet closed. Moves stored but illegal on replay do not count: a listing counts them under refused, and a thread read lists its own.",
      run: (input) => {
        const sourceLocators = workBoardSourceLocators(input);
        const read = board.read(binding.now(), input?.thread === undefined && sourceLocators !== undefined && sourceLocators.length <= 200
          ? { sources: sourceLocators }
          : {});
        if (input?.thread !== undefined && !read.threads.some((thread) => thread.id === input.thread)) throw new TypeError(`no thread ${input.thread} on this board`);
        const agency = agencyAt(agencyRoot);
        const agenda = input?.agenda === undefined ? undefined
          : new Map(agendaOf(read, input.agenda, { playerIdentity: (player) => canonicalPlayer(agency, player) }).map((entry, rank) => [entry.id, rank]));
        const threads = read.threads.filter((thread) =>
          (input?.kind === undefined || thread.opening.move === input.kind)
          && (input?.standing === undefined || thread.standing === input.standing)
          && (input?.step === undefined || stepOf(thread) === input.step)
          && (agenda === undefined || agenda.has(thread.id))
          && (input?.open !== true || !CLOSED_STANDINGS.includes(thread.standing))
          && (input?.ready === undefined || thread.ready === input.ready)
          && (input?.owes === undefined || (owesOf(thread) ?? []).includes(input.owes))
          && (input?.horizon === undefined || horizonOf(thread) === input.horizon)
          && (input?.by === undefined || canonicalPlayer(agency, thread.opening.by) === canonicalPlayer(agency, input.by))
          && (input?.home === undefined || thread.home === input.home)
          && (input?.tag === undefined || (thread.opening.tags ?? []).includes(input.tag))
          && (input?.law === undefined || thread.opening.law === input.law)
          && (input?.subject === undefined || workSubjectMatchesThread(thread, input.subject))
          && (input?.serves === undefined || (thread.opening.serves ?? []).includes(input.serves))
          && (sourceLocators === undefined || (thread.opening.sources ?? []).some((source) => sourceLocators.includes(source.locator)))
          && (input?.thread === undefined || thread.id === input.thread));
        if (agenda !== undefined) threads.sort((a, b) => agenda.get(a.id) - agenda.get(b.id));
        const listing = { kind: "feltos.work.work-board", at: binding.now(), position: read.position, matched: threads.length };
        if (input?.thread !== undefined) return Object.freeze({ ...listing, threads, refused: read.refused.filter((refusal) => refusal.move.thread === input.thread || refusal.move.id === input.thread) });
        const limit = input?.limit ?? 50;
        if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new TypeError("work-board limit is an integer from 1 to 200");
        const start = input?.after === undefined ? 0 : threads.findIndex((thread) => thread.id === input.after) + 1;
        if (start === 0 && input?.after !== undefined) throw new TypeError(`no thread ${input.after} in this listing to page after`);
        const page = threads.slice(start, start + limit);
        return Object.freeze({
          ...listing,
          threads: input?.full === true ? page : page.map(threadSummary),
          ...(start + limit < threads.length ? { next: page.at(-1).id } : {}),
          refused: read.refused.length,
        });
      },
    }),
    operation({
      verb: "economy-readout",
      inputFormat: "json", outputFormat: "json",
      summary: "Read the economy the work board carries: crossings by stage, flows between micro-enterprises, positions, tally credit, the market and what keeps the books from gluing.",
      description: "Domain: { enterprise?: id, windowDays?: 1..365 (default 30) }. A crossing is one request taken up by one provider. Its stage is reconciled, never stated: the provider's delivery and the assayer's verdict on it are the two halves of a split tally, whose status is the stage: settled (the halves agree: double-booked in both micro-enterprises' books under the halves' content digest), claimed (one half held: delivered, awaiting its assayer), disputed (the halves disagree: rejected while the provider stands by its delivery, held through the thread's closing). With no half, a held promise on an open thread is committed (backlog, disclosed but not booked), anything else lapsed. Each crossing carries its Δ, σ and tally readings in FOUR. Values are exact decimal text by currency: between members of one entity at the provider's witnessed cost, else the offer; at the border at the offer; a value nobody witnessed is counted as unknown, never zero. Returns totals by stage; flows by provider and requester with each pair's tally credit (the limit earned by matched tallies, closed by a stale claim); each micro-enterprise's provided and requested crossings, own work, counterparties, and the resources its work consumed (sunk: on crossings that lapsed); the resources consumed in all and sunk, as witnessed quantities apart from any price; the census of tally readings; multilateral netting of the members' settled credit lines (gross, net and clearable by currency, each member's net position, and the independent cycles netting clears: the obligation graph's first cohomology); open requests carrying offers (the market); and obstructions (stale claims, disputes, unvalued settlements, priced-nowhere consumption, unseated providers), each naming whose move it owes. Balances are the books' own reading: ledger-readings consolidates the entity's holdings book with these member books. enterprise=<id> keeps the flows and positions it is party to.",
      relation: "projection",
      effects: { class: "host-read", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "schema-bounded" },
      run: (input) => {
        const windowDays = input?.windowDays ?? 30;
        if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) throw new TypeError("economy-readout windowDays is an integer from 1 to 365");
        const at = binding.now();
        const economy = economyOf(board.read(at), { at, territories: territories(), costOf: costOf(), consumedOf: consumedOf(), windowDays });
        const party = input?.enterprise;
        if (party === undefined) return economy;
        return Object.freeze({
          ...economy,
          flows: economy.flows.filter((flow) => flow.provider === party || flow.requester === party),
          enterprises: economy.enterprises.filter((enterprise) => enterprise.id === party),
          market: economy.market.filter((bounty) => bounty.home === party),
          obstructions: economy.obstructions.filter((obstruction) => obstruction.owes === party || obstruction.crossing.endsWith(`#${party}`)),
        });
      },
    }),
    operation({
      verb: "work-open",
      inputFormat: "json", outputFormat: "json",
      summary: "Open a thread on the work board: an aim, a request, a proposal, a report, a question or a declaration.",
      description: `Domain: one opening move, played as the office you hold (as?: office registry key; an account holding one office plays as it; one holding several names it with as, or plays as the office seated deepest over the move's section: scope, and is refused when that does not decide; an account holding no office plays in its own name as an outside party; your account is recorded as the move's hand). A bounded allocated office service instead supplies officeService: { allocation, office, scope, subject, session } from its exact current delegated execution; the subject is the original canonical work subject, while scope is its distinct allocation scope. The exact current in-flight execution receipt, session/model carrier, authored office method and verb must match; if a separate assignment exists, its worker must match that execution session. For an opening, serve one current enterprise taking whose thread and canonical work subject match the exact allocation. The board records that original enterprise as the serving opening's player; the request's own scope still determines its home, which can be a different provider enterprise. This is service authority, not appointment, and officeService is stripped before the move is recorded. { move: "aim", purpose, user?, measures?: [{ id?, says, assay?, unit?, better?: more|less }], scope? } states a purpose that never finishes: a chain group's one contract to its user, the outside party whose outcome it is, a typed subject (market:causeway-readers, client:<name>); a measure with a unit can carry a wager's target. An aim naming no user or no measure with a unit is unframed: nothing can be wagered on it and its opener owes restating it (supersede). Micro-enterprises grab an aim by wagering on it and open requests serving it. { move: "request", need, user?, requirements?: [{ id?, says, class?: functional|quality|constraint|interface, priority?: must|should|could|wont, rationale?, kind? } | string], conditions?: [{ id?, says, verifies?: requirement ids, method?: test|analysis|inspection|demonstration, assay?: { operation, request, acceptance } } | string], scope?: work subjects (section:<path> names the part of the house it is about, which derives its home), to?: enterprise, assayer?, offer?: { amount, perDay?, ceiling?, currency? }, plan?: structured work intent } asks for a state of affairs. The need is the goal: one statement (at most 400 characters) of the state of the world that holds once it is met ("Client ledgers stay consistent under concurrent writers"), never the activity that reaches it ("Implement …", "Plan …", "Assay …": choosing the means is the taker's), never hands to do it (a need for staff, a carrier or a slot is refused: say what stands in the way as an obstacle report), and never that a request or work item be made. Each requirement is one conforming "shall" statement (at most 400 characters): exactly one shall, its subject before it and its response after it, in an EARS template (The <subject> shall <response>; When <trigger>, the <subject> shall …; While <state>, …; If <unwanted condition>, then …; Where <feature>, …), so two responses are two requirements; a requirement allocated from a request or aim this one serves names it in traces: ["<thread>#<requirement or measure id>"]. Conditions of satisfaction are what the assayer reads to accept; it is refined when every must-requirement is verified by some condition (a condition without verifies answers for all). Its horizon is read from it (its priorities, readiness and who is committed), never stated; a rationale on each requirement is what lets a taker weigh it. Delivery is played by the taker's own loop when the work it admitted the request as settles; you do not deliver by hand what a micro-enterprise promised. { move: "propose", idea, rationale?, addresses?: thread ids, serves?: aim or request ids, scope? } takes a position on an issue (IBIS): it names the question, report, request or proposal it answers (addresses) or the aim or request it advances (serves), at least one; others argue for or against it and its addressee adopts it; it obliges nobody. { move: "declare", ruling, rationale?, scope? } makes a ruling within your own authority (a leader's decision, an architecture decision, a policy): it is neither work nor a finding, nobody takes it up, and it stands in force until you withdraw it or supersede it; work waiting on it comes after it. { move: "report", observation, law?, subject?, evidence?, obstacle?: capacity|capability|information|authority|dependency|resource|conflict, obstructs?: ["<request or aim>" | "<thread>#<requirement or measure id>"], scope? } asserts a condition (friction, an incident, a broken law); it is not a request. A report with obstacle and obstructs is an obstacle (KAOS): what stands between a goal and its satisfaction. Capacity and capability are a taker's own (nobody free, nobody able) and leave the thread open to others; information, authority, dependency, resource and conflict hold the thread back (step obstructed) until the obstacle is resolved. A report naming its law and subject is that condition's one thread: reporting it again corroborates it, and reopens it if resolved. { move: "ask", question, scope?, to? } asks a question. A purpose, idea or question is one statement of at most 400 characters, and an observation or ruling at most 800; background, history and links go in context (at most 4000 characters) and documents in sources. Scope subjects are typed, <kind>:<value>, a house section spelled section:services/<path from the agency root>; tags are lowercase topic slugs and never name a section (a section is scope). Any opening may carry context, tags, serves (the requests or aims it is part of: decompose work by opening requests that serve it, never by writing parents and children into prose), after (threads that must settle before it is ready), supersedes (your own earlier threads it replaces: a correction or revision is a new opening that supersedes, never a second demand) and relates. Never name who or which model does the work: a move carrying model, provider, scale, effort, carrier, harness or assignee, or a need, idea, purpose, requirement, condition, measure, context or plan handing the work to a named model or a class of one ("a free model", "a frontier agent"), is refused; the micro-enterprise that takes it derives its own staffing, and which micro-enterprise takes it is derived from its policy and territory. The same content opened again is the same thread.`,
      relation: "boundary", effects: boundary,
      run: (input, _args, context) => {
        if (!OPENING_MOVES.includes(input?.move)) throw new TypeError(`work-open: move is one of ${OPENING_MOVES.join(", ")}`);
        return opened(played(input, context, "work-open"));
      },
    }),
    operation({
      verb: "work-move",
      inputFormat: "json", outputFormat: "json",
      summary: "Play a move on a work-board thread as the office you hold.",
      description: `Domain: { thread, move, as?: office, officeService?: { allocation, office, scope, subject, session }, ... }. An allocated office service supplies the exact envelope from its current delegated execution; subject is the original canonical work subject, distinct from allocation scope. The current allocation, in-flight execution receipt, session/model carrier, authored office method and verb must match; if a separate assignment exists, its worker must match that execution session. It is anchored to one exact current enterprise taking of the allocated original subject, regardless of supported thread kind or who originally opened it. For work-open, the sole serves edge must lead directly to that taking. For work-move, the target may itself be that taking; otherwise only a request opened by the taking's original enterprise with one serves edge back to that taking is eligible. The request's home may be a different provider enterprise. The board preserves the original enterprise as player and the worker as hand, then enforces the move's ordinary legality. This is service authority, not appointment. Otherwise the move is played as the office you hold (name it with as when your account holds several, else the office seated deepest over the thread's section scope is derived, and the move is refused when that does not decide). On an aim: wager { measure, target, until, benchmark: { of, value, evidence }, stake: { upside, downside } } (grab it: a target on a measure with a unit, running until until, no worse than the benchmark, the best comparable performance of an operator outside the house told on evidence, never the house's own past; the stake binds both ways, each side in (0, 1], a share of the margin above target when met and a forfeit when missed; a running wager is not renegotiated, and two consecutive misses forfeit the aim to other bidders), observe { measure, value, observed?, evidence } (anyone: a measure's value read on evidence; wagers are read from observations), hold { subject? } (make it your own without a wager, which then owes one), attach { subject } only to your same player's current standing subjectless hold, leave { reason? } (withdraw your engagement; the relation stays on record), withdraw { reason? } (its opener). On a request: promise { subject? } (any player, or only its addressee or awardee; a promise with a subject is delivered by its promiser's loop when that work settles), attach { subject } only to your same player's current standing subjectless promise; a delivered request awaiting assay belongs to its assayer and cannot be reattached, while a rejected delivery may be worked again, decline { reason } (its addressee), refine { requirements, conditions, scope? } (its opener or assayer before any delivery, or a promiser while it states no contract), counter { requirements, conditions, scope?, reason? } (anyone else before any delivery: a bid or counter-offer; your latest counter stands), agree { to } (its opener or assayer: that player's counter-offer becomes the operative contract and, unless it already promised, the request is awarded to it), release { reason? } (a promiser lets its promise go), deliver { evidence: string[], claims?: [{ condition, evidence }] } (a promiser), accept { of, evidence? } and reject { of, unmet: condition ids, reason?, evidence? } (a witness told into that player's delivery, claim by claim: its assayer, whose acceptance validates and who may presume without evidence, or anyone but the deliverer with evidence, which verifies; witnessing stays open after acceptance, and a later witness against makes the delivery contested), withdraw { reason? } (its opener). On a proposal: argue { stance: for|against, says, evidence? } (anyone: an argument on the position), adopt { request?, subject? }, attach { subject } only to your same player's current standing subjectless adoption, withdraw. On a report: corroborate { evidence, observation? } (also reopens a resolved one), adopt { request?, subject? }, attach { subject } only to your same player's current standing subjectless adoption, resolve { evidence } (the condition no longer holds), withdraw. On a question: answer { says, evidence? } (whoever it is asked of, or anyone), accept { of } (its asker), withdraw. Attach cannot replace an existing subject, change request or contract, attach to a closed or released commitment, or alter another player's taking. A move that is not legal at the thread's position is refused. Telling needs no turn (CALM): observe, argue, corroborate, answer and a witness on a delivery only add to what is known, so they are never refused for what came before, are admitted after the thread closes (kept as knowledge, reopening nothing), and travel to the peer settlement; every other move is coordinated at the thread's own board.`,
      relation: "boundary", effects: boundary,
      run: (input, _args, context) => {
        const legal = new Set(Object.values(RESPONSE_MOVES).flat());
        if (!legal.has(input?.move)) throw new TypeError(`work-move: move is one of ${[...legal].join(", ")}`);
        return told(played(input, context, "work-move"));
      },
    }),
  ]);
}
