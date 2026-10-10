/**
 * enterprise/operations — the Group's micro-enterprises as MetroPlat operations: each one's
 * constitution, contracts and their standing, grey-band settings, and the win-win value-added
 * statement, read as one managed element's loop (monitor: contact activity; analyze: funnel and
 * statement against its leading goal; plan: settings due and open orders); and the acts that
 * belong to the enterprise itself (setting a point on a band, entering or withdrawing from a
 * contract, bidding for an office, recording a cost or a settlement); and the legal entities that
 * sign for them, with their formation papers drafted from the entity's packet.
 * @packageDocumentation
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { CONTACT_SIDES, contactActivity, currentOrders, funnel, interestReading, procedure } from "./orders.mjs";
import { contractOf, contractStanding, enterpriseOf } from "./constitution.mjs";
import { checkJudgment, checkSetting, currentSettings } from "./settings.mjs";
import { valueAddedStatement } from "./statement.mjs";
import { readJudgedSettlements } from "./outcomes.mjs";
import { outcomeSettlementsIndexOf } from "./root.mjs";
import { enterpriseStore } from "./store.mjs";
import { VERIFIER_ROLE_NAMES } from "./work-arena.mjs";
import { enterpriseRoots } from "./root.mjs";
import { contractingParty, fillTemplate, legalEntityOf, principalOf, templateBody } from "./documents.mjs";
import { CONTROL_DISPOSITIONS, CONTROL_EVENT_TYPES, currentControls } from "./control.mjs";
import { enterpriseBoard } from "./board.mjs";
import { bidderOf, doersOf, enterpriseRecord, foundingOf, governingRight, incumbentsOf, lineOfficeOf, openSeatsOf, qiangdan } from "../agency/governing.mjs";
import { enactAgencyRecords } from "../agency/records.mjs";
import { playerOfAct, subjectOf } from "../agency/cast.mjs";

const object = (id, properties, required = []) => schemaFrom({ $id: `enterprise/${id}`, type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const named = { type: "string", minLength: 1 };
const number = { type: "number" };
const period = { type: "object", properties: { from: text, to: text }, additionalProperties: false };

/** The legal entities in a registry. */
const entitiesIn = (agency) => [...(agency.entities?.values() ?? [])].map(legalEntityOf);

/** The principals (real people or organizations an entity names as members or managers) in a registry. */
const principalsIn = (agency) => [...(agency.principals?.values() ?? [])].map(principalOf);

/**
 * The contracting party of an enterprise, read from the legal entity its record names; undefined
 * when it names none.
 * @param {object} agency the agency registry
 * @param {string} enterpriseId
 */
export function contractingPartyFor(agency, enterpriseId) {
  const enterprise = [...agency.enterprises.values()].find((e) => e.id === enterpriseId);
  if (!enterprise?.entity) return undefined;
  const entity = entitiesIn(agency).find((e) => e.id === enterprise.entity || e.key === enterprise.entity);
  return contractingParty(entity);
}

/**
 * @param {{dataRoot: string}} binding
 * @param {object} options
 * @param {() => object} options.agency the agency registry (with `enterprises` and `contracts` pools)
 * @param {Record<string, object>} [options.procedures] each enterprise's stage procedure, by enterprise id
 * @param {(subject: string, officeKey: string) => boolean} [options.holds] whether an account holds an office
 * @param {() => object} [options.handedAgency] the registry with this node's told hands folded in
 *   (`withToldHands`), from which the caller's player is read (`playerOfAct`); by default `agency`
 * @param {(enterprise: object) => ReadonlyArray<object>} [options.deedsOf] the deeds done in an enterprise's
 *   work, read off the work board (organizing/agency governing `deedsOf`); without it, only seats on record
 *   make doers
 * @param {() => Record<string, { capabilities: string[], carriers: object[] }>} [options.testimony] each bearer's
 *   provider testimony, read at runtime (organizing/agency governing `qiangdan`)
 * @param {object} [options.store] the enterprise store; by default each enterprise's records are in its own root
 */
