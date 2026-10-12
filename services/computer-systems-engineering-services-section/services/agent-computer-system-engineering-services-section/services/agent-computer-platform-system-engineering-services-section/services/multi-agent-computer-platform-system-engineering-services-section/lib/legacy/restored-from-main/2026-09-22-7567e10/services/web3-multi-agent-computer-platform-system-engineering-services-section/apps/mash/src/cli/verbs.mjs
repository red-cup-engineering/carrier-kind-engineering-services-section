// CLI verb layer: pure functions only, no process.argv/stdout/exitCode —
// exactly apps/fae/src/cli/verbs.mjs's split (the process boundary lives
// entirely in cli/mash.mjs, the one file allowed to touch it).

import { defineMember } from "../kernel/member.mjs";
import { composeMembers } from "../kernel/tick.mjs";

// "<id>=<root>" — the same shape the section README gives for
// apps/mash's own relationship to apps/fae ("composes the FARS app...
// as its node substrate"): one member is one id bound to one FARS
// substrate root.
export function parseMemberArg(arg) {
  const eq = arg.indexOf("=");
  if (eq <= 0) throw new TypeError(`member argument must be <id>=<root>, got: ${arg}`);
  return defineMember({ id: arg.slice(0, eq), root: arg.slice(eq + 1) });
}

export function runTick(memberArgs) {
  const members = memberArgs.map(parseMemberArg);
  return composeMembers(members, { onMemberError: "diagnose" });
}
