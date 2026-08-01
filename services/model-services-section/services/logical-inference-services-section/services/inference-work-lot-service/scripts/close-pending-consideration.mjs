#!/usr/bin/env node
import { resolve } from "node:path";
import { queryWitnessJournalDocumentsByCategory, querySettlementRecords } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { loadCustomerServiceAdmissions } from "../src/provider-admission.mjs";
import { CONSIDERATION_CLOSE_CATEGORY, recordAssayedInferenceConsiderationClose } from "../src/consideration-close.mjs";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const DATA = resolve(ROOT, "data");
const services = loadCustomerServiceAdmissions(resolve(ROOT, "content/provider-admissions/semantic-services.nq"), { admissionGraph: "urn:ame:inference-work-lot-service:service-admissions" });
const assays = new Map((await queryWitnessJournalDocumentsByCategory("typed-inference.customer-assay")).map(({ value }) => {
  const assay = value.record;
  return [assay.procurement, { ...assay, assayedAt: assay.assayedAt ?? value.recordedAt }];
}));
const closedReceipts = new Set((await querySettlementRecords(CONSIDERATION_CLOSE_CATEGORY)).map(({ initialReceipt }) => initialReceipt));
const pending = (await querySettlementRecords("typed-inference.procurement")).filter((procurement) => procurement.receipt?.consideration?.some(({ status }) => status === "pending") && !closedReceipts.has(procurement.receipt.id));
const results = [];
for (const procurement of pending) {
  const assay = assays.get(procurement.settlement);
  if (!assay) throw new Error(`no customer assay closes ${procurement.receipt.id}`);
  const close = await recordAssayedInferenceConsiderationClose(procurement, assay, { customerServices: services, settlementRoot: ROOT, dataRoot: DATA, at: assay.assayedAt });
  results.push({ receipt: procurement.receipt.id, close: close.id, disposition: close.disposition, amount: procurement.selected.consideration.obligations[0].amount, idempotent: close.idempotent });
}
process.stdout.write(`${JSON.stringify({ pending: pending.length, closed: results.length, creditIssued: results.filter(({ disposition }) => disposition === "credit-issued").reduce((sum, { amount }) => sum + amount, 0), notDue: results.filter(({ disposition }) => disposition === "consideration-not-due").reduce((sum, { amount }) => sum + amount, 0), results }, null, 2)}\n`);
