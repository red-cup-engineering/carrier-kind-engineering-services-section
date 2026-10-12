/**
 * politic — the body politic as a constitution that runs and a viable system that regulates.
 *
 * A body's kind (./kinds.mjs) names how it decides and on what authority. Here those are executed, on
 * socializing's frame-neutral capabilities rather than restated as strings:
 *
 *   - DECIDING. A decision is settled by the kind's `rule` over its deciders' FOUR alignments: consensus
 *     is the bilattice truth meet (silence ⊥ blocks — silence is not consent; a contradiction ⊤ is a
 *     coherence breach), an assembly is a strict majority. A band decides in living council (the
 *     tiyóšpaye's omniciye): its records recognize no one, so its deciders are only whoever the caller
 *     reports aligning, and a dissenter withdraws — released from the decision rather than blocking it.
 *   - AUTHORITY. Each kind's authority is one of Weber's three bases.
 *   - VIABILITY. Each body is a viable system (Beer) whose operations (System 1) are the bodies that are
 *     part of it and whose policy (System 5) is its head. Ashby's law of requisite variety: the variety
 *     its offices DEMAND (the verbs their skills require — the office service's required capabilities,
 *     as allocation reads them; a duty's own `required-capabilities` labels name nothing any skill or
 *     provider commands) must be absorbed by the variety its incumbents' bodies natural COMMAND. An office is bearer-independent and absorbs nothing itself:
 *     "an admitted Character may serve a bounded office service only when its provider-admitted
 *     capabilities include that service's required capabilities" (chief-executive-officer), and "a
 *     Character record alone does not establish its current provider-admitted capabilities" (note on the
 *     missing allocation controller). So the controller is runtime testimony — `admitted`, bearer →
 *     capabilities, read from the provider admissions (work/model-character) — never a record. Variety is
 *     read as FOUR: a demand of a vacant office, or one its seated bearers' testimony does not cover, is
 *     refused (f, unabsorbed); one whose bearers no testimony speaks for is unknown (⊥, untestified); a
 *     body absorbs (t) only what testimony covers. A body is viable as the truth meet of it and every body
 *     in its recursion (Beer's recursion theorem; ⊥ where only testimony is missing, never f).
 *   - THE FIVE SYSTEMS. Operations (S1) are the parts; policy (S5) the heads. The middle three are read
 *     off the gates the house already closes over its offices, each live only through a seated office:
 *     coordination (S2) is the coordination boundary (who an office receives from and assigns to) linking
 *     the operations into one component — islands oscillate unchecked; control (S3) is the command line
 *     (reports-to, presides-over) from an office of the whole into each operation; audit (S3*) is an
 *     authority scope of the whole reaching into an operation's own section past its management;
 *     intelligence (S4) is an authority scope reaching beyond the body's recursion — its environment.
 *     The first three are closed-world (an absent or vacant link is refused, f; with no operations there
 *     is nothing to coordinate, control or audit); intelligence is open-world (no outward reach declared
 *     is unknown, ⊥; one declared only through vacant offices is refused). A level reads as the truth meet
 *     of its variety and its systems.
 *   - THE ALGEDONIC CHANNEL. Pain reaches the apex directly: from any bearer, the heads of the outermost
 *     playing bodies it belongs to, skipping the reports-to chain its offices would route through. A body
 *     politic that serves a band answers to the band's head too: the culm exists by tending the rhizome.
 */
import { truthMeetAll } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { AUTHORITY_BASES, consensusClose, majorityClose, requisiteVariety } from "@red-cup-engineering/socializing/deciding";
import { viableRecursion } from "@red-cup-engineering/socializing/viable";

import { agencyKey, bodiesOf, bodyMembers, bodyOf, headsOf, incumbenciesOf, officeCoordinationBoundary, officeReading, officesOf, resolve } from "./index.mjs";
import { BODY_KINDS } from "./kinds.mjs";
import { doersOf } from "./governing.mjs";
import { councilClose, councilMerged } from "./band.mjs";

