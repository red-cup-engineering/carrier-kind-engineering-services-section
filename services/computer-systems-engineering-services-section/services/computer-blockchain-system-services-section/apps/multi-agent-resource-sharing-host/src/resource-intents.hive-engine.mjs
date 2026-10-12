// resource-intents.hive-engine — pure construction of the MARSH Hive-Engine contract's resource
// id and its two write calls. No network access, no signing, no key material: this module only
// builds plain data. Signing and broadcasting a call it builds is a systems-layer effect,
// deliberately left to the fleet's one signer
// (hive-fleet-operations-service/scripts/hive-broadcast.mjs) rather than duplicated here — see
// this package's notes on the one call site that still needs wiring before any of these calls
// can actually be cast.

function requiredNonEmptyString(name, value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

/**
 * The domain-separated identity of a resource governed by one controller, on one Hive-Engine
 * network. The Hive-Engine analogue of MARSH.sol's `resourceId(controller, kind, subject)`
 * (there: keccak256(abi.encode("MARSH", chainid, address(this), controller, kind, subject))) —
 * a plain readable string rather than a hash, since Hive-Engine's state is a JSON document
 * store, not fixed-width EVM storage.
 * @param {object} request
 * @param {string} [request.contractName] The deployed contract's name (default "marsh").
 * @param {string} request.network A Hive-Engine network label (e.g. "mainnet", or a private dev
 *   sidechain's own name) — the domain separator MARSH.sol gets from `block.chainid` and its own
 *   contract address.
 * @param {string} request.controller The resource's controller (a Hive account name).
 * @param {string} request.kind A resource kind label.
 * @param {string} request.subject The resource's subject.
 * @returns {string}
 */
export function marshHiveEngineResourceId(request) {
  const contractName = request.contractName ?? "marsh";
  const network = requiredNonEmptyString("network", request.network);
  const controller = requiredNonEmptyString("controller", request.controller);
  const kind = requiredNonEmptyString("kind", request.kind);
  const subject = requiredNonEmptyString("subject", request.subject);
  return `${contractName}:${network}:${controller}:${kind}:${subject}`;
}

/**
 * Build the Hive-Engine contract call that admits the first typed, content-addressed state of a
 * resource — the exact {contractName,contractAction,contractPayload} shape
 * @red-cup-engineering/hive-blockchain-client-service's EngineClient/hive-broadcast expect, ready
 * to carry inside an L1 custom_json (id "ssc-mainnet-hive").
 * @param {object} request
 * @param {string} [request.contractName]
 * @param {string} request.network
 * @param {string} request.controller
 * @param {string} request.kind
 * @param {string} request.subject
 * @param {string} request.content
 * @param {string} request.evidence
 * @returns {{resource: string, call: {contractName: string, contractAction: "admitResource", contractPayload: object}}}
 */
export function buildMarshHiveEngineAdmitCall(request) {
  const resource = marshHiveEngineResourceId(request);
  const content = requiredNonEmptyString("content", request.content);
  const evidence = requiredNonEmptyString("evidence", request.evidence);
  return {
    resource,
    call: {
      contractName: request.contractName ?? "marsh",
      contractAction: "admitResource",
      contractPayload: { resource, kind: request.kind, content, evidence },
    },
  };
}

/**
 * Build the Hive-Engine contract call that replaces a resource head only from its current
 * content head (a compare-and-swap transition), the Hive-Engine analogue of MARSH.sol's
 * transitionResource.
 * @param {object} request
 * @param {string} [request.contractName]
 * @param {string} request.network
 * @param {string} request.controller
 * @param {string} request.kind
 * @param {string} request.subject
 * @param {string} request.priorContent
 * @param {string} request.content
 * @param {string} request.evidence
 * @returns {{resource: string, call: {contractName: string, contractAction: "transitionResource", contractPayload: object}}}
 */
export function buildMarshHiveEngineTransitionCall(request) {
  const resource = marshHiveEngineResourceId(request);
  const priorContent = requiredNonEmptyString("priorContent", request.priorContent);
  const content = requiredNonEmptyString("content", request.content);
  const evidence = requiredNonEmptyString("evidence", request.evidence);
  return {
    resource,
    call: {
      contractName: request.contractName ?? "marsh",
      contractAction: "transitionResource",
      contractPayload: { resource, priorContent, content, evidence },
    },
  };
}
