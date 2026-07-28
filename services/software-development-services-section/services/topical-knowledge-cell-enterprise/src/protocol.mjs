import { createRelationalOperationProtocol } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";
export const cellEnterpriseProtocol = createRelationalOperationProtocol({
  requestKind: "org.emsenn.topical-knowledge-cell-enterprise.request.v1",
  responseKind: "org.emsenn.topical-knowledge-cell-enterprise.response.v1",
  label: "topical-cell-enterprise protocol",
});
export const encodeRequest = cellEnterpriseProtocol.encodeRequest;
export const decodeRequest = cellEnterpriseProtocol.decodeRequest;
export const encodeResponse = cellEnterpriseProtocol.encodeResponse;
export const decodeResponse = cellEnterpriseProtocol.decodeResponse;