const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.length > 0) : typeof value === "string" && value.length > 0 ? [value] : []);
const recognized = (agency, key) => bodyMembers(agency, key).filter((m) => m.reading === "potential").map((m) => m.who);
const allBodies = (agency) => [...agency.bodies.values(), ...agency.enterprises.values()];
const readings = new WeakMap();
/** An office's reading, held per registry: the systems read every office's chain many times over. */
const readOffice = (agency, key) => {
  const held = readings.get(agency) ?? new Map();
  readings.set(agency, held);
  if (!held.has(key)) held.set(key, officeReading(agency, key));
  return held.get(key);
};
const seatedAt = (agency, key) => incumbenciesOf(agency, key).some((s) => s.state === "dignitas");
/** An authority scope read: a repository section (`lib/…` absolute, or relative to the office's own
 *  section: `./`, `content/`), or a site outside the repository (a first segment that is a domain, as
 *  `koios.news/world/`) — the environment by construction. */
export const scopeOf = (office, scope) => {
  if (typeof scope !== "string" || scope.length === 0) return undefined;
  const value = scope.replace(/\/+$/u, "");
  if (value.startsWith("lib/")) return { section: value.slice(4) };
  if (/^[^/.]+(?:\.[^/.]+)+(?:\/|$)/u.test(value)) return { site: value };
  const relative = value.replace(/^\.(?:\/|$)/u, "");
  if (relative.split("/").some((part) => part === "." || part === "..")) return undefined;
  return { section: relative === "" ? office.sectionPath : `${office.sectionPath}/${relative}` };
};
export const within = (path, section) => section === "" || path === section || path.startsWith(`${section}/`);
const sectionOfBody = (body) => body.seat ?? body.sectionPath;

/** A band council's close in the shape the other rules' closes take: the merged reading of the engaged
 *  (./band.mjs `councilMerged`), settled when it carries the for side alone. */
const bandClose = (alignments) => {
  const value = councilMerged(alignments.map((alignment, index) => [index, alignment]));
  return Object.freeze({ value, settled: value === "potential", close: councilClose(alignments.map((alignment, index) => [index, alignment])).close,
    aligned: alignments.filter((a) => a === "potential").length, dissent: alignments.filter((a) => a === "active").length,
    silent: alignments.filter((a) => a === "absurd").length, disputed: alignments.filter((a) => a === "stable").length });
};

/** Who settles a body's decisions under its kind's rule, and who withdrew (a band's dissenters). */
function decidersOf(agency, found, alignments) {
  const { body, kind } = found;
  switch (BODY_KINDS[kind].rule) {
    case "withdrawal": {
      // A band's council (./band.mjs, ObsmetrologiaComputing.Band): a dissenter withdraws rather than
      // blocks, and the question settles on the knowledge join of those still engaged, so silence never
      // blocks; a held contradiction stays held.
      const council = Object.keys(alignments);
      const withdrawn = council.filter((who) => alignments[who] === "active");
      return { deciders: council.filter((who) => !withdrawn.includes(who)), withdrawn, close: bandClose };
    }
    case "head": return { deciders: headsOf(agency, body), withdrawn: [], close: consensusClose };
    // Those who do its work (seated on record here; by deed where a board is read, ./governing.mjs
    // `deedsOf`), closing as a band's council does: silence never blocks.
    case "doers": {
      const council = doersOf(agency, body);
      const withdrawn = council.filter((who) => alignments[who] === "active");
      return { deciders: council.filter((who) => !withdrawn.includes(who)), withdrawn, close: bandClose };
    }
    case "direction": return { deciders: strings(body.founders), withdrawn: [], close: consensusClose };
    case "assembly": return { deciders: recognized(agency, body.key), withdrawn: [], close: majorityClose };
    default: return { deciders: recognized(agency, body.key), withdrawn: [], close: consensusClose };
  }
}

