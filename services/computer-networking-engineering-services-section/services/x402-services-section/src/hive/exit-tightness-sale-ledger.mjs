import { randomUUID } from "node:crypto";
import { each, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { parseOptions } from "@red-cup-engineering/hive-fleet-operations-service/hive-engine-exit-tightness";
import { formHbdPaymentRequirement } from "../hbd/form-hbd-payment-requirement.mjs";
import { sellHiveExitTightnessResource } from "./sell-hive-exit-tightness-resource.mjs";

export const HIVE_EXIT_TIGHTNESS_SALE_TYPE = "hive-exit-tightness-sale";

function fail(message) {
  throw new TypeError(`hive-exit-tightness-sale-ledger: ${message}`);
}

function normalizeReportRequest(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) fail("report request must be an object");
  const args = ["--account", request.account ?? "", "--symbol", request.symbol ?? ""];
  if (request.quantity !== undefined) args.push("--quantity", String(request.quantity));
  return parseOptions(args);
}

function allRecords(root) {
  return [...each(root, HIVE_EXIT_TIGHTNESS_SALE_TYPE)]
    .map(({ address, record }) => ({ address, record }))
    .sort((left, right) => String(left.record.at).localeCompare(String(right.record.at)) || left.address.localeCompare(right.address))
    .map(({ record }) => record);
}

function snapshot(records, saleId) {
  const events = records.filter((record) => record.saleId === saleId);
  const issued = events.find((record) => record.type === "HiveExitTightnessSaleIssued");
  const settlement = events.find((record) => record.type === "HiveExitTightnessSaleSettled");
  const delivery = events.find((record) => record.type === "HiveExitTightnessSaleDelivered");
  return { issued, settlement, delivery };
}

/**
 * Opens the durable, append-only sale carrier for the paid Hive Engine exit
 * report. A payment challenge is first bound to the requested report, then a
 * two-node-confirmed payment and the delivered report are retained as separate
 * evidence. The journal lets a restarted service recover delivery without
 * asking the buyer to pay a second time.
 */
export function createHiveExitTightnessSaleLedger({
  journalRoot,
  sellerAccount,
  resource,
  memoPrefix = "exit-tightness",
  expirySeconds = 900,
  hiveNodes,
  makeReport,
  now = () => new Date().toISOString(),
  newId = randomUUID,
}) {
  if (typeof journalRoot !== "string" || journalRoot.length === 0) fail("journalRoot is required");
  if (typeof sellerAccount !== "string" || sellerAccount.length === 0) fail("sellerAccount is required");
  if (typeof makeReport !== "function") fail("makeReport is required");
  if (!Array.isArray(hiveNodes) || hiveNodes.length !== 2) fail("hiveNodes must contain two public Hive nodes");
  const deliveriesInFlight = new Map();
  const record = (entry) => put(journalRoot, HIVE_EXIT_TIGHTNESS_SALE_TYPE, { ...entry, at: now() });

  function quote(reportRequest) {
    const normalizedRequest = normalizeReportRequest(reportRequest);
    const issuedAt = now();
    const saleId = newId();
    const paymentRequirement = formHbdPaymentRequirement({
      resource,
      sellerAccount,
      memoPrefix,
      nonce: newId(),
      expirySeconds,
      requestedAt: issuedAt,
    });
    record({
      type: "HiveExitTightnessSaleIssued",
      version: 1,
      saleId,
      issuedAt,
      reportRequest: normalizedRequest,
      paymentRequirement,
    });
    return { saleId, reportRequest: normalizedRequest, paymentRequirement };
  }

  function read(saleId) {
    if (typeof saleId !== "string" || saleId.length === 0) fail("saleId is required");
    const state = snapshot(allRecords(journalRoot), saleId);
    if (!state.issued) return null;
    return {
      saleId,
      reportRequest: state.issued.reportRequest,
      paymentRequirement: state.issued.paymentRequirement,
      status: state.delivery ? "delivered" : state.settlement ? "delivery-pending" : "payment-pending",
      ...(state.settlement ? { settlement: state.settlement.settlement } : {}),
      ...(state.delivery ? { report: state.delivery.report, deliveredAt: state.delivery.deliveredAt } : {}),
    };
  }

  async function settleAndDeliverNow(saleId, claim) {
    const current = read(saleId);
    if (!current) return { status: 404, body: { error: "sale-not-found" } };
    if (current.status === "delivered") return { status: 200, body: current };

    let settlement = current.settlement;
    if (!settlement) {
      const response = await sellHiveExitTightnessResource({
        resource,
        sellerAccount,
        memoPrefix,
        expirySeconds,
        requestedAt: current.paymentRequirement.accepts[0].extra.expiresAt,
        hiveNodes,
        paymentClaim: { requirement: current.paymentRequirement.accepts[0], claim },
      });
      if (response.status !== 200) return response;
      settlement = response.body.settlement;
      const duplicate = allRecords(journalRoot).find((entry) => entry.type === "HiveExitTightnessSaleSettled"
        && entry.settlement.witnessRecord.transaction === settlement.witnessRecord.transaction
        && entry.saleId !== saleId);
      if (duplicate) return { status: 409, body: { error: "payment-already-applied", saleId: duplicate.saleId } };
      record({ type: "HiveExitTightnessSaleSettled", version: 1, saleId, settledAt: now(), settlement });
    }

    try {
      const report = await makeReport(current.reportRequest);
      const deliveredAt = now();
      record({ type: "HiveExitTightnessSaleDelivered", version: 1, saleId, deliveredAt, report });
      return { status: 200, body: { ...read(saleId), settlement, report, deliveredAt } };
    } catch (error) {
      return {
        status: 202,
        body: {
          saleId,
          status: "delivery-pending",
          settlement,
          error: "report-production-failed",
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  function settleAndDeliver(saleId, claim) {
    if (deliveriesInFlight.has(saleId)) return deliveriesInFlight.get(saleId);
    const delivery = settleAndDeliverNow(saleId, claim).finally(() => deliveriesInFlight.delete(saleId));
    deliveriesInFlight.set(saleId, delivery);
    return delivery;
  }

  return Object.freeze({ quote, read, settleAndDeliver });
}
