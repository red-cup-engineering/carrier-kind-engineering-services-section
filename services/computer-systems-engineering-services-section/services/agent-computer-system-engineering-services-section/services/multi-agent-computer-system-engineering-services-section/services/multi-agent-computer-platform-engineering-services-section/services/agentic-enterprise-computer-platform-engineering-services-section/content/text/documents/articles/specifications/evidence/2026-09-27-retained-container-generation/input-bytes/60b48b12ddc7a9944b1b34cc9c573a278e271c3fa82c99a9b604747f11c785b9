/** Causal reception, admission, and frontier judgments. */

export function causalWitness(value) {
  return Object.freeze({ kind: "metroplat.causal:witness", value });
}

export function causalObstruction(
  code,
  path,
  message,
  relatedRefs = Object.freeze([]),
) {
  return Object.freeze({
    kind: "metroplat.causal:obstruction",
    code,
    path,
    message,
    relatedRefs: Object.freeze([...relatedRefs].sort()),
  });
}

export function isCausalWitness(judgment) {
  return judgment.kind === "metroplat.causal:witness";
}
