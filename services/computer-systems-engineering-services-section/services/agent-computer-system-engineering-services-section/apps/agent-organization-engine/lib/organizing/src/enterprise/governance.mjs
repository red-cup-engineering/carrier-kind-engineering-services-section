/**
 * enterprise/governance — what obliges a micro-enterprise to govern itself, read off the work board
 * and its own settings as derived reports (561 Group lane register, 2026-10-03: the enterprise
 * governing itself).
 *
 * Two laws, each read once per enterprise, so an enterprise owes at most one report under each:
 *
 * - its Huidu settings are judged (`SETTINGS_LAW`): every grey band it holds carries a point chosen
 *   by one of its doers or by its own turn, with a date to look at it again (organizing/enterprise settings `due`);
 * - it holds its own ground (`GROUND_LAW`): no open thread standing over its territory is at home
 *   nowhere. A thread stands over the enterprise whose territory most deeply encloses what it is
 *   about, with no one passed over; when that thread owes the market, the enterprise either opened
 *   it about its own ground or gave it back. That is demand its organization does not yet hold,
 *   and the signal to found and seat.
 *
 * Each report's subject names the enterprise (`enterprise:<id>`), so it is at home with that
 * enterprise even when it made it (work-arena `homeOf`): a report on a party's own conformance is
 * owed by that party. Those who do its work answer by governing acts (organizing/agency governing):
 * choosing points (its own turn holds each due point on its measured flow until then, settings
 * `derivedJudgmentsOf`), founding an office for the unheld demand and doing its work, or posting what
 * is another's. The poster resolves the report once the measurement no longer finds it.
 * @packageDocumentation
 */
import { CLOSED_STANDINGS, houseSectionOf, openingOf, owesOf, reportPartyOf, sectionsOf, VERIFIER_ROLE_NAMES } from "./work-arena.mjs";
import { canonicalPlayer, incumbenciesOf, resolve } from "../agency/index.mjs";

export const SETTINGS_LAW = "A micro-enterprise's grey bands are held judgments: each carries a point it chose, with a date to look at it again.";
export const GROUND_LAW = "A micro-enterprise holds its own ground: no open thread standing over its territory is at home nowhere.";
export const GOVERNANCE_LAWS = Object.freeze([SETTINGS_LAW, GROUND_LAW]);

const FINDING_LIMIT = 800;
const SUBJECT = "enterprise:";

/** The subject naming an enterprise: a report under it is on that enterprise's own conformance
 *  (work-arena `reportPartyOf`). */
export const enterpriseSubject = (id) => `${SUBJECT}${id}`;

/**
 * The territory a thread stands over: the one most deeply enclosing what it is about (its sections,
 * else its opening office's), with no one passed over for having opened it or given it back.
 */
export function standingOverOf(thread, territories = []) {
  const opening = thread.opening ?? thread;
  const sections = sectionsOf(thread);
  const about = sections.length > 0 ? sections
    : typeof opening.by === "string" && opening.by.includes("#") ? [houseSectionOf(opening.by.split("#")[0])].filter(Boolean) : [];
  let deepest;
  for (const section of about) {
    for (const territory of territories) {
      if (section !== territory.section && !section.startsWith(`${territory.section}/`)) continue;
      if (deepest === undefined || territory.section.length > deepest.section.length) deepest = territory;
    }
  }
  return deepest;
}

/** Each enterprise's unheld ground: the open threads owing the market that stand over its territory.
 *  A governance report itself is never ground (it is owed by its party, never the market). */
export function unheldGroundOf(board, territories = []) {
  const ground = new Map();
  for (const thread of board.threads) {
    if (CLOSED_STANDINGS.includes(thread.standing) || reportPartyOf(thread) !== undefined) continue;
    if (!(owesOf(thread) ?? []).includes("market")) continue;
    const over = standingOverOf(thread, territories);
    if (over === undefined) continue;
    ground.set(over.id, [...(ground.get(over.id) ?? []), thread]);
  }
  return ground;
}

