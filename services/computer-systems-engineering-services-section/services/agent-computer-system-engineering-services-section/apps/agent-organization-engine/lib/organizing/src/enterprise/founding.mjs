/**
 * enterprise/founding — the offices a micro-enterprise's own turn founds because demand obliges it to
 * hold them (561 Group lane register, 2026-10-03: the enterprise governing itself; Lane 6 done-when 1).
 *
 * Nobody owns the founding: demand is read off the board and the registry, so it needs no seat to be
 * filled first. A demand is a signal that an enterprise's organization lacks an office the work at home
 * with it requires, and the enterprise answers it by one governing act (agency/governing `foundingOf`),
 * authorized by its decision right and played by its own turn (`governingRight` rule `demand`), recorded
 * on the act chain with the demand's threads as evidence. The turn founds the office and never seats it:
 * whoever does its work is seated there by that deed (agency/governing `incumbentsOf`).
 *
 * Two sources of demand, one shape:
 *
 * - a verifier refusal: a delivered request at home with the enterprise needs a verifier colour (white,
 *   black, blue, red: work-arena VERIFIER_ROLES) for which the enterprise lists no office distinct from
 *   the delivery's producer, the "no distinct verifier office" refusal (`verifierSeatingRefusalsOf`);
 * - unhomed ground: an open thread standing over its territory at home nowhere (governance `GROUND_LAW`)
 *   that names the verifier colour it asks for.
 *
 * Demand holds only while no office answers it: an office already founded for the same charge is the
 * answer, so a second turn founds nothing twice.
 * @packageDocumentation
 */
import { CLOSED_STANDINGS, VERIFIER_ROLES, VERIFIER_ROLE_NAMES } from "./work-arena.mjs";
import { verifierOfficesOf, verifierSeatingOf } from "./governance.mjs";
import { resolve } from "../agency/index.mjs";
import { enterpriseOffices, enterpriseRecord, foundingOf, governingRight, lineOfficeOf } from "../agency/governing.mjs";
import { enactAgencyRecords } from "../agency/records.mjs";

const slug = (text) => `${text}`.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
const colours = (value) => (Array.isArray(value) ? value : typeof value === "string" ? [value] : []).filter((role) => VERIFIER_ROLE_NAMES.includes(role));

/** The verifier colour an opening asks for, when it names any (`verifies`, or `verifiers`). */
const askedColoursOf = (opening) => [...new Set([...colours(opening?.verifies), ...colours(opening?.verifiers)])];

/**
 * The verifier refusals at home with an enterprise, read by the one rule that says who verifies
 * (governance `verifierSeatingOf`): for each delivered request awaiting a verdict, the colours its
 * opening names (else those the enterprise houses) that no listed office distinct from the delivery's
 * producer answers. A refusal naming no colour (the enterprise lists no verifying office at all) asks
 * for the first colour. One refusal per thread and colour.
 * @param {{ threads: ReadonlyArray<object> }} board
 */
export function verifierSeatingRefusalsOf(agency, enterprise, board) {
  const refusals = [];
  for (const thread of board?.threads ?? []) {
    if (thread.home !== enterprise.id || thread.opening?.move !== "request" || thread.standing !== "delivered" || CLOSED_STANDINGS.includes(thread.standing)) continue;
    const delivery = (thread.deliveries ?? []).filter((entry) => entry.verdict === undefined).at(-1);
    if (delivery === undefined || typeof delivery.player !== "string") continue;
    const { refused } = verifierSeatingOf(agency, { enterprise: enterprise.id, producer: delivery.player, require: askedColoursOf(thread.opening) });
    for (const entry of refused) refusals.push(Object.freeze({ role: entry.role ?? VERIFIER_ROLE_NAMES[0], thread: thread.id, producer: delivery.player, reason: entry.reason }));
  }
  return Object.freeze(refusals);
}

/** The skill a founded verifier office provides: one the registry already holds, borrowed from an office
 *  the enterprise lists that verifies, else from its line office; a founding conveys no new verb. */
function skillFor(agency, enterprise) {
  const listed = enterpriseOffices(agency, enterprise);
  const lines = [...listed.filter((office) => office.authored?.verifies !== undefined), lineOfficeOf(agency, enterprise)].filter(Boolean);
  for (const office of lines) {
    for (const ref of [office.providesSkill ?? []].flat()) {
      const skill = resolve(agency, "skills", ref, office.sectionPath) ?? resolve(agency, "skills", ref, enterprise.sectionPath);
      if (skill !== undefined && resolve(agency, "skills", skill.id, enterprise.sectionPath) !== undefined) return skill.id;
    }
  }
  return undefined;
}

