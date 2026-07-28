#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ACTOR, ROOT, contentRecord, dataRoot, digest, readRecords, recordOutcome, timestamp } from "../lib/canonical.mjs";
import {
  KOIOS_OWNER,
  KOIOS_OWNER_ACTOR,
  NEWSCABLE_ACTOR,
  NEWSCABLE_ENTERPRISE,
  examineNewscableCarrierActivationDeficiency,
} from "./independent-newscable-carrier-activation-deficiency-examiner.mjs";

const CONTEXT = "https://www.w3.org/ns/activitystreams";
const OUTCOME = "newscable-live-import-failure-qualified-and-owner-activation-response-open";
const OWNER_ROOT = resolve(ROOT, "../../../rsc-quiescent/services/koios-news");

function assert(value, message) { if (!value) throw new Error(message); }
async function record(type, value) {
  await recordOutcome({ dataRoot: dataRoot(), nodeId: "software-development-services-section", aggregateType: type, record: value });
  return value;
}
function carrier(path) {
  const bytes = readFileSync(resolve(ROOT, path));
  return { path, digest: digest(bytes.toString("base64")), byteLength: bytes.length };
}
function deliverToKoiosOwner(activity, recordedAt) {
  const manifest = JSON.parse(readFileSync(join(OWNER_ROOT, "package.json"), "utf8"));
  const relative = manifest.bin?.["settle-message"];
  assert(typeof relative === "string", "Koios owner does not advertise settle-message");
  const endpoint = resolve(OWNER_ROOT, relative);
  assert(endpoint.startsWith(`${OWNER_ROOT}/`), "Koios owner settle-message endpoint escapes its membrane");
  const run = spawnSync(process.execPath, [endpoint, "settle-message", recordedAt], {
    cwd: OWNER_ROOT,
    input: `${JSON.stringify(activity)}\n`,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  assert(run.status === 0, `Koios owner boundary failed without a typed response: ${run.stderr || run.stdout}`);
  let response;
  try { response = JSON.parse(run.stdout); }
  catch { throw new Error(`Koios owner boundary emitted invalid JSON: ${run.stdout}`); }
  assert(["Accept", "Offer", "Question", "Reject"].includes(response?.type), "Koios owner boundary returned an untyped response");
  return { response, exitCode: run.status, stderrDigest: digest(String(run.stderr ?? "")) };
}

export async function advanceNewscableCarrierActivationDeficiencyCycle(recordedAt = new Date().toISOString()) {
  const existing = readRecords("standing-campaign-cycles").find((item) => item.recordedAt === recordedAt && item.outcome === OUTCOME);
  if (existing) return {
    cycle: existing,
    examination: readRecords("standing-campaign-examinations").find((item) => item.id === existing.examination),
    offer: readRecords("successor-offers").find((item) => item.id === existing.offer),
    responseReceipt: readRecords("inter-enterprise-responses").find((item) => item.sourceOffer === existing.offer),
    reopened: readRecords("standing-campaign-monitor").find((item) => item.causedBy === existing.id),
  };
  const monitors = readRecords("standing-campaign-monitor");
  const partialMonitor = monitors.find((item) => item.recordedAt === recordedAt
    && item.observations?.affectedProvider === NEWSCABLE_ENTERPRISE
    && item.causedBy === undefined);
  const predecessorMonitor = partialMonitor
    ? monitors.find((item) => item.id === partialMonitor.predecessorMonitor)
    : monitors.at(-1);
  assert(predecessorMonitor?.campaignTerminal === false && predecessorMonitor?.nextAnalysisRequired === true,
    "an open predecessor Monitor is required");
  const examination = examineNewscableCarrierActivationDeficiency(recordedAt);
  assert(examination.disposition === "qualify-newscable-live-carrier-activation-deficiency-for-owner-response",
    "independent examiner withheld the Newscable activation deficiency");

  const monitor = partialMonitor ?? await record("standing-campaign-monitor", contentRecord({
    type: "SDSSStandingCampaignMonitor", recordedAt, predecessorMonitor: predecessorMonitor.id,
    observations: {
      purposeBearingCustomer: KOIOS_OWNER,
      affectedProvider: NEWSCABLE_ENTERPRISE,
      affectedPurpose: examination.purpose,
      liveProviderImportPassed: false,
      liveProviderTypedRefusalReachable: false,
      repeatedLeaderMovementImportFailures: examination.liveSolicitationFailures.length,
      acceptedPortableCarrierStaged: examination.stagedCarrier !== null,
      stagedPortableCarrierImportPassed: examination.stagedCarrier?.importWitness?.passed === true,
      stagedPortableCarrierDeploymentAuthorized: examination.stagedCarrier?.deployment === true,
      liveActivationOperationAdvertised: false,
      activityPubOwnerResponsePending: predecessorMonitor.observations?.activityPubOwnerResponsePending === true,
      purposeBearingLiveReceiverUseObserved: predecessorMonitor.observations?.purposeBearingLiveReceiverUseObserved === true,
      priceTradeAndReinvestmentEvidence: false,
    },
    marketDigest: digest({ predecessor: predecessorMonitor.id, examination }),
    nextAnalysisRequired: true, campaignTerminal: false, customerMutation: false, foreignMutation: false,
  }));
  const priorAnalysis = readRecords("standing-campaign-analysis").find((item) => item.recordedAt === recordedAt && item.monitor === monitor.id);
  const analysis = priorAnalysis ?? await record("standing-campaign-analysis", contentRecord({
    type: "SDSSStandingCampaignAnalysis", recordedAt, monitor: monitor.id,
    selectedObstruction: "newscable-has-an-accepted-executable-portable-carrier-but-its-live-service-cannot-resolve-the-declared-dependency-and-advertises-no-activation-operation",
    selectionBasis: "Koios News requires an exact Newscable SourceBundleDelivery for its research-packet service. The declared producing-content source exists, but the live broker fails during module linking before it can issue a typed contractual response. Two Leader Movement Team solicitations observe the same failure. A separately accepted carrier imports successfully from staging, but its receipt explicitly withholds deployment and the owner advertises no activation or dependency-install operation.",
    alternatives: [
      { action: "write-the-staged-carrier-or-dependency-into-koios-territory", disposition: "rejected-cross-settlement-write" },
      { action: "treat-staging-acceptance-as-live-deployment-authority", disposition: "rejected-receiver-authority-collapse" },
      { action: "call-the-leader-sweep-malformed-and-ignore-startup-failure", disposition: "rejected-import-fails-before-contract-validation" },
      { action: "offer-the-exact-activation-dependency-or-repair-choice-through-the-koios-owner-boundary", disposition: "selected" },
    ],
    marketResidue: ["Koios owner activation or dependency decision", "an admitted owner operation for carrier activation or exact repair tendering", "a restored typed Newscable service response", "customer-owned usefulness evidence", "ActivityPub provider owner response", "price trade recurrence and reinvestment evidence"],
  }));
  const priorPlan = readRecords("standing-campaign-plans").find((item) => item.recordedAt === recordedAt && item.analysis === analysis.id);
  const plan = priorPlan ?? await record("standing-campaign-plans", contentRecord({
    type: "SDSSStandingCampaignPlan", recordedAt, analysis: analysis.id,
    intervention: "deliver-one-content-bound-newscable-live-carrier-activation-demand-through-the-advertised-koios-owner-inbox-and-retain-the-owner-boundary-response",
    authority: "continuous-sdss-bootstrap-rsi-mape-k-leader-authorization",
    allowedEffects: ["read-current-koios-and-newscable-contracts", "execute-read-only-live-and-staged-import-witnesses", "SDSS-local-independent-examination", "deliver-one-ActivityStreams-solicitation-through-koios-settle-message", "Koios-provider-local-inbox-settlement-record", "SDSS-local-response-retention"],
    stopConditions: ["direct Koios or Newscable filesystem write", "package installation", "carrier activation or deployment", "software repair without owner tender", "network credentials Git publication or spend", "fabricated usefulness or acceptance"],
  }));

  const demand = contentRecord({
    type: "NewscableLiveCarrierActivationDemand",
    customer: KOIOS_OWNER,
    affectedProvider: NEWSCABLE_ENTERPRISE,
    affectedProviderActor: NEWSCABLE_ACTOR,
    purpose: examination.purpose,
    independentExamination: examination.id,
    liveFailure: {
      errorCode: examination.liveImportWitness.errorCode,
      missingPackage: examination.liveImportWitness.missingPackage,
      liveSolicitationFailures: examination.liveSolicitationFailures.map(({ round, advertisement, solicitation, reasonDigest }) => ({ round, advertisement, solicitation, reasonDigest })),
    },
    acceptedStagedCarrier: {
      proposedProduct: examination.stagedCarrier.proposedProduct,
      snapshotDigest: examination.stagedCarrier.snapshotDigest,
      targetRoot: examination.stagedCarrier.targetRoot,
      importPassed: examination.stagedCarrier.importWitness.passed,
      deploymentAuthorized: examination.stagedCarrier.deployment,
      publicIngressAuthorized: examination.stagedCarrier.publicIngress,
    },
    allowedOwnerResponses: examination.allowedOwnerResponses,
    ownerDecisionRequired: true,
    softwareDevelopmentTenderRequiredNow: false,
    installationAuthorized: false,
    activationAuthorized: false,
    deploymentAuthorized: false,
    customerUsefulnessClaimed: false,
    customerAcceptanceClaimed: false,
    customerMutation: false,
    foreignMutation: false,
    externalSpend: 0,
    recordedAt,
  });
  const sourceActivity = contentRecord({
    "@context": CONTEXT, type: "Create", actor: ACTOR, target: KOIOS_OWNER_ACTOR,
    object: demand, recordedAt,
  });
  const offer = contentRecord({
    "@context": CONTEXT, type: "Offer", actor: ACTOR, target: KOIOS_OWNER_ACTOR,
    inReplyTo: predecessorMonitor.id, recordedAt,
    object: contentRecord({
      type: "ServiceSolicitation",
      sourceActivity,
      independentExamination: examination.id,
      ownerDecisionRequired: true,
      customerAcceptanceClaimed: false,
      customerMutation: false,
      foreignMutation: false,
      externalSpend: 0,
    }),
  });
  const delivery = deliverToKoiosOwner(offer, recordedAt);
  const responseReceipt = await record("inter-enterprise-responses", contentRecord({
    type: "SDSSInterEnterpriseResponseReceipt",
    sourceOffer: offer.id,
    targetBoundary: KOIOS_OWNER_ACTOR,
    targetEnterprise: KOIOS_OWNER,
    advertisedOperation: "settle-message",
    responseDigest: digest(delivery.response),
    response: delivery.response,
    responseType: delivery.response.type,
    responseCode: delivery.response.code ?? delivery.response.object?.code ?? null,
    demandAdmitted: delivery.response.type !== "Reject",
    ownerActivationDecisionReceived: false,
    providerLocalInboxSettlementExpected: true,
    sdssDirectForeignWrite: false,
    customerMutation: false,
    foreignMutation: false,
    externalSpend: 0,
    recordedAt,
  }));
  const execution = await record("standing-campaign-executions", contentRecord({
    type: "SDSSStandingCampaignExecution", recordedAt, plan: plan.id,
    changedCarriers: [
      carrier("src/independent-newscable-carrier-activation-deficiency-examiner.mjs"),
      carrier("src/advance-newscable-carrier-activation-deficiency-cycle.mjs"),
      carrier("test/newscable-carrier-activation-deficiency.test.mjs"),
      carrier("src/contract-receiver-fresh-process-assurance.mjs"),
      carrier("src/independent-receiver-fresh-process-assurance-result-examiner.mjs"),
      carrier("test/receiver-fresh-process-assurance.test.mjs"),
      carrier("src/verify-sdss.mjs"),
      carrier("package.json"),
    ],
    observedEffects: [
      "the independent examiner distinguished existing source bytes from absent live package resolution",
      "a current live import failure was compared with a passing import from the exact accepted staged carrier",
      "two independent Leader Movement Team solicitation failures were bound without treating generic sweep demand as customer usefulness",
      "the accepted carrier remained staged with deployment public ingress network credentials and spend withheld",
      "the exact owner demand crossed only the advertised Koios settle-message ingress and received a typed boundary response",
      "unrelated provider-catalog enrichment no longer retroactively invalidates historical exact-plan receiver evidence",
    ],
    collaboration: {
      customer: KOIOS_OWNER,
      affectedProvider: NEWSCABLE_ENTERPRISE,
      ownerBoundary: KOIOS_OWNER_ACTOR,
      advertisedOperation: "settle-message",
      outgoingOffer: offer.id,
      responseReceipt: responseReceipt.id,
      responseType: responseReceipt.responseType,
      responseCode: responseReceipt.responseCode,
      ownerActivationDecisionRequired: true,
    },
    customerMutation: false, foreignMutation: false, externalSpend: 0,
    resources: { interactiveInference: "unknown-not-zero", coordination: "unknown-not-zero", localCompute: "unknown-not-zero", monetaryCost: "unknown-not-zero" },
  }));
  await record("standing-campaign-examinations", examination);
  await record("successor-offers", offer);
  const boundaryRefused = responseReceipt.responseType === "Reject";
  const knowledge = await record("standing-campaign-knowledge", contentRecord({
    type: "SDSSStandingCampaignKnowledge", recordedAt,
    predecessor: readRecords("standing-campaign-knowledge").at(-1)?.id ?? null,
    examination: examination.id, successorOffer: offer.id,
    learned: [
      "A declared link target may exist while the live settlement remains unable to resolve it; source presence and runtime availability are separate observations.",
      "An accepted portable carrier may prove an executable closure without granting activation deployment public ingress or installation authority.",
      "A provider that fails during module linking cannot issue even a typed refusal, so generic solicitation content does not explain the startup failure.",
      boundaryRefused
        ? `Koios received the owner-facing demand through its advertised inbox but refused it at the ${responseReceipt.responseCode ?? "unclassified"} contract seam; this is a missing owner coordination operation, not permission for SDSS to activate the carrier.`
        : `Koios returned ${responseReceipt.responseType} through its advertised inbox; its exact substantive effect remains subject to owner decision and independent examination.`,
      "Historical contracted evidence must bind the exact plan used, not freeze an unrelated provider's whole evolving catalog.",
    ],
    policyEffect: "When a receiver has accepted an executable portable carrier but the live service is unresolved, contract the receiver owner for an explicit activation dependency-install or exact-repair decision. Never promote staging acceptance into deployment authority or repair the foreign settlement by proximity.",
    openMarketState: ["Koios owner activation dependency or repair decision", "owner inbox support for activation demands", "restored typed Newscable service response", "customer-owned usefulness evidence", "ActivityPub provider owner response", "purpose-bearing live receiver demand", "price trade recurrence and reinvestment evidence"],
    campaignTerminal: false,
  }));
  const cycle = await record("standing-campaign-cycles", contentRecord({
    type: "SDSSStandingCampaignCycle", recordedAt, monitor: monitor.id, analysis: analysis.id, plan: plan.id,
    execution: execution.id, examination: examination.id, offer: offer.id, knowledge: knowledge.id,
    responseReceipt: responseReceipt.id,
    outcome: OUTCOME, campaignTerminal: false,
  }));
  const reopened = await record("standing-campaign-monitor", contentRecord({
    type: "SDSSStandingCampaignMonitor", recordedAt, predecessorMonitor: monitor.id, causedBy: cycle.id,
    observations: {
      purposeBearingCustomer: KOIOS_OWNER,
      affectedProvider: NEWSCABLE_ENTERPRISE,
      liveNewscableImportPassed: false,
      stagedAcceptedCarrierImportPassed: true,
      stagedCarrierDeploymentAuthorized: false,
      ownerDemand: offer.id,
      ownerBoundaryResponse: responseReceipt.id,
      ownerBoundaryResponseType: responseReceipt.responseType,
      ownerBoundaryResponseCode: responseReceipt.responseCode,
      ownerDemandAdmitted: responseReceipt.demandAdmitted,
      ownerActivationDecisionPending: true,
      ownerCoordinationContractEnrichmentRequired: boundaryRefused,
      sdssKoiosMutationPerformed: false,
      activityPubOwnerResponsePending: predecessorMonitor.observations?.activityPubOwnerResponsePending === true,
      purposeBearingLiveReceiverUseObserved: predecessorMonitor.observations?.purposeBearingLiveReceiverUseObserved === true,
      priceTradeAndReinvestmentEvidence: false,
    },
    marketDigest: digest({ offer: offer.id, response: responseReceipt.id, examination: examination.id, state: "newscable-owner-activation-response-open" }),
    nextAnalysisRequired: true, campaignTerminal: false, customerMutation: false, foreignMutation: false,
  }));
  return { cycle, examination, offer, responseReceipt, reopened };
}

async function main() {
  const result = await advanceNewscableCarrierActivationDeficiencyCycle(timestamp());
  process.stdout.write(`${JSON.stringify({ cycle: result.cycle.id, examination: result.examination.id, successorOffer: result.offer.id,
    responseReceipt: result.responseReceipt.id, responseType: result.responseReceipt.responseType,
    responseCode: result.responseReceipt.responseCode, reopenedMonitor: result.reopened.id, campaignTerminal: false }, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`); process.exitCode = 1;
});
