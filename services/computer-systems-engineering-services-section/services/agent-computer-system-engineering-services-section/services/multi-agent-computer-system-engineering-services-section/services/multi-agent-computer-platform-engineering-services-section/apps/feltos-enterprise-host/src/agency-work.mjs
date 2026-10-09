import { admitAgencyWorkExecution } from "@red-cup-engineering/feltos/work/agency-work-execution";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { operationDescriptor } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { configuredWorkSourceRepository, configuredWorkSourceTask, sourceTaskSessionObservation } from "@red-cup-engineering/metroplat/source-repository";
import { allocationSources } from "@red-cup-engineering/metroplat/allocation-sources";
import { codexAgencyWorkProvider } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/agency-work";
import { codexNodeOptions } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/codex/operations";
import { claudeCodeAgencyWorkProvider, officeAgentDefinition } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/claude-code/agency-work";
import { antigravityAgencyWorkProvider } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/antigravity/agency-work";
import { BOUNDED_INFERENCE_SERVICE_MODEL } from "@red-cup-engineering/computer-inference-engine/dispatch/inference-work-lot-source";
import { recordAcceptedWorkInferenceOutcome } from "@red-cup-engineering/computer-inference-engine/dispatch/accepted-work-outcome";
import { workInferenceCoordinate } from "@red-cup-engineering/computer-inference-engine/dispatch/work-inference-coordinate";
import { allowanceLedgerPath, readAllowanceLedger } from "@red-cup-engineering/computer-inference-engine/media/allowance-ledger";
import { subscriptionAllowance } from "@red-cup-engineering/computer-inference-engine/media/subscription-allowances";
import { selectInferenceSource } from "@red-cup-engineering/computer-inference-engine/dispatch/source-selection";
import { admitCapabilityAssertions, readCapabilityAssertions } from "@red-cup-engineering/computer-system-engine/rpc/capability-assertions";
import { authorizationFromCapabilityAssertions, authorizationFromStanding } from "@red-cup-engineering/computer-system-engine/rpc/dispatch";
import { defaultFilesystemBinding } from "@red-cup-engineering/computer-system-engine/rpc/binding";
import { journalRpcWitness } from "@red-cup-engineering/computer-system-engine/rpc/journal-witness";
import { encounterExecutionControl } from "@red-cup-engineering/feltos/encounter/control";
import { journalEncounterStore } from "@red-cup-engineering/feltos/encounter/store";
import { inferenceProviderOperation, witnessedInferenceEncounterPort } from "@red-cup-engineering/feltos/agents/inference/rpc";
import { AGENT_WORKER_BOUNDS, AGENT_WORKER_STAGE_VERBS } from "@red-cup-engineering/feltos/agents/worker";
import { executeAgencyWorkProvider } from "@red-cup-engineering/feltos/work/agency-work-provider";
import { charterProviderDelegationAuthorizer, journalProviderDelegationAuthorizer, journalWorkDischargeReceiverAuthorizer, providerDelegationAuthorityAnchorFromFile } from "@red-cup-engineering/feltos/work/provider-delegation-authority";
import { capabilityGrant, grantAssertion } from "@red-cup-engineering/computer-networking-engineering-services-section/object-capability";
import { firmPoolAuthorityResolver } from "@red-cup-engineering/metroplat/firm-pool-authority";
import { agencyAt, admitCharacterMasks, admitHarnessCarriers, coordinatingOffice, coordinatingOfficeSession, currentHarnessCarrier, currentHarnessCarriers, delegatingOffice, harnessModelCharacterResolver, isMaskedCharacter, officeServiceSession, officesOfAccount, providerDelegationOffices, providersOfAccount } from "@red-cup-engineering/metroplat/offices";
import { resolve } from "@red-cup-engineering/organizing/agency";
import { workResultProposalByReceipt } from "@red-cup-engineering/feltos/work/work-result-proposal";
import { admitWorkDischargeWithProposal, resolveWorkDischarge, workResultReceivingBySession } from "@red-cup-engineering/feltos/work/work-discharge";
import { bestStaffing, joinStandings, thompsonDraw } from "@red-cup-engineering/organizing/work/staffing";
import { outcomeJournal, outcomeOf, outcomeStandingIndexOf, perishablePrice, pricedCostOf, proposalResources, readStandingIndex, resourcePricesAt, resourcePricesIndexOf } from "@red-cup-engineering/organizing/enterprise";
import { carrierStandingOfQueue } from "@red-cup-engineering/feltos/work/allocation-control";
import { processIsoNow } from "@red-cup-engineering/node-process-services-section/clock";
import { inferenceReceivingCarrier, directEndpointReceivingTransport } from "@red-cup-engineering/agent-harness-computer-system-engineering-services-section/carrier/inference-receiving-carrier";
import { loadDirectEndpointProviderDescriptors } from "@red-cup-engineering/computer-inference-engine/dispatch/direct-endpoint-provider";
import { modelFamily, rankReceivers, receivedOutcomeFields } from "./receiver-independence.mjs";
import { publicationPlanForHostedOutcome } from "./publication-plan-resource.mjs";

function positiveInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new RangeError(name + " must be a positive integer");
  return number;
}

export const ANTIGRAVITY_DEFAULT_OFFICES = Object.freeze(["junior-engineer", "engineering-assurance-engineer", "verifies:*"]);
/** The office the inference receiver serves: receiving only, never a duty. */
export const INFERENCE_RECEIVER_DEFAULT_OFFICES = Object.freeze(["engineering-assurance-engineer"]);
const INFERENCE_RECEIVER_DEFAULT_PROVIDER = "urn:ame:groq-inference-team";

const listOf = (value) => (value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);

/**
 * The offices a carrier's declared service reaches, as office keys of `agency`. An entry names an
 * office, or selects offices by the role they bear: `verifies:<colour>` every office that verifies
 * in that colour, `verifies:*` every verifier office. A selector is read against the agency as it
 * stands, so a verifier office an enterprise founds by its own act is served once founded, with no
 * deployment naming it.
 */
export function servedOfficesOf(agency, serves = []) {
  const keys = new Set();
  for (const entry of serves) {
    const role = /^verifies:(.+)$/u.exec(entry)?.[1];
    if (role === undefined) {
      const key = resolve(agency, "offices", entry)?.key;
      if (key !== undefined) keys.add(key);
      continue;
    }
    for (const [key, office] of agency.offices) {
      const verifies = office.authored?.verifies;
      if (typeof verifies === "string" && (role === "*" || verifies === role)) keys.add(key);
    }
  }
  return Object.freeze([...keys]);
}

/** The offices a character's carrier may serve when it is bounded to its reach: the offices the
 *  character holds or its deployment declares it serves (a carrier that holds no seat serves by
 *  allocation, so its reach is what the host declares for it), and every office those preside over. */
