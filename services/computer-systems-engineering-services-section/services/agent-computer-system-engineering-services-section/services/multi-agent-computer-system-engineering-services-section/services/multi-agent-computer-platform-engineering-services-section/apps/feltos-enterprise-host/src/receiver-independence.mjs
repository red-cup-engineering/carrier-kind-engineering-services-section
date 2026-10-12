import { workResultReceivingByDischarge, workResultReceivings } from "@red-cup-engineering/feltos/work/work-discharge";
import { canonicalJson } from "@red-cup-engineering/json-services-section/canonical-json";
import { outcomeJournal, outcomeOf } from "@red-cup-engineering/organizing/enterprise/outcomes";
import { proposalResources } from "@red-cup-engineering/organizing/enterprise/resources";

/**
 * Receiver independence: who may receive a delivery, ranked by how independent a channel the
 * receiver is of the producer (Central Dogma of Code Fabrication: different models are independent
 * channels, a miss is the order's once enough of them miss). Independence of receiver from producer
 * outranks price; price only orders receivers equally independent.
 *
 * The class of independence is the model family, the lineage a model's training and provider share:
 * a delivery produced by a Google model is judged by a non-Google receiver before any Google one,
 * whichever character or harness carries it. The family of a model is read from its name; a carrier
 * declares its own family only for a model whose name says nothing.
 */

/** Organizations a model id may be namespaced under (`openai/gpt-oss-20b`, `qwen/qwen3.8-27b`), and their family. */
const ORGANIZATIONS = Object.freeze({
  openai: "openai", anthropic: "anthropic", google: "google", qwen: "alibaba", alibaba: "alibaba", "meta-llama": "meta", meta: "meta",
  mistralai: "mistral", "deepseek-ai": "deepseek", deepseek: "deepseek", nvidia: "nvidia", "z-ai": "zhipu", cohere: "cohere",
  moonshotai: "moonshot", "x-ai": "xai",
});
/** Model-name prefixes and the family each belongs to, first match wins. */
const NAMES = Object.freeze([
  [/^(?:gpt|o\d|codex|chatgpt)/u, "openai"], [/^claude/u, "anthropic"], [/^(?:gemini|gemma)/u, "google"], [/^(?:qwen|qwq)/u, "alibaba"],
  [/^llama/u, "meta"], [/^(?:mistral|mixtral|codestral|ministral)/u, "mistral"], [/^deepseek/u, "deepseek"], [/^nemotron/u, "nvidia"],
  [/^glm/u, "zhipu"], [/^(?:command|north)/u, "cohere"], [/^kimi/u, "moonshot"], [/^grok/u, "xai"],
]);

/** The family of a model name, or undefined when the name says nothing. */
export function modelFamily(model) {
  if (typeof model !== "string" || model === "") return undefined;
  const [organization, ...rest] = model.toLowerCase().split("/");
  if (rest.length > 0 && Object.hasOwn(ORGANIZATIONS, organization)) return ORGANIZATIONS[organization];
  const name = rest.length > 0 ? rest.join("/") : organization;
  return NAMES.find(([pattern]) => pattern.test(name))?.[1];
}

/**
 * The independence class of what produced a proposal: its observed model's family, else the family
 * its carrier declares, else nothing known. `declaredFamilyOf(workerId)` is the host's carrier table.
 */
export function producerFamily(proposal, declaredFamilyOf = () => undefined) {
  return modelFamily(proposal?.origin?.model) ?? declaredFamilyOf(proposal?.producer?.id);
}

/** The models of a receiver whose family is known and not the producer's. */
export function independentModels(receiver, proposal, producing) {
  return producing === undefined ? [] : receiver.models.filter((model) => {
    const family = modelFamily(model) ?? receiver.carrier.family;
    return family !== undefined && family !== producing;
  });
}

/**
 * How independent a qualified receiver is of the proposal's producer, lowest first:
 *   0  a model of another family
 *   1  another character, family unknown or shared (another harness on the same lineage)
 *   2  the producer's own character, another model
 *   3  the producer's own character and model
 */
export function receiverIndependence(receiver, proposal, producing) {
  if (independentModels(receiver, proposal, producing).length > 0) return 0;
  if (receiver.carrier.workerId !== proposal.producer?.id) return 1;
  return receiver.models.some((model) => model !== proposal.origin?.model) ? 2 : 3;
}

/**
 * The qualified receivers of a proposal, most independent first, equally independent ones by
 * ascending price, then by character for a stable order. `declaredFamilyOf` is the host's declared
 * family of a producing character; each receiver is `{ carrier: { workerId, family?, pricing() }, models, office }`.
 */