/**
 * A body's decision on one question: `alignments` maps each who to a FOUR reading (`potential` for,
 * `active` against, `stable` both, `absurd` silent; an unlisted decider is silent). Returns the rule, the
 * authority it rests on, the deciders, the closure and who the decision binds: every recognized member
 * who did not withdraw (for a band, the council that stayed).
 */
export function bodyDecision(agency, bodyRef, alignments = {}) {
  const found = bodyOf(agency, bodyRef);
  if (found === undefined || BODY_KINDS[found.kind] === undefined) return Object.freeze({ kind: "organizing.agency.decision-obstruction", body: bodyRef, reason: "no such body, or of no known kind" });
  const regime = BODY_KINDS[found.kind];
  const { deciders, withdrawn, close } = decidersOf(agency, found, alignments);
  // No one to decide is silence, not a vacuous consensus: the meet of nothing must not settle.
  const closed = deciders.length === 0 ? { ...close(["absurd"]), unseated: true } : close(deciders.map((who) => alignments[who] ?? "absurd"));
  const binds = regime.rule === "withdrawal" ? deciders : recognized(agency, found.body.key).filter((who) => !withdrawn.includes(who));
  return Object.freeze({
    kind: "organizing.agency.decision",
    body: agencyKey(found.body), bodyKind: found.kind, rule: regime.rule, authority: regime.authority,
    deciders: Object.freeze(deciders), withdrawn: Object.freeze(withdrawn), binds: Object.freeze(binds),
    ...closed,
  });
}

/** The bodies that are part of a body: those naming it in `part-of`, and — for a polity — the
 *  micro-enterprises of the legal entity it is the polity of (Rendanheyi's platform of xiaowei). */
export function partsOf(agency, bodyRef) {
  const found = bodyOf(agency, bodyRef);
  if (found === undefined) return Object.freeze([]);
  const { body, kind } = found;
  return Object.freeze(allBodies(agency).filter((other) => other !== body && (
    strings(other.partOf ?? other["part-of"]).some((ref) => bodyOf(agency, ref, other.sectionPath)?.body === body)
    || (kind === "polity" && body.entity !== undefined && agency.enterprises.get(other.key) === other && other.entity === body.entity)
  )).map((other) => other.key));
}

/** The offices a body regulates through: a micro-enterprise's own, a polity's under its seat, and for
 *  every other kind the offices its recognized members hold at dignitas. */
export function officesOfBody(agency, { body, kind }) {
  if (kind === "micro-enterprise") return strings(body.offices).map((id) => resolve(agency, "offices", id, body.sectionPath)?.key).filter(Boolean);
  if (kind === "polity") {
    const seat = body.seat ?? body.sectionPath;
    return [...agency.offices.values()].filter((o) => seat === "" || o.sectionPath === seat || o.sectionPath.startsWith(`${seat}/`)).map((o) => o.key);
  }
  return [...new Set(recognized(agency, body.key).flatMap((who) => officesOf(agency, who)))];
}

/** The offices (keys) a body regulates through, by reference. */
export function bodyOffices(agency, bodyRef) {
  const found = bodyOf(agency, bodyRef);
  return Object.freeze(found === undefined ? [] : officesOfBody(agency, found));
}

/** One level's variety, each demanded capability read as FOUR against the testimony `admitted` gives
 *  for the bearers seated at dignitas in the offices that demand it. */
function varietyOf(agency, found, admitted) {
  const offices = officesOfBody(agency, found).map((key) => readOffice(agency, key)).filter((o) => o.kind === "organizing.agency.office");
  const covered = new Map();
  for (const office of offices) {
    const holders = incumbenciesOf(agency, office.office).filter((s) => s.state === "dignitas").map((s) => s.holder);
    const testified = holders.filter((who) => admitted[who] !== undefined);
    for (const capability of office.verbs) {
      const reading = testified.some((who) => admitted[who].includes(capability)) ? "potential"
        : holders.length > testified.length ? "absurd" : "active";
      const prior = covered.get(capability);
      covered.set(capability, prior === undefined || prior === "active" || reading === "potential" ? reading : prior);
    }
  }
  const demanded = [...covered.keys()].sort();
  const by = (reading) => demanded.filter((c) => covered.get(c) === reading);
  const absorbed = by("potential");
  return {
    name: agencyKey(found.body), demanded, absorbed, untestified: by("absurd"), unabsorbed: by("active"),
    reading: truthMeetAll(demanded.map((c) => covered.get(c))),
    controllerVariety: absorbed.length, disturbanceVariety: demanded.length,
  };
}