export function officeReach(binding, agency, character, serves = []) {
  const reach = new Set();
  const pending = [
    ...officesOfAccount(binding, character, agency).map(({ office }) => office),
    ...servedOfficesOf(agency, serves),
  ];
  while (pending.length > 0) {
    const key = pending.pop();
    if (reach.has(key)) continue;
    reach.add(key);
    const record = agency.offices.get(key);
    for (const ref of record?.presidesOver ?? []) {
      const presided = resolve(agency, "offices", ref, record.sectionPath)?.key;
      if (presided !== undefined) pending.push(presided);
    }
  }
  return reach;
}

/** A carrier's exchange rate per attempt, read from its subscription's windows, held for a minute. */
function subscriptionPricing(dialect, environment) {
  let held;
  return () => {
    if (held !== undefined && Date.now() - held.at < 60_000) return held.value;
    let value;
    try {
      const { reading } = readAllowanceLedger(subscriptionAllowance(dialect.allowance), { storePath: allowanceLedgerPath(environment) });
      value = perishablePrice(reading);
    } catch (error) {
      value = Object.freeze({ price: 1, exhausted: false, binding: null, unread: error instanceof Error ? error.message : String(error) });
    }
    held = { at: Date.now(), value };
    return value;
  };
}

/**
 * The inference receiver: a carrier of a provider family the producers and the agent-CLI
 * receivers are not, so independence-first receiving can pick it over them. It is a provider CIE's
 * direct endpoint lane admits for schema-bound work, carrying its pinned model, and it serves
 * receiving only. Absent when that provider is not admitted and credentialed on this host, or its model names
 * no known family and the deployment declares none.
 */
export function inferenceReceiver({ binding, identity, environment, repositoryRoot, onReceivingSession }) {
  if (environment.METROPLAT_INFERENCE_RECEIVER === "off") return undefined;
  const actor = environment.METROPLAT_INFERENCE_RECEIVER_PROVIDER ?? INFERENCE_RECEIVER_DEFAULT_PROVIDER;
  const admitted = () => loadDirectEndpointProviderDescriptors(environment, { configPath: environment.DIRECT_ENDPOINT_PROVIDER_CONFIG })
    .find((descriptor) => descriptor.provider === actor && descriptor.capabilities.includes("json-schema-output"));
  let first;
  try { first = admitted(); } catch { return undefined; }
  if (first === undefined) return undefined;
  const family = modelFamily(first.model) ?? environment.METROPLAT_INFERENCE_RECEIVER_FAMILY;
  if (family === undefined) return undefined;
  const workerId = environment.METROPLAT_INFERENCE_RECEIVER_WORKER ?? `inference-receiver-${first.providerId ?? actor.slice(actor.lastIndexOf(":") + 1)}`;
  return {
    workerId, harness: "inference-receiver", family, models: [first.model], bounded: true, receivingOnly: true,
    serves: environment.METROPLAT_INFERENCE_RECEIVER_OFFICES === undefined ? INFERENCE_RECEIVER_DEFAULT_OFFICES : listOf(environment.METROPLAT_INFERENCE_RECEIVER_OFFICES),
    // Its window is the provider's own and staffing holds no measured price for it yet, so staffing leaves it unpriced (0).
    pricing: () => Object.freeze({ price: 0, exhausted: false, binding: null }),
    adapter: inferenceReceivingCarrier({
      workerId, dataRoot: path.resolve(binding.dataRoot), nodeName: identity.id, model: first.model, family, repositoryRoot,
      label: `${first.providerId ?? actor} receiver`, evidenceScheme: `${first.providerId ?? "inference"}-receiving`,
      onReceivingSession,
      // Each attempt reads the endpoint's admission afresh and must find the same model.
      descriptor: () => {
        const current = admitted();
        if (current === undefined || current.model !== first.model) throw new TypeError(`${actor} no longer admits ${first.model} for schema-bound work`);
        return current;
      },
      dispatch: (call) => directEndpointReceivingTransport(call, { environment }),
    }),
  };
}

/**
 * The agent-CLI carriers this host runs, each the carrier contract (agent-harness
 * `carrier/agency-carrier.mjs`) in its own dialect, for the character its deployment names:
 *
 *   Codex        `METROPLAT_CODEX_WORKER`; its sessions are the codex node's service, whichever
 *                micro-enterprise's work they do.
 *   Claude Code  `METROPLAT_CLAUDE_WORKER`, carrying the models `METROPLAT_CLAUDE_MODELS` names on
 *                the subscription this host is signed in to. That subscription also carries the
 *                house's interactive sessions, so the carrier is bounded to its character's reach
 *                (the offices it holds and those they preside over), and its standing session is
 *                admitted for each model so allocation can choose it before its first run.
 *   Antigravity  `METROPLAT_ANTIGRAVITY_WORKER`, carrying the models `METROPLAT_ANTIGRAVITY_MODELS`
 *                names on the Google AI Pro subscription, as its carrier home
 *                (`METROPLAT_ANTIGRAVITY_HOME`: its permissions and its own MetroPlat client) and
 *                confined by its unit to what each session's effects grant. Bounded and standing as
 *                Claude Code is.
 *   Inference receiver  the direct-endpoint model CIE admits for schema-bound work (by default Groq's
 *                `qwen/qwen3.8-27b`), serving receiving only (`METROPLAT_INFERENCE_RECEIVER_OFFICES`, by default the
 *                engineering-assurance-engineer): the carrier contract's receiving part over a schema-bound call, not a
 *                coding session. Its `family` is the independence class receiving ranks by; it carries no execution.
 *                Present when its provider is admitted and credentialed; `METROPLAT_INFERENCE_RECEIVER=off` withholds it.
 *
 * Each is `{ workerId, harness, adapter, family?, models?, bounded?, receivingOnly?, pricing }`; `pricing()` is its exchange
 * rate per attempt, read from its subscription's windows in the host-wide allowance ledger
 * (organizing `perishablePrice`): capacity a window will lapse unspent costs nearly nothing, and a
 * window spent out takes the carrier out of staffing until it turns. An allowance the house has not
 * read prices at the unit, since an unknown is never free.
 */
