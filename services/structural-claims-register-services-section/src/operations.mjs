/**
 * The structural-claims register as an operation family, so its offices act through MetroPlat and
 * bare-cedar-fog.561.group: keep the watch list of projects that tribal nations, counties and communities face
 * (data centers, transmission, pipelines); record each party's claims against a project and read
 * their class and worth as an option on the project's schedule; call the parties; forecast which
 * projects will be captured and score those forecasts; and carry engagements to payment, with the
 * caller's share. Records are semantic record journal rows under MetroPlat's data root.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";
import { brierScore, createForecast } from "@red-cup-engineering/forecasting/forecasting";
import { enterpriseOf, enterpriseStore, settingValues } from "@red-cup-engineering/organizing/enterprise";
import { subjectOf } from "@red-cup-engineering/organizing/agency/cast";
import {
  CAPTURE_OUTCOMES, CLAIMS_ENTERPRISE, CLAIM_KINDS, CONSEQUENCES, CONTACT_OUTCOMES, ENGAGEMENT_STAGES, OPERATIONS, PROJECT_KINDS, PROJECT_STATUSES,
  claimClass, dailyDelayCost, engagementState, folded, groupBy, interestReading, latest, optionValue,
} from "./register.mjs";

const SECTION_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KIND = "structural-claims";

const journalOf = (binding) => createSemanticRecordJournal({ root: binding.dataRoot, objectKind: KIND });
const recordsOf = (binding, category) => journalOf(binding).query({ category }).map((row) => row.record);

function writeRecord(binding, category, record, told = { for: true, against: false }) {
  const recordedAt = new Date().toISOString();
  const stored = { ...record, recordedAt };
  journalOf(binding).record({ category, recordedAt, record: stored, told });
  return Object.freeze(stored);
}

// Read the declared settings only when an operation needs them; discovery does no registry IO.
const enterpriseForSettings = () => enterpriseOf(JSON.parse(readFileSync(join(SECTION_ROOT, "lib", "agency", "enterprises", `${CLAIMS_ENTERPRISE}.json`), "utf8")));

/** The watch list the register started from: parties and public actions, each with its source. */
export function readWatchList() {
  return JSON.parse(readFileSync(join(SECTION_ROOT, "data", "records", "watch-list.json"), "utf8"));
}

const slug = (value) => String(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Every project at its current state: its records folded in order. */
function currentProjects(binding) {
  return [...groupBy(recordsOf(binding, "project"), "project").values()].map(folded);
}

/** Every claim at its current state, with its class and option value against its project. */
function currentClaims(binding, projects = currentProjects(binding)) {
  const byId = new Map(projects.map((project) => [project.project, project]));
  return [...groupBy(recordsOf(binding, "claim"), "claim").values()].map(folded).map((claim) => {
    const project = byId.get(claim.project) ?? {};
    return Object.freeze({ ...claim, class: claimClass(claim), option: optionValue(claim, project) });
  });
}

const object = (id, properties, required = []) => schemaFrom({ $id: `structural-claims/${id}`, type: "object", properties, required, additionalProperties: false });
const text = { type: "string" };
const number = { type: "number" };
const texts = { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] };
const list = (value) => value === undefined ? undefined : Array.isArray(value) ? value : String(value).split(",").map((item) => item.trim()).filter(Boolean);

const projectSchema = object("project", {
  project: text, name: text, developer: text, kind: { enum: PROJECT_KINDS }, status: { enum: PROJECT_STATUSES },
  county: text, state: text, nation: text, capacityMw: number, capitalUsd: number, dailyDelayCostUsd: number,
  announcedAt: text, nextMilestone: text, nextMilestoneAt: text, dockets: texts, sources: texts, notes: text,
}, ["name"]);
const claimSchema = object("claim", {
  claim: text, project: text, holder: text, kind: { enum: CLAIM_KINDS }, statement: text,
  constrains: { enum: [...OPERATIONS, "none"] }, consequence: { enum: Object.keys(CONSEQUENCES) },
  delayDays: number, sources: texts, notes: text,
}, ["project", "holder", "statement"]);
const contactSchema = object("contact", {
  party: text, project: text, name: text, role: text, phone: text, email: text,
  outcome: { enum: Object.keys(CONTACT_OUTCOMES) }, callbackAt: text, notes: text,
}, ["party", "outcome"]);
const forecastSchema = object("forecast", {
  project: text, outcome: { enum: CAPTURE_OUTCOMES }, by: text, probability: { type: "number", minimum: 0, maximum: 1 },
  rationale: text, sources: texts,
}, ["project", "outcome", "by", "probability", "rationale", "sources"]);
const resolveSchema = object("resolve", { question: text, happened: { type: "boolean" }, notes: text }, ["question", "happened"]);
const engagementSchema = object("engagement", {
  engagement: text, party: text, project: text, stage: { enum: ENGAGEMENT_STAGES }, feeUsd: number, callerShare: number,
  caller: text, notes: text,
}, ["party", "stage"]);
const projectsSchema = object("projects", { state: text, kind: text, status: texts, nation: text });
const oneProjectSchema = object("one-project", { project: text }, ["project"]);
const registerSchema = object("register", { project: text, holder: text, classes: texts, minUsd: number });
const queueSchema = object("call-queue", { limit: { type: "integer", minimum: 1, maximum: 200 }, quietDays: number });
const emptySchema = object("empty", {});

