import { chargeSideName, chargeValue, joinKnowledgeValue } from "@lenticule-science/articulating/predicating/positing";

const HASH = /^0x[0-9a-fA-F]{64}$/u;
const ACCOUNT = /^eip155:[1-9][0-9]*:0x[0-9a-fA-F]{40}$/u;
const CHAIN = /^eip155:[1-9][0-9]*$/u;
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u;

function hexQuantity(value, label) {
  try { const parsed = BigInt(value); if (parsed < 0n) throw new Error(); return parsed; }
  catch { throw new TypeError(`${label} must be a nonnegative EVM quantity`); }
}

export function chainReceiptKey(value) {
  if (!CHAIN.test(value?.chainId ?? "")) throw new TypeError("receipt chainId must be an EVM CAIP-2 identifier");
  if (!HASH.test(value?.blockHash ?? "") || !HASH.test(value?.transactionHash ?? "")) throw new TypeError("receipt must carry block and transaction hashes");
  const logIndex = hexQuantity(value.logIndex, "receipt logIndex");
  return `${value.chainId}:${value.blockHash.toLowerCase()}:${value.transactionHash.toLowerCase()}:${logIndex}`;
}

async function rpc(url, method, params, fetchImpl) {
  const response = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await response.json(); if (!response.ok || body.error) throw new Error(`${method} refused: ${body.error?.message ?? response.status}`); return body.result;
}

/** Witness that the named log remains in a canonical receipt under the selected finality policy. */
export async function assayReceiptFinalityPolicy(receipt, policy, fetchImpl = fetch) {
  const key = chainReceiptKey(receipt);
  if (policy?.chainId !== receipt.chainId || typeof policy.rpcUrl !== "string") throw new TypeError("receipt requires an exact chain finality policy");
  const transaction = await rpc(policy.rpcUrl, "eth_getTransactionReceipt", [receipt.transactionHash], fetchImpl);
  if (!transaction || BigInt(transaction.status) !== 1n || transaction.blockHash?.toLowerCase() !== receipt.blockHash.toLowerCase()) throw new Error("receipt is absent, failed, or no longer canonical");
  const index = Number(hexQuantity(receipt.logIndex, "receipt logIndex"));
  if (!transaction.logs?.some((entry) => Number(hexQuantity(entry.logIndex, "observed logIndex")) === index)) throw new Error("receipt log is absent");
  const block = hexQuantity(transaction.blockNumber, "receipt blockNumber");
  let observedThrough, boundaryKind, settlingRegime;
  if (policy.finalityTag) {
    if (policy.finalityTag !== "finalized") throw new TypeError("finality tag must be the EVM finalized tag");
    const finalized = await rpc(policy.rpcUrl, "eth_getBlockByNumber", [policy.finalityTag, false], fetchImpl);
    if (!finalized) throw new Error("chain did not return the selected finality tag");
    observedThrough = hexQuantity(finalized.number, "finalized block");
    boundaryKind = "protocol-finalized-block";
    settlingRegime = "strict-finite";
  } else {
    const latest = hexQuantity(await rpc(policy.rpcUrl, "eth_blockNumber", [], fetchImpl), "latest block");
    const confirmations = hexQuantity(policy.confirmations, "finality confirmations");
    if (confirmations < 1n) throw new TypeError("finality confirmations must be positive");
    observedThrough = latest >= confirmations - 1n ? latest - (confirmations - 1n) : -1n;
    boundaryKind = "confirmation-threshold";
    settlingRegime = "scott-continuous";
  }
  if (block > observedThrough) throw new Error("receipt has not reached the declared finality policy");
  return Object.freeze({
    ...receipt,
    key,
    blockNumber: Number(block),
    observedThrough: Number(observedThrough),
    boundaryKind,
    settlingRegime,
    finalityPolicy: policy.id,
    positiveEvidence: true,
    negativeEvidence: false,
  });
}

function evidenceKey(value) {
  if (!NI.test(value?.predicate ?? "") || !NI.test(value?.subject ?? "") || !NI.test(value?.object ?? "")) throw new TypeError("FOUR evidence must be typed by predicate, subject, and object ni identities");
  return `${value.predicate}\0${value.subject}\0${value.object}`;
}

function normalizedEvidence(value) {
  const canonical = chargeValue(value.positiveEvidence === true ? (value.negativeEvidence === true ? "stable" : "potential") : (value.negativeEvidence === true ? "active" : "absurd"));
  const [truth, falsity] = canonical.coordinates.map(chargeSideName);
  const positiveEvidence = truth === "present", negativeEvidence = falsity === "present";
  return Object.freeze({ predicate: value.predicate, subject: value.subject, object: value.object, positiveEvidence, negativeEvidence });
}

function knowledgeJoinEvidence(left, right) {
  const leftValue = chargeValue(left.positiveEvidence ? (left.negativeEvidence ? "stable" : "potential") : (left.negativeEvidence ? "active" : "absurd"));
  const rightValue = chargeValue(right.positiveEvidence ? (right.negativeEvidence ? "stable" : "potential") : (right.negativeEvidence ? "active" : "absurd"));
  const [truth, falsity] = joinKnowledgeValue(leftValue, rightValue).coordinates.map(chargeSideName);
  return Object.freeze({ ...right, positiveEvidence: truth === "present", negativeEvidence: falsity === "present" });
}

/** Merge sovereign views without creating a Union-wide interior view. */
export function mergeChainReceiptViews(views) {
  const receipts = new Map(), evidence = new Map(), custody = new Map();
  for (const view of views) {
    for (const receipt of view.receipts ?? []) {
      const key = chainReceiptKey(receipt), prior = receipts.get(key);
      if (prior && (prior.rmnAct !== receipt.rmnAct || prior.evidenceRoot !== receipt.evidenceRoot)) throw new Error(`receipt replay changed semantic content: ${key}`);
      receipts.set(key, Object.freeze({ ...receipt, key }));
    }
    for (const charge of view.evidence ?? []) {
      const key = evidenceKey(charge), prior = evidence.get(key), next = normalizedEvidence(charge);
      evidence.set(key, prior ? knowledgeJoinEvidence(prior, next) : next);
    }
    for (const claim of view.custody ?? []) {
      if (!NI.test(claim?.resource ?? "") || !ACCOUNT.test(claim?.account ?? "") || !CHAIN.test(claim?.chainId ?? "") || !NI.test(claim?.evidence ?? "")) throw new TypeError("custody claim is not fully typed and chain-qualified");
      if (!claim.active) continue;
      const holder = `${claim.chainId}:${claim.account}`, prior = custody.get(claim.resource);
      if (prior && prior.holder !== holder) throw new Error(`exclusive custody violated for ${claim.resource}`);
      custody.set(claim.resource, Object.freeze({ ...claim, holder }));
    }
  }
  return Object.freeze({
    receipts: Object.freeze([...receipts.values()].sort((left, right) => left.key.localeCompare(right.key))),
    evidence: Object.freeze([...evidence.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value)),
    custody: Object.freeze([...custody.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value)),
  });
}

/** A reorg adds contradictory evidence; it never deletes the prior receipt claim. */
export function reorganizationCorrection({ predicate, subject, object }) {
  return normalizedEvidence({ predicate, subject, object, positiveEvidence: false, negativeEvidence: true });
}
