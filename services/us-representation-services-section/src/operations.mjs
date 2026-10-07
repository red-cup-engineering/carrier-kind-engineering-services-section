/**
 * US representation as an operation family: read a country's FDA-registered device establishments
 * and the US agents they pay, build the call list, screen a counterparty against the consolidated
 * screening list, log contacts, record engagements (US agent, sales representation, local
 * presence), record payments with the originating caller's share, and draft the agreements.
 * Records go through the enterprise store (kind `enterprise`) like every other business's.
 * @packageDocumentation
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { callQueue, contactActivity, contactOutcomes, currentOrders, enterpriseOf, enterpriseStore, fillTemplate, funnel, groupBy, procedure, settingValues } from "@red-cup-engineering/organizing/enterprise";
import { DEVICE_REGISTRATION_LISTING, openfdaAll } from "@red-cup-engineering/openfda-services-section/client";
import { fetchConsolidatedList } from "@red-cup-engineering/consolidated-screening-list-services-section/client";
import { screenName, screeningIndex } from "@red-cup-engineering/consolidated-screening-list-services-section/screen";
import { agentMarket, clientKey, establishmentsFrom, leadRows } from "./leads.mjs";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(SECTION_ROOT, "content", "text", "documents", "templates");
const TEMPLATE_NAMES = readdirSync(TEMPLATES).filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3)).sort();
const KIND = "us-representation";
const DAY_MS = 86_400_000;

/** The US representation enterprise's id in the agency registry and the enterprise store. */
export const REPRESENTATION_ENTERPRISE = "us-representation";
// Read the declared settings only when an operation needs them; discovery does no registry IO.
const enterpriseForSettings = () => enterpriseOf(JSON.parse(readFileSync(join(SECTION_ROOT, "lib", "agency", "enterprises", `${REPRESENTATION_ENTERPRISE}.json`), "utf8")));

/** What the Group does for a client. */
export const OFFERS = Object.freeze(["us-agent", "sales-representation", "local-presence"]);

/** An engagement's procedure: proposed, signed, active (the role held or the line selling), renewed. */
export const REPRESENTATION_PROCEDURE = procedure([
  { stage: "proposed", means: "an agreement sent to the client", office: "us-representation-caller", deadReasons: ["declined", "no answer", "price", "chose another agent", "screening"] },
  { stage: "signed", means: "the agreement signed by both, the client screened", office: "us-agent-of-record", deadReasons: ["unpaid", "screening", "withdrew"] },
  { stage: "active", means: "named as US agent in the FDA's system, or the line on sale, or the first presence day worked", office: "us-agent-of-record", deadReasons: ["ended by client", "ended by the Group", "client left the US market"] },
  { stage: "renewed", means: "a further year or term agreed and paid", office: "us-agent-of-record", deadReasons: ["ended by client", "ended by the Group"] },
]);
const CONTACT_OUTCOMES = contactOutcomes(["no answer", "voicemail", "letter sent", "not the right contact", "callback", "interested", "engagement sent", "not interested", "remove"]);
const FOR = new Set(Object.entries(CONTACT_OUTCOMES).filter(([, side]) => side === "for").map(([name]) => name));

const snapshotDir = (binding, country) => join(binding.dataRoot, "data", "state", KIND, "establishments", country);
const screeningPath = (binding) => join(binding.dataRoot, "data", "state", KIND, "screening", "consolidated.json");

