// MARSH — the Hive-Engine contract for the Blockchain Agent Engine's Hive resource world.
//
// The same semantics as MARSH.sol (this package's EVM engine), ported to the layer Hive
// contracts actually run on: Hive-Engine, a witness-run sidechain that replays custom_json
// operations into JS contract calls (github.com/hive-engine/hivesmartcontracts). A resource's
// semantic body and evidence remain content-addressed carriers outside this sidechain; MARSH
// stores only the current typed head per resource and emits every accepted admission or
// transition as an event, exactly as the EVM contract does.
//
// This file is the entire deployable unit: Hive-Engine contracts are one self-contained
// JavaScript source file, sandboxed, with no `require()`, no third-party modules, and no
// `RegExp` — everything available comes from the injected `api` object (api.db, api.sender,
// api.owner, api.BigNumber, api.emit, api.assert). See the companion research note,
// hive-engineering-services-section/services/hive-fleet-operations-service/content/text/
// documents/research/2026-09-26-smart-contracts-on-hive-2026.md, S2, for the deploy mechanics
// and its one governance gate on the shared mainnet sidechain.
//
// Deploy step (the one this contract needs): broadcast an L1 custom_json, id
// "ssc-mainnet-hive", payload {contractName:"contract", contractAction:"deploy",
// contractPayload:{name:"marsh", code: base64(thisFile)}} — on the Group's own
// hivesmartcontracts dev node today (fully permissionless), or on the shared production
// sidechain once its maintainers/witness set have accepted this code into the node software
// they run (see the research note's S7 open item).
//
// resourceId domain separation (computed by the Node client, src/resource-intents.hive-
// engine.mjs, never on-chain): `${contractName}:${network}:${controller}:${kind}:${subject}` —
// the Hive-Engine analogue of the EVM contract's
// keccak256(abi.encode("MARSH", chainid, address(this), controller, kind, subject)); a plain
// readable string rather than a hash, because Hive-Engine's state is a JSON document store, not
// fixed-width EVM storage, and a hash buys nothing here.

actions.createSSC = async () => {
  const tableExists = await api.db.tableExists('resources');
  if (tableExists === false) {
    await api.db.createTable('resources', ['resource']);
  }
};

/**
 * Admit the first typed, content-addressed state of a resource.
 * Payload: { resource, kind, content, evidence } — all non-empty strings.
 * Mirrors MARSH.sol's admitResource: refuses when the resource already exists.
 */
actions.admitResource = async (payload) => {
  const { resource, kind, content, evidence } = payload;
  if (!api.assert(typeof resource === 'string' && resource.length > 0, 'resource is required')) return;
  if (!api.assert(typeof kind === 'string' && kind.length > 0, 'kind is required')) return;
  if (!api.assert(typeof content === 'string' && content.length > 0, 'content is required')) return;
  if (!api.assert(typeof evidence === 'string' && evidence.length > 0, 'evidence is required')) return;

  const existing = await api.db.findOne('resources', { resource });
  if (!api.assert(existing === null, 'resource already exists')) return;

  const record = {
    resource,
    controller: api.sender,
    kind,
    content,
    evidence,
    sequence: 1,
  };
  await api.db.insert('resources', record);
  api.emit('resourceAdmitted', { resource, controller: api.sender, kind, content, evidence, sequence: 1 });
};

/**
 * Replace a resource head only from its current content head.
 * Payload: { resource, priorContent, content, evidence }.
 * The compare-and-swap precondition (current.content === priorContent) mirrors MARSH.sol's
 * transitionResource: it gives concurrent writers a deterministic refusal instead of silently
 * discarding a transition, and only the resource's own controller (api.sender at admission
 * time) may transition it.
 */
actions.transitionResource = async (payload) => {
  const { resource, priorContent, content, evidence } = payload;
  if (!api.assert(typeof resource === 'string' && resource.length > 0, 'resource is required')) return;
  if (!api.assert(typeof content === 'string' && content.length > 0, 'content is required')) return;
  if (!api.assert(typeof evidence === 'string' && evidence.length > 0, 'evidence is required')) return;

  const current = await api.db.findOne('resources', { resource });
  if (!api.assert(current !== null, 'resource not found')) return;
  if (!api.assert(current.controller === api.sender, 'controller required')) return;
  if (!api.assert(current.content === priorContent, 'prior content mismatch')) return;

  const sequence = current.sequence + 1;
  current.content = content;
  current.evidence = evidence;
  current.sequence = sequence;
  await api.db.update('resources', current);
  api.emit('resourceTransitioned', {
    resource,
    controller: api.sender,
    kind: current.kind,
    priorContent,
    content,
    evidence,
    sequence,
  });
};