function hostedCarriers({ binding, identity, environment, enterprise, firmPoolRoot, onSession, onReceivingSession, onSourceBinding, onSourceResult, operationOf, sourceBindingOf, bindSourceGit, publishSourceCandidate, sourcePreparationOf, prepareSourceBinding }) {
  const carriers = [];
  const repositoryRoot = environment.METROPLAT_REPOSITORY_ROOT ?? process.cwd();
  if (environment.METROPLAT_CODEX_WORKER) {
    const codexNode = codexNodeOptions(binding, { environment, workspace: repositoryRoot });
    carriers.push({
      workerId: environment.METROPLAT_CODEX_WORKER, harness: "codex", family: "openai",
      adapter: codexAgencyWorkProvider({
        workerId: environment.METROPLAT_CODEX_WORKER,
        onSession, onReceivingSession, onSourceBinding, onSourceResult,
        bindGit: bindSourceGit, publishSourceCandidate, sourcePreparationOf,
        dataRoot: codexNode.dataRoot,
        formerRoots: codexNode.formerRoots,
        toldRoot: codexNode.toldRoot,
        nodeName: identity.id,
        enterprise,
        metroplatServer: environment.METROPLAT_CODEX_MCP_SERVER,
        characterName: environment.METROPLAT_CODEX_CHARACTER_NAME ?? "the Codex character",
        cwd: environment.METROPLAT_CODEX_WORKSPACE ?? repositoryRoot,
        repositoryOf: spec => configuredWorkSourceRepository(environment.METROPLAT_CODEX_WORKSPACE ?? repositoryRoot, spec, { operationOf, sourceBindingOf, bindSourceGit, publishSourceCandidate, sourcePreparationOf, prepareSourceBinding }),
        // No deployment names the model: an allocation carries its derived carrier, and the session observes the one that ran.
        ...(environment.METROPLAT_CODEX_BIN ? { codex: environment.METROPLAT_CODEX_BIN } : {}),
      }),
    });
  }
  const claudeModels = listOf(environment.METROPLAT_CLAUDE_MODELS);
  if (environment.METROPLAT_CLAUDE_WORKER && claudeModels.length > 0) {
    const house = path.resolve(binding.dataRoot);
    carriers.push({
      workerId: environment.METROPLAT_CLAUDE_WORKER, harness: "claude-code", family: "anthropic", models: claudeModels, bounded: true, serves: listOf(environment.METROPLAT_CLAUDE_OFFICES),
      adapter: claudeCodeAgencyWorkProvider({
        workerId: environment.METROPLAT_CLAUDE_WORKER,
        onSession, onReceivingSession, onSourceBinding, onSourceResult,
        bindGit: bindSourceGit, publishSourceCandidate, sourcePreparationOf,
        dataRoot: house,
        toldRoot: house,
        nodeName: identity.id,
        enterprise,
        mcpServer: environment.METROPLAT_CLAUDE_MCP_SERVER ?? "metroplat",
        mcpConfig: environment.METROPLAT_CLAUDE_MCP_CONFIG ?? path.join(repositoryRoot, ".mcp.json"),
        characterName: environment.METROPLAT_CLAUDE_CHARACTER_NAME ?? "the Claude Code character",
        cwd: repositoryRoot,
        repositoryOf: spec => configuredWorkSourceRepository(repositoryRoot, spec, { operationOf, sourceBindingOf, bindSourceGit, publishSourceCandidate, sourcePreparationOf, prepareSourceBinding }),
        officeAgent: (office) => officeAgentDefinition({ repoRoot: repositoryRoot, agency: agencyAt(firmPoolRoot), office }),
        ...(environment.METROPLAT_CLAUDE_BIN ? { claude: environment.METROPLAT_CLAUDE_BIN } : {}),
      }),
    });
  }
  const antigravityModels = listOf(environment.METROPLAT_ANTIGRAVITY_MODELS);
  if (environment.METROPLAT_ANTIGRAVITY_WORKER && environment.METROPLAT_ANTIGRAVITY_HOME && antigravityModels.length > 0) {
    const house = path.resolve(binding.dataRoot);
    carriers.push({
      workerId: environment.METROPLAT_ANTIGRAVITY_WORKER, harness: "antigravity", family: "google", models: antigravityModels, bounded: true,
      // It holds no seat: it serves the offices its deployment names, by default the bottom of the engineering
      // line, its receiving office and every verifier office (an independent family to judge deliveries
      // other carriers made), so allocation and receiving staff it by the one carrier contract.
      serves: environment.METROPLAT_ANTIGRAVITY_OFFICES === undefined ? ANTIGRAVITY_DEFAULT_OFFICES : listOf(environment.METROPLAT_ANTIGRAVITY_OFFICES),
      adapter: antigravityAgencyWorkProvider({
        workerId: environment.METROPLAT_ANTIGRAVITY_WORKER,
        onSession, onReceivingSession, onSourceBinding, onSourceResult,
        bindGit: bindSourceGit, publishSourceCandidate, sourcePreparationOf,
        dataRoot: house,
        toldRoot: house,
        nodeName: identity.id,
        enterprise,
        mcpServer: environment.METROPLAT_ANTIGRAVITY_MCP_SERVER ?? "metroplat",
        characterName: environment.METROPLAT_ANTIGRAVITY_CHARACTER_NAME ?? "the Antigravity character",
        home: environment.METROPLAT_ANTIGRAVITY_HOME,
        cwd: repositoryRoot,
        ...(environment.METROPLAT_ANTIGRAVITY_BIN ? { agy: environment.METROPLAT_ANTIGRAVITY_BIN } : {}),
      }),
    });
  }
  const receiver = inferenceReceiver({ binding, identity, environment, repositoryRoot, onReceivingSession });
  if (receiver !== undefined) carriers.push(receiver);
  // A carrier's service is read as office keys against the agency as it stands at each read.
  return Object.freeze(carriers.map(({ serves, ...carrier }) => {
    const hosted = { ...carrier, pricing: carrier.pricing ?? subscriptionPricing(carrier.adapter.dialect, environment) };
    if (serves !== undefined) Object.defineProperty(hosted, "serves", { enumerable: true, get: () => servedOfficesOf(agencyAt(firmPoolRoot), serves) });
    return Object.freeze(hosted);
  }));
}

// One outcome journal per root (organizing/enterprise/outcomes), told into without reading it: a
// received result's outcome is unique by its receipt, so the day's segment admits it once. Staffing
// reads the carrier standing the acceptance readout folds from the journal (its standing index), at
// most once a minute, never the journal itself.
const outcomeJournals = new Map();
const outcomeJournalOf = (root) => outcomeJournals.get(root) ?? outcomeJournals.set(root, outcomeJournal(root, { dedupe: "day" })).get(root);
const standingIndexes = new Map();
function journalStandingOf(environment) {
  const path = outcomeStandingIndexOf({ environment });
  if (path === undefined) return new Map();
  const held = standingIndexes.get(path);
  if (held !== undefined && Date.now() - held.at < 60_000) return held.standing;
  const standing = readStandingIndex(path);
  standingIndexes.set(path, { at: Date.now(), standing });
  return standing;
}