export function rankReceivers(qualified, proposal, declaredFamilyOf) {
  const producing = producerFamily(proposal, declaredFamilyOf);
  return qualified.map((receiver) => ({ receiver, independence: receiverIndependence(receiver, proposal, producing), price: receiver.carrier.pricing().price }))
    .sort((left, right) => left.independence - right.independence || left.price - right.price
      || (left.receiver.carrier.workerId < right.receiver.carrier.workerId ? -1 : left.receiver.carrier.workerId > right.receiver.carrier.workerId ? 1 : 0))
    .map(({ receiver, independence }) => ({ ...receiver, independence, models: independence === 0 ? independentModels(receiver, proposal, producing) : receiver.models.some((model) => model !== proposal.origin?.model) ? receiver.models.filter((model) => model !== proposal.origin?.model) : receiver.models }));
}

/**
 * The Outcome a received result is told as on the one outcome path (organizing `outcomeOf`): the
 * receiving office judged the work the proposal's origin office delivered, carried by the origin's
 * model. Whatever carrier received, the booking is this one.
 */
export function receivedOutcomeFields({ proposal, discharge, office, at }) {
  return {
    source: "work-discharge", lot: proposal.subject ?? proposal.scope, delivery: proposal.receipt,
    provider: proposal.origin.office, judge: office, verdict: discharge.decision === "rejected" ? "rejected" : "accepted", at,
    reportedResult: proposal.result,
    evidence: [...new Set([proposal.receipt, ...(discharge.evidence ?? [])])],
    ...(typeof proposal.origin.model === "string" && proposal.origin.model !== "" ? { carrier: proposal.origin.model } : {}),
    ...(typeof proposal.skill === "string" && proposal.skill !== "" ? { skill: proposal.skill } : {}),
    player: { by: proposal.origin.office, bearer: proposal.producer?.id, hand: proposal.origin.session },
    ...(discharge.decision === "rejected" && typeof discharge.text === "string" && discharge.text !== "" ? { reason: discharge.text.slice(0, 800) } : {}),
  };
}

const outcomeJournalOf = root => outcomeJournal(root);

/** Tell the already admitted independent judgment, including failure-report evidence, exactly once.
 * Admission and any inference-delivery resolution remain with the caller that owns the receipt. */
export function recordReceivedOutcome({ dataRoot, proposal, discharge, office, market }) {
  const receiving = workResultReceivingByDischarge({ dataRoot }, proposal, discharge);
  if (receiving === undefined || receiving.at === undefined) throw new TypeError("work outcome requires the original admitted receiving witness and time");
  if (receiving.office !== office) throw new TypeError("work outcome office must be the original receiving office");
  const fields = receivedOutcomeFields({ proposal, discharge, office: receiving.office, at: receiving.at });
  const journal = outcomeJournalOf(dataRoot);
  // Earlier outcomes did not name their receiving witness. Keep an already recorded exact
  // judgment and its original time rather than creating a newly dated copy on retry. Rich
  // records additionally bind to the exact event. Only an original legacy receiving
  // witness may match an unkeyed outcome on its original day: a newly admitted A must
  // never be suppressed by an old A, including after an intervening B. Untyped old
  // records are eligible only for the successful-result path the old host recorded.
  const identity = outcome => canonicalJson(Object.fromEntries([
    "source", "lot", "delivery", "provider", "judge", "verdict", "evidence", "carrier", "skill", "player", "reason",
  ].filter(key => outcome[key] !== undefined).map(key => [key, outcome[key]])));
  const expected = identity(outcomeOf(fields));
  const compatible = journal.read().filter(outcome => identity(outcome) === expected
    && (outcome.reportedResult === undefined ? proposal.result.kind === "skill-result"
      : canonicalJson(outcome.reportedResult) === canonicalJson(proposal.result)));
  if (compatible.some(outcome => outcome.receivingReceipt === receiving.receipt)) return 0;
  const unkeyed = compatible.filter(outcome => outcome.receivingReceipt === undefined
    && receiving.dischargeIdentity === undefined && outcome.at.slice(0, 10) === receiving.at.slice(0, 10));
  if (unkeyed.length > 0) {
    // One old unkeyed body is not evidence that two distinct admitted acts have
    // both been recorded. Recover original companion fields through their owner,
    // then require a unique outcome-to-act mapping; do not invent old precision.
    const acts = workResultReceivings({ dataRoot }, proposal).filter(act => act.judgment !== undefined
      && act.at?.slice(0, 10) === receiving.at.slice(0, 10)
      && identity(outcomeOf(receivedOutcomeFields({ proposal,
        discharge: { ...act.judgment, decision: act.decision }, office: act.office, at: act.at,
      }))) === expected);
    if (acts.length !== 1 || acts[0].receipt !== receiving.receipt) throw new TypeError("ambiguous historical outcome-to-receiving pairing");
    return 0;
  }
  return journal.record(outcomeOf({
    ...fields, receivingReceipt: receiving.receipt,
    ...(receiving.authorizationReceipt === undefined ? {} : { receivingAuthorizationReceipt: receiving.authorizationReceipt }),
    ...(receiving.atPrecision === undefined ? {} : { atPrecision: receiving.atPrecision }),
    ...(market === undefined ? {} : { market }), resources: proposalResources(proposal),
  }));
}