function latestSnapshot(binding, country) {
  let names;
  try { names = readdirSync(snapshotDir(binding, country)).filter((name) => name.endsWith(".json")).sort(); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
  return names.length === 0 ? null : JSON.parse(readFileSync(join(snapshotDir(binding, country), names.at(-1)), "utf8"));
}

const object = (id, properties, required = []) => schemaFrom({ $id: `us-representation/${id}`, type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const number = { type: "number" };
const boolean = { type: "boolean" };
const texts = { type: "array", items: { type: "string" } };
const country = { type: "string", pattern: "^[A-Z]{2}$" };
const limit = { type: "integer", minimum: 1, maximum: 500 };

const pullSchema = object("pull", { country, limit: { type: "integer", minimum: 1 } });
const marketSchema = object("agent-market", { country, limit });
const SCREENING_READINGS = ["clear", "possible", "listed", "blocked"];
const findSchema = object("find", { country, province: text, city: text, device: text, deviceClass: { enum: ["class I", "class II", "class III"] }, agent: text, noAgent: boolean, minScore: number, screening: { enum: SCREENING_READINGS }, limit });
const queueSchema = object("call-queue", { country, province: text, device: text, by: text, limit, quietDays: number });
const screenSchema = object("screen", { name: text, owners: texts, country, refresh: boolean }, ["name"]);
const contactSchema = object("contact", {
  client: text, establishment: text, outcome: { enum: Object.keys(CONTACT_OUTCOMES) }, channel: { enum: ["call", "email", "wechat", "letter", "meeting"] },
  callbackAt: text, notes: text, by: text,
}, ["outcome"]);
const engagementSchema = object("engagement", {
  client: text, establishment: text, country, offer: { enum: OFFERS }, stage: { enum: REPRESENTATION_PROCEDURE.names },
  owners: texts, annualFee: number, commissionRate: number, dayRate: number, territory: text, products: text,
  commercialScope: text, termEnds: text, deadReason: text, notes: text,
}, ["client", "offer", "stage"]);
const engagementsSchema = object("engagements", { stage: text, offer: { enum: OFFERS }, client: text });
const paymentSchema = object("payment", { engagement: text, received: number, date: text, saleAmount: number, notes: text }, ["engagement", "received"]);
const documentSchema = object("document", { template: { enum: TEMPLATE_NAMES }, engagement: text, values: { type: "object" } }, ["template"]);
const activitySchema = object("activity", { since: text, by: text });

/**
 * @param {{dataRoot: string}} binding MetroPlat's binding; records land under its data root.
 * @param {{fetch?: typeof fetch}} [options]
 */
export function usRepresentationOperations(binding, { fetch: fetchImpl, store = enterpriseStore(binding), now = () => Date.now(), contractingParty = () => undefined } = {}) {
  const settings = () => settingValues(enterpriseForSettings(), store.read("setting", { enterprise: REPRESENTATION_ENTERPRISE }));
  const engagements = () => currentOrders(store.read("order", { enterprise: REPRESENTATION_ENTERPRISE }));
  const engagementOf = (id) => engagements().find((e) => e.order === id);
  const contacts = () => store.read("contact", { enterprise: REPRESENTATION_ENTERPRISE });
  const rowsOf = (countryCode) => {
    const snapshot = latestSnapshot(binding, countryCode);
    if (!snapshot) throw new Error(`no establishments pulled for ${countryCode}: run representation-establishments-pull country=${countryCode}`);
    return { snapshot, rows: leadRows(snapshot.establishments, { year: new Date(now()).getUTCFullYear() }) };
  };

  let screeningList = null;
  async function screeningEntries(refresh = false) {
    const path = screeningPath(binding);
    let fresh = false;
    try { fresh = !refresh && now() - statSync(path).mtimeMs < DAY_MS; } catch (error) { if (error?.code !== "ENOENT") throw error; }
    if (fresh && screeningList) return screeningList;
    if (fresh) {
      const held = JSON.parse(readFileSync(path, "utf8"));
      screeningList = { ...held, index: screeningIndex(held.entries) };
      return screeningList;
    }
    const entries = await fetchConsolidatedList({ fetch: fetchImpl });
    const pulledAt = new Date(now()).toISOString();
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ pulledAt, entries }));
    screeningList = { pulledAt, entries, index: screeningIndex(entries) };
    return screeningList;
  }
  const worstOf = (readings) => readings.reduce((worst, r) => (SCREENING_READINGS.indexOf(r) > SCREENING_READINGS.indexOf(worst) ? r : worst), "clear");
  async function screen(name, owners = [], countryCode, refresh = false) {
    const list = await screeningEntries(refresh);
    const parties = [name, ...owners].filter(Boolean).map((party) => screenName(list.index, party, { country: countryCode }));
    return Object.freeze({ listPulledAt: list.pulledAt, reading: worstOf(parties.map((p) => p.reading)), parties: Object.freeze(parties) });
  }

  return Object.freeze([
    operation({
      verb: "representation-establishments-pull",
      summary: "Pull a country's FDA-registered device establishments, with the US agent each names, screened against the consolidated screening list, into a dated snapshot.",
      description: "Reads openFDA's device registration and listing data for one country (default CN, mainland China), merges listings into establishments, screens each establishment's name and its owner's against the consolidated screening list, and writes the snapshot the find, market and call-queue verbs read. Signing an engagement screens again.",
      domain: pullSchema,
      reads: ["openfda/device-registrationlisting"],
      writes: ["us-representation/establishments"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async ({ country: countryCode = "CN", limit: max } = {}) => {
        const listings = [];
        for await (const listing of openfdaAll(DEVICE_REGISTRATION_LISTING, { search: `registration.iso_country_code:${countryCode}` }, { limit: max ?? Infinity, fetch: fetchImpl })) listings.push(listing);
        const list = await screeningEntries();
        const establishments = establishmentsFrom(listings).map((row) => {
          const parties = [...new Set([row.name, row.owner].filter(Boolean))].map((party) => screenName(list.index, party, { country: countryCode }));
          const matches = parties.flatMap((p) => p.matches.slice(0, 3).map((m) => ({ party: p.name, kind: m.kind, name: m.name, source: m.source, blocking: m.blocking })));
          return { ...row, screening: { reading: worstOf(parties.map((p) => p.reading)), listPulledAt: list.pulledAt, matches } };
        });
        const pulledAt = new Date(now()).toISOString();
        mkdirSync(snapshotDir(binding, countryCode), { recursive: true });
        const path = join(snapshotDir(binding, countryCode), `${pulledAt.slice(0, 10)}.json`);
        writeFileSync(path, JSON.stringify({ pulledAt, country: countryCode, listings: listings.length, establishments }));
        const market = agentMarket(establishments);
        const screened = Object.fromEntries(SCREENING_READINGS.map((r) => [r, establishments.filter((row) => row.screening.reading === r).length]));
        return Object.freeze({ path, pulledAt, country: countryCode, listings: listings.length, establishments: establishments.length, screened, withoutAgent: market.withoutAgent, agents: market.agents, topAgents: market.ranked.slice(0, 10) });
      },
    }),
    operation({
      verb: "representation-agent-market",
      summary: "The US agents a country's device establishments pay: each agent's client count, share, states and contact.",
      description: "Read from the latest establishments snapshot. This is the competition and the price reference for the US agent offer.",
      domain: marketSchema,
      reads: ["us-representation/establishments"],
      run: ({ country: countryCode = "CN", limit: max = 25 } = {}) => {
        const { snapshot } = rowsOf(countryCode);
        const market = agentMarket(snapshot.establishments);
        return Object.freeze({ ...market, pulledAt: snapshot.pulledAt, ranked: market.ranked.slice(0, max) });
      },
    }),
    operation({
      verb: "representation-establishments-find",
      summary: "Find establishments to call: by province, city, device, device class or US agent, scored with the reasons to call.",
      domain: findSchema,
      reads: ["us-representation/establishments"],
      run: ({ country: countryCode = "CN", province, city, device, deviceClass, agent, noAgent, minScore, screening, limit: max = 50 } = {}) => {
        const has = (value, wanted) => !wanted || String(value ?? "").toLowerCase().includes(wanted.toLowerCase());
        const { snapshot, rows } = rowsOf(countryCode);
        const found = rows.filter((row) => has(row.province, province) && has(row.city, city)
          && (!device || row.devices.some((d) => has(d, device)))
          && (!deviceClass || row.classes.includes(deviceClass))
          && (!agent || has(row.usAgent?.business ?? row.usAgent?.name, agent))
          && (!noAgent || !row.usAgent)
          && (minScore === undefined || row.score >= minScore)
          && (!screening || (row.screening?.reading ?? "clear") === screening));
        return Object.freeze({ pulledAt: snapshot.pulledAt, total: found.length, establishments: found.slice(0, max) });
      },
    }),
    operation({
      verb: "representation-call-queue",
      summary: "The next establishments to call or email: callbacks now due first, then the highest-scored not reached lately.",
      description: "Clients who declined or asked to be removed drop out, and so do establishments already under an engagement past proposed, and establishments whose name or owner is on the consolidated screening list (listed or blocked); possible matches stay in, flagged.",
      domain: queueSchema,
      reads: ["us-representation/establishments", "enterprise/records"],
      run: ({ country: countryCode = "CN", province, device, by, limit: max = 40, quietDays } = {}) => {
        const has = (value, wanted) => !wanted || String(value ?? "").toLowerCase().includes(wanted.toLowerCase());
        const stageOf = new Map(engagements().filter((e) => e.establishment).map((e) => [e.establishment, e.stage === "proposed" ? "interested" : e.stage]));
        const rows = rowsOf(countryCode).rows
          .filter((row) => !["listed", "blocked"].includes(row.screening?.reading))
          .filter((row) => has(row.province, province) && (!device || row.devices.some((d) => has(d, device))))
          .map((row) => ({ ...row, party: row.name, stage: stageOf.get(row.key) ?? "lead" }));
        return callQueue(rows, groupBy(contacts().filter((c) => c.establishment), "establishment"), {
          by, limit: max, outcomes: CONTACT_OUTCOMES, now: now(), quietDays: quietDays ?? settings()["quiet-days"],
        });
      },
    }),
    operation({
      verb: "representation-screen",
      summary: "Screen a client and its named owners against the US consolidated screening list, and record the reading.",
      description: "Readings: clear, possible (shares most distinctive words with a listed name; resolve by address and ids), listed (on a Commerce, State or non-SDN Treasury list: read the list for what it restricts) or blocked (on OFAC's SDN list: no dealing). The list is re-downloaded when a day old or on refresh.",
      domain: screenSchema,
      reads: ["trade.gov/consolidated-screening-list"],
      writes: ["enterprise/records"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async ({ name, owners = [], country: countryCode = "CN", refresh = false }, _args, context) => {
        const screening = await screen(name, owners, countryCode, refresh);
        store.party({ enterprise: REPRESENTATION_ENTERPRISE, party: name, client: clientKey(name), kind: "screening", owners, reading: screening.reading, listPulledAt: screening.listPulledAt, matches: screening.parties.flatMap((p) => p.matches.slice(0, 5)), by: context?.invocation?.subject });
        return screening;
      },
    }),
    operation({
      verb: "representation-contact-log",
      summary: "Log one call, email, WeChat message, letter or meeting with an establishment or client: outcome, callback time and notes.",
      description: "An email or letter is logged as letter sent with its channel. Interested, callback and engagement sent (an agreement sent) tell for the client's interest; not interested and remove tell against; the rest tell nothing.",
      domain: contactSchema,
      writes: ["enterprise/records"],
      run: (input, _args, context) => {
        if (!input.client && !input.establishment) throw new Error("a contact names its client or establishment (registration number)");
        let party = input.client;
        if (!party && input.establishment) {
          const snapshotRow = ["CN", "HK", "TW"].map((c) => latestSnapshot(binding, c)).filter(Boolean)
            .flatMap((s) => s.establishments).find((row) => row.key === input.establishment);
          party = snapshotRow?.name ?? input.establishment;
        }
        return store.contact({ ...input, enterprise: REPRESENTATION_ENTERPRISE, party, client: clientKey(party), by: input.by ?? context?.invocation?.subject }, CONTACT_OUTCOMES);
      },
    }),
    operation({
      verb: "representation-engagement-record",
      summary: "Move an engagement (US agent, sales representation or local presence) to a stage with its terms; signing screens the client and its owners first.",
      description: "An engagement's id is the client's key and the offer. At signed, the client and any owners named are screened against the consolidated screening list and the reading is kept on the engagement; a blocked reading (OFAC SDN) is not signed. A dead engagement names its reason. Unset terms take the enterprise's current settings.",
      domain: engagementSchema,
      reads: ["trade.gov/consolidated-screening-list"],
      writes: ["enterprise/records"],
      effects: { class: "external", replay: "safe", coordination: "coordination-free", deterministic: "unmeasured", totality: "unmeasured" },
      run: async (input, _args, context) => {
        const id = `${clientKey(input.client)}-${input.offer}`;
        if (input.stage === "dead" && !input.deadReason) throw new Error(`a dead engagement names its reason: ${REPRESENTATION_PROCEDURE.deadReasons.join(", ")}`);
        const current = settings();
        const terms = input.offer === "us-agent" ? { annualFee: input.annualFee ?? engagementOf(id)?.annualFee ?? current["us-agent-annual-fee"] }
          : input.offer === "sales-representation" ? { commissionRate: input.commissionRate ?? engagementOf(id)?.commissionRate ?? current["sales-commission"] }
          : { dayRate: input.dayRate ?? engagementOf(id)?.dayRate ?? current["local-presence-day-rate"] };
        let screening;
        if (input.stage === "signed") {
          screening = await screen(input.client, input.owners ?? [], input.country ?? "CN");
          if (screening.reading === "blocked") throw new Error(`${input.client} is on OFAC's SDN list; US persons may not deal with it: ${JSON.stringify(screening.parties.flatMap((p) => p.matches.filter((m) => m.blocking)).slice(0, 3))}`);
        }
        const fee = input.offer === "us-agent" ? terms.annualFee : null;
        return store.order({
          ...input, ...terms, enterprise: REPRESENTATION_ENTERPRISE, order: id, fee,
          ...(screening ? { screening: { reading: screening.reading, listPulledAt: screening.listPulledAt, matches: screening.parties.flatMap((p) => p.matches.slice(0, 3)) } } : {}),
          by: context?.invocation?.subject,
        });
      },
    }),
    operation({
      verb: "representation-engagements",
      summary: "Every engagement at its current stage with its terms and screening, counts by stage, the funnel, contract fees a year, and settlements.",
      domain: engagementsSchema,
      reads: ["enterprise/records"],
      run: ({ stage, offer, client } = {}) => {
        const all = engagements();
        const shown = all.filter((e) => (!stage || e.stage === stage) && (!offer || e.offer === offer) && (!client || e.client === client));
        const live = all.filter((e) => ["signed", "active", "renewed"].includes(e.stage));
        return Object.freeze({
          byStage: Object.fromEntries(REPRESENTATION_PROCEDURE.names.map((s) => [s, all.filter((e) => e.stage === s).length])),
          agentFeesPerYear: live.filter((e) => e.offer === "us-agent").reduce((sum, e) => sum + (e.annualFee ?? 0), 0),
          funnel: funnel(all.map((e) => e.history), REPRESENTATION_PROCEDURE),
          procedure: REPRESENTATION_PROCEDURE.stages,
          settlements: store.read("settlement", { enterprise: REPRESENTATION_ENTERPRISE }),
          engagements: shown.map(({ history, ...e }) => ({ ...e, stages: history.length })),
        });
      },
    }),
    operation({
      verb: "representation-payment-record",
      summary: "Record a payment on an engagement (an agent fee, a commission on a sale, presence days): its settlement names the originating caller's share.",
      description: "For sales representation, pass saleAmount and received is the commission. The originating caller is the first account that logged a contact telling for the client before the engagement began.",
      domain: paymentSchema,
      writes: ["enterprise/records"],
      run: ({ engagement: id, received, date, saleAmount, notes }, _args, context) => {
        const engagement = engagementOf(id);
        if (!engagement) throw new Error(`no engagement ${id}; engagement ids are <client key>-<offer>`);
        const began = String(engagement.history[0].recordedAt);
        const originator = contacts()
          .filter((c) => FOR.has(c.outcome) && c.by && (c.client === clientKey(engagement.client) || (engagement.establishment && c.establishment === engagement.establishment)) && String(c.recordedAt) <= began)
          .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)))[0]?.by;
        const share = settings()["caller-share"];
        return store.settlement({
          enterprise: REPRESENTATION_ENTERPRISE, order: id, offer: engagement.offer, date: date ?? new Date(now()).toISOString().slice(0, 10), received,
          saleAmount: saleAmount ?? null, parties: [engagement.client], userValue: [],
          shares: originator ? [{ party: originator, office: "us-representation-caller", share, amount: Math.round(received * share * 100) / 100, basis: "joint-venture caller agreement: originating caller's share of each payment in the engagement's first year" }] : [],
          witness: notes ?? null, by: context?.invocation?.subject,
        });
      },
    }),
    operation({
      verb: "representation-activity",
      summary: "Calling and email activity by caller and by day, and engagements by stage.",
      domain: activitySchema,
      reads: ["enterprise/records"],
      run: ({ since, by } = {}) => {
        const logged = contacts().filter((c) => (!since || String(c.recordedAt) >= since) && (!by || c.by === by));
        return Object.freeze({ activity: contactActivity(logged, { outcomes: CONTACT_OUTCOMES, reachedOutcomes: ["callback", "interested", "engagement sent", "not interested", "remove"] }), engagements: groupBy(engagements(), "stage").size });
      },
    }),
    operation({
      verb: "representation-document-draft",
      summary: "Draft the US agent service agreement, the sales representative agreement, the local presence order or the caller's joint-venture agreement with an engagement's values filled in.",
      domain: documentSchema,
      reads: ["enterprise/records"],
      run: ({ template, engagement: id, values = {} }) => {
        const engagement = id ? engagementOf(id) : undefined;
        const current = settings();
        const merged = {
          date: new Date(now()).toISOString().slice(0, 10), contractingParty: contractingParty(REPRESENTATION_ENTERPRISE), annualFee: current["us-agent-annual-fee"], commissionPercent: Math.round(current["sales-commission"] * 1000) / 10,
          dayRate: current["local-presence-day-rate"], callerPercent: Math.round(current["caller-share"] * 1000) / 10,
          ...engagement, ...(engagement?.commissionRate ? { commissionPercent: Math.round(engagement.commissionRate * 1000) / 10 } : {}), ...values,
        };
        const body = fillTemplate(readFileSync(join(TEMPLATES, `${template}.md`), "utf8").replace(/^---[\s\S]*?---\n/, ""), merged);
        return Object.freeze({ template, engagement: id ?? null, values: merged, markdown: body });
      },
    }),
  ]);
}
