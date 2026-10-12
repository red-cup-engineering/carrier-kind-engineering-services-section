/**
 * Orbit demo: launch a point vessel from the homeworld, circularize, plan a transfer to the moon with What-if, cross the
 * sphere of influence, capture, and warp ten years ahead in one call. The plan is a SignCraft history of law cells; every
 * number printed is derived. A rerun prints the same history head.
 *
 * The vessel is a point mass (the slice-3 rocket integrates a rigid body under uniform gravity, so its parts are not coupled
 * to a central field); its ascent is a powered law with a gravity-turn steering programme and an apoapsis cutoff, and the
 * later burns are impulsive laws.
 */
import {
  bodyRelative, chain, commRegion, continuity, createPlan, diamonds, headAddress, mergePlans, orbitSummary, planOf, poseAt, reopenManeuver,
  seams, sequencingCheck, systemOf, tellCoast, tellImpulse, tellPowered, visibilityRegion, visibleFrom, whatIf,
} from "../src/orbit.mjs";

const km = (m) => (m === null ? "open" : `${(m / 1000).toFixed(1)} km`);
const clock = (s) => `${s.toFixed(1)} s`;
const days = (s) => `${(s / 86400).toFixed(3)} d`;
const norm = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const wrap = (a) => a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
const say = (...parts) => console.log(...parts);
const heading = (text) => say(`\n== ${text}`);
const apsides = (o) => `${o.parent}: peri ${km(o.periapsisAltitude)}, apo ${km(o.apoapsisAltitude)}, e ${o.eccentricity.toExponential(2)}, period ${o.period === null ? "open" : days(o.period)}`;

const VESSEL = "probe-1";
const system = systemOf(createPlan().history);
const terra = system.bodies.get("terra"), luna = system.bodies.get("luna");
const MU = terra.mu;

// — the plan, as one player tells it —
let alice = planOf(createPlan(), VESSEL);
heading("System (admitted as cells)");
for (const body of system.bodies.values()) say(`${body.id.padEnd(7)} mu ${body.mu.toExponential(4)}  radius ${km(body.radius)}  parent ${body.parent ?? "-"}  soi ${body.soi === Infinity ? "-" : km(body.soi)}`);

heading("Ascent: powered law, gravity turn, apoapsis cutoff");
alice = tellPowered(alice, {
  vessel: VESSEL, epoch: 0, parent: "terra", r: [terra.radius, 0, 0], v: [0, 0, 0],
  mass: 20000, dry: 5000, thrust: 360000, flow: 114.7, dt: 1 / 16, steps: 16 * 400,
  steer: { vertical: 6, kick: 10, tilt: 0.5, east: [0, 1, 0] }, cutoff: { apoapsis: 700000 }, player: "alice",
});
const ascent = chain(alice, VESSEL, 4000);
const tCutoff = ascent[0].end;
say(`powered ${clock(ascent[0].epoch)} .. ${clock(tCutoff)} (${ascent[0].endReason}); mass at cutoff ${poseAt(alice, tCutoff).mass.toFixed(0)} kg`);
const suborbital = orbitSummary(alice, VESSEL, tCutoff);
say(`after cutoff  ${apsides(suborbital)}; next ${JSON.stringify(suborbital.nextEvent)}`);

heading("Circularize at apoapsis (What-if first, then told)");
const tApo = tCutoff + suborbital.timeToApoapsis;
const atApo = poseAt(alice, tApo);
const circular = Math.sqrt(MU / norm(atApo.local.r)) - norm(atApo.local.v);
const circularize = whatIf(alice, { kind: "impulse", t: tApo, dv: { prograde: circular } });
say(`dv ${circular.toFixed(1)} m/s at t=${clock(tApo)} -> ${apsides(circularize.result.after)}`);
alice = tellImpulse(alice, { t: tApo, dv: { prograde: circular }, player: "alice" });
const parking = orbitSummary(alice, VESSEL, tApo);

