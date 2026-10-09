import { identify } from "./semantic-content.mjs";

export const LAW = Object.freeze({
  type: "SemanticServiceLaw",
  service: "urn:ame:scheduled-activity-delivery-service",
  operations: ["solicit-service", "invoke-service", "renew-schedule", "run-due"],
  evidence: { support: true, refutation: false },
});
export const RETIREMENT_LAW = Object.freeze({
  type: "SemanticServiceLaw",
  service: "urn:ame:scheduled-activity-delivery-service",
  operations: ["retire-schedule"],
  evidence: { support: true, refutation: false },
});
export const CONTRACT = identify(LAW, "scheduled-activity-delivery.law").id;
export const RETIREMENT_CONTRACT = identify(RETIREMENT_LAW, "scheduled-activity-delivery.retirement-law").id;