const gist = (thread) => {
  const opening = thread.opening;
  return String(opening.need ?? opening.observation ?? opening.purpose ?? opening.idea ?? opening.question ?? opening.ruling ?? "").replace(/\s+/gu, " ").slice(0, 90);
};

/**
 * What the board and the enterprises' settings find against the two governance laws, as a derivation
 * by `poster`: one report per enterprise per law it does not keep. `enterprises` are the seated
 * enterprises, each `{ id, sectionPath, settings }`, its settings read by `currentSettings`.
 * @param {{ poster: string, board: { threads: ReadonlyArray<object> }, enterprises: ReadonlyArray<{ id: string, sectionPath: string, settings: ReadonlyArray<object> }>, territories: ReadonlyArray<object>, at: string }} options
 */
export function governanceFindingsOf({ poster, board, enterprises, territories, at }) {
  if (typeof poster !== "string" || poster === "") throw new TypeError("governance-findings: poster names the enterprise its findings are by");
  const ground = unheldGroundOf(board, territories);
  const openings = enterprises.flatMap((enterprise) => {
    const scope = [`section:${enterprise.sectionPath}`];
    const subject = enterpriseSubject(enterprise.id);
    const found = [];
    const due = enterprise.settings.filter((setting) => setting.due);
    if (due.length > 0) {
      const unjudged = due.filter((setting) => !setting.judged).map((setting) => setting.axis);
      const lapsed = due.filter((setting) => setting.judged).map((setting) => `${setting.axis} (revisit by ${setting.revisitBy ?? "never"})`);
      found.push({
        enterprise: enterprise.id, law: "settings",
        opening: openingOf({
          move: "report", by: poster, law: SETTINGS_LAW, subject,
          observation: `${enterprise.id} holds ${due.length} grey band${due.length === 1 ? "" : "s"} it has not judged or looked at again: ${[...unjudged, ...lapsed].join(", ")}. Its own turn holds each on its measured flow, and any of its doers may choose a point, why, and when to revisit it (enterprise-setting-record).`.slice(0, FINDING_LIMIT),
          evidence: due.map((setting) => `setting:${enterprise.id}/${setting.axis}=${setting.value}@${setting.since ?? "declared-default"}`),
          scope, at,
        }),
      });
    }
    const unheld = ground.get(enterprise.id) ?? [];
    if (unheld.length > 0) {
      const named = unheld.slice(0, 4).map((thread) => `"${gist(thread)}"`).join("; ");
      found.push({
        enterprise: enterprise.id, law: "ground",
        opening: openingOf({
          move: "report", by: poster, law: GROUND_LAW, subject,
          observation: `${unheld.length} open thread${unheld.length === 1 ? "" : "s"} standing over ${enterprise.id}'s territory ${unheld.length === 1 ? "is" : "are"} at home nowhere: ${named}${unheld.length > 4 ? "; …" : ""}. Its organization holds no office for ${unheld.length === 1 ? "it" : "them"}: one who does its work founds one (enterprise-found) and takes the work up, which seats them, or posts the part that is another's.`.slice(0, FINDING_LIMIT),
          evidence: unheld.map((thread) => thread.id),
          scope, at,
        }),
      });
    }
    return found;
  });
  return Object.freeze({
    kind: "enterprise-governance-findings.v1",
    poster,
    domain: Object.freeze({ laws: GOVERNANCE_LAWS }),
    evidence: `governance-findings:${enterprises.length} enterprises at ${at}`,
    openings: Object.freeze(openings),
  });
}

/**
 * The offices that verify deliveries in one of the four armies' roles (work-arena VERIFIER_ROLES:
 * white, black, blue, red): each office whose record declares `verifies: <role>` as its standing
 * charge, with the enterprises listing it and the bearers seated there at dignitas. The role is the
 * office's, so who verifies is read off the registry, never listed again by the enterprises it serves.
 * A verifier never attests its own work: `except` names the enterprises whose offices are passed over
 * (the deliverer's, the assayer's), so the four roles sit at loci distinct from the work they judge.
 */
