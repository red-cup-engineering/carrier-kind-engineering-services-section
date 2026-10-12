import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { produceGroupFinancialReadout } from "../../../../../../../../../../../../../../../../561-group-services-section/services/561-group-operations-services-section/apps/group-operations/scripts/produce-group-financial-readout.mjs";

export function groupFinancialReadoutOperation({ environment = process.env, clock = () => new Date().toISOString() } = {}) {
  return operation({
    verb: "group-financial-readout-produce", inputFormat: "json", outputFormat: "json",
    summary: "Produce the 561 Group's daily financial readout.",
    description: "Reads the configured Group financial inputs and writes the dated readout under OPS_DATA_DIR using this node's clock.",
    reads: ["OPS_DATA_DIR", "METROPLAT_LEDGER_JOURNAL", "X402_SETTLEMENT_RECORDS", "X402_SECRETS_FILE"],
    writes: ["group-financial-readout"],
    effects: { class: "journal-write", replay: "idempotency-key", coordination: "coordination-free", deterministic: "unmeasured", totality: "partial" },
    run: () => produceGroupFinancialReadout({ environment, now: clock }),
  });
}
