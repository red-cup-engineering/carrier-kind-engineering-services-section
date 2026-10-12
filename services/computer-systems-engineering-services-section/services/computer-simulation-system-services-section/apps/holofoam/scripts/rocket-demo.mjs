/**
 * A small rocket flown through Holofoam's structure and flight: three welded tanks, an engine, two balanced rings,
 * and two side boosters each held by a decoupler (a ball joint) and braced by struts. Prints the rigidity
 * receipt, the loads at launch thrust, an over-thrust case where struts fire in order, and a 60 s flight with
 * staging at 20 s. Deterministic: the history head address is identical on every run.
 *   node scripts/rocket-demo.mjs
 */
import { admitDesign, failure, loads, rigidity } from "../src/structure.mjs";
import { bodiesAt, headAddress, launch, setThrottle, stage } from "../src/flight.mjs";

const G = [0, 0, -9.80665];

/** The rocket. z is up. Left booster has one redundant brace (a self-stress); the right is exactly braced. */
export function rocket({ boosterThrust = 14000 } = {}) {
  const booster = (side, x) => [
    { id: `booster-${side}-top`, mass: 100, at: [x, 0, 5], kind: "nose-cone" },
    { id: `booster-${side}-tank`, mass: 350, at: [x, 0, 3], kind: "booster-tank" },
    { id: `booster-${side}-bot`, mass: 150, at: [x, 0, 1], kind: "booster-engine", thrust: [0, 0, boosterThrust] },
  ];
  const brace = (side, x) => [
    { id: `weld-${side}-1`, from: `booster-${side}-top`, to: `booster-${side}-tank`, kind: "weld", strength: 1e6 },
    { id: `weld-${side}-2`, from: `booster-${side}-tank`, to: `booster-${side}-bot`, kind: "weld", strength: 1e6 },
    { id: `decoupler-${side}`, from: "tank-3", to: `booster-${side}-top`, kind: "decoupler", at: [x / 2, 0, 5.5], strength: 6000 },
    { id: `strut-${side}-a`, from: "tank-1", to: `booster-${side}-bot`, kind: "strut", strength: 2000, releasedBy: `decoupler-${side}` },
    { id: `strut-${side}-b`, from: "ring-n", to: `booster-${side}-bot`, kind: "strut", strength: 2000, releasedBy: `decoupler-${side}` },
    { id: `strut-${side}-c`, from: "ring-n", to: `booster-${side}-top`, kind: "strut", strength: 80, releasedBy: `decoupler-${side}` },
  ];
  return admitDesign({
    parts: [
      { id: "engine", mass: 300, at: [0, 0, 0], kind: "engine", thrust: [0, 0, 20000] },
      { id: "tank-1", mass: 400, at: [0, 0, 2], kind: "tank" },
      { id: "tank-2", mass: 400, at: [0, 0, 4], kind: "tank" },
      { id: "tank-3", mass: 400, at: [0, 0, 6], kind: "tank" },
      { id: "ring-n", mass: 20, at: [0, 1, 3], kind: "ring" },
      { id: "ring-s", mass: 20, at: [0, -1, 3], kind: "ring" },
      ...booster("L", -2), ...booster("R", 2),
    ],
    joints: [
      { id: "weld-e", from: "engine", to: "tank-1", kind: "weld", strength: 1e6 },
      { id: "weld-12", from: "tank-1", to: "tank-2", kind: "weld", strength: 1e6 },
      { id: "weld-23", from: "tank-2", to: "tank-3", kind: "weld", strength: 1e6 },
      { id: "weld-rn", from: "tank-1", to: "ring-n", kind: "weld", strength: 1e6 },
      { id: "weld-rs", from: "tank-1", to: "ring-s", kind: "weld", strength: 1e6 },
      ...brace("L", -2), ...brace("R", 2),
      // the redundant brace on the left booster: over-braced, H1 = 1
      { id: "strut-L-d", from: "tank-3", to: "booster-L-bot", kind: "strut", strength: 2500, releasedBy: "decoupler-L" },
    ],
  });
}

