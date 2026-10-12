/**
 * control — meaningful human control over a move, as the polity's charter states it.
 *
 * "Meaningful human control over a workitem w holds iff the four conditions all hold; each is decidable
 * in bare Π₁" (meaningful-human-control; its charter-C3-extension theorem). A move here is a bearer
 * playing a mask to perform a verb of a declared class, through an organ where it actuates — the two
 * bodies (./organs.mjs, ./politic.mjs) read as one accountable act. Each condition is read as FOUR:
 *
 *   1. ACCOUNTABILITY (witness chain to captain). The chain starts at the bearer's seat in its mask (an
 *      office seat at dignitas holds, under repair is held both ways, failed is refused, partly seated is
 *      unknown; no seat at all is refused) and climbs the office's reports-to chain until an office heads
 *      a body whose `serves` chain — or, serving none, the wholes it is part of — ends at a head no
 *      office bears: the captain, the human locus the chain terminates at. An office reporting to no
 *      office answers through the bodies that regulate through it (the micro-enterprise listing it, else
 *      the polity seating it), as a Rendanheyi micro-enterprise answers through the platform it stands
 *      on. A chain that closes through none of these is refused; a link naming nothing the registry
 *      holds is unknown (evidence wanting, the move stays open). A captain wearing the mask is the human
 *      locus already: the trace closes at the bearer in person.
 *   2. ENVELOPE (safety-envelope precheck □σ). A move whose class does not actuate is exempt by its
 *      class and reads t vacuously. An actuating move reads its device's safety gate
 *      (animating/embodying/device `safetyGate`), or the actuate coordinate of the organ it acts through
 *      as the runtime tells it (./organs.mjs `told`); with neither, unknown.
 *   3. CHARTER (charter-tier discipline). The class requires a tier of the charter's precedence
 *      (instructions < preferences < guidelines < rules < constitutional): a process or procedure is
 *      mechanical enactment and needs a rule; a derivation or inquiry bears judgment and needs a
 *      guideline; an actuating move, a governance amendment and a federation admission need the
 *      constitution — the office's own record granting the verb over the place it acts on, the body
 *      politic as "a constitution that runs". House rules (./rules.mjs, BCP 14) supply the middle tiers
 *      by force (binding a rule, advisory a guideline, permission a preference), a principal's direction
 *      the instructions tier. A binding prohibition refuses; a permission told both ways is held. A
 *      governance amendment also needs the captain's attestation, a federation admission two seated
 *      personnel's: wanting, unknown; refused by an attester, refused.
 *   4. PERSISTENCE (falsifiable agency's persistent state). The acting body survives interrupt and
 *      resume: a device whose journal holds the hash of its fields reads t when its fields reproduce it
 *      byte-identically and f when they do not; otherwise the current certificates told for the bearer
 *      or its mask, knowledge-joined (expired ones withdrawn); none, unknown.
 *
 * The verdict is the meet across the four, and only t admits. The charter names that meet ∧_k, but the
 * behaviour it fixes — t only when all four are t, any f refuses, any ⊥ wants evidence, any ⊤ blocks
 * for repair — is the bilattice TRUTH meet (the knowledge meet would let a contradicted axis through,
 * ⊤ being its unit, and turn a refusal into ⊥). The truth meet is used, as the device's safety gate
 * uses it; the conflict is the theory's to settle. Because the truth meet folds ⊥ with ⊤ to f, the
 * response is read per axis, as the charter's table has it: any f fails the move (failed-mhc), else
 * any ⊤ blocks it pending repair, else any ⊥ keeps it open for evidence.
 */
import { createHash } from "node:crypto";

