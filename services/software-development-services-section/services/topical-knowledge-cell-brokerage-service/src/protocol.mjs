import { createRelationalOperationProtocol } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
export const brokerageServiceProtocol = createRelationalOperationProtocol({
  requestKind: "org.emsenn.topical-knowledge-cell-brokerage-service.request.v1",
  responseKind: "org.emsenn.topical-knowledge-cell-brokerage-service.response.v1",
  label: "brokerage-service protocol",
});
export const encodeRequest = brokerageServiceProtocol.encodeRequest;
export const decodeRequest = brokerageServiceProtocol.decodeRequest;
export const encodeResponse = brokerageServiceProtocol.encodeResponse;
export const decodeResponse = brokerageServiceProtocol.decodeResponse;
