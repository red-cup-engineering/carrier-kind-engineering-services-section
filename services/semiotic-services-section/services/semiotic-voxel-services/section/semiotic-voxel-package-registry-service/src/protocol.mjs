import { createRelationalOperationProtocol } from "@red-cup-engineering/a2a-sovereign-operation-boundary-service";

export const registrySnapshotProtocol = createRelationalOperationProtocol({
  requestKind: "org.harmonious-union.package-registry-snapshot.a2a-request.v1",
  responseKind: "org.harmonious-union.package-registry-snapshot.a2a-response.v1",
  label: "Union package registry snapshot",
});