export function verifierOfficesOf(agency, role, { except = [] } = {}) {
  if (!VERIFIER_ROLE_NAMES.includes(role)) throw new TypeError(`verifier role ${role} is none of ${VERIFIER_ROLE_NAMES.join(", ")}`);
  const listing = (office) => [...agency.enterprises.values()].filter((enterprise) => (enterprise.authored?.offices ?? [])
    .some((ref) => resolve(agency, "offices", ref, enterprise.sectionPath)?.key === office.key)).map((enterprise) => enterprise.id);
  return Object.freeze([...agency.offices.values()].filter((office) => office.authored?.verifies === role).map((office) => Object.freeze({
    office: office.key, role, enterprises: Object.freeze(listing(office)),
    seated: Object.freeze(incumbenciesOf(agency, office.key).filter((seat) => seat.state === "dignitas").map((seat) => seat.holder)),
  })).filter((entry) => !entry.enterprises.some((id) => except.includes(id))));
}


/**
 * Who verifies one delivery, the one rule: the offices `verifierOfficesOf` reads off the registry
 * (`office.verifies`) that the receiving enterprise lists, distinct from the delivery's producer.
 * Distinct is explicit: an office is passed over when it is the producer's own, or when one of its
 * seated bearers is the producer or bears the producer's office, since a verifier never attests its
 * own work. `require` names the colours the request's terms ask for (several distinct colours, each
 * staffed by its own office); with none named, every colour the enterprise houses is staffed.
 * Returns `{staffed: [{role, office}], refused: [{role, reason}]}`: a colour with no distinct
 * office is refused with its reason, a seating signal (an unhomed thread) and never an error.
 * @param {object} agency
 * @param {{enterprise: string, producer: string, require?: string[]}} subject
 */
export function verifierSeatingOf(agency, { enterprise, producer, require = [] }) {
  for (const role of require) if (!VERIFIER_ROLE_NAMES.includes(role)) throw new TypeError(`verifier role ${role} is none of ${VERIFIER_ROLE_NAMES.join(", ")}`);
  const by = canonicalPlayer(agency, producer);
  const producerBearers = new Set([by, ...(by.includes("#") ? incumbenciesOf(agency, by).filter((seat) => seat.state === "dignitas").map((seat) => seat.holder) : [])]);
  const housed = new Map(VERIFIER_ROLE_NAMES.map((role) => [role, verifierOfficesOf(agency, role).filter((entry) => entry.enterprises.includes(enterprise))]));
  const wanted = require.length > 0 ? [...new Set(require)] : VERIFIER_ROLE_NAMES.filter((role) => housed.get(role).length > 0);
  if (wanted.length === 0) return Object.freeze({ staffed: Object.freeze([]), refused: Object.freeze([Object.freeze({ role: undefined, reason: `${enterprise} lists no office that verifies: seat one with \`verifies\` for ${producer}'s delivery` })]) });
  const staffed = [];
  const refused = [];
  for (const role of wanted) {
    const listed = housed.get(role);
    const distinct = listed.filter((entry) => entry.office !== by && !entry.seated.some((holder) => producerBearers.has(holder))).sort((a, b) => a.office.localeCompare(b.office));
    if (distinct.length > 0) staffed.push(Object.freeze({ role, office: distinct[0].office }));
    else refused.push(Object.freeze({ role, reason: listed.length === 0
      ? `${enterprise} lists no office that verifies as ${role}`
      : `every ${role} verifier office of ${enterprise} (${listed.map((entry) => entry.office).join(", ")}) is ${producer}'s own or shares its bearer: seat a distinct one` }));
  }
  return Object.freeze({ staffed: Object.freeze(staffed), refused: Object.freeze(refused) });
}