/** What founding a verifier office of one colour is: its record, the work its duty is owed toward, the skill. */
function verifierFoundingOf(agency, enterprise, role) {
  const shape = VERIFIER_ROLES[role];
  const id = `${slug(enterprise.id)}-${role}-verifier`;
  const skill = skillFor(agency, enterprise);
  if (skill === undefined) return undefined;
  const line = lineOfficeOf(agency, enterprise);
  return Object.freeze({
    office: { id, name: `${enterprise.authored?.name ?? enterprise.name ?? enterprise.id} ${role} verifier`, verifies: role,
      "normative-structure": `${shape.question} ${shape.instruction}`.slice(0, 1200) },
    work: { id, name: `verifying a delivery as ${role}`,
      from: `A delivery at home in ${enterprise.id} awaiting a ${role} finding, whose producer's own office is the only other verifier ${enterprise.id} lists for it.`,
      to: `The ${role} verifier's finding is told into the delivery as a witness with its evidence: ${shape.question}`,
      cost: `Bounded verification attention of one bearer distinct from the delivery's producer, within ${enterprise.id}'s own section.`,
      otherwise: "The delivery stays unverified in that colour, open on the board, with the refusal that no distinct verifier office exists." },
    duty: { id, name: `verifying a delivery as ${role}`, ...(line === undefined ? {} : { "receiver-condition": "The delivery's assayer reads the finding and its evidence; a verifier never attests its own work." }) },
    skill,
  });
}

/**
 * The offices an enterprise's own turn is obliged to found from the demand at home with it: one per
 * charge (a verifier colour), each with the threads that show the demand as its evidence, the refusal
 * that states it, and the founding it is answered by (`foundingOf`'s input). Charges an office the
 * enterprise lists already answers are left out, so founding is idempotent across turns.
 * @param {{ board: { threads: ReadonlyArray<object> }, ground?: ReadonlyArray<object> }} options `ground`
 *   are the open threads standing over its territory at home nowhere (governance `unheldGroundOf`)
 */
export function foundingDemandOf(agency, enterprise, { board, ground = [] }) {
  const byRole = new Map();
  const note = (role, thread, reason) => {
    const held = byRole.get(role) ?? { role, threads: new Set(), reasons: new Set() };
    held.threads.add(thread);
    held.reasons.add(reason);
    byRole.set(role, held);
  };
  for (const refusal of verifierSeatingRefusalsOf(agency, enterprise, board)) note(refusal.role, refusal.thread, refusal.reason);
  for (const thread of ground) for (const role of askedColoursOf(thread.opening)) {
    const listed = verifierOfficesOf(agency, role).some((entry) => entry.enterprises.includes(enterprise.id));
    if (!listed) note(role, thread.id, `${thread.id} stands over ${enterprise.id}'s territory at home nowhere and asks for a ${role} verifier`);
  }
  const own = new Set(enterpriseOffices(agency, enterprise, { own: true }).map((office) => office.id));
  return Object.freeze([...byRole.values()].sort((a, b) => VERIFIER_ROLE_NAMES.indexOf(a.role) - VERIFIER_ROLE_NAMES.indexOf(b.role)).flatMap(({ role, threads, reasons }) => {
    const founding = verifierFoundingOf(agency, enterprise, role);
    if (founding === undefined || own.has(founding.office.id) || resolve(agency, "offices", founding.office.id, enterprise.sectionPath) !== undefined) return [];
    return [Object.freeze({
      kind: "verifier", role, charge: `verifies:${role}`,
      evidence: Object.freeze([...[...threads].sort(), ...[...reasons].sort().map((reason) => `demand:${reason}`)]),
      founding,
    })];
  }));
}

/**
 * The enterprise's own turn founding what demand obliges it to: for each demand no office answers yet,
 * one governing act (`foundingOf`) enacted on the agency act chain under the decision right (rule
 * `demand`), its player the turn (`player`, agency/cast `playerOfAct`) and its evidence the demand's
 * threads. Each act is read against the registry as the one before left it, so a second turn finds the
 * offices held and founds nothing again. Returns what it founded.
 * @param {{ root: string, read: () => object, enterprise: string, board: object, ground?: ReadonlyArray<object>, player: object, at: string, log?: string }} options
 *   `read` reads the current registry (the host's held `agencyAt`)
 */
export function foundByDemand({ root, read, enterprise: id, board, ground = [], player, at, log }) {
  const founded = [];
  const demands = foundingDemandOf(read(), enterpriseRecord(read(), id), { board, ground });
  for (const demand of demands) {
    const agency = read();
    const enterprise = enterpriseRecord(agency, id);
    if (foundingDemandOf(agency, enterprise, { board, ground }).every((open) => open.charge !== demand.charge)) continue;
    enactAgencyRecords({
      root, entries: foundingOf(agency, enterprise, demand.founding), ...(log === undefined ? {} : { log }),
      act: { kind: "enterprise-found", enterprise: id, rule: "demand", player, evidence: [...demand.evidence], at },
      authorize: ({ agency: before, pool, source, existing, record }) => {
        const held = governingRight(before, enterpriseRecord(before, id), { pool, source, record, existing }, { rule: "demand" });
        return `${held.right}:${held.enterprise}`;
      },
    });
    founded.push(Object.freeze({ office: `${enterprise.sectionPath}#${demand.founding.office.id}`, charge: demand.charge, evidence: demand.evidence }));
  }
  return Object.freeze(founded);
}
