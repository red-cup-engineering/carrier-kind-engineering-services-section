import { existsSync, statSync } from "node:fs";

// A member names one sovereign FARS substrate MASH composes over — a
// directory MASH itself never writes to (the FARS README's own
// discipline: "one directory, one writer"). MASH only ever reads a
// member's already-settled state (kernel/face.mjs's readMemberFace);
// nothing in this kernel appends to a member's event log.
//
// Mirrors apps/fae's own src/provider/provider.mjs discipline
// (defineProvider/validateResourceGraph): a small, explicit shape
// constructor, never a bare object literal passed around ad hoc.

function nonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

export function defineMember({ id, root }) {
  nonEmptyString(id, "member.id");
  nonEmptyString(root, "member.root");
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new TypeError(`member.root must be an existing directory: ${root}`);
  }
  return Object.freeze({ id, root });
}

export function isMember(value) {
  return value !== null && typeof value === "object" && typeof value.id === "string" && typeof value.root === "string";
}
