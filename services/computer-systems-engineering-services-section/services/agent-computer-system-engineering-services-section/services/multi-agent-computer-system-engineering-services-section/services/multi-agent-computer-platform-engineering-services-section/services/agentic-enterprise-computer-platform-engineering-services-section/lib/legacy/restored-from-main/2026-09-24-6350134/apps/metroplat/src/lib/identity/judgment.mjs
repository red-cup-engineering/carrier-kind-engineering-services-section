/** Identity admission witnesses and obstructions. */

export function identityWitness(value) {
  return Object.freeze({ kind: "metroplat.identity:witness", value });
}

export function identityObstruction(
  code,
  path,
  message,
) {
  return Object.freeze({ kind: "metroplat.identity:obstruction", code, path, message });
}

export function isIdentityWitness(judgment) {
  return judgment.kind === "metroplat.identity:witness";
}