/**
 * @param {{dataRoot: string}} binding MetroPlat's binding
 * @param {{ store?: object }} [options] the enterprise store; the host passes one that keeps the
 *   register's records in its own root, and without it they land under the binding's data root
 */
export function structuralClaimsOperations(binding, { store = enterpriseStore(binding) } = {}) {
  const settings = () => settingValues(enterpriseForSettings(), store.read("setting", { enterprise: CLAIMS_ENTERPRISE }));
  return Object.freeze([
    operation({
      verb: "claims-watch-list",
      summary: "The watch list the register started from: tribal nations, counties and communities acting on data-center and energy projects, each action with its source.",
      domain: emptySchema,
      run: () => readWatchList(),
    }),
    operation({
      verb: "claims-project-record",
      summary: "Record or update a project a party faces: developer, kind, place, capacity, capital, schedule, dockets and sources.",
      description: "A project is named once; later records update its fields. The daily cost of delay comes from the record, or from capacity at STL Partners' $14.2M a month for 60 MW.",
      domain: projectSchema,
      writes: ["structural-claims/project"],
      run: (input, _args, context) => writeRecord(binding, "project", {
        by: subjectOf(context), ...input, project: input.project ?? slug(input.name),
        ...(input.dockets === undefined ? {} : { dockets: list(input.dockets) }), ...(input.sources === undefined ? {} : { sources: list(input.sources) }),
      }),
    }),
    operation({
      verb: "claims-projects",
      summary: "The projects on the register, by state, kind, status or nation, each with its structural claims and their summed option value.",
      domain: projectsSchema,
      reads: ["structural-claims/project", "structural-claims/claim"],
      run: ({ state, kind, status, nation } = {}) => {
        const statuses = list(status);
        const projects = currentProjects(binding).filter((p) => (!state || p.state === state) && (!kind || p.kind === kind) && (!nation || p.nation === nation) && (!statuses || statuses.includes(p.status)));
        const claims = groupBy(currentClaims(binding, projects), "project");
        return Object.freeze({ projects: projects.map((project) => {
          const structural = (claims.get(project.project) ?? []).filter((claim) => claim.class === "structural");
          const priced = structural.filter((claim) => claim.option.usd !== null);
          return { ...project, dailyDelayCost: dailyDelayCost(project), structuralClaims: structural.length, pricedOptionUsd: priced.reduce((sum, claim) => sum + claim.option.usd, 0), unpricedStructuralClaims: structural.length - priced.length };
        }) });
      },
    }),
    operation({
      verb: "claims-project",
      summary: "Read one project: its record, every claim with class and option value, the parties' interest, contacts, forecasts and engagements.",
      domain: oneProjectSchema,
      reads: ["structural-claims/project", "structural-claims/claim", "structural-claims/contact", "structural-claims/forecast", "structural-claims/engagement"],
      run: ({ project }) => {
        const found = currentProjects(binding).find((p) => p.project === project);
        if (!found) throw new Error(`project ${project} is not on the register`);
        const claims = currentClaims(binding).filter((claim) => claim.project === project);
        const contacts = store.read("contact", { enterprise: CLAIMS_ENTERPRISE }).filter((c) => c.project === project);
        const parties = [...new Set([...claims.map((c) => c.holder), ...contacts.map((c) => c.party)])].map((party) => ({ party, interest: interestReading(contacts.filter((c) => c.party === party)) }));
        return Object.freeze({
          ...found, dailyDelayCost: dailyDelayCost(found), claims, parties, contacts,
          forecasts: recordsOf(binding, "forecast").filter((f) => f.project === project),
          engagements: [...groupBy(store.read("order", { enterprise: CLAIMS_ENTERPRISE }).filter((e) => e.project === project), "engagement").values()].map(engagementState),
        });
      },
    }),
    operation({
      verb: "claims-claim-record",
      summary: "Record a party's claim against a project: what it constrains, what its violation does, the delay it can impose, and the sources.",
      description: "The class is derived: structural if it constrains an operation and its violation pauses, redoes, denies or goes to court; aspirational if consulted or reported without consequence; decorative if it constrains nothing.",
      domain: claimSchema,
      writes: ["structural-claims/claim"],
      run: (input, _args, context) => {
        claimClass(input);
        const claim = input.claim ?? slug(`${input.project}-${input.holder}-${input.kind ?? "claim"}`);
        return writeRecord(binding, "claim", { by: subjectOf(context), ...input, claim, ...(input.sources === undefined ? {} : { sources: list(input.sources) }) });
      },
    }),
    operation({
      verb: "claims-register",
      summary: "The register: every claim with its class and option value, structural and priced first, filterable by project, holder, class and value.",
      domain: registerSchema,
      reads: ["structural-claims/project", "structural-claims/claim"],
      run: ({ project, holder, classes, minUsd } = {}) => {
        const wanted = list(classes);
        const claims = currentClaims(binding).filter((c) => (!project || c.project === project) && (!holder || c.holder === holder) && (!wanted || wanted.includes(c.class)) && (minUsd === undefined || (c.option.usd ?? -1) >= minUsd));
        const order = { structural: 0, aspirational: 1, unclassified: 2, decorative: 3 };
        claims.sort((a, b) => order[a.class] - order[b.class] || (b.option.usd ?? -1) - (a.option.usd ?? -1));
        const byClass = Object.fromEntries(Object.keys(order).map((k) => [k, claims.filter((c) => c.class === k).length]));
        return Object.freeze({ byClass, pricedOptionUsd: claims.reduce((sum, c) => sum + (c.option.usd ?? 0), 0), claims });
      },
    }),
    operation({
      verb: "claims-contact-log",
      summary: "Log one call, email or meeting with a party (a council, a county, a community group, a developer): outcome, callback time and notes.",
      description: "Interested, callback and discovery call set tell for the party's interest; not interested and remove tell against; the rest tell nothing.",
      domain: contactSchema,
      writes: ["structural-claims/contact"],
      run: (input, _args, context) => store.contact({ by: subjectOf(context), ...input, enterprise: CLAIMS_ENTERPRISE }, CONTACT_OUTCOMES),
    }),
    operation({
      verb: "claims-call-queue",
      summary: "The next parties to call: callbacks now due first, then holders of structural claims not reached lately, the richest options first.",
      description: "A party that declined or asked to be removed drops out. Each row names the party, its projects, its structural claims and their priced value.",
      domain: queueSchema,
      reads: ["structural-claims/project", "structural-claims/claim", "structural-claims/contact"],
      run: ({ limit = 40, quietDays = settings()["quiet-days"] } = {}) => {
        const now = Date.now();
        const contacts = groupBy(store.read("contact", { enterprise: CLAIMS_ENTERPRISE }), "party");
        const holders = groupBy(currentClaims(binding).filter((c) => c.class === "structural"), "holder");
        const parties = new Set([...holders.keys(), ...contacts.keys()]);
        const due = [];
        const fresh = [];
        for (const party of parties) {
          const history = contacts.get(party) ?? [];
          const interest = interestReading(history);
          if (interest === "denied" || interest === "contested") continue;
          const claims = holders.get(party) ?? [];
          const row = { party, interest, projects: [...new Set(claims.map((c) => c.project))], structuralClaims: claims.length, pricedOptionUsd: claims.reduce((sum, c) => sum + (c.option.usd ?? 0), 0) };
          const last = latest(history);
          if (last?.callbackAt && Date.parse(last.callbackAt) <= now) due.push({ ...row, reason: `callback due ${last.callbackAt}`, lastNotes: last.notes ?? "" });
          else if (claims.length > 0 && (!last || now - Date.parse(last.recordedAt) > quietDays * 86_400_000)) fresh.push({ ...row, reason: last ? `last reached ${String(last.recordedAt).slice(0, 10)}` : "not yet called", lastNotes: last?.notes ?? "" });
        }
        fresh.sort((a, b) => b.pricedOptionUsd - a.pricedOptionUsd || b.structuralClaims - a.structuralClaims);
        return Object.freeze({ due: due.length, fresh: fresh.length, queue: [...due, ...fresh].slice(0, limit) });
      },
    }),
    operation({
      verb: "claims-forecast-record",
      summary: "Forecast whether a project will be delayed, downsized, cancelled or proceed by a date, with a probability, a rationale and sources.",
      description: "Recorded through the forecasting service's forecast record, so it is scored the same way as every other house forecast.",
      domain: forecastSchema,
      writes: ["structural-claims/forecast"],
      run: (input, _args, context) => {
        const question = slug(`${input.project}-${input.outcome}-by-${input.by}`);
        const forecast = createForecast({
          questionId: question, probability: input.probability, rationale: input.rationale,
          evidenceCitations: list(input.sources).map((source) => ({ source })), timestamp: new Date().toISOString(),
        });
        return writeRecord(binding, "forecast", { by: subjectOf(context), project: input.project, outcome: input.outcome, resolvesBy: input.by, question, ...forecast });
      },
    }),
    operation({
      verb: "claims-forecast-resolve",
      summary: "Resolve a capture forecast: did it happen by its date. Records the outcome and the forecast's Brier score.",
      domain: resolveSchema,
      reads: ["structural-claims/forecast"],
      writes: ["structural-claims/resolution"],
      run: ({ question, happened, notes }, _args, context) => {
        const forecast = latest(recordsOf(binding, "forecast").filter((f) => f.question === question));
        if (!forecast) throw new Error(`no forecast for ${question}`);
        const outcome = happened ? 1 : 0;
        return writeRecord(binding, "resolution", { by: subjectOf(context), question, project: forecast.project, outcome, brier: brierScore(forecast.probability, outcome), ...(notes ? { notes } : {}) });
      },
    }),
    operation({
      verb: "claims-forecasts",
      summary: "Every capture forecast with its resolution and Brier score, and the mean score of the resolved ones: the register's public track record.",
      domain: emptySchema,
      reads: ["structural-claims/forecast", "structural-claims/resolution"],
      run: () => {
        const resolutions = new Map(recordsOf(binding, "resolution").map((r) => [r.question, r]));
        const forecasts = recordsOf(binding, "forecast").map((f) => ({ ...f, resolution: resolutions.get(f.question) ?? null }));
        const scored = forecasts.filter((f) => f.resolution);
        return Object.freeze({ forecasts, resolved: scored.length, meanBrier: scored.length ? scored.reduce((sum, f) => sum + f.resolution.brier, 0) / scored.length : null });
      },
    }),
    operation({
      verb: "claims-engagement-record",
      summary: "Move an engagement with a party to a stage (lead, contacted, discovery set, proposal, engaged, delivered, paid, dead), with its fee, the caller and the caller's share.",
      domain: engagementSchema,
      writes: ["structural-claims/engagement"],
      run: (input, _args, context) => {
        const engagement = input.engagement ?? slug(`${input.party}-${input.project ?? "engagement"}`);
        const recorded = store.order({ by: subjectOf(context), ...input, enterprise: CLAIMS_ENTERPRISE, order: engagement, engagement });
        if (input.stage !== "paid") return recorded;
        const state = engagementState(store.read("order", { enterprise: CLAIMS_ENTERPRISE, engagement }));
        const share = Number.isFinite(state.callerShare) ? state.callerShare : settings()["caller-share"];
        const settlement = store.settlement({
          enterprise: CLAIMS_ENTERPRISE, order: engagement, date: new Date().toISOString().slice(0, 10), received: state.feeUsd ?? 0,
          parties: [state.party].filter(Boolean), userValue: [],
          shares: state.caller && Number.isFinite(state.feeUsd) ? [{ party: state.caller, office: "claims-caller", share, amount: Math.round(state.feeUsd * share * 100) / 100, basis: "the caller's share of the engagement's fee" }] : [],
          witness: input.notes ?? null,
        });
        return Object.freeze({ ...recorded, settlement });
      },
    }),
    operation({
      verb: "claims-pipeline",
      summary: "Every engagement at its stage, with fees, what each caller is owed on paid engagements, and what they can expect from open ones.",
      domain: emptySchema,
      reads: ["structural-claims/engagement"],
      run: () => {
        const engagements = [...groupBy(store.read("order", { enterprise: CLAIMS_ENTERPRISE }), "engagement").values()].map(engagementState);
        const byStage = Object.fromEntries(ENGAGEMENT_STAGES.map((stage) => [stage, engagements.filter((e) => e.stage === stage).length]));
        const callers = new Map();
        for (const e of engagements) {
          const key = e.caller ?? "unnamed";
          const entry = callers.get(key) ?? { caller: key, owedUsd: 0, expectedUsd: 0 };
          entry.owedUsd += e.callerOwedUsd ?? 0;
          entry.expectedUsd += e.callerExpectedUsd ?? 0;
          callers.set(key, entry);
        }
        return Object.freeze({
          byStage,
          paidFeesUsd: engagements.filter((e) => e.stage === "paid").reduce((sum, e) => sum + (e.feeUsd ?? 0), 0),
          openFeesUsd: engagements.filter((e) => !["paid", "dead"].includes(e.stage)).reduce((sum, e) => sum + (e.feeUsd ?? 0), 0),
          callers: [...callers.values()],
          engagements,
        });
      },
    }),
  ]);
}
