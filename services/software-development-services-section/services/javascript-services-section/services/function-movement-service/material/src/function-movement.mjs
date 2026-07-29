import { createHash } from "node:crypto";

const identity = (value, label) => {
  if (typeof value !== "string" || value.length === 0 || value.includes("\n")) {
    throw new TypeError(`${label} must be one non-empty line`);
  }
  return value;
};

const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

/**
 * Deterministically prepare, but do not apply, a function move.
 *
 * The returned edits are the existing software-edit-language shape. The
 * artifact set is deliberately receiver-ready: an external provider may
 * compute it ephemerally, while accepted-software-delivery-receiver remains
 * the only component allowed to admit bytes into a customer package.
 */
export function prepareFunctionMovement({
  sourceSemioverse,
  sourcePackage,
  sourceFile,
  targetSemioverse,
  targetPackage,
  targetFile,
  functionName,
  functionSource,
  targetMarker,
} = {}) {
  for (const [value, label] of [
    [sourceSemioverse, "sourceSemioverse"],
    [sourcePackage, "sourcePackage"],
    [sourceFile, "sourceFile"],
    [targetSemioverse, "targetSemioverse"],
    [targetPackage, "targetPackage"],
    [targetFile, "targetFile"],
    [functionName, "functionName"],
  ]) identity(value, label);
  if (typeof functionSource !== "string" || !functionSource.trim()) throw new TypeError("functionSource must be non-empty");
  if (typeof targetMarker !== "string" || !targetMarker) throw new TypeError("targetMarker must be non-empty");
  if (!new RegExp(`\\b${functionName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(functionSource)) {
    throw new TypeError("functionSource does not contain functionName");
  }
  if (sourcePackage === targetPackage && sourceSemioverse === targetSemioverse && sourceFile === targetFile) {
    throw new TypeError("source and target must be distinct package locations");
  }

  // Keep one blank line in the REPLACE arm: the shared edit language requires
  // a distinct, parseable replacement arm and refuses an empty SEARCH act.
  const removal = `<<<<<<< SEARCH\n${functionSource}\n=======\n\n>>>>>>> REPLACE`;
  const insertion = `<<<<<<< SEARCH\n${targetMarker}\n=======\n${targetMarker}\n\n${functionSource}\n>>>>>>> REPLACE`;
  const artifacts = [
    { path: sourceFile, content: removal, kind: "source-removal-edit" },
    { path: targetFile, content: insertion, kind: "target-insertion-edit" },
  ];
  return {
    operation: "prepare-function-movement",
    movement: { sourceSemioverse, sourcePackage, sourceFile, targetSemioverse, targetPackage, targetFile, functionName },
    artifactSetDigest: digest(JSON.stringify(artifacts)),
    artifacts,
    nextActuator: "accepted-software-delivery-receiver",
    writeAuthority: "receiver-only",
  };
}
