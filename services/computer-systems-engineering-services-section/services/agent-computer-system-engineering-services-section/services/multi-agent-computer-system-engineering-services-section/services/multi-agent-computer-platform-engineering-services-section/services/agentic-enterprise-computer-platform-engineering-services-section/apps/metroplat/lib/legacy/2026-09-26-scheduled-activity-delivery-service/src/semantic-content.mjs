import { EMPTY_WITNESS_ROOT, admitJsonSemanticContent, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";

export const OPERATION_KIND = "scheduled-activity-delivery.operation";
export const RECORD_KIND = "scheduled-activity-delivery.record";
export const identify = (value, objectKind) => identifyJsonSemanticContent({ objectKind, value, witnessRoot: EMPTY_WITNESS_ROOT });
export const admit = (bytes, objectKind) => admitJsonSemanticContent({ bytes, objectKind }).value;