heading("Transfer to the moon");
const r1 = parking.periapsis, r2 = luna.law ? norm(luna.law.r) : 0;
const dvTransfer = Math.sqrt(MU / r1) * (Math.sqrt((2 * r2) / (r1 + r2)) - 1);
const flight = Math.PI * Math.sqrt(((r1 + r2) / 2) ** 3 / MU);
const angle = (v) => Math.atan2(v[1], v[0]);
// phase: depart when the moon will be opposite the burn point at arrival
const phase = (t) => wrap(angle(bodyRelative(system, "luna", t + flight).r) - angle(poseAt(alice, t).local.r) - Math.PI);
let t = tApo + 600, step = 20, prior = phase(t), departure;
for (; t < tApo + 4e5; t += step) {
  const now = phase(t + step);
  if (prior < 0 && now >= 0) { let lo = t, hi = t + step; for (let i = 0; i < 80; i += 1) { const mid = lo + (hi - lo) / 2; if (phase(mid) >= 0) hi = mid; else lo = mid; } departure = hi; break; }
  prior = now;
}
say(`Hohmann dv ${dvTransfer.toFixed(1)} m/s, flight ${days(flight)}, phased departure t=${clock(departure)}`);
// aim: slip the departure until the lunar periapsis clears the surface by 60 km or more
let chosen;
for (let k = 0; k < 80 && chosen === undefined; k += 1) {
  for (const sign of k === 0 ? [1] : [1, -1]) {
    const at = departure + sign * k * 5;
    const probe = whatIf(alice, { kind: "impulse", t: at, dv: { prograde: dvTransfer } });
    const entry = probe.result.after.nextEvent;
    if (entry === null || entry.reason !== "soi-entry") continue;
    const inside = orbitSummary(probe.plan, VESSEL, entry.t);
    if (inside.periapsisAltitude >= 60000) { chosen = { at, probe, inside, entry }; break; }
  }
}
say(`aim: depart t=${clock(chosen.at)} (slip ${clock(chosen.at - departure)}); What-if: ${apsides(chosen.probe.result.after)}`);
say(`     next event ${JSON.stringify(chosen.entry)}; inside it ${apsides(chosen.inside)}`);
const document = chosen.probe.document;
const reopened = reopenManeuver(alice, document);
say(`     maneuver document reopens to the same fork: ${reopened.result.head === chosen.probe.result.head}; original head unchanged: ${headAddress(alice) === document.input.head}`);
alice = tellImpulse(alice, { t: chosen.at, dv: { prograde: dvTransfer }, player: "alice" });

heading("Sphere-of-influence change");
const tEntry = chosen.entry.t;
say(`entry into luna soi at t=${clock(tEntry)} (${days(tEntry)}); parent terra -> luna`);
for (const j of continuity(alice, VESSEL, tEntry + 1).filter((j) => j.from === "soi-entry")) say(`root-frame jump across the boundary: position ${j.positionJump.toExponential(2)} m, velocity ${j.velocityJump.toExponential(2)} m/s`);

heading("Capture at lunar periapsis");
const tPe = tEntry + chosen.inside.timeToPeriapsis;
const pe = poseAt(alice, tPe);
const capture = Math.sqrt(luna.mu / norm(pe.local.r)) - norm(pe.local.v);
const captured = whatIf(alice, { kind: "impulse", t: tPe, dv: { prograde: capture } });
say(`dv ${capture.toFixed(1)} m/s at t=${clock(tPe)} -> ${apsides(captured.result.after)}`);
alice = tellImpulse(alice, { t: tPe, dv: { prograde: capture }, player: "alice" });

heading("Time warp: ten years ahead in one call");
const tenYears = 10 * 365.25 * 86400;
const started = performance.now();
const far = poseAt(alice, tenYears);
say(`t = 10 y: parent ${far.parent}, |r| ${km(norm(far.local.r))}, root position ${far.position.map((c) => c.toExponential(4)).join(" ")}`);
console.error(`(warp took ${(performance.now() - started).toFixed(1)} ms)`);
say(`final orbit   ${apsides(orbitSummary(alice, VESSEL, tenYears))}`);

