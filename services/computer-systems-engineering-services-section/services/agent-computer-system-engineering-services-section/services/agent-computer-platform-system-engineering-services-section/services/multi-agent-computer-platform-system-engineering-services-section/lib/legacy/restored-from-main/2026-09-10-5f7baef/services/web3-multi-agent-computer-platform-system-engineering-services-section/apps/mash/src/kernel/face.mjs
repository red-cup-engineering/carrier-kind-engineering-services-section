import * as fae from "@red-cup-engineering/feltos/flatfile";

// A member's settled face — σ, per this section's README ("MASH... reads
// each member's settled face"). Composes FARS's own deterministic replay
// (kernel/replay.mjs's replayEventLog/serializeState) unchanged: MASH
// never re-derives belief from a member's raw journal, and never touches
// a member's substrate directly — the member's own FARS realization is
// the only writer, and the only party allowed to fold its own log. This
// is the section README's composition doctrine applied to the FARS app
// itself, exactly as apps/fae/src/provider composes its own upstream
// carriers rather than re-parsing them.
//
// readMemberFace is synchronous because replayEventLog is synchronous;
// kernel/tick.mjs composes many members by calling this once per member,
// not concurrently — a deliberate simplicity, revisited only if a real
// multi-member deployment shows the sequential read is ever the
// bottleneck (no such deployment exists yet to measure against).
export function readMemberFace(member) {
  const state = fae.replay.replayEventLog(member.root);
  const digest = fae.replay.serializeState(state).toString("hex");
  return Object.freeze({
    member: member.id,
    root: member.root,
    beliefCount: Object.keys(state.belief).length,
    recordCount: Object.keys(state.records).length,
    witnessCount: Object.keys(state.witnesses).length,
    digest,
  });
}