/** One system's channels read through offices: live (t) through a seated office, refused (f) when only
 *  vacant offices or none carry it. */
const channel = (offices, seated) => (offices.some(seated) ? "potential" : "active");

/** Beer's Systems 2–4 of one level, read off the coordination boundary, the command line and authority
 *  scope of its offices (the head's S5 and the parts' S1 are read with the level). `recursion` is the
 *  section of every body in the level's recursion: what is not within one is the environment. */
function systemsOf(agency, found, recursion) {
  const seated = (key) => seatedAt(agency, key);
  const parts = partsOf(agency, found.body.key).map((key) => ({ key, found: bodyOf(agency, key) }));
  const officesOfPart = new Map(parts.map(({ key, found: part }) => [key, new Set(officesOfBody(agency, part))]));
  const inParts = new Set([...officesOfPart.values()].flatMap((set) => [...set]));
  const own = officesOfBody(agency, found).filter((key) => !inParts.has(key));
  const partOf = (key) => parts.filter((part) => officesOfPart.get(part.key).has(key)).map((part) => part.key);

  // S2: the operations joined by seated coordination boundaries; more than one component is oscillation unchecked.
  const component = new Map(parts.map(({ key }) => [key, key]));
  const root = (key) => (component.get(key) === key ? key : root(component.get(key)));
  const coordinators = new Set();
  for (const key of [...own, ...inParts].filter(seated)) {
    const boundary = officeCoordinationBoundary(agency, key);
    const reach = [key, ...boundary.receivesFrom, ...boundary.assignsTo].map((ref) => resolve(agency, "offices", ref)?.key).filter(Boolean);
    const joined = [...new Set(reach.flatMap(partOf))];
    if (joined.length > 1) coordinators.add(key);
    for (const other of joined.slice(1)) component.set(root(other), root(joined[0]));
  }
  const islands = Object.values(Object.groupBy(parts.map(({ key }) => key), root));
  const coordination = { reading: islands.length > 1 ? "active" : "potential", through: [...coordinators].sort(), islands: islands.length > 1 ? islands : [] };

  // S3: each operation commanded, and S3*: its section within an authority scope, by a seated office
  // outside it — of the whole, or housed in a sibling operation that serves as the metasystem.
  const commands = (whole, key) => readOffice(agency, key).reportsTo?.includes(whole)
    || strings(agency.offices.get(whole)?.presidesOver).some((ref) => resolve(agency, "offices", ref, agency.offices.get(whole).sectionPath)?.key === key);
  const scopes = (key) => strings(agency.offices.get(key)?.authorityScope).map((scope) => scopeOf(agency.offices.get(key), scope)).filter(Boolean);
  const metasystem = [...own, ...inParts];
  const perPart = (by) => parts.map((part) => ({ part: part.key, by: metasystem.filter((whole) => !officesOfPart.get(part.key).has(whole) && by(whole, part)) }));
  const read = (rows) => ({
    reading: rows.every((row) => channel(row.by, seated) === "potential") ? "potential" : "active",
    through: [...new Set(rows.flatMap((row) => row.by.filter(seated)))].sort(),
    missing: rows.filter((row) => channel(row.by, seated) === "active").map((row) => agencyKey(bodyOf(agency, row.part).body)),
  });
  const control = read(perPart((whole, part) => [...officesOfPart.get(part.key)].some((key) => commands(whole, key))));
  const audit = read(perPart((whole, part) => scopes(whole).some(({ section }) => section !== undefined && within(sectionOfBody(part.found.body), section))));

  // S4: an authority scope of the body's offices reaching past every section of its recursion, or out of the repository.
  const outward = metasystem.map((key) => ({ key, reaches: scopes(key).filter(({ section }) => section === undefined || !recursion.some((at) => within(section, at))).map(({ section, site }) => site ?? section) }))
    .filter((row) => row.reaches.length > 0);
  const intelligence = {
    reading: outward.length === 0 ? "absurd" : channel(outward.map((row) => row.key), seated),
    through: outward.filter((row) => seated(row.key)).map((row) => row.key).sort(),
    reaches: [...new Set(outward.flatMap((row) => row.reaches))].sort(),
  };
  return { coordination, control, audit, intelligence };
}

