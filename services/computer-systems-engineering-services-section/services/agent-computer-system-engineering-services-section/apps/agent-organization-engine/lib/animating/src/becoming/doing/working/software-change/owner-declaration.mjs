import { readFile, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { createTypedMark } from "@red-cup-engineering/signcell/typed-mark";
import { ownerType } from "./carriers.mjs";

export function admitSoftwareOwner(owner) {
  const admitted = createTypedMark(ownerType, owner);
  if (!admitted.ok) throw new TypeError(admitted.refusal.message);
  if (owner.kind === "instance") {
    throw new TypeError("an instance supplies configuration and state; it cannot own executable capability");
  }
  return admitted.value;
}

/** Read the nearest declared executable owner, never an instance or an undeclared workspace root. */
export async function nearestSoftwareOwner(directory) {
  let current = await realpath(directory);
  for (;;) {
    const path = join(current, "package.json");
    let bytes;
    try { bytes = await readFile(path); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (bytes !== undefined) {
      const manifest = JSON.parse(bytes.toString("utf8"));
      const owner = { name: manifest.name, kind: manifest.softwareKind };
      admitSoftwareOwner(owner);
      return Object.freeze({ ...owner, path, digest: sha256Hex(bytes), length: bytes.length });
    }
    const parent = dirname(current);
    if (parent === current) throw new TypeError("software work needs a declared package owner");
    current = parent;
  }
}