heading("Diamond chain (kinematic points)");
const points = diamonds(alice, { until: tenYears });
for (const p of points) say(`${p.id.padEnd(22)} ${p.kind.padEnd(8)} ${p.parent.padEnd(6)} [${p.a.t.toFixed(1)}, ${p.b.t.toFixed(1)}]  ends: ${p.endReason}`);
const check = sequencingCheck(points);
say(`sequencing chain (b <= c, never nesting): ${check.ok ? "ok" : JSON.stringify(check.violations)} over ${check.count} diamonds`);

heading("Readouts: visibility and comm range from a relay in a high Terra orbit");
let relayPlan = planOf(alice, "relay-1");
const rr = 3.0e6;
relayPlan = tellCoast(relayPlan, { vessel: "relay-1", epoch: 0, parent: "terra", r: [0, rr, 0], v: [-Math.sqrt(MU / rr), 0, 0], player: "alice" });
const target = planOf(relayPlan, VESSEL);
const rows = [0, 3600, 4 * 3600, 86400, 3 * 86400, 5 * 86400, 12 * 86400, 40 * 86400, 400 * 86400].map((t) => `${days(t)}:${visibleFrom(relayPlan, target, t) ? "see" : "dark"}`);
say(rows.join("  "));
const region = visibilityRegion(relayPlan, target, { samples: 24 });
for (const row of region.reading(points)) say(`${row.id.padEnd(22)} readout ${String(row.readout).padEnd(5)} exterior ${String(row.exterior).padEnd(5)} hole ${row.hole}`);
say(`region laws (hole future-closed, exterior past-closed, disjoint, no future hole->exterior): ${region.laws(points).ok ? "ok" : "violated"}`);
const comm = commRegion(relayPlan, target, { range: 4e6, samples: 24 });
say(`comm (range 4000 km): ${comm.reading(points).map((row) => `${Number(row.id.split("@")[1]).toFixed(0)}:${row.readout ? "linked" : row.exterior ? "silent/exterior" : "silent/hole"}`).join(" ")}`);

heading("Two players, one deliberate conflict");
const base = planOf(createPlan(), VESSEL);
const shared = tellCoast(base, { vessel: VESSEL, epoch: 0, parent: "terra", r: [r1, 0, 0], v: [0, Math.sqrt(MU / r1), 0], player: "alice" });
const tBurn = 5400;
const left = tellImpulse(shared, { t: tBurn, dv: { prograde: dvTransfer }, player: "alice" });
const right = tellImpulse(tellCoast(shared, { vessel: "relay-2", epoch: 0, parent: "terra", r: [0, rr, 0], v: [-Math.sqrt(MU / rr), 0, 0], player: "bob" }), { t: tBurn, dv: { prograde: 0.5 * dvTransfer }, player: "bob" });
const ab = mergePlans(left, right), ba = mergePlans(right, left);
say(`merge(alice,bob) head ${ab.head.slice(0, 40)}..`);
say(`merge(bob,alice) head ${ba.head.slice(0, 40)}..  identical: ${ab.head === ba.head}`);
say(`seams: H1 = ${ab.seams.h1}; contested cells: ${ab.seams.conflicts.map((c) => `(${c.vessel}, ${c.epoch}) told both by ${c.laws.map((l) => l.witnesses.join("+")).join(" vs ")}`).join("; ")}`);
say(`relay-2 (bob only) reads fine: |r| ${km(norm(poseAt(ab, 100, "relay-2").local.r))}`);
try { poseAt(ab, tBurn + 1, VESSEL); } catch (error) { say(`${VESSEL} after the contested epoch is refused: ${error.name}`); }
say(`${VESSEL} before it reads: |r| ${km(norm(poseAt(ab, tBurn - 1, VESSEL).local.r))}`);
say(`seams(alice alone) H1 = ${seams(left).h1}`);

heading("History head");
say(headAddress(alice));
