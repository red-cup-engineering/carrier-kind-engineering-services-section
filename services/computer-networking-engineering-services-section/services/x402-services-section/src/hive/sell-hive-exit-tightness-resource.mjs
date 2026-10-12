import { formHbdPaymentRequirement } from "../hbd/form-hbd-payment-requirement.mjs";
import { verifyHbdPayment } from "../hbd/verify-hbd-payment.mjs";
import { settleHbdPurchase } from "../hbd/settle-hbd-purchase.mjs";
import { executeJavascriptNodeCommand } from "@red-cup-engineering/execute-javascript-node-command-service";

/**
 * Serves one x402 hbd-transfer resource: without a `paymentClaim`, returns the 402 payment requirement; with one, independently verifies the claimed Hive transfer against two public nodes and, only once verified, settles the sale (witness record plus Beancount transaction). A caller may then produce the report in-process or through the retained command adapter. Never holds a key, signs, or broadcasts a transaction; every Hive read is public and every settlement is a pure computation the caller journals.
 * @param {object} request A record with `resource` ({id, price, description?}), `sellerAccount`, `memoPrefix`, `expirySeconds`, `requestedAt`, `nonce` (used only to form a new requirement), `hiveNodes` (exactly two distinct public Hive node URLs), an optional `paymentClaim` ({requirement, claim, fixtureResponses?}, omitted meaning "no payment yet"; `fixtureResponses` replaces either node's live call for deterministic offline testing, passed straight through to `verifyHbdPayment`), optional `produceReport` (an async in-process report operation), optional `reportCommand` ({command, arguments, directory}, the retained external read-only command adapter), and an optional `runCommand` (injectable in place of the real `executeJavascriptNodeCommand`, for offline testing only).
 * @returns {Promise<object>} A `{status, body}` pair: 402 with the payment requirement or a refusal, 202 retaining a settled purchase whose report delivery failed, or 200 with `{settlement, report}`.
 * @throws {TypeError} When `resource`, `sellerAccount`, or `hiveNodes` is missing or malformed (propagated from the composed operations).
 */
export async function sellHiveExitTightnessResource(request) {
  const {
    resource,
    sellerAccount,
    memoPrefix,
    expirySeconds,
    requestedAt,
    nonce,
    hiveNodes,
    paymentClaim,
    produceReport,
    reportCommand,
    runCommand = executeJavascriptNodeCommand,
  } = request ?? {};

  if (!paymentClaim) {
    const requirement = formHbdPaymentRequirement({ resource, sellerAccount, memoPrefix, nonce, expirySeconds, requestedAt });
    return { status: 402, body: requirement };
  }

  const observedAt = new Date().toISOString();
  const verification = await verifyHbdPayment({
    requirement: paymentClaim.requirement,
    claim: paymentClaim.claim,
    nodes: hiveNodes,
    observedAt,
    ...(paymentClaim.fixtureResponses ? { fixtureResponses: paymentClaim.fixtureResponses } : {}),
  });
  if (verification.status !== "verified") {
    return { status: 402, body: verification };
  }

  const settlement = settleHbdPurchase({
    verification,
    resource,
    sellerAccount,
    date: observedAt.slice(0, 10),
  });

  if (produceReport !== undefined && typeof produceReport !== "function") {
    throw new TypeError("sell-hive-exit-tightness-resource: produceReport must be a function when supplied");
  }
  if (produceReport) {
    try {
      return { status: 200, body: { settlement, report: await produceReport() } };
    } catch (error) {
      return { status: 202, body: { settlement, delivery: { status: "pending", error: "report-production-failed", detail: error instanceof Error ? error.message : String(error) } } };
    }
  }

  if (!reportCommand) {
    return { status: 200, body: { settlement, report: null } };
  }

  const receipt = runCommand({
    type: "JavascriptNodeCommandExecutionRequest",
    version: 1,
    command: reportCommand.command,
    arguments: reportCommand.arguments,
    directory: reportCommand.directory,
    environment: null,
    input: null,
  });
  if (receipt.result.status !== 0) {
    return { status: 202, body: { settlement, delivery: { status: "pending", error: "report-command-failed", receipt } } };
  }
  return { status: 200, body: { settlement, report: JSON.parse(receipt.result.stdout) } };
}