import { safetyGate, deviceStateHash, actuate } from "@red-cup-engineering/animating/becoming/doing/embodying/device";
import { knowledgeJoinAll, truthMeetAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";

import { masksOf } from "./cast.mjs";
import { bodyOf, incumbenciesOf, officeReading, resolve } from "./index.mjs";
import { organsOf } from "./organs.mjs";
import { officesOfBody, scopeOf, wholesOf, within } from "./politic.mjs";
import { judgeAction } from "./rules.mjs";

const T = "potential";
const F = "active";
const BOTH = "stable";
const NONE = "absurd";

/** The charter's precedence, weakest first. */
export const CHARTER_TIERS = Object.freeze(["instructions", "preferences", "guidelines", "rules", "constitutional"]);

/** The move classes and what each requires (the charter-fragment-tier table). */
export const MOVE_CLASSES = Object.freeze({
  process: Object.freeze({ tier: "rules", actuates: false }),
  procedure: Object.freeze({ tier: "rules", actuates: false }),
  derivation: Object.freeze({ tier: "guidelines", actuates: false }),
  inquiry: Object.freeze({ tier: "guidelines", actuates: false }),
  actuating: Object.freeze({ tier: "constitutional", actuates: true }),
  "governance-amendment": Object.freeze({ tier: "constitutional", actuates: false, attest: "captain" }),
  "federation-admission": Object.freeze({ tier: "constitutional", actuates: false, attest: "personnel", quorum: 2 }),
});

const BCP_TIER = Object.freeze({ binding: "rules", advisory: "guidelines", permission: "preferences" });
const rank = (tier) => CHARTER_TIERS.indexOf(tier);
const strongest = (tiers) => tiers.reduce((best, tier) => (best === undefined || rank(tier) > rank(best) ? tier : best), undefined);
const SEAT = Object.freeze({ dignitas: T, repair: BOTH, failed: F });

const bodies = (agency) => [...agency.bodies.values(), ...agency.enterprises.values()];

/** The captains a body answers to: follow `serves` to the body served by none, else the wholes it is
 *  part of (./politic.mjs wholesOf: its `part-of`, and the polity of its legal entity — Rendanheyi's
 *  platform the micro-enterprise stands on), else its head — when no office bears it — is the captain.
 *  A served body the registry lacks is unknown; a head that is an office, a missing head or a cycle
 *  reaches no captain. */
export function captainsOf(agency, body, seen = new Set()) {
  if (seen.has(body.key)) return Object.freeze({ reading: F, through: [...seen], captains: [] });
  const path = new Set([...seen, body.key]);
  if (typeof body.serves === "string" && body.serves.length > 0) {
    const served = bodyOf(agency, body.serves, body.sectionPath);
    if (served === undefined) return Object.freeze({ reading: NONE, through: [...path], captains: [], dangling: body.serves });
    return captainsOf(agency, served.body, path);
  }
  const wholes = wholesOf(agency, body.key).map((key) => captainsOf(agency, bodyOf(agency, key).body, path));
  const closed = wholes.filter((w) => w.reading === T);
  if (closed.length > 0) {
    return Object.freeze({ reading: T, through: [...new Set(closed.flatMap((w) => w.through))], captains: [...new Set(closed.flatMap((w) => w.captains))].sort() });
  }
  if (typeof body.head !== "string" || body.head.length === 0 || resolve(agency, "offices", body.head, body.sectionPath) !== undefined) {
    const dangling = wholes.find((w) => w.reading === NONE);
    return Object.freeze({ reading: dangling ? NONE : F, through: [...path], captains: [], ...(dangling ? { dangling: dangling.dangling } : {}) });
  }
  return Object.freeze({ reading: T, through: [...path], captains: [body.head] });
}

/** The bodies that regulate through an office (./politic.mjs officesOfBody): the micro-enterprises
 *  that list it, or — when none does — the polities whose seat it sits under. The more particular
 *  body speaks first: an enterprise of another legal entity is not answered for by a polity whose
 *  seat happens to cover it. */
const regulators = new WeakMap();
function regulatedBy(agency, officeKey) {
  if (!regulators.has(agency)) {
    const index = { enterprises: new Map(), polities: new Map() };
    const note = (map, office, key) => map.set(office, [...(map.get(office) ?? []), key]);
    for (const body of agency.enterprises.values()) {
      for (const office of officesOfBody(agency, { body, kind: "micro-enterprise" })) note(index.enterprises, office, body);
    }
    for (const body of agency.bodies.values()) {
      if (body.kind === "polity") for (const office of officesOfBody(agency, { body, kind: "polity" })) note(index.polities, office, body);
    }
    regulators.set(agency, index);
  }
  const { enterprises, polities } = regulators.get(agency);
  return enterprises.get(officeKey) ?? polities.get(officeKey) ?? [];
}

/** Every captain the agency knows: the heads, borne by no office, of the bodies that serve none. */
const knownCaptains = new WeakMap();
function captainsKnown(agency) {
  if (!knownCaptains.has(agency)) {
    const tops = bodies(agency).filter((body) => !(typeof body.serves === "string" && body.serves.length > 0));
    knownCaptains.set(agency, new Set(tops.flatMap((body) => captainsOf(agency, body).captains)));
  }
  return knownCaptains.get(agency);
}

/** An office's chain to its captain: climb reports-to until an office heads a body that answers to a
 *  captain, or reports to a captain by name. Read per office, independent of who bears it. */
const chains = new WeakMap();
export function officeChain(agency, officeRef) {
  const start = resolve(agency, "offices", officeRef);
  if (start === undefined) return Object.freeze({ reading: NONE, chain: [], captains: [], dangling: officeRef });
  const held = chains.get(agency) ?? new Map();
  chains.set(agency, held);
  if (!held.has(start.key)) held.set(start.key, climb(agency, start));
  return held.get(start.key);
}

function climb(agency, start) {
  const chain = [];
  for (let office = start; office !== undefined;) {
    if (chain.includes(office.key)) return Object.freeze({ reading: F, chain, captains: [], cycle: office.key });
    chain.push(office.key);
    const headed = bodies(agency).filter((body) => typeof body.head === "string" && resolve(agency, "offices", body.head, body.sectionPath)?.key === office.key);
    const closing = headed.map((body) => ({ body: body.key, ...captainsOf(agency, body) }));
    const closed = closing.filter((c) => c.reading === T);
    if (closed.length > 0) {
      return Object.freeze({ reading: T, chain, through: closed.map((c) => c.body), captains: [...new Set(closed.flatMap((c) => c.captains))].sort() });
    }
    if (typeof office.reportsTo !== "string" || office.reportsTo.length === 0) {
      // An office reporting to no office answers through the bodies that regulate through it.
      const regulating = regulatedBy(agency, office.key).map((body) => ({ body: body.key, ...captainsOf(agency, body) }));
      const through = regulating.filter((c) => c.reading === T);
      if (through.length > 0) {
        return Object.freeze({ reading: T, chain, through: through.map((c) => c.body), captains: [...new Set(through.flatMap((c) => c.captains))].sort(), regulated: true });
      }
      const dangling = [...closing, ...regulating].find((c) => c.reading === NONE);
      return Object.freeze({ reading: dangling ? NONE : F, chain, captains: [], ...(dangling ? { dangling: dangling.dangling } : {}) });
    }
    const up = resolve(agency, "offices", office.reportsTo, office.sectionPath);
    if (up === undefined && captainsKnown(agency).has(office.reportsTo)) {
      return Object.freeze({ reading: T, chain, through: [], captains: [office.reportsTo] });
    }
    if (up === undefined) return Object.freeze({ reading: NONE, chain, captains: [], dangling: office.reportsTo });
    office = up;
  }
  return Object.freeze({ reading: F, chain, captains: [] });
}

/** Condition 1: the bearer's seat in the mask, met with the mask's chain to a captain. An office mask
 *  climbs its own chain; a body's face, its body's; a persona or role, the chains of the offices its
 *  bearer is seated in and the bodies its bearer belongs to, and — when the bearer is itself a body
 *  wearing the persona — that body's own captains: any one closing suffices. */
export function accountabilityOf(agency, bearer, maskRef) {
  const office = resolve(agency, "offices", maskRef);
  const body = office === undefined ? bodyOf(agency, maskRef)?.body : undefined;
  const target = office?.key ?? body?.key ?? agency.masks.get(maskRef)?.key ?? maskRef;
  const masks = masksOf(agency, bearer);
  const worn = masks.filter((m) => m.by === target || m.key === target);
  const seat = worn.length === 0 ? F
    : knowledgeJoinAll(worn.map((m) => (m.kind === "office" ? SEAT[m.state] ?? NONE : m.wearable ? T : F)));
  let paths;
  if (office !== undefined) paths = [officeChain(agency, office.key)];
  else if (body !== undefined) paths = [{ ...captainsOf(agency, body), chain: [] }];
  else {
    paths = [
      ...masks.filter((m) => m.kind === "office" && m.state === "dignitas").map((m) => officeChain(agency, m.by)),
      ...masks.filter((m) => m.kind === "face").map((m) => bodyOf(agency, m.through ?? m.key)?.body).filter(Boolean)
        .map((b) => ({ ...captainsOf(agency, b), chain: [] })),
    ];
    const own = bodyOf(agency, bearer)?.body;
    if (own !== undefined) paths.push({ ...captainsOf(agency, own), chain: [] });
  }
  // Tracing ends at a human who answers: a captain seated in the mask answers for it in person.
  if (captainsKnown(agency).has(bearer)) paths.push({ reading: T, chain: [], captains: [bearer] });
  const closed = paths.filter((p) => p.reading === T);
  const chain = closed.length > 0 ? T : paths.some((p) => p.reading === NONE) ? NONE : F;
  return Object.freeze({
    reading: truthMeetAll([seat, chain]), seat, chain,
    captains: Object.freeze([...new Set(closed.flatMap((p) => p.captains))].sort()),
    through: Object.freeze(closed.map((p) => Object.freeze({ chain: p.chain, bodies: p.through }))),
    dangling: Object.freeze(paths.filter((p) => p.dangling).map((p) => p.dangling)),
  });
}

/** Condition 2: the safety-envelope precheck. */
function envelopeOf(agency, move, testimony, spec) {
  if (spec === undefined) return Object.freeze({ reading: NONE, why: "undeclared class: no exemption declared" });
  if (!spec.actuates) return Object.freeze({ reading: T, why: "exempt: the class does not actuate" });
  if (testimony.device !== undefined) {
    const gate = safetyGate(testimony.device);
    return Object.freeze({ reading: gate.reading, why: "device safety gate", gate });
  }
  if (move.organ !== undefined) {
    const organ = organsOf(agency, move.bearer, { admitted: testimony.admitted, told: testimony.told })
      .find((o) => o.key === move.organ || o.key.endsWith(`#${move.organ}`));
    if (organ?.derived === "told") return Object.freeze({ reading: organ.handedness.actuate ?? NONE, why: "organ as told", organ: organ.key });
  }
  return Object.freeze({ reading: NONE, why: "no precheck has fired" });
}

/** Condition 3: the charter tier the move's authorization reaches against the tier its class requires,
 *  met with the attestation its class requires. */
function charterOf(agency, move, testimony, spec, accountability) {
  if (spec === undefined) return Object.freeze({ reading: NONE, why: "undeclared class: no tier to require" });
  const through = [];
  const office = resolve(agency, "offices", move.mask);
  if (office !== undefined) {
    const reading = officeReading(agency, office.key);
    const scopes = (office.authorityScope ?? []).map((s) => scopeOf(office, s)).filter((s) => s?.section !== undefined);
    const reaches = move.place === undefined || scopes.some((s) => within(move.place, s.section));
    if (reading.verbs.includes(move.verb) && reaches) through.push({ tier: "constitutional", by: office.key });
  }
  const judgment = judgeAction(agency, { actor: move.actor ?? move.bearer, verb: move.verb, input: move.input });
  for (const finding of judgment.findings) {
    const tier = BCP_TIER[finding.force];
    if (tier !== undefined && finding.told === "for") through.push({ tier, by: finding.rule });
  }
  const principals = new Set([...accountability.captains, ...accountability.through.flatMap((t) => t.chain),
    ...accountability.through.flatMap((t) => t.chain).flatMap((key) => incumbenciesOf(agency, key).filter((s) => s.state === "dignitas").map((s) => s.holder))]);
  for (const direction of testimony.directions ?? []) if (principals.has(direction.by)) through.push({ tier: "instructions", by: direction.by });
  const reached = strongest(through.map((t) => t.tier));
  const forbidden = judgment.findings.some((f) => f.force === "binding" && f.told === "against");
  const permitted = through.some((t) => t.tier === "constitutional" || t.tier === "rules");
  const tierReading = forbidden ? (permitted ? BOTH : F) : reached !== undefined && rank(reached) >= rank(spec.tier) ? T : F;
  let attestation;
  if (spec.attest !== undefined) {
    const eligible = spec.attest === "captain"
      ? (by) => accountability.captains.includes(by)
      : (by) => [...agency.offices.keys()].some((key) => incumbenciesOf(agency, key).some((s) => s.holder === by && s.state === "dignitas"));
    const told = new Map();
    for (const a of testimony.attestations ?? []) if (eligible(a.by)) told.set(a.by, knowledgeJoinAll([told.get(a.by) ?? NONE, a.face ?? T]));
    const faces = [...told.values()];
    const affirming = faces.filter((face) => face === T).length;
    attestation = faces.includes(BOTH) ? BOTH : faces.includes(F) ? F : affirming >= (spec.quorum ?? 1) ? T : NONE;
  }
  return Object.freeze({
    reading: truthMeetAll([tierReading, ...(attestation === undefined ? [] : [attestation])]),
    required: spec.tier, reached: reached ?? null, through: Object.freeze(through.map((t) => Object.freeze(t))),
    ...(forbidden ? { forbidden: Object.freeze(judgment.reasons) } : {}),
    ...(attestation === undefined ? {} : { attestation, attest: spec.attest }),
  });
}

/** Condition 4: persistent state across interrupt and resume. */
function persistenceOf(move, testimony) {
  if (testimony.device !== undefined && typeof testimony.persisted === "string") {
    const now = deviceStateHash(testimony.device);
    return Object.freeze({ reading: now === testimony.persisted ? T : F, why: "device replay", state: now });
  }
  const at = testimony.now ?? new Date().toISOString();
  const targets = new Set([move.bearer, move.mask].filter(Boolean));
  const current = (testimony.certificates ?? []).filter((c) => targets.has(c.target) && (c.expiresAt === undefined || String(c.expiresAt) > String(at)));
  return Object.freeze({
    reading: knowledgeJoinAll(current.map((c) => (c.persistent ? T : F))),
    why: current.length === 0 ? "no current certificate" : "certificates",
    by: Object.freeze([...new Set(current.map((c) => c.by))].sort()),
  });
}

const RESPONSE = Object.freeze({ [F]: "refusal", [BOTH]: "repair", [NONE]: "evidence" });

/**
 * Meaningful human control over a move `{ bearer, mask, verb, class, organ?, place?, actor?, input? }`
 * under runtime testimony `{ device?, persisted?, told?, admitted?, directions?, attestations?,
 * certificates?, now? }`. Returns the four conditions, their meet, and the response each axis calls for.
 */
export function meaningfulHumanControl(agency, move, testimony = {}) {
  if (typeof move?.bearer !== "string" || typeof move.mask !== "string" || typeof move.verb !== "string") {
    throw new TypeError("meaningfulHumanControl: a move names its bearer, mask and verb");
  }
  const spec = MOVE_CLASSES[move.class];
  const accountability = accountabilityOf(agency, move.bearer, move.mask);
  const conditions = Object.freeze({
    accountability,
    envelope: envelopeOf(agency, move, testimony, spec),
    charter: charterOf(agency, move, testimony, spec, accountability),
    persistence: persistenceOf(move, testimony),
  });
  const readings = Object.values(conditions).map((c) => c.reading);
  const reading = truthMeetAll(readings);
  const lifecycle = readings.includes(F) ? "failed-mhc" : readings.includes(BOTH) ? "blocked-repair" : readings.includes(NONE) ? "open" : "admitted";
  return Object.freeze({
    kind: "organizing.agency.meaningful-human-control",
    move: Object.freeze({ ...move }), reading, admitted: reading === T, lifecycle, conditions,
    responses: Object.freeze(Object.entries(conditions).filter(([, c]) => c.reading !== T).map(([condition, c]) => Object.freeze({ condition, reading: c.reading, response: RESPONSE[c.reading] }))),
    witness: createHash("sha256").update(JSON.stringify([move, readings])).digest("hex"),
  });
}

/** An actuating move under meaningful human control: the device is effected only when all four hold.
 *  Refused, the device comes back unchanged with the verdict; admitted, as `actuate` returns it. */
export function controlledActuate(agency, move, d, intent, testimony = {}) {
  const control = meaningfulHumanControl(agency, { ...move, class: "actuating" }, { ...testimony, device: d });
  if (!control.admitted) return Object.freeze({ device: d, control, verdict: Object.freeze({ kind: "animating.device.actuate", device: d.name, admitted: false, effected: false }) });
  return Object.freeze({ ...actuate(d, { ...intent, by: intent.by ?? move.bearer }), control });
}

/** The polity's standing under condition 1: each office's chain to a captain, and each seat's. */
export function controlCensus(agency) {
  const offices = [...agency.offices.keys()].map((key) => ({ office: key, ...officeChain(agency, key) }));
  const seats = offices.flatMap(({ office }) => incumbenciesOf(agency, office).filter((s) => s.state === "dignitas")
    .map((s) => ({ office, holder: s.holder, reading: accountabilityOf(agency, s.holder, office).reading })));
  return Object.freeze({
    kind: "organizing.agency.control-census",
    captains: Object.freeze([...new Set(offices.flatMap((o) => o.captains))].sort()),
    closed: offices.filter((o) => o.reading === T).length,
    offices: offices.length,
    unaccountable: Object.freeze(offices.filter((o) => o.reading === F).map((o) => Object.freeze({ office: o.office, top: o.chain.at(-1) ?? null, ...(o.cycle ? { cycle: o.cycle } : {}) }))),
    dangling: Object.freeze(offices.filter((o) => o.reading === NONE).map((o) => Object.freeze({ office: o.office, at: o.chain.at(-1) ?? null, names: o.dangling }))),
    seats: Object.freeze(seats.map((s) => Object.freeze(s))),
  });
}