/** The host composes agent execution, inference, and delegation for one installed organization. */
export function enterpriseAgencyWorkOptions({
  identity, dataRoot, environment, processConfig, operationOf, operationSurface, workBinding, enterprise, sourceBindingOf, bindSourceGit, publishSourceCandidate, sourcePreparationOf, prepareSourceBinding,
}) {
  const rootName = identity.id;
  const binding = defaultFilesystemBinding(dataRoot);
  const owning = workBinding ?? binding;
  const firmPoolRoot = processConfig.firmPoolRoot ?? environment.METROPLAT_AGENCY_ROOT;
  const resolveAgencyWorkAuthority = firmPoolRoot === undefined ? undefined
    : (allocation, declared) => firmPoolAuthorityResolver({ firmPoolRoot }, binding)(allocation, declared);

  const workerModel = environment.METROPLAT_AGENT_WORKER_MODEL;
  const workerId = !workerModel ? undefined : environment.METROPLAT_AGENT_WORKER_ID ?? "infograph-worker";
  if (workerId !== undefined && workBinding === undefined) {
    const verbs = new Set([
        ...(environment.METROPLAT_AGENT_WORKER_CAPABILITIES ?? "").split(",").map((value) => value.trim()).filter(Boolean),
    ]);
    const at = processIsoNow();
    admitCapabilityAssertions({
      dataRoot, rootName, date: at.slice(0, 10),
      assertions: [...verbs].map((verb) => grantAssertion(rootName, workerId, rootName + "#" + verb, at)),
    });
  }

  const officeStaffing = (officeRef, { carrier, carriers, attempts = [], standing, efforts, price, orderChannels, draw } = {}) => {
    const office = resolve(agencyAt(firmPoolRoot), "offices", officeRef);
    if (office === undefined) throw new TypeError("staffing: canonical office is absent or ambiguous");
    // An office names no carrier: the best-standing admitted carrier and its effort are derived.
    const eligible = (carriers ?? [carrier]).filter(model => typeof model === "string");
    if (eligible.length === 0) throw new TypeError(`staffing: no admitted carrier qualifies for ${office.id}`);
    return bestStaffing({ carriers: eligible, attempts, standing, ...(efforts === undefined ? {} : { efforts }), ...(price === undefined ? {} : { price }),
      ...(orderChannels === undefined ? {} : { orderChannels }), ...(draw === undefined ? {} : { draw }) });
  };

  // These session facts come from the hosted process artifacts, rather than a
  // claimed invocation identity supplied by a client or an inferred model.
  const surfaceVerbs = () => [...new Set(operationSurface().operations.map(operation => operation.verb))].sort();
  const carrierOf = (character) => carriers.find((carrier) => carrier.workerId === character);
  const admitSession = (carrier, session, at = processIsoNow()) => {
    const observation = sourceTaskSessionObservation(dataRoot, carrier.workerId, session);
    if (!observation.admit) return;
    const sourceTask = observation.sourceTask;
    admitHarnessCarriers({ dataRoot, date: at.slice(0, 10), carriers: [{ kind: "metroplat.harness-carrier", ...(sourceTask === undefined ? {} : { sourceTask }), character: carrier.workerId, model: session.model, ...(session.reasoningEffort === undefined ? {} : { reasoningEffort: session.reasoningEffort }), harness: carrier.harness, session: session.id, capabilities: surfaceVerbs(), reading: "held", issuer: identity.id, at }] });
    admitCharacterMasks({ dataRoot, date: at.slice(0, 10), masks: [{ kind: "metroplat.character-mask", account: `session:${session.id}`, character: carrier.workerId, reading: "held", issuer: identity.id, at }] });
  };
  const recordHostedSession = (item, outcome) => {
    const carrier = carrierOf(item.delegation?.provider ?? item.agent);
    if (outcome?.session === undefined || carrier === undefined) return outcome;
    admitSession(carrier, outcome.session);
    return outcome;
  };
  const recordHostedSource = (item, sourceBinding) => {
    if (item.execution === undefined) throw new TypeError("agency work execution: source capture requires the original execution receipt");
    if (item.execution.sourceBinding !== undefined && item.execution.sourceBinding.id !== sourceBinding.id) throw new TypeError("agency work execution: original source closure changed");
    const receipt = admitAgencyWorkExecution(owning, { ...item, execution: { ...item.execution, sourceBinding } }, "started");
    Object.assign(item.execution, { receipt, sourceBinding });
    return receipt;
  };
  const recordHostedSourceResult = (item, sourceResult) => {
    if (item.execution?.sourceBinding === undefined || sourceResult.sourceBinding !== item.execution.sourceBinding.id) throw new TypeError("agency work execution: source completion has no original captured closure");
    const receipt = admitAgencyWorkExecution(owning, { ...item, execution: { ...item.execution, sourceResult } }, "started");
    Object.assign(item.execution, { receipt, sourceResult });
    return receipt;
  };
  const recordHostedStart = (item, session) => {
    recordHostedSession(item, { session });
    if (item.requiredCarrier !== undefined && (session.model !== item.requiredCarrier.model
      || session.reasoningEffort !== item.requiredCarrier.reasoningEffort)) {
      throw new TypeError("agency work execution: observed session does not meet the obligation's required model and reasoning effort");
    }
    const receipt = admitAgencyWorkExecution(owning, { ...item, execution: { ...item.execution, session: session.id, model: session.model, ...(session.reasoningEffort === undefined ? {} : { reasoningEffort: session.reasoningEffort }) } }, "started");
    if (item.execution !== undefined) Object.assign(item.execution, { receipt, session: session.id, model: session.model, ...(session.reasoningEffort === undefined ? {} : { reasoningEffort: session.reasoningEffort }) });
    return receipt;
  };
  const carriers = hostedCarriers({ binding, identity, environment, enterprise, firmPoolRoot, sourceBindingOf, bindSourceGit, publishSourceCandidate, sourcePreparationOf, prepareSourceBinding,
    onSourceBinding: recordHostedSource, onSourceResult: recordHostedSourceResult,
    operationOf: verb => operationSurface().operations.find(operation => operation.verb === verb),
    onSession: (item, session) => recordHostedStart(item, session),
    onReceivingSession: (review, session) => recordHostedSession(review, { session }) });
  // A carrier with declared models stands ready before its first run: each model is admitted under
  // one standing session, so allocation can choose it, as the hosted worker's is.
  // The standing sessions are admitted once the operation surface is open: a session's capabilities
  // are its verbs, and that surface is the one whose opening constructs these options, so reading it
  // here re-entered operationSurface() mid-construction and failed every boot (1af229b, 2026-10-03).
  // The surface opens asynchronously, so admission waits for it (every second, for ten minutes).
  if (workBinding === undefined) {
    const standing = carriers.filter((entry) => entry.models !== undefined);
    const admitStanding = (attempt = 0) => {
      let surface;
      try { surface = operationSurface(); } catch { surface = undefined; }
      if (surface?.operations === undefined) {
        if (attempt < 600) setTimeout(admitStanding, 1000, attempt + 1).unref();
        else console.error("[agency-work] standing carrier sessions not admitted: the operation surface never opened");
        return;
      }
      try {
        for (const carrier of standing) {
          for (const model of carrier.models) admitSession(carrier, { id: `${carrier.harness}@${identity.id}#${model}`, model });
        }
      } catch (error) {
        console.error(`[agency-work] standing carrier sessions not admitted: ${error?.message ?? error}`);
      }
    };
    if (standing.length > 0) setImmediate(admitStanding);
  }

  let executeInferredWork;
  if (workerId !== undefined) {
    const configured = selectInferenceSource({
      selection: environment.METROPLAT_INFERENCE_SOURCE,
      dataRoot: owning.dataRoot,
      env: environment,
      now: processIsoNow,
      market: {
        agentUrl: environment.METROPLAT_INFERENCE_MARKET_AGENT_CARD,
        desiredUse: "metroplat-production-assistance",
      },
    });
    if (configured.provider === "inference-work-lot.market" && workerModel !== BOUNDED_INFERENCE_SERVICE_MODEL) {
      throw new TypeError("METROPLAT_AGENT_WORKER_MODEL must be " + BOUNDED_INFERENCE_SERVICE_MODEL + " when the inference-work-lot market is selected");
    }
    const encounters = journalEncounterStore(dataRoot, { namespace: rootName });
    const operation = inferenceProviderOperation(configured.provider, configured.source, encounters, encounterExecutionControl());
    // The host that composes the worker's inference port is that port's issuer: the worker holds
    // its own port, or every turn is refused as a subject with unknown standing.
    if (workBinding === undefined) {
      const at = processIsoNow();
      admitCapabilityAssertions({ dataRoot, rootName, date: at.slice(0, 10), assertions: [grantAssertion(identity.id, workerId, capabilityGrant(`inference:${operation.ref}`, operation.verb), at)] });
    }
    const inference = witnessedInferenceEncounterPort({
      operation, encounters, witness: journalRpcWitness(dataRoot, { namespace: rootName }),
      authorize: authorizationFromCapabilityAssertions(
        authorizationFromStanding(new Map([[operation.ref, "held"]]), "infograph-inference-provider"),
        () => readCapabilityAssertions(dataRoot), "settled-capability-assertions",
      ),
      now: processIsoNow,
    });
    // The hosted worker is a harness like a carrier's thread: its one standing session carries the
    // inference pool's model, admitted as a carrier so allocation can choose it, and each run is an
    // invocation of that session, so its proposal has an office origin an independent receiver can judge.
    const session = Object.freeze({ id: `${workerId}@${identity.id}`, model: workerModel });
    if (workBinding === undefined) {
      const at = processIsoNow();
      admitHarnessCarriers({ dataRoot, date: at.slice(0, 10), carriers: [{ kind: "metroplat.harness-carrier", character: workerId, model: workerModel, harness: "metroplat-agent-worker", session: session.id, capabilities: [], reading: "held", issuer: identity.id, at }] });
      admitCharacterMasks({ dataRoot, date: at.slice(0, 10), masks: [{ kind: "metroplat.character-mask", account: `session:${session.id}`, character: workerId, reading: "held", issuer: identity.id, at }] });
    }
    executeInferredWork = async (item) => ({ ...await executeAgencyWorkProvider(item, {
      surface: operationSurface(), dataRoot: owning.dataRoot, rootName, workerId, provider: configured.provider, enterprise,
      model: workerModel, inference, now: processIsoNow, agentBounds: AGENT_WORKER_BOUNDS,
      // Its acts are played by the hand the host admits: the standing session, told as a mask of the worker.
      session: session.id,
    }), session });
  }

  const agencyWorkProviders = Object.freeze([...new Set([...carriers.filter((carrier) => carrier.receivingOnly !== true).map((carrier) => carrier.workerId), workerId].filter((provider) => provider !== undefined))]);
  let authorizeProviderDelegation;
  let authorizeWorkDischargeReceiver;
  if (processConfig.providerDelegationAuthorityAnchor !== undefined) {
    const anchor = providerDelegationAuthorityAnchorFromFile(processConfig.providerDelegationAuthorityAnchor, binding);
    authorizeProviderDelegation = journalProviderDelegationAuthorizer(binding, anchor);
    const authorizeRootReceiver = journalWorkDischargeReceiverAuthorizer(binding, anchor);
    authorizeWorkDischargeReceiver = (request) => {
      const evaluation = authorizeRootReceiver(request);
      if (request.office === undefined) return evaluation;
      const carrier = currentHarnessCarrier(binding, request.receiver, request.session);
      if (carrier.session !== request.session || carrier.model !== request.model) throw new TypeError("work discharge: receiver session is no longer the current admitted harness carrier");
      const office = coordinatingOfficeSession(binding, request.receiver, request.office, request.session, "work-discharge-admit", owning, carrierOf(request.receiver)?.serves);
      return Object.freeze({ ...evaluation, office: office.office, session: carrier.session, model: carrier.model, receivesFrom: office.receivesFrom, invocation: request.invocation });
    };
  } else {
    authorizeProviderDelegation = charterProviderDelegationAuthorizer({
      providers: agencyWorkProviders,
      resolveHolderOffices: (holder) => providerDelegationOffices(binding, holder),
      resolveOffice: (office) => delegatingOffice(binding, office),
      operationOf,
      isConnectedProvider: (provider) => isMaskedCharacter(binding, provider),
    });
    authorizeWorkDischargeReceiver = (request) => {
      const office = coordinatingOfficeSession(binding, request.receiver, request.office, request.session, "work-discharge-admit", owning, carrierOf(request.receiver)?.serves);
      const carrier = office;
      if (carrier.session !== request.session || carrier.model !== request.model) throw new TypeError("work discharge: current office-qualified session is required");
      return Object.freeze({
        evaluation: Object.freeze({ kind: "metroplat.office-incumbency-evaluation", allowed: true, snapshotRevision: carrier.session, evidenceRefs: Object.freeze([`office:${office.officeKey}`, `incumbent:${request.receiver}`, `harness-session:${carrier.session}`, `harness-model:${carrier.model}`, ...(office.allocation === undefined ? [] : [`allocation:${office.allocation}`, `scope:${office.scope}`])]) }),
        office: office.office, session: carrier.session, model: carrier.model, receivesFrom: office.receivesFrom, invocation: request.invocation,
      });
    };
  }

  const executeAgencyWork = carriers.length === 0 && executeInferredWork === undefined ? undefined : async (item) => {
    const carrier = carrierOf(item.delegation?.provider);
    if (carrier !== undefined) {
      const methodResources = (item.requiresCapabilities ?? []).map(verb => {
      const installed = operationSurface().operations.find(operation => operation.verb === verb && item.delegation.operations.includes(operation.ref));
      if (installed === undefined) throw new TypeError("allocated method resource is no longer installed: " + verb);
      const descriptor = operationDescriptor(installed);
      return { verb, ref: descriptor.ref, summary: descriptor.summary, description: descriptor.description, input: descriptor.domain };
      });
      // Acquisition is a trusted source-owner effect after current method/delegation admission.
      // Recovery reads the captured original closure and never resolves a new latest copy.
      if (item.sourceRepository !== undefined && item.execution?.sourceBinding === undefined && prepareSourceBinding !== undefined) {
        if (typeof prepareSourceBinding !== "function" || typeof sourceBindingOf !== "function") throw new TypeError("source execution requires its trusted preparation and retained-binding ports");
        const prepared = await prepareSourceBinding({ sourceRepository: item.sourceRepository, item });
        const held = configuredWorkSourceRepository(environment.METROPLAT_REPOSITORY_ROOT ?? process.cwd(), { item, sourceBinding: prepared }, { sourceBindingOf });
        recordHostedSource(item, held.sourceBinding);
      }
      const outcome = await carrier.adapter({ ...item, methodResources });
      const plan = await publicationPlanForHostedOutcome({
        item,
        outcome,
        sourceRoot: environment.METROPLAT_REPOSITORY_ROOT ?? process.cwd(),
        binding: owning,
        date: processIsoNow().slice(0, 10),
        observedSession: outcome?.session,
        verifyHostedSession: (work, session) => {
          if (work.execution?.session !== session.id || work.execution?.model !== session.model) {
            throw new TypeError("publication plan request does not match the host-recorded execution");
          }
          const admitted = currentHarnessCarrier(binding, work.delegation?.provider, session.id);
          if (admitted.session !== session.id || admitted.model !== session.model
            || (admitted.reasoningEffort !== undefined && admitted.reasoningEffort !== session.reasoningEffort)) {
            throw new TypeError("publication plan request's actual carrier session is no longer admitted");
          }
        },
      });
      return recordHostedSession(item, plan === undefined ? outcome : { ...outcome, result: plan });
    }
    if (executeInferredWork !== undefined && item.delegation?.provider === workerId) return executeInferredWork(item);
    throw new TypeError("No hosted agency-work provider for " + String(item.delegation?.provider));
  };
  const sources = allocationSources({ ...binding, ...(firmPoolRoot === undefined ? {} : { agencyRoot: firmPoolRoot }) });
  const observedModel = character => harnessModelCharacterResolver(binding)(carrierOf(character.id) !== undefined ? { id: character.id, model: character.model } : character);
  // A model's admission proves its carrier. Tools are supplied by this installed
  // host, not frozen into that model's last session; delegation still authorizes
  // the exact method resources at allocation and execution boundaries.
  const hosts = character => carrierOf(character.id) !== undefined
    || (character.id === workerId && executeInferredWork !== undefined);
  const hostedCharacter = character => !hosts(character) ? character : {
    ...character, capabilities: surfaceVerbs(),
  };
  const onAcceptedWork = workerId === undefined || !environment.EXPECTED_RESOLUTION_PRICING_ROOT ? undefined
    : ({ proposal, discharge }) => recordAcceptedWorkInferenceOutcome({
      proposal, discharge, pricingRoot: environment.EXPECTED_RESOLUTION_PRICING_ROOT, workProvider: workerId,
    });
  // Receiving is the power to admit a work discharge. The host admits the receiver's judgement
  // into the root that owns the proposal, as it admits execution's proposal there: every
  // micro-enterprise's work is received in its own root. Any carrier whose character holds an
  // office with that power, and whose office receives from the proposal's origin, can receive it;
  // the receiver is the most independent of them: another character before another model of the
  // producer's own, and another model before the producer's.
  const receivingVerb = "work-discharge-admit";
  // What every register other than the queue's own receipts judged of each carrier's work (arena
  // assays, editors, the inference market), joined into allocation's and receiving's staffing.
  const readCarrierStanding = () => journalStandingOf(environment);
  // Every received result is a judgment of delivered work, told once as an outcome in the node's
  // journal: its receiving office judged the work its origin office delivered, carried by the
  // origin's model. A failure to tell never undoes the receipt.
  const tellReceivedOutcome = ({ proposal, discharge, office, at }) => {
    try {
      if (proposal?.origin?.office === undefined || discharge.result?.kind !== "skill-result") return;
      // The delivery coordinate is optional provenance. An unavailable pricing
      // record must not prevent telling the independently received native outcome.
      let market;
      try {
        market = workInferenceCoordinate({
          proposal, pricingRoot: environment.EXPECTED_RESOLUTION_PRICING_ROOT, workProvider: workerId,
        });
      } catch (error) {
        console.error("[work-discharge] inference coordinate remains unlinked:", error instanceof Error ? error.message : String(error));
      }
      outcomeJournalOf(binding.dataRoot).record(outcomeOf({
        ...receivedOutcomeFields({ proposal, discharge, office, at }),
        ...(market === undefined ? {} : { market }), resources: proposalResources(proposal),
      }));
    } catch (error) {
      console.error("[work-discharge] outcome remains untold:", error instanceof Error ? error.message : String(error));
    }
  };
  // The independence class of a producing character: its carrier's family, or its pool model's.
  const declaredFamilyOf = (character) => carrierOf(character)?.family ?? (character === workerId ? modelFamily(workerModel) : undefined);
  const receivingCarriers = carriers.filter((carrier) => typeof carrier.adapter.receive === "function");
  const readAgencyWorkReceiving = receivingCarriers.length === 0 ? undefined : (read, owningBinding) => {
    const standing = joinStandings(carrierStandingOfQueue(read?.queue), readCarrierStanding());
    const receiversOf = receivingCarriers.flatMap((carrier) => {
      const served = (carrier.serves ?? []).map(ref => delegatingOffice(binding, ref)).filter(office => office !== undefined);
      const held = [...new Map([...providerDelegationOffices(binding, carrier.workerId), ...served].map(office => [office.office, office])).values()]
        .filter(office => office.powers.includes(receivingVerb));
      const admitted = currentHarnessCarriers(binding, carrier.workerId);
      // Coordination is the worker's standing in an office; its admitted sessions only carry it.
      const models = [...new Set(admitted.map(entry => entry.model).filter(model => typeof model === "string" && model.length > 0
        && (carrier.models === undefined || carrier.models.includes(model))))];
      if (models.length === 0) return [];
      return held.flatMap(office => {
        try { return [{ carrier, ...coordinatingOffice(binding, carrier.workerId, office.office, receivingVerb, owningBinding, carrier.serves), models }]; }
        catch { return []; }
      });
    });
    if (receiversOf.length === 0) return [];
    return (read?.queue ?? []).filter(item => item.reasons?.includes("result-awaiting-receipt") && item.execution?.receipt !== undefined).flatMap(item => {
      // A receipt is read in the causal subject that recorded it: the execution's, not the duty's derived subject.
      const proposal = workResultProposalByReceipt(owningBinding, item.execution.receipt, item.execution.subject ?? item.subject);
      if (proposal.origin === undefined || proposal.result.kind !== "skill-result") return [];
      const qualified = receiversOf.filter(receiver => receiver.office !== proposal.origin.office && receiver.receivesFrom.includes(proposal.origin.office));
      if (qualified.length === 0) return [];
      // Most independent first (receiver-independence.mjs), then cheapest; a receiver that cannot take the receipt
      // (its window spent out, or its attempts on this proposal exhausted) yields to the next most independent.
      for (const authority of rankReceivers(qualified, proposal, declaredFamilyOf)) {
        const staffing = officeStaffing(authority.office, {
          carriers: authority.models, standing, price: Math.min(1, authority.carrier.pricing().price) });
        if (staffing?.exhausted === true) continue;
        const review = { agent: authority.carrier.workerId, allocatedModel: staffing.carrier, scope: proposal.scope,
          delegation: { provider: authority.carrier.workerId }, office: authority.office, proposal, staffing, root: owningBinding.dataRoot,
          ...(item.sourceRepository === undefined ? {} : { sourceRepository: item.sourceRepository }) };
        if (authority.carrier.adapter.receivingExhausted?.(review) === true) continue;
        // Ended agent turns remain terminal. Only the provider's bounded,
        // evidenced transport/capacity recovery can reopen a failed start.
        // A judgement its session made and the host never admitted is admitted now, without a new session.
        return authority.carrier.adapter.receivingFinished(review) && authority.carrier.adapter.receivingJudged?.(review) !== true ? [] : [review];
      }
      return [];
    });
  };
  const receiveAgencyWork = receivingCarriers.length === 0 ? undefined : async review => {
    const carrier = carrierOf(review.agent);
    if (carrier === undefined) throw new TypeError(`independent receiving: no hosted carrier for ${review.agent}`);
    const owning = review.root === binding.dataRoot ? binding : defaultFilesystemBinding(review.root);
    const receiver = { id: carrier.workerId, office: review.office };
    const prior = (session) => workResultReceivingBySession(owning, review.proposal, { ...receiver, session });
    const outcome = await carrier.adapter.receive(review);
    if (outcome.session === undefined) throw new TypeError("independent receiving ended without an observed native session");
    const already = prior(outcome.session.id);
    if (already !== undefined) return { ...already, task: outcome.task, usage: outcome.usage };
    if (outcome.judgement === undefined) throw new TypeError(`independent receiving returned no typed judgement (${outcome.task}, exit ${outcome.exitCode}${outcome.errors?.length ? `: ${outcome.errors.join("; ")}` : ""})`);
    // A receiver that could not inspect the evidence judged nothing: no discharge is admitted, the
    // work stays awaiting receipt, and the carrier's next attempt receives it again.
    if (outcome.judgement.decision === "unverified") throw new TypeError(`independent receiving unverified (${outcome.task}): ${outcome.judgement.text.slice(0, 400)}`);
    const at = processIsoNow();
    const invocation = `${carrier.adapter.dialect.evidence}:${outcome.session.id}`;
    const discharge = resolveWorkDischarge(owning, {
      kind: "metroplat.work.discharge", id: outcome.task, subject: review.proposal.subject, resultReceipt: review.proposal.receipt,
      decision: outcome.judgement.decision, text: outcome.judgement.text,
      receiver: { ...receiver, session: outcome.session.id, evidence: [review.proposal.receipt, invocation] },
      evidence: [review.proposal.receipt, ...outcome.judgement.evidence],
    });
    const receiverAuthorization = authorizeWorkDischargeReceiver({ receiver: carrier.workerId, office: review.office,
      session: outcome.session.id, model: outcome.session.model, invocation,
      scope: discharge.scope, operation: receivingVerb, at });
    const { proposal } = admitWorkDischargeWithProposal(owning, discharge, { at: at.slice(0, 10), receiverAuthorization });
    tellReceivedOutcome({ proposal, discharge, office: review.office, at });
    if (onAcceptedWork !== undefined && discharge.result.kind === "skill-result" && discharge.decision !== "rejected") {
      try { await onAcceptedWork({ proposal, discharge }); }
      catch (error) { console.error("[work-discharge] derived inference outcome remains unrecorded:", error instanceof Error ? error.message : String(error)); }
    }
    const received = prior(outcome.session.id);
    if (received === undefined) throw new TypeError(`independent receiving recorded no native admission (${outcome.task})`);
    return { ...received, task: outcome.task, usage: outcome.usage };
  };
  // A carrier bounded to its character's reach serves only the offices inside it.
  const reachOf = new Map();
  const withinReach = (carrier, office) => {
    if (carrier.bounded !== true) return true;
    const agency = agencyAt(firmPoolRoot);
    if (!reachOf.has(carrier.workerId)) reachOf.set(carrier.workerId, officeReach(binding, agency, carrier.workerId, carrier.serves));
    const key = resolve(agency, "offices", office.id)?.key;
    return key !== undefined && reachOf.get(carrier.workerId).has(key);
  };
  return Object.freeze({
    ...sources,
    sourceTaskOf: (scope, identity, execution) => configuredWorkSourceTask({ scope, identity, execution,
      workBinding: owning, callerBinding: binding, repositoryRoot: environment.METROPLAT_REPOSITORY_ROOT ?? process.cwd(),
      carrierOf, authorizeReceiving: authorizeWorkDischargeReceiver, sourceBindingOf }),
    ...(readAgencyWorkReceiving === undefined ? {} : { readAgencyWorkReceiving, receiveAgencyWork }),
    readCarrierStanding,
    // Inside the entity a crossing is valued at its provider's witnessed cost (enterprise/crossings):
    // what its work consumed at the unit prices the allowance registry publishes, valued only when
    // every resource is priced.
    crossingCostOf: (crossing) => pricedCostOf(crossing.resources, resourcePricesAt(resourcePricesIndexOf({ environment }))),
    // The market's exchange rate (Theorem 10): each carrier is priced per attempt by its own
    // allowance, and the least expected cost per accepted result is chosen. The inference pool
    // draws no premium subscription quota, so it is tried first; it has no effort dial, so its first
    // miss on a duty passes the duty on.
    // `orderChannels` is the staffing enterprise's own `order-channels` point (organizing/enterprise).
    resolveAllocationStaffing: ({ character, office, officeService, attempts, standing, requiredCarrier, orderChannels }) => {
      const serviceCarrier = officeService?.requiredCarrier;
      if (serviceCarrier !== undefined && requiredCarrier !== undefined
        && (serviceCarrier.model !== requiredCarrier.model || serviceCarrier.reasoningEffort !== requiredCarrier.reasoningEffort)) return undefined;
      const effectiveCarrier = requiredCarrier ?? serviceCarrier;
      if (effectiveCarrier !== undefined && character.model !== effectiveCarrier.model) return undefined;
      const efforts = effectiveCarrier === undefined ? undefined : [effectiveCarrier.reasoningEffort];
      // Each allocation decision draws each character's acceptance from its posterior (organizing
      // `thompsonDraw`), seeded by the decision: its office, character, attempts so far and minute.
      const draw = thompsonDraw([office.id, character.id, character.model, attempts?.length ?? 0, processIsoNow().slice(0, 16)].join("|"));
      const carrier = carrierOf(character.id);
      if (carrier !== undefined) {
        if (carrier.receivingOnly === true) throw new TypeError(`${carrier.harness} serves receiving only and carries no duty`);
        if (carrier.models !== undefined && !carrier.models.includes(character.model)) throw new TypeError(`${carrier.harness} does not carry ${character.model} headless`);
        if (!withinReach(carrier, office)) throw new TypeError(`${office.id} is outside the reach of ${carrier.workerId}`);
        const pricing = carrier.pricing();
        if (pricing.exhausted) throw new TypeError(`${carrier.harness}'s ${pricing.binding} window is spent until ${pricing.until}`);
        return officeStaffing(office.id, { carrier: character.model, attempts, standing, ...(efforts === undefined ? {} : { efforts }), price: pricing.price, orderChannels, draw });
      }
      return character.id === workerId && executeInferredWork !== undefined
        ? officeStaffing(office.id, { carrier: character.model, attempts, standing, efforts: efforts ?? ["medium"], price: 0, orderChannels, draw })
        : undefined;
    },
    resolveRequiredCarrier: ({ character, requiredCarrier }) => sources.readAllocationCharacters().some(entry =>
      entry.character.id === character.id && entry.character.model === requiredCarrier.model
        && entry.reasoningEffort === requiredCarrier.reasoningEffort && entry.available === true
        && typeof entry.session === "string"),
    readAllocationCharacters: () => sources.readAllocationCharacters().map(entry => ({ ...entry,
      character: hostedCharacter(entry.character),
      evidence: [...entry.evidence, ...(carrierOf(entry.character.id) !== undefined ? [`installed-operation-surface:${identity.id}:${createHash("sha256").update(JSON.stringify(operationSurface().operations.map(operation => operation.ref).sort())).digest("hex")}`] : [])],
    })),
    ...(resolveAgencyWorkAuthority === undefined ? {} : { resolveAgencyWorkAuthority }),
    resolveModelCharacter: (character) => hostedCharacter(observedModel(character)),
    resolveHarnessSession: (character, session) => currentHarnessCarrier(binding, character, session),
    resolveOfficeSession: (character, office, session) => officeServiceSession(binding, character, office, session),
    authorizeAssignmentOffice: (character, office, session) => {
      if (office !== undefined) return coordinatingOfficeSession(binding, character, office, session, "agency-work-assignment-admit", owning);
      const candidates = providerDelegationOffices(binding, character).flatMap((held) => {
        try { return [coordinatingOfficeSession(binding, character, held.office, session, "agency-work-assignment-admit", owning)]; } catch { return []; }
      });
      if (candidates.length !== 1) throw new TypeError("agency work assignment: name the coordinating office explicitly");
      return candidates[0];
    },
    authorizeProviderDelegation,
    reserveAgencyWork: async (request, run) => {
      const carrier = carrierOf(request.provider);
      if (carrier?.adapter.reserve === undefined) return run(null);
      const lease = await carrier.adapter.reserve({
        item: request.item,
        scopeKey: JSON.stringify([owning.dataRoot, request.kind, request.scope]),
        executionIdentity: request.executionIdentity,
      });
      if (lease.acquired !== true) throw new TypeError(`agency work reservation refused: ${lease.reason}`);
      try { return await run(lease); }
      finally { await carrier.adapter.release(lease); }
    },
    ...(authorizeWorkDischargeReceiver === undefined ? {} : { authorizeWorkDischargeReceiver }),
    ...(onAcceptedWork === undefined ? {} : { onAcceptedWork }),
    agencyWorkProviders,
    // Carriers expose a cross-process atomic provider reservation. Other
    // adapters keep the existing same-carrier admission gate until they do.
    sharedReservationProviders: carriers.filter(carrier => carrier.adapter.reserve !== undefined).map(carrier => carrier.workerId),
    resolveAllocationDelegation: (selected, item) => {
      if (!agencyWorkProviders.includes(selected.character.id)) throw new TypeError("selected character has no hosted execution adapter");
      const operations = selected.officeService.requiredCapabilities.map(verb => operationSurface().operations.find(operation => operation.verb === verb));
      if (operations.some(operation => operation === undefined)) throw new TypeError("assessment execution requires an absent operation");
      const delegation = { provider: selected.character.id, operations: operations.map(operation => operation.ref), effects: [...new Set(operations.map(operation => operation.effects.class))], authority: `office-service:${selected.office}` };
      return delegation;
    },
    readCompletedAgencyWork: item => recordHostedSession(item, carrierOf(item.delegation?.provider)?.adapter.completed(item)),
    recoverAgencyWork: async item => {
      const carrier = carrierOf(item.delegation?.provider);
      if (carrier === undefined) return undefined;
      const session = carrier.adapter.session(item);
      if (session !== undefined && item.execution?.session !== session.id) {
        recordHostedStart(item, session);
      }
      return recordHostedSession(item, await carrier.adapter.recover(item));
    },
    providersOfSubject: (subject) => providersOfAccount(binding, subject),
    // A tick takes every ready item admitted capacity allows; only an explicit
    // operator allocation cuts it.
    ...(environment.METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK === undefined || environment.METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK.trim() === "" ? {}
      : { agencyWorkPumpMaxPerTick: positiveInteger(environment.METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK, "METROPLAT_AGENCY_WORK_PUMP_MAX_PER_TICK") }),
    ...(executeAgencyWork === undefined ? {} : { executeAgencyWork }),
  });
}