export function enterpriseOperations(binding, { agency, procedures = {}, holds, handedAgency = agency, deedsOf = () => [], testimony = () => ({}), store = enterpriseStore(binding, { roots: enterpriseRoots(agency) }), judgedSettlements = (enterprise) => readJudgedSettlements(outcomeSettlementsIndexOf(), enterprise) } = {}) {
  const enterprises = () => [...agency().enterprises.values()].map(enterpriseOf);
  const find = (id) => {
    const found = enterprises().find((e) => e.id === id || e.key === id);
    if (!found) throw new Error(`no enterprise ${id}: the enterprises are ${enterprises().map((e) => e.id).join(", ")}`);
    return found;
  };
  // Operating an enterprise (its sales, controls, board) is for those who do its work: a holder of one of
  // its offices, or a bearer with a deed in its work (organizing/agency governing `doersOf`).
  const operatorFor = (id, context, activity = "operations", bearer) => {
    const enterprise = find(id);
    const subject = subjectOf(context);
    const held = subject && holds && enterprise.offices.some((office) => holds(subject, office));
    if (bearer !== undefined) playerOfAct(handedAgency(), { invocation: context?.invocation, bearer });
    const doer = () => {
      const record = enterpriseRecord(agency(), enterprise.id);
      const selectedBearer = playerOfAct(handedAgency(), { invocation: context?.invocation, bearer }).bearer;
      return record !== undefined && doersOf(agency(), record, { deeds: deedsOf(record) }).includes(selectedBearer);
    };
    if (!subject || subject === "anonymous" || !(held || doer())) {
      throw new Error(`${activity} for ${enterprise.id} are for those who do its work: a held office of it, or a deed in its work`);
    }
    return enterprise;
  };
  // Nobody owns an enterprise's rights (organizing/agency governing): those who do its work exercise them.
  // The caller acts when it is one of the enterprise's doers, by record or by deed, or not at all.
  const doerActing = (id, verb, context, bearer) => {
    const record = enterpriseRecord(agency(), find(id).id);
    const subject = subjectOf(context);
    if (!subject || subject === "anonymous") throw new Error(`${verb} is one doer's act: the caller is unknown`);
    const actor = playerOfAct(handedAgency(), { invocation: context?.invocation, bearer });
    const doers = doersOf(agency(), record, { deeds: deedsOf(record) });
    if (!doers.includes(actor.bearer)) throw new Error(`${verb} for ${record.id} is for those who do its work; ${actor.bearer} has done none of it (its doers: ${doers.join(", ") || "none yet, so its own turn decides"})`);
    return { record, doers, actor };
  };
  const sellerFor = (id, context, bearer) => operatorFor(id, context, "sales", bearer);
  const contractsOf = (enterprise, records = store) => {
    const contracts = [...agency().contracts.values()].map(contractOf)
      .filter((c) => c.enterprise === enterprise.id || (c.enterprises ?? []).includes(enterprise.id) || enterprise.contracts.includes(c.id));
    // Signatures are written in the contract's first owning enterprise. A
    // shared contract therefore reads that owner's root, even for another
    // participant; enterprises without contracts read no signature journals.
    const owners = new Set(contracts.map((c) => c.enterprise ?? (c.enterprises ?? [])[0]));
    const signatures = [...owners].flatMap((owner) => records.read("signature", { enterprise: owner }));
    return contracts
      .map((c) => Object.freeze({ ...c, ...contractStanding(c, signatures) }));
  };
  const entities = () => entitiesIn(agency());
  const findEntity = (id) => {
    const found = entities().find((e) => e.id === id || e.key === id);
    if (!found) throw new Error(`no legal entity ${id}: the entities are ${entities().map((e) => e.id).join(", ") || "none"}`);
    return found;
  };
  const principals = () => principalsIn(agency());
  const principalName = (ref) => principals().find((p) => p.id === ref || p.key === ref)?.name ?? ref;
  const packetDir = (entity) => {
    if (!entity.packet) throw new Error(`legal entity ${entity.id} names no formation packet`);
    return path.join(agency().root, entity.sectionPath, entity.packet);
  };
  const packetTemplates = (entity) => (entity.packet ? readdirSync(packetDir(entity)).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).sort() : []);
  const procedureOf = (enterprise) => procedures[enterprise.id] ?? procedure([{ stage: "lead" }, { stage: "contacted" }, { stage: "interested" }, { stage: "contracted" }, { stage: "closed" }]);

  function reading(enterprise, { from, to } = {}, records = store) {
    const orders = currentOrders(records.read("order", { enterprise: enterprise.id }));
    const contacts = records.read("contact", { enterprise: enterprise.id });
    const contracts = contractsOf(enterprise, records);
    const settings = currentSettings(enterprise, records.read("setting", { enterprise: enterprise.id }));
    const proc = procedureOf(enterprise);
    const controls = currentControls(records.read("control", { enterprise: enterprise.id }));
    const statement = valueAddedStatement({
      enterprise, orders, contacts, contracts,
      // What its users paid as the outcome path judged it, beside the receipts its own records hold.
      settlements: [...records.read("settlement", { enterprise: enterprise.id }), ...judgedSettlements(enterprise.id)],
      costs: records.read("cost", { enterprise: enterprise.id }),
      period: { from, to },
      closedStage: proc.stages.at(-1)?.stage ?? "closed",
    });
    return Object.freeze({
      enterprise,
      contracts: contracts.map(({ standing, parties, id, type, leadingGoal, user }) => ({ id, type, standing, parties, leadingGoal: leadingGoal ?? null, user: user ?? null })),
      monitor: contactActivity(contacts),
      controls,
      analyze: { funnel: funnel(orders.map((o) => o.history), proc), statement },
      plan: {
        settingsDue: settings.filter((s) => s.due).map((s) => s.axis),
        settingsUnjudged: settings.filter((s) => !s.judged).map((s) => s.axis),
        contractsToEnter: contracts.filter((c) => c.standing === "proposed").map((c) => ({ contract: c.id, unsigned: c.parties.filter((p) => p.reading !== "held").map((p) => p.office) })),
        openOrders: orders.filter((o) => !["dead", proc.stages.at(-1)?.stage].includes(o.stage)).length,
        bids: records.read("bid", { enterprise: enterprise.id }).slice(-10),
      },
      settings,
    });
  }

  return Object.freeze([
    operation({
      verb: "enterprise-board",
      summary: "The live ERP/ICS/CRM attention board across every micro-enterprise: callbacks due, unanswered quotes, open orders, settings and contract work, short measures, and unresolved control faults.",
      domain: object("board", { at: text }),
      reads: ["agency/enterprises", "agency/contracts", "enterprise/records"],
      run: ({ at } = {}) => {
        const records = store.readView?.() ?? store;
        const now = at ?? new Date().toISOString();
        return enterpriseBoard(enterprises().map((enterprise) => {
          const r = reading(enterprise, {}, records);
          return {
            enterprise,
            reading: r,
            contacts: records.read("contact", { enterprise: enterprise.id }),
            orders: currentOrders(records.read("order", { enterprise: enterprise.id })),
            controls: r.controls,
          };
        }), { now });
      },
    }),
    operation({
      verb: "enterprise-control",
      summary: "Read one enterprise's witnessed operational-control loops and their current standing without issuing any command.",
      domain: object("control-read", { enterprise: named }, ["enterprise"]),
      reads: ["enterprise/records"],
      run: ({ enterprise: id }) => {
        const enterprise = find(id);
        return Object.freeze({
          enterprise: enterprise.id,
          controls: currentControls(store.read("control", { enterprise: enterprise.id })),
        });
      },
    }),
    operation({
      verb: "enterprise-control-record",
      summary: "Record one evidence-gated operational-control fact for an enterprise; recording a command does not execute it.",
      description: "Command, correction and release records require authoritySource. Observation and alarm records require observationSource. Actuation remains a separate capability outside this operation.",
      domain: object("control-record", { bearer: named,
        enterprise: named,
        control: named,
        target: named,
        type: { enum: CONTROL_EVENT_TYPES },
        disposition: { enum: CONTROL_DISPOSITIONS },
        instruction: text,
        desiredState: { type: "object" },
        observedState: { type: "object" },
        authoritySource: text,
        observationSource: text,
        source: text,
        notes: text,
      }, ["enterprise", "control", "target", "type", "disposition"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const enterprise = operatorFor(input.enterprise, context, "control", input.bearer);
        return store.control({ ...input, enterprise: enterprise.id, by: subjectOf(context) });
      },
    }),
    operation({
      verb: "enterprises",
      summary: "The Group's micro-enterprises: kind, whom each faces, its contracts' standing, users reached and served, value captured, and its measures against their leading goals.",
      domain: object("list", { from: text, to: text }),
      reads: ["agency/enterprises", "agency/contracts", "enterprise/records"],
      run: ({ from, to } = {}) => {
        const records = store.readView?.() ?? store;
        return Object.freeze(enterprises().map((enterprise) => {
          const r = reading(enterprise, { from, to }, records);
          return {
            enterprise: enterprise.id, name: enterprise.name, kind: enterprise.kind, faces: enterprise.faces,
            contracts: r.contracts.map((c) => `${c.id}: ${c.standing}`),
            users: r.analyze.statement.users,
            valueCaptured: r.analyze.statement.valueCaptured.amount,
            measures: r.analyze.statement.valueAdjustment.flatMap((v) => v.measures.map((m) => `${m.id}: ${m.reading}${m.actual === null ? "" : ` (${m.actual} of ${m.target})`}`)),
            settingsDue: r.plan.settingsDue,
          };
        }));
      },
    }),
    operation({
      verb: "enterprise",
      summary: "One micro-enterprise read as its loop: constitution and contracts, contact activity, funnel and win-win value-added statement against its leading goal, settings on their bands and what is due.",
      domain: object("one", { enterprise: text, from: text, to: text }, ["enterprise"]),
      reads: ["agency/enterprises", "agency/contracts", "enterprise/records"],
      run: ({ enterprise, from, to }) => reading(find(enterprise), { from, to }),
    }),
    operation({
      verb: "enterprise-sales",
      summary: "Read an enterprise's sourced buyer contacts and current quotes with their recorded answers.",
      domain: object("sales", { bearer: named, enterprise: text }, ["enterprise"]),
      reads: ["enterprise/records"],
      run: ({ enterprise: id, bearer }, _args, context) => {
        const enterprise = sellerFor(id, context, bearer);
        const contacts = store.read("contact", { enterprise: enterprise.id });
        const parties = [...new Set(contacts.map((contact) => contact.party))].map((party) => ({
          party, interest: interestReading(contacts.filter((contact) => contact.party === party), { party, enterprise: enterprise.id }),
          contacts: contacts.filter((contact) => contact.party === party),
        }));
        return Object.freeze({ enterprise: enterprise.id, parties, orders: currentOrders(store.read("order", { enterprise: enterprise.id })) });
      },
    }),
    operation({
      verb: "enterprise-contact-record",
      summary: "Record a sourced buyer call, message or meeting under an existing enterprise.",
      domain: object("contact", { bearer: named, enterprise: named, party: named, outcome: { enum: Object.keys(CONTACT_SIDES) }, channel: text, person: text, callbackAt: text, source: named, notes: text }, ["enterprise", "party", "outcome", "source"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => store.contact({ ...input, enterprise: sellerFor(input.enterprise, context, input.bearer).id, by: subjectOf(context) }),
    }),
    operation({
      verb: "enterprise-quote-record",
      summary: "Record a quote actually given to a buyer, with its amount, scope and source.",
      domain: object("quote", { bearer: named, enterprise: named, order: named, party: named, amountUsd: { type: "number", minimum: 0 }, scope: named, source: named, notes: text }, ["enterprise", "order", "party", "amountUsd", "scope", "source"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const enterprise = sellerFor(input.enterprise, context, input.bearer);
        const history = store.read("order", { enterprise: enterprise.id, order: input.order });
        if (history.some((record) => record.party !== input.party)) throw new Error(`order ${input.order} belongs to another party`);
        return store.order({ ...input, enterprise: enterprise.id, stage: "interested", event: "quote", by: subjectOf(context) });
      },
    }),
    operation({
      verb: "enterprise-quote-answer-record",
      summary: "Record a buyer's sourced answer to the latest quote, without treating an answer as a signed contract or received payment.",
      domain: object("quote-answer", { bearer: named, enterprise: named, order: named, answer: { enum: ["accepted", "declined", "countered", "deferred"] }, source: named, notes: text }, ["enterprise", "order", "answer", "source"]),
      reads: ["enterprise/records"],
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const enterprise = sellerFor(input.enterprise, context, input.bearer);
        const history = store.read("order", { enterprise: enterprise.id, order: input.order });
        const quote = [...history].reverse().find((record) => record.event === "quote");
        if (!quote) throw new Error(`order ${input.order} has no recorded quote`);
        return store.order({ ...input, enterprise: enterprise.id, party: quote.party, stage: input.answer === "declined" ? "dead" : "interested", event: "quote-answer", by: subjectOf(context) });
      },
    }),
    operation({
      verb: "enterprise-setting-record",
      summary: "Choose a point on one of an enterprise's grey bands, saying why and when to look at it again.",
      domain: object("setting", { bearer: named, enterprise: text, axis: text, value: number, because: text, revisitBy: text }, ["enterprise", "axis", "value", "because", "revisitBy"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const enterprise = find(input.enterprise);
        const axis = enterprise.settings.find((a) => a.axis === input.axis);
        if (!axis) throw new Error(`${enterprise.id} has no axis ${input.axis}: its axes are ${enterprise.settings.map((a) => a.axis).join(", ")}`);
        checkSetting(axis, input.value);
        checkJudgment(input);
        // A point is a doer's judgment, played as the enterprise (Huidu: the unit holds its settings); the
        // latest record stands, its own turn's or another doer's.
        const { actor } = doerActing(enterprise.id, "enterprise-setting-record", context, input.bearer);
        return store.setting({ ...input, enterprise: enterprise.id, by: enterprise.id, player: playerOfAct(undefined, { player: { by: enterprise.id, bearer: actor.bearer, hand: actor.hand } }) });
      },
    }),
    operation({
      verb: "enterprise-contract-sign",
      summary: "Enter (or withdraw from) a value-adjustment or chain-group contract for an office you hold.",
      description: "A contract binds its parties only once each office named in it has entered it; withdrawing tells against the entry. Standing is read from these signatures.",
      domain: object("sign", { contract: text, office: text, reading: { enum: ["held", "denied"] }, notes: text }, ["contract", "office"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const contract = [...agency().contracts.values()].map(contractOf).find((c) => c.id === input.contract);
        if (!contract) throw new Error(`no contract ${input.contract}`);
        const party = contract.parties.find((p) => p.office === input.office);
        if (!party) throw new Error(`${input.office} is not a party to ${contract.id}: its parties are ${contract.parties.map((p) => p.office).join(", ")}`);
        const subject = subjectOf(context);
        if (holds && subject && !holds(subject, input.office)) throw new Error(`${subject} does not hold ${input.office}`);
        return store.signature({ enterprise: contract.enterprise ?? (contract.enterprises ?? [])[0], contract: contract.id, office: input.office, reading: input.reading ?? "held", notes: input.notes, by: subject });
      },
    }),
    operation({
      verb: "entities",
      summary: "The legal entities in the registry, the Group's and its members' own companies: legal name, form, state, standing (proposed, filed, terminated), the enterprises each signs for, how contracts name it, and its formation papers.",
      domain: object("entities", {}),
      run: () => entities().map((entity) => Object.freeze({
        ...entity, contractingParty: contractingParty(entity), packetTemplates: packetTemplates(entity),
        unsigned: enterprises().filter((e) => !e.entity).map((e) => e.id),
      })),
    }),
    operation({
      verb: "entity-document-draft",
      summary: "Draft one of a legal entity's formation papers (articles worksheet, operating agreement, initial consent, EIN worksheet, bank checklist, compliance calendar) with its record's values and any given values filled in.",
      description: "Values given here (members, shares, managers, addresses) fill the draft and are not stored; the draft is for the people who sign it. Blanks stay for hand entry.",
      domain: object("entity-document", { entity: text, template: text, values: { type: "object" } }, ["entity", "template"]),
      run: ({ entity: id, template, values = {} }) => {
        const entity = findEntity(id);
        const names = packetTemplates(entity);
        if (!names.includes(template)) throw new Error(`${entity.id}'s packet has ${names.join(", ")}`);
        const units = enterprises().filter((e) => e.entity === entity.id || entity.enterprises.includes(e.id));
        // Each entity.members/managers entry names a principal by id; resolved here from the
        // `principals` pool, never stored on the entity record itself.
        const memberFields = Object.fromEntries(entity.members.flatMap((m, i) => [
          [`member${i + 1}Name`, principalName(m.principal)],
          [`member${i + 1}Percent`, m.percent],
          [`member${i + 1}Contribution`, m.contribution],
        ]));
        const managerFields = Object.fromEntries(entity.managers.flatMap((m, i) => [
          [`manager${i + 1}Name`, principalName(m.principal)],
          [`manager${i + 1}Authority`, m.authority],
        ]));
        const merged = {
          date: new Date().toISOString().slice(0, 10), companyName: entity.legalName, filingDate: entity.filed ?? undefined,
          contractingParty: contractingParty(entity), businessUnits: units.map((e) => e.name).join(", ") || undefined,
          ...memberFields, ...managerFields,
          ...values,
        };
        const markdown = fillTemplate(templateBody(readFileSync(path.join(packetDir(entity), `${template}.md`), "utf8")), merged);
        return Object.freeze({ entity: entity.id, standing: entity.standing, template, markdown });
      },
    }),
    operation({
      verb: "enterprise-bid",
      summary: "Bid for an office of an enterprise by committing to a target and a plan (抢单); the enterprise's members then recognize and induct the holder.",
      domain: object("bid", { enterprise: text, office: text, target: text, plan: { type: "array", items: text }, measures: { type: "array", items: { type: "object" } } }, ["enterprise", "office", "target"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const record = enterpriseRecord(agency(), find(input.enterprise).id);
        const subject = subjectOf(context);
        if (!subject) throw new Error("a bid is its bidder's own act: the caller is unknown");
        const office = incumbentsOf(agency(), record).find((own) => own.id === input.office || own.key === input.office);
        if (office === undefined) throw new Error(`${input.office} is not one of ${record.id}'s own offices`);
        // The bid is the bidder's induction (socializing office: munus): its bearer plays it as itself.
        const bearer = bidderOf(agency(), { by: subject });
        return store.bid({ ...input, office: office.id, enterprise: record.id, by: subject, bearer, player: playerOfAct(undefined, { player: { by: bearer, bearer, hand: subject } }) });
      },
    }),
    operation({
      verb: "enterprise-found",
      summary: "Found an office in an enterprise's own section, with the duty it bears and the work that duty is owed toward, by the enterprise's decision right, exercised by one who does its work.",
      description: "The caller is one of the enterprise's doers: seated in one of its offices on record, or with a deed in its work on the board (held, promised, adopted or delivered) within the flow window. Set office.rank to senior or junior to instantiate Coesite’s shared service officer form; normative-structure is then the local capability scope, and duty.receiver-condition is required. A Junior also names an existing Senior in its own section in office.reports-to. The closure is carried by its formed duty, with no parallel work record. Other offices report to the enterprise's line office, bear one duty owed toward one work, and provides one skill the registry already holds; it conveys duties only, never powers. An office founded to verify deliveries names its role in `verifies` (white, black, blue or red: the four armies of work-arena VERIFIER_ROLES). The founding is one governing act on the agency act chain, played as the enterprise and recording its player. Whoever then does the new office's work is seated in it by that deed; a bearer may also commit ahead of any deed (enterprise-bid), recognized by the enterprise's own turn (qiangdan).",
      domain: object("found", { bearer: named,
        enterprise: named,
        office: { type: "object", required: ["id", "name", "normative-structure"], properties: { id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" }, name: named, "normative-structure": named, rank: { enum: ["senior", "junior"] }, "reports-to": named, verifies: { enum: VERIFIER_ROLE_NAMES } }, additionalProperties: false },
        work: { type: "object", required: ["from", "to", "cost"], properties: { id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" }, name: named, from: named, to: named, cost: named, otherwise: named }, additionalProperties: false },
        duty: { type: "object", properties: { id: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$" }, name: named, "receiver-condition": named }, additionalProperties: false },
        skill: named,
        evidence: { type: "array", minItems: 1, items: named },
      }, ["enterprise", "office", "work", "skill", "evidence"]),
      writes: ["agency/acts"],
      run: (input, _args, context) => {
        const { record, doers, actor } = doerActing(input.enterprise, "enterprise-found", context, input.bearer);
        const at = binding.now?.() ?? new Date().toISOString();
        const entries = foundingOf(agency(), record, { office: input.office, duty: input.duty, work: input.work, skill: input.skill });
        const enacted = enactAgencyRecords({
          root: agency().root, entries,
          act: { kind: "enterprise-found", enterprise: record.id, player: playerOfAct(undefined, { player: { by: record.id, bearer: actor.bearer, hand: actor.hand } }), evidence: input.evidence, at },
          authorize: ({ agency: before, pool, source, existing, record: next }) => {
            const held = governingRight(before, enterpriseRecord(before, record.id), { pool, source, record: next, existing }, { bearer: actor.bearer, doers });
            return `${held.right}:${held.enterprise}`;
          },
        });
        return Object.freeze({ kind: "enterprise.founded", enterprise: record.id, office: `${record.sectionPath}#${input.office.id}`, records: enacted.map((r) => r?.id).filter(Boolean) });
      },
    }),
    operation({
      verb: "enterprise-seats",
      summary: "Each enterprise's doers (who did its work, by record or by deed), its own offices and who is seated in each by record or by deed, its open seats, and the bids for each read by qiangdan (qualified or refused, with reasons, and the winner its own turn will recognize).",
      domain: object("seats", { enterprise: text }),
      reads: ["agency/enterprises", "agency/incumbencies", "enterprise/records"],
      run: ({ enterprise: id } = {}) => {
        const registry = agency();
        const told = testimony();
        const records = id === undefined ? [...registry.enterprises.values()] : [enterpriseRecord(registry, find(id).id)];
        return Object.freeze(records.map((record) => {
          const bids = store.read("bid", { enterprise: record.id });
          const deeds = deedsOf(record);
          return Object.freeze({
            enterprise: record.id, line: lineOfficeOf(registry, record)?.key ?? null,
            doers: doersOf(registry, record, { deeds }),
            offices: incumbentsOf(registry, record, { deeds }).map((office) => ({ office: office.key, seated: office.seated })),
            open: openSeatsOf(registry, record, { deeds }).map((office) => {
              const read = qiangdan(registry, record, office.key, { bids, testimony: told, deeds });
              return { office: office.key, bids: read.bids.map((b) => ({ bearer: b.bearer, target: b.bid.target, at: b.bid.recordedAt, qualified: b.qualified, reasons: b.reasons })), winner: read.winner?.bearer ?? null };
            }),
          });
        }));
      },
    }),
    operation({
      verb: "enterprise-cost-record",
      summary: "Record a cost an enterprise bore (letters mailed, a license course, a title fee), with its source.",
      domain: object("cost", { enterprise: text, amount: number, source: text, date: text, notes: text }, ["enterprise", "amount", "source"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => store.cost({ ...input, enterprise: find(input.enterprise).id, by: subjectOf(context) }),
    }),
    operation({
      verb: "enterprise-payout-record",
      summary: "Record a value-added share paid out to the party it was accrued to (a caller's share of a closed deal).",
      domain: object("payout", { enterprise: text, party: text, amount: number, date: text, order: text, notes: text }, ["enterprise", "party", "amount"]),
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        const enterprise = find(input.enterprise);
        const owed = store.read("settlement", { enterprise: enterprise.id }).flatMap((s) => (s.shares ?? []).filter((share) => share.party === input.party)).reduce((sum, share) => sum + (share.amount ?? 0), 0);
        const paid = store.read("settlement", { enterprise: enterprise.id, kind: "payout", party: input.party }).reduce((sum, p) => sum + (p.amount ?? 0), 0);
        if (input.amount > owed - paid + 0.005) throw new Error(`${input.party} is owed ${(owed - paid).toFixed(2)} by ${enterprise.id}, less than ${input.amount}`);
        return store.settlement({ ...input, kind: "payout", enterprise: enterprise.id, date: input.date ?? new Date().toISOString().slice(0, 10), witness: input.notes, by: subjectOf(context) });
      },
    }),
  ]);
}