/** A body read as a viable system: its operations and policy, the variety it must absorb against the
 *  incumbents' admitted capabilities (`admitted`, bearer → capabilities), and Beer's recursion over it
 *  and every body part of it. */
export function bodyViability(agency, bodyRef, { admitted = {} } = {}) {
  const found = bodyOf(agency, bodyRef);
  if (found === undefined) return Object.freeze({ kind: "organizing.agency.viability-obstruction", body: bodyRef, reason: "no such body" });
  const keys = [];
  for (const queue = [found.body.key]; queue.length > 0;) {
    const key = queue.shift();
    if (keys.includes(key)) continue;
    keys.push(key);
    queue.push(...partsOf(agency, key));
  }
  const levels = keys.map((key) => {
    const level = bodyOf(agency, key);
    const recursion = [];
    for (const queue = [key]; queue.length > 0;) {
      const at = queue.shift();
      const section = sectionOfBody(bodyOf(agency, at).body);
      if (!recursion.includes(section)) recursion.push(section);
      queue.push(...partsOf(agency, at).filter((part) => !recursion.includes(sectionOfBody(bodyOf(agency, part).body))));
    }
    const variety = varietyOf(agency, level, admitted);
    const systems = systemsOf(agency, level, recursion);
    const reading = truthMeetAll([variety.reading, ...Object.values(systems).map((system) => system.reading)]);
    return { ...variety, variety: variety.reading, systems, reading };
  });
  const [own] = levels;
  const recursion = viableRecursion(levels);
  const frozen = (system) => Object.freeze(Object.fromEntries(Object.entries(system).map(([k, v]) => [k, Array.isArray(v) ? Object.freeze(v) : v])));
  return Object.freeze({
    kind: "organizing.agency.viability",
    body: own.name, bodyKind: found.kind,
    systems: Object.freeze({
      operations: partsOf(agency, found.body.key).map((key) => agencyKey(bodyOf(agency, key).body)),
      coordination: frozen(own.systems.coordination), control: frozen(own.systems.control), audit: frozen(own.systems.audit), intelligence: frozen(own.systems.intelligence),
      policy: Object.freeze(headsOf(agency, found.body)),
    }),
    demanded: Object.freeze(own.demanded), absorbed: Object.freeze(own.absorbed), untestified: Object.freeze(own.untestified), unabsorbed: Object.freeze(own.unabsorbed),
    requisite: requisiteVariety(own.controllerVariety, own.disturbanceVariety),
    recursion: Object.freeze(recursion.levels.map((level, i) => Object.freeze({ ...level, variety: levels[i].variety, reading: levels[i].reading, unabsorbed: Object.freeze(levels[i].unabsorbed),
      systems: Object.freeze(Object.fromEntries(Object.entries(levels[i].systems).map(([name, system]) => [name, system.reading]))) }))),
    viable: truthMeetAll(levels.map((level) => level.reading)),
  });
}

/** The bodies a body is part of: those its `part-of` names, and the polity of its legal entity. */
export function wholesOf(agency, key) {
  return allBodies(agency).filter((whole) => whole.key !== key && partsOf(agency, whole.key).includes(key)).map((whole) => whole.key);
}

