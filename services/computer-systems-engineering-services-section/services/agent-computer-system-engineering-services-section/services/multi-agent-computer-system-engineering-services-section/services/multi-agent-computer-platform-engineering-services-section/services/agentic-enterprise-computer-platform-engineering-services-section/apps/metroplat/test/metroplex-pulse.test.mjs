import assert from "node:assert/strict";
import test from "node:test";
import { HALF_LIFE, PRESENCE, emptyPulse, foldPulse, heatAt, pulseEvent, pulseReading } from "../src/metroplex-pulse.mjs";

const attempt = (id, at, invocation) => ({ kind: "metroplat.rpc.attempt", at: new Date(at).toISOString(), invocation: { id, ...invocation } });
const outcome = (id, at, ok) => ({ kind: "metroplat.rpc.outcome", at: new Date(at).toISOString(), invocation: id, receipt: { ok } });
const site = (event) => (event.schedule === undefined
  ? { walker: `account:${event.subject}`, kind: "account", name: event.subject, rest: "section:office", room: "section:office" }
  : { walker: `routine:${event.schedule}`, kind: "routine", name: event.schedule, rest: "metroplex", room: `section:${event.enterprise}` });

test("the pulse folds attempts into walkers in their rooms, and outcomes into their ends", () => {
  const t = Date.parse("2026-10-03T00:00:00.000Z");
  const rows = [
    attempt("i1", t, { verb: "enterprise-loop-run", subject: "node", input: { enterprise: "codex-node" }, caller: { schedule: "enterprise-loop-codex-node", transport: "clock" } }),
    attempt("i2", t + 1000, { verb: "work-open", subject: "actor:a", input: {}, caller: { transport: "mcp" } }),
    attempt("i3", t + 1500, { verb: "metroplex-pulse", subject: "actor:a", input: {} }),
    outcome("i1", t + 2000, true),
    { kind: "metroplat.rpc.decision" },
  ];
  const pulse = rows.map(pulseEvent).filter(Boolean).reduce((folded, event) => foldPulse(folded, event, site), emptyPulse());
  const reading = pulseReading(pulse, t + 3000);
  assert.equal(reading.seq, 2, "reading the city's own pulse is no act in it");
  const routine = reading.walkers.find((w) => w.id === "routine:enterprise-loop-codex-node");
  assert.deepEqual([routine.room, routine.rest, routine.done, routine.ok], ["section:codex-node", "metroplex", t + 2000, true]);
  assert.equal(reading.walkers.find((w) => w.id === "account:actor:a").done, undefined);
  assert.deepEqual(reading.acts.map((a) => a.seq), [1, 2]);
  assert.deepEqual(pulseReading(pulse, t + 3000, 1).acts.map((a) => a.verb), ["work-open"]);
  // Heat is read by its formula: one act, halved once per half-life.
  const held = reading.heat.find((h) => h.room === "section:codex-node");
  assert.equal(heatAt(held, held.at + HALF_LIFE), 0.5);
  // An account that stops acting leaves the city; a routine stays.
  assert.deepEqual(pulseReading(pulse, t + 1000 + PRESENCE).walkers.map((w) => w.kind), ["routine"]);
});
