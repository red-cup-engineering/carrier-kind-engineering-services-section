/**
 * Coordinator only.  Admission, supplier selection, and settlement belong to
 * resource-brokerage-service-section; typed placement evidence belongs to TRC.
 * This cell receives one selected move and invokes one injected effect.  It
 * owns no queue, wallet, hot key, daemon, or independent market vocabulary.
 */
function brokerApi(value) {
  if (value === null || typeof value !== "object") throw new TypeError("normalization-broker-required");
  for (const name of ["admitTrcNormalizationDemand", "offerBareCedarFogCapacity", "selectNormalizationOffer", "settleNormalizationSelection"]) {
    if (typeof value[name] !== "function") throw new TypeError(`normalization-broker-missing-${name}`);
  }
  return value;
}

function observation(value, label) {
  if (value === null || typeof value !== "object") throw new TypeError(`${label}-required`);
  if (typeof value.resource !== "string" || typeof value.contentDigest !== "string" || typeof value.path !== "string") throw new TypeError(`${label}-must-carry-resource-digest-and-path`);
  return Object.freeze({ resource: value.resource, contentDigest: value.contentDigest, path: value.path });
}

/**
 * Execute one brokerage-selected clopen move.  A stale preimage is a refused
 * effect: the actuator is not called.  The broker receives both observations
 * and emits the one canonical RMN/RWIL settlement.
 */
export async function coordinateBrokeredNormalization({ broker, trcReceipt, trcRmn, placementPlan, buyer, supplier, inventory, publication, observe, actuate, at = new Date().toISOString() } = {}) {
  const market = brokerApi(broker);
  if (typeof observe !== "function" || typeof actuate !== "function") throw new TypeError("injected-observer-and-bounded-actuator-required");
  const demand = market.admitTrcNormalizationDemand(trcReceipt, placementPlan, { buyer, publication, trcRmn });
  const capacityOffer = market.offerBareCedarFogCapacity({ supplier, inventory, publication });
  const selection = market.selectNormalizationOffer(demand, capacityOffer, { supplier });
  const [from] = selection.clopenMove.deltaMinus, [to] = selection.clopenMove.deltaPlus;
  const pre = observation(await observe({ resource: selection.clopenMove.resource, path: from }), "pre-move-observation");
  let actuatorError = null;
  if (pre.resource !== selection.clopenMove.resource || pre.path !== from) actuatorError = "pre-observation-refused";
  else {
    try {
      await actuate(Object.freeze({ type: "BrokeredBoundedNormalizationMove", selection: selection.id, resource: selection.clopenMove.resource, from, to, contentDigest: pre.contentDigest }));
    } catch (error) { actuatorError = error instanceof Error ? error.message : String(error); }
  }
  let post = null;
  try { post = observation(await observe({ resource: selection.clopenMove.resource, path: to }), "post-move-observation"); }
  catch (error) { if (actuatorError === null) actuatorError = error instanceof Error ? error.message : String(error); }
  const settlement = market.settleNormalizationSelection(selection, { pre, post, actuatorError, observedAt: at });
  return Object.freeze({ demand, capacityOffer, selection, settlement });
}
