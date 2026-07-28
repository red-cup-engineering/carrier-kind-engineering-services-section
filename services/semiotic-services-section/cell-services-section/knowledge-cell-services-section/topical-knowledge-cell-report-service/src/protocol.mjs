import { createRelationalOperationProtocol } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";

export const reportServiceProtocol = createRelationalOperationProtocol({
  requestKind: "org.emsenn.topical-knowledge-cell-report-service.request.v1",
  responseKind: "org.emsenn.topical-knowledge-cell-report-service.response.v1",
  label: "report-service protocol",
});

export const encodeRequest = reportServiceProtocol.encodeRequest;
export const decodeRequest = reportServiceProtocol.decodeRequest;
export const encodeResponse = reportServiceProtocol.encodeResponse;
export const decodeResponse = reportServiceProtocol.decodeResponse;