const fmt = (v) => (Array.isArray(v) ? `[${v.map(fmt).join(", ")}]` : typeof v === "number" ? (Math.abs(v) < 5e-9 ? "0" : String(Math.round(v * 1e4) / 1e4)) : String(v));
const thrusts = (design, throttle = 1) => design.parts.filter((p) => p.thrust).map((p) => ({ part: p.id, force: p.thrust.map((c) => c * throttle) }));

function run() {
  const out = [];
  const say = (s = "") => out.push(s);
  const design = rocket();

  say("== rigidity (exact over Q, body-bar sheaf) ==");
  const r = rigidity(design);
  say(`rigid clusters: ${r.clusters.map((c) => `${c.id}(${c.parts.length})`).join(" ")}`);
  say(`motions H0=${r.motions} mechanisms=${r.mechanisms} self-stresses H1=${r.selfStresses} rigid=${r.rigid}  Maxwell ${r.maxwell.lhs} = ${r.maxwell.rhs}: ${r.maxwell.holds}`);
  for (const p of r.pieces) say(`piece ${p.id}: ${p.parts.length} parts, ${p.members.length} members, mechanisms=${p.mechanisms} self-stresses=${p.selfStresses}`);

  say("\n== loads at launch thrust (compression positive; z up, g = 9.80665) ==");
  const l = loads(design, thrusts(design), { gravity: G });
  say(`piece acceleration = ${fmt(l.pieces[0].acceleration)}  resolved=${l.resolved}`);
  for (const m of l.members.filter((x) => x.kind !== "weld")) say(`  ${m.id.padEnd(14)} ${m.kind.padEnd(9)} load ${fmt(m.load).padStart(9)} / ${m.strength}  ratio ${fmt(m.ratio)}`);
  const weld = l.members.filter((x) => x.kind === "weld").reduce((a, b) => (b.ratio > a.ratio ? b : a));
  say(`  max weld ${weld.id} load ${fmt(weld.load)} / ${weld.strength}`);

  say("\n== over-thrust: boosters at 2.4x thrust, struts fire in order ==");
  const hot = rocket({ boosterThrust: 14000 * 2.4 });
  const f = failure(hot, thrusts(hot), { gravity: G });
  for (const x of f.firings) say(`  step ${x.step}: ${x.member} fires (${x.event}) load ${fmt(x.load)} > ${x.strength}, ratio ${fmt(x.ratio)}; over: ${x.overloaded.join(",")}${x.split ? "; T1 split into " + x.split.length + " pieces" : ""}`);
  say(`  survivors: ${f.design.joints.length} joints of ${hot.joints.length}; obstructions: ${f.obstructions.length}`);

  say("\n== flight: 60 s, staging at 20 s, throttle 0.8 at 40 s (dt = 1/64) ==");
  let flight = launch(design, { dt: 1 / 64, gravity: G });
  say(`launch: ${flight.firings.length} firings, ${bodiesAt(flight, 0).length} body`);
  flight = stage(flight, 20 * 64, "decoupler-L");
  say(`stage decoupler-L at 20 s: firings ${flight.firings.length}, bodies ${bodiesAt(flight, 20 * 64).map((b) => b.body).join(", ")}`);
  flight = stage(flight, 20 * 64, "decoupler-R");
  flight = setThrottle(flight, 40 * 64, 0.8);
  for (const t of [0, 10, 19.984375, 20, 25, 40, 50, 60]) {
    for (const b of bodiesAt(flight, Math.round(t * 64))) say(`  t=${String(t).padStart(9)} s  ${b.body.padEnd(14)} x=${fmt(b.position)} v=${fmt(b.velocity)} q=${fmt(b.orientation)} w=${fmt(b.angularVelocity)}`);
  }
  say(`\nhistory head: ${headAddress(flight)}`);
  return { text: out.join("\n"), address: headAddress(flight) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const first = run();
  const second = run();
  console.log(first.text);
  console.log(`\nrerun identical: ${first.address === second.address && first.text === second.text}`);
}