/** The algedonic route from a bearer: the apex (the heads of the outermost playing bodies it belongs
 *  to) its pain reaches in one hop, the band heads those bodies answer to, and how many reports-to hops
 *  of its offices the channel bypasses. `severed` when no apex is seated to receive it. */
export function algedonicRoute(agency, bearer) {
  const outermost = new Set();
  const seen = new Set();
  for (const queue = [...bodiesOf(agency, bearer)]; queue.length > 0;) {
    const key = queue.shift();
    if (seen.has(key)) continue;
    seen.add(key);
    const wholes = wholesOf(agency, key).filter((whole) => BODY_KINDS[bodyOf(agency, whole).kind]?.plays);
    if (wholes.length === 0) outermost.add(key); else queue.push(...wholes);
  }
  const bodies = [...outermost].map((key) => bodyOf(agency, key));
  const apex = [...new Set(bodies.flatMap(({ body }) => headsOf(agency, body)))];
  const answersTo = [...new Set(bodies.flatMap(({ body }) => {
    const served = body.serves === undefined ? undefined : bodyOf(agency, body.serves, body.sectionPath);
    return served?.kind === "band" ? headsOf(agency, served.body) : [];
  }))];
  const bypassed = Math.max(0, ...officesOf(agency, bearer).map((office) => officeReading(agency, office).reportsTo.length));
  return Object.freeze({
    kind: "organizing.agency.algedonic-route",
    from: bearer, through: Object.freeze(bodies.map(({ body }) => agencyKey(body))),
    apex: Object.freeze(apex), answersTo: Object.freeze(answersTo), bypassed, severed: apex.length === 0,
  });
}

/** Every body politic's constitution and viability, and where the records break the theory: a body
 *  whose rule needs a head no one bears, an authority basis Weber does not name, variety refused (a
 *  demand of a vacant office, or one testimony shows its bearers cannot absorb), and a System 2–4
 *  refused (operations uncoordinated, uncommanded or unaudited; intelligence only through vacancy).
 *  Untestified variety and undeclared intelligence are reported on the body, not as problems: they are
 *  unknown, not refused. */
export function politicCensus(agency, { admitted = {} } = {}) {
  const problems = [];
  const bodies = allBodies(agency).map((record) => {
    const found = bodyOf(agency, record.key);
    const regime = BODY_KINDS[found.kind];
    if (regime === undefined) return undefined;
    const viability = bodyViability(agency, record.key, { admitted });
    if (regime.rule === "head" && viability.systems.policy.length === 0) problems.push({ record: record.key, reason: `decides by its head, and no one bears it${record.head === undefined ? " (no head named)" : ` (${record.head} unseated)`}` });
    if (!AUTHORITY_BASES.includes(regime.authority)) problems.push({ record: record.key, reason: `authority ${regime.authority} is none of Weber's bases` });
    if (viability.unabsorbed.length > 0) problems.push({ record: record.key, reason: `variety refused: ${viability.unabsorbed.join(", ")}` });
    const { coordination, control, audit, intelligence } = viability.systems;
    if (coordination.reading === "active") problems.push({ record: record.key, reason: `operations uncoordinated: ${coordination.islands.length} islands no seated coordination boundary joins` });
    if (control.reading === "active") problems.push({ record: record.key, reason: `operations no seated office of the whole commands: ${control.missing.join(", ")}` });
    if (audit.reading === "active") problems.push({ record: record.key, reason: `operations no seated authority scope of the whole audits: ${audit.missing.join(", ")}` });
    if (intelligence.reading === "active") problems.push({ record: record.key, reason: `intelligence reaches ${intelligence.reaches.join(", ")} only through vacant offices` });
    return [agencyKey(record), Object.freeze({ kind: found.kind, rule: regime.rule, authority: regime.authority, plays: regime.plays, viability })];
  }).filter(Boolean);
  return Object.freeze({ kind: "organizing.agency.politic", bodies: Object.freeze(Object.fromEntries(bodies)), problems: Object.freeze(problems.map((p) => Object.freeze(p))) });
}
