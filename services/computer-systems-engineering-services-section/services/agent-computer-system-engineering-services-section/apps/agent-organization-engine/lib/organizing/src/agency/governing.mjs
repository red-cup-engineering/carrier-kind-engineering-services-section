/**
 * governing — how a micro-enterprise grows its own organization: the rights it holds because it is
 * one, and the governing acts those rights authorize (561 Group lane register, 2026-10-03: the
 * enterprise governing itself).
 *
 * Rendanheyi delegates three rights (sanquan) to a micro-enterprise in full: decision (what it does),
 * personnel (who is in it) and distribution (how its earnings divide). They are the enterprise's because
 * of its kind (./kinds.mjs `rights`), so no record grants them and no office above it can overrule their
 * exercise. Nobody owns them: they are exercised by the enterprise's DOERS, the bearers whose hands did
 * its work (`doersOf`), read off the work board's deeds (`deedsOf`), never off a seat someone has to fill
 * first. A doer founds, judges and recognizes; one doer's act stands until another doer's later act
 * replaces it, and an enterprise no one has worked in yet still decides, by its own turn's derivations
 * (organizing/enterprise settings `derivedJudgmentsOf`). Silence never blocks.
 *
 * Socializing's office reads incumbency as a double settlement: recognition (the body acknowledges
 * the candidate) and induction (the candidate takes on the office's forward obligation). Doing the
 * office's work is both at once: a bearer whose hand played as an office (held, promised, adopted or
 * delivered as it) is seated there by that deed (`incumbentsOf`), with no act of appointment. A record
 * of a seat, told by its two parties (a doer's recognition, the bearer's induction), or a commitment
 * recognized by qiangdan before any deed, seats too; a seat is never told by one party alone.
 *
 * So an enterprise changes its organization only by governing acts on the agency act chain
 * (./acts.mjs), each authorized by one of its rights (`governingRight`) and recording its player:
 *
 * - found (decision): an office, the duty it bears and the work that duty is owed toward, in the
 *   enterprise's own section, listed in its own record's `offices`;
 * - seat (personnel): an incumbency seating a bidder in one of its own offices, recognized by a doer
 *   or by qiangdan and inducted by the bidder's own bid;
 * - judge (decision): a point on one of its grey bands (organizing/enterprise settings), chosen by a
 *   doer or derived by its own turn.
 *
 * The enterprise's line office (`lineOfficeOf`) is only structure: the office a founded office reports
 * to and shares jurisdiction with. It holds no right and gates nothing.
 */
import { createHash } from "node:crypto";
import { BODY_KINDS } from "./kinds.mjs";
import { CARRIER_PRESCRIPTIONS, bearersHandedBy, incumbenciesOf, officeReading, resolve } from "./index.mjs";

/** The three rights and the agency pools each may change. Distribution is exercised on the books,
 *  not the registry. */
export const RIGHTS = Object.freeze({
  decision: Object.freeze({ pools: Object.freeze(["offices", "duties", "works", "skills", "enterprises"]), means: "what the enterprise does, and so which offices it keeps and what each is owed toward" }),
  personnel: Object.freeze({ pools: Object.freeze(["incumbencies"]), means: "who is in the enterprise: recognizing a bidder into one of its offices, and withdrawing that recognition" }),
  distribution: Object.freeze({ pools: Object.freeze([]), means: "how the enterprise's earnings divide among its members" }),
});

const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.length > 0) : typeof value === "string" && value.length > 0 ? [value] : []);
const within = (path, section) => section === "" || path === section || path.startsWith(`${section}/`);
const fail = (reason) => { throw new TypeError(`governing act: ${reason}`); };

/** An enterprise record by id or key, or undefined. */
export function enterpriseRecord(agency, enterpriseRef) {
  return [...agency.enterprises.values()].find((record) => record.id === enterpriseRef || record.key === enterpriseRef);
}

/** The rights an enterprise holds by its kind. */
export function rightsOf(agency, enterpriseRef) {
  return enterpriseRecord(agency, enterpriseRef) === undefined ? Object.freeze([]) : BODY_KINDS["micro-enterprise"].rights;
}

/** The offices an enterprise lists, resolved from its section; `own` keeps only those whose records sit
 *  in its own section, the offices its personnel right reaches (an office it lists from a wider section,
 *  as engineering lists the Group's chief engineering officer, is seated by that section's body). */
export function enterpriseOffices(agency, enterprise, { own = false } = {}) {
  const offices = strings(enterprise.authored?.offices ?? enterprise.offices)
    .map((ref) => resolve(agency, "offices", ref, enterprise.sectionPath)).filter(Boolean);
  return Object.freeze(own ? offices.filter((office) => within(office.sectionPath, enterprise.sectionPath)) : offices);
}

/**
 * The enterprise's line office: the office a founded office reports to and stands in the jurisdiction
 * of. It is the office its record names as `head`; else the office bearing the duty its `assesses`
 * names, since that office already takes the enterprise's demand into its own work; else its first
 * listed office. It is structure only: no right is its, and nothing waits for it to be held.
 */
export function lineOfficeOf(agency, enterprise) {
  const offices = enterpriseOffices(agency, enterprise);
  const head = enterprise.authored?.head === undefined ? undefined : resolve(agency, "offices", enterprise.authored.head, enterprise.sectionPath);
  if (head !== undefined && offices.some((office) => office.key === head.key)) return head;
  const assesses = enterprise.authored?.assesses;
  if (assesses !== undefined) {
    const assessing = offices.find((office) => office.bearsDuty.some((ref) => {
      const duty = resolve(agency, "duties", ref, office.sectionPath);
      return duty?.work === assesses.work && duty.skills.includes(assesses.skill);
    }));
    if (assessing !== undefined) return assessing;
  }
  return offices[0];
}

/** How far back a deed makes its bearer a doer: the arena's flow window (organizing/enterprise
 *  work-arena WORK_AXES `flow-window`, its default), so a doer is one whose work still earns. */
export const DEED_WINDOW_DAYS = 14;

/** The pools the enterprise's own turn may found from derived demand: an office, its duty, its work and the listing. */
const DEMAND_POOLS = Object.freeze(["offices", "duties", "works", "enterprises"]);

const TAKINGS = Object.freeze(["holders", "promisers", "adoptions", "deliveries"]);

/** The bearer a hand is of: the one bearer it is a hand of, else none. A constituted actor is its own
 *  hand (`bidderOf`). */
const bearerOfHand = (agency, hand) => {
  const hands = bearersHandedBy(agency, hand);
  return hands.length === 1 ? hands[0] : undefined;
};

/**
 * The deeds done in an enterprise's work, read off one board read: each holding, promise, adoption and
 * delivery played as one of its own offices, or on a thread at home with it, within `windowDays` of
 * `at`. A deed names its bearer (the bearer its hand is of; or its player, when the player is no office
 * and so plays in its own name), the office it was played as when that is one of the enterprise's own,
 * the thread, the move and when. A deed whose bearer cannot be read (an office, or an enterprise taking
 * in its own name, played with no hand) is left out: it says what was done, not who did it.
 * @param {{ threads: ReadonlyArray<object> }} board
 */
export function deedsOf(agency, enterprise, board, { at = new Date().toISOString(), windowDays = DEED_WINDOW_DAYS } = {}) {
  const own = new Map(enterpriseOffices(agency, enterprise, { own: true }).map((office) => [office.key, office]));
  const since = Date.parse(at) - windowDays * 86_400_000;
  const deeds = [];
  for (const thread of board?.threads ?? []) {
    for (const move of TAKINGS) {
      for (const entry of thread[move] ?? []) {
        if (!(Date.parse(entry.at) >= since)) continue;
        const player = entry.player ?? entry.by;
        const office = typeof player === "string" ? resolve(agency, "offices", player, enterprise.sectionPath) : undefined;
        const ownOffice = office !== undefined && own.has(office.key) ? office.key : undefined;
        if (ownOffice === undefined && thread.home !== enterprise.id) continue;
        const bearer = typeof entry.hand === "string" ? bearerOfHand(agency, entry.hand) ?? entry.hand
          : office === undefined && typeof player === "string" && enterpriseRecord(agency, player) === undefined ? player : undefined;
        if (bearer === undefined || enterpriseRecord(agency, bearer) !== undefined) continue;
        deeds.push(Object.freeze({ bearer, ...(ownOffice === undefined ? {} : { office: ownOffice }), thread: thread.id, move, at: entry.at }));
      }
    }
  }
  return Object.freeze(deeds);
}

/** Who holds an enterprise's own offices on record: the holders seated there at dignitas. */
const recordedHolders = (agency, office) => incumbenciesOf(agency, office.key).filter((seat) => seat.state === "dignitas").map((seat) => seat.holder);

/**
 * The enterprise's doers, who exercise its rights: every bearer with a deed in its work (`deedsOf`), and
 * every holder of one of its own offices on record. Sorted, each once; empty for an enterprise nobody
 * has worked in yet, which then decides by its own turn's derivations.
 */
export function doersOf(agency, enterprise, { deeds = [] } = {}) {
  const recorded = enterpriseOffices(agency, enterprise, { own: true }).flatMap((office) => recordedHolders(agency, office));
  return Object.freeze([...new Set([...recorded, ...deeds.map((deed) => deed.bearer)])].sort());
}

/** The enterprise's own offices, each with whoever is seated there (`seated`): the holders on record at
 *  dignitas and the bearers seated by deed, having played as that office (`deeds`, from `deedsOf`). */
export function incumbentsOf(agency, enterprise, { deeds = [] } = {}) {
  return Object.freeze(enterpriseOffices(agency, enterprise, { own: true }).map((office) => Object.freeze({
    ...office,
    seated: Object.freeze([...new Set([...recordedHolders(agency, office), ...deeds.filter((deed) => deed.office === office.key).map((deed) => deed.bearer)])].sort()),
  })));
}

/** The enterprise's own offices no one is seated in, by record or by deed: its open seats. */
export function openSeatsOf(agency, enterprise, { deeds = [] } = {}) {
  return Object.freeze(incumbentsOf(agency, enterprise, { deeds }).filter((office) => office.seated.length === 0));
}

/** The carrier an office's service offerings require of whoever serves it (the authored
 *  `requiredCarrier`, one for all its offerings), or undefined. */
export function requiredCarrierOf(office) {
  const offerings = Array.isArray(office.authored?.["service-offerings"]) ? office.authored["service-offerings"] : [];
  const required = [...new Map(offerings.map((offering) => offering?.requiredCarrier).filter(Boolean).map((carrier) => [JSON.stringify(carrier), carrier])).values()];
  return required.length === 1 ? required[0] : undefined;
}

/** The bearer a bid speaks for: the one bearer its account is a hand of, else the account itself
 *  (a constituted actor is its own hand). */
export const bidderOf = (agency, bid) => {
  const hands = bearersHandedBy(agency, bid.by);
  return hands.length === 1 ? hands[0] : bid.by;
};

/**
 * Qiangdan over one open seat: the bids for it, each qualified or refused with its reasons, and the
 * winner, the first qualified commitment. A bid is a commitment made before any deed; a bearer who
 * simply does the office's work is seated by that (`incumbentsOf`) and needs no bid. A bid is qualified when its bearer's admitted testimony
 * covers every verb the office's skills require (Ashby: the office's variety absorbed, never assumed)
 * and one of its carriers meets the carrier the office's offerings require. A bearer already seated
 * there does not bid again. Commitments are ranked by when they were made: the office carries no
 * measure yet against which one target outbids another.
 *
 * `testimony` maps a bearer to `{ capabilities: string[], carriers: [{ model, reasoningEffort }] }`,
 * the provider testimony a platform admits at runtime (never a record).
 */
export function qiangdan(agency, enterprise, officeRef, { bids = [], testimony = {}, deeds = [] } = {}) {
  const office = resolve(agency, "offices", officeRef, enterprise.sectionPath);
  if (office === undefined) fail(`${officeRef} is no office of ${enterprise.id}`);
  const verbs = officeReading(agency, office.key).verbs ?? [];
  const required = requiredCarrierOf(office);
  const seated = new Set([...recordedHolders(agency, office), ...deeds.filter((deed) => deed.office === office.key).map((deed) => deed.bearer)]);
  const forSeat = bids.filter((bid) => bid.enterprise === enterprise.id
    && resolve(agency, "offices", bid.office, enterprise.sectionPath)?.key === office.key)
    .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)));
  const read = forSeat.map((bid) => {
    const bearer = bidderOf(agency, bid);
    const told = testimony[bearer];
    const reasons = [];
    if (seated.has(bearer)) reasons.push("already-seated");
    if (told === undefined) reasons.push("no-testimony");
    else {
      const missing = verbs.filter((verb) => !told.capabilities.includes(verb));
      if (missing.length > 0) reasons.push(...missing.map((verb) => `capability-missing:${verb}`));
      if (required !== undefined && !(told.carriers ?? []).some((carrier) => carrier.model === required.model && carrier.reasoningEffort === required.reasoningEffort)) {
        reasons.push(`carrier-required:${required.model}/${required.reasoningEffort}`);
      }
    }
    return Object.freeze({ bid, bearer, qualified: reasons.length === 0, reasons: Object.freeze(reasons) });
  });
  const winner = read.find((entry) => entry.qualified);
  return Object.freeze({ kind: "organizing.agency.qiangdan", enterprise: enterprise.id, office: office.key, verbs: Object.freeze([...verbs]), bids: Object.freeze(read), ...(winner === undefined ? {} : { winner }) });
}

/** An agency id for a seat: the bearer and office, slugged, with a digest so distinct bearers never meet. */
const seatId = (bearer, office) => {
  const slug = `${bearer}`.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, 32).replace(/-+$/u, "");
  const digest = createHash("sha256").update(`${bearer}\0${office.key}`).digest("hex").slice(0, 10);
  return `${slug || "bearer"}-${digest}-as-${office.id}`.slice(0, 120);
};

/** The act entry seating a qiangdan winner: the incumbency in the enterprise's own section, its
 *  recognition told by the enterprise and its induction by the bid. */
export function seatingOf(agency, enterprise, officeRef, winner, { at } = {}) {
  const office = resolve(agency, "offices", officeRef, enterprise.sectionPath);
  if (office === undefined) fail(`${officeRef} is no office of ${enterprise.id}`);
  const id = seatId(winner.bearer, office);
  return Object.freeze({
    pool: "incumbencies", id, section: enterprise.sectionPath, expectedRevision: null,
    record: {
      id, name: `${winner.bearer} as ${office.name}`, office: resolve(agency, "offices", office.id, enterprise.sectionPath)?.key === office.key ? office.id : office.key,
      holder: winner.bearer, recognition: "t", induction: "t", from: at,
      "recognized-by": enterprise.id,
      "inducted-by": { bid: winner.bid.recordedAt, by: winner.bid.by, target: winner.bid.target },
    },
  });
}

/**
 * The act entries founding an office: the office record and the duty carrying the work it is
 * owed toward (each in the enterprise's own section, the office reporting to its line office), and the
 * enterprise's own record listing it. The skill is one the registry already holds: founding an
 * office conveys no verb the house has not already described.
 */
export function foundingOf(agency, enterprise, { office, duty, work, skill }) {
  const line = lineOfficeOf(agency, enterprise);
  if (line === undefined) fail(`${enterprise.id} lists no office for a founded office to report to`);
  const skillRecord = resolve(agency, "skills", skill, enterprise.sectionPath);
  if (skillRecord === undefined) fail(`no skill ${skill} reachable from ${enterprise.sectionPath}`);
  const section = enterprise.sectionPath;
  const workId = work?.id ?? office.id;
  const dutyId = duty?.id ?? office.id;
  const rank = office.rank;
  let reporting = line;
  if (rank !== undefined) {
    if (!["senior", "junior"].includes(rank)) fail("a section service officer is senior or junior");
    if (office.verifies !== undefined) fail("verifier and section officer are distinct capabilities");
    if (typeof duty?.["receiver-condition"] !== "string" || !duty["receiver-condition"].trim()) fail("a section officer requires its actual independent receiving condition");
    if (rank === "junior") {
      reporting = resolve(agency, "offices", office["reports-to"], section);
      if (reporting?.sectionPath !== section || reporting?.rank !== "senior") fail("a Junior reports to an existing Senior in its own section");
    }
  }
  const officeRecord = {
    id: office.id, name: office.name, kind: "office",
    "reports-to": resolve(agency, "offices", reporting.id, section)?.key === reporting.key ? reporting.id : reporting.key,
    ...(rank === undefined ? {} : { rank }),
    jurisdiction: line.jurisdiction,
    "bears-duty": [dutyId], "provides-skill": [skillRecord.id],
    "deontic-profile": { [workId]: "duty" },
    "normative-structure": office["normative-structure"],
    // A verifier's standing charge: one of the four armies' roles (work-arena VERIFIER_ROLES).
    ...(office.verifies === undefined ? {} : { verifies: office.verifies }),
  };
  const dutyRecord = {
    id: dutyId, name: duty?.name ?? office.name, authority: line.id, claim: line.id, work: workId,
    skills: [skillRecord.id], delegation: true,
    from: work.from, to: work.to, cost: work.cost, needs: [skillRecord.id],
    ...(work.otherwise === undefined ? {} : { otherwise: work.otherwise }),
    ...(duty?.["receiver-condition"] === undefined ? {} : { "receiver-condition": duty["receiver-condition"] }),
  };
  const listed = strings(enterprise.authored.offices);
  return Object.freeze([
    Object.freeze({ pool: "duties", id: dutyId, section, expectedRevision: resolve(agency, "duties", `${section}#${dutyId}`)?.revision ?? null, record: dutyRecord }),
    Object.freeze({ pool: "offices", id: office.id, section, expectedRevision: agency.offices.get(`${section}#${office.id}`)?.revision ?? null, record: officeRecord }),
    Object.freeze({
      pool: "enterprises", id: enterprise.id, section, expectedRevision: enterprise.revision,
      record: listed.includes(office.id) ? stripped(enterprise.authored) : { ...stripped(enterprise.authored), offices: [...listed, office.id] },
    }),
  ]);
}

/** A record's authored fields without the trace of the act that last made it. */
const stripped = (authored) => Object.fromEntries(Object.entries(authored).filter(([key]) => key !== "last-governance-act"));

/**
 * Which of the enterprise's rights authorizes one entry of a governing act, or why none does.
 * `actor` is `{ bearer, doers }` for a bearer acting in the enterprise, `doers` its doers (`doersOf`),
 * `{ rule: "qiangdan" }` for the enterprise's own turn recognizing a commitment, or `{ rule: "demand" }`
 * for its own turn founding an office derived demand obliges it to hold (enterprise/founding).
 */
export function governingRight(agency, enterprise, { pool, source, record, existing }, actor) {
  const line = lineOfficeOf(agency, enterprise);
  const byDoer = typeof actor?.bearer === "string";
  if (byDoer && !(actor.doers ?? []).includes(actor.bearer)) fail(`${actor.bearer} has done none of ${enterprise.id}'s work: its rights are exercised by those who do it`);
  if (!byDoer && actor?.rule !== "qiangdan" && actor?.rule !== "demand") fail("an enterprise's rights are exercised by its doers or by its own turn");
  const right = Object.entries(RIGHTS).find(([, held]) => held.pools.includes(pool))?.[0];
  if (right === undefined || right === "distribution") fail(`no right of ${enterprise.id} reaches the ${pool} pool`);
  // Its own turn decides only what derived demand obliges it to hold (enterprise/founding): founding an
  // office (its work, duty and listing), never a skill, never a seat; seats fill by deed or by qiangdan.
  if (right === "decision" && actor?.rule === "demand" && !DEMAND_POOLS.includes(pool)) fail(`its own turn founds an office from demand; the ${pool} pool is its doers' to decide`);
  if (right === "decision" && !byDoer && actor?.rule !== "demand") fail("its own turn recognizes commitments; deciding what the enterprise does is its doers'");
  if (right === "personnel" && actor?.rule === "demand") fail("demand founds offices and never seats anyone: a seat fills by deed or by qiangdan");
  const prescribed = CARRIER_PRESCRIPTIONS.filter((field) => record[field] !== undefined);
  if (prescribed.length > 0) fail(`a governing act never names who does the work (${prescribed.join(", ")})`);
  if (pool === "enterprises") {
    if (source !== enterprise.source) fail("an enterprise amends only its own record");
    const before = stripped(enterprise.authored);
    const after = stripped(record);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
    if (changed.some((key) => key !== "offices")) fail(`an enterprise's decision right lists its offices; it changes none of ${changed.filter((key) => key !== "offices").join(", ")}`);
    const prior = strings(before.offices);
    if (prior.some((ref) => !strings(after.offices).includes(ref))) fail("founding lists an office; it never drops one");
    return Object.freeze({ right, enterprise: enterprise.id });
  }
  if (!source.startsWith(`${enterprise.sectionPath}/lib/agency/${pool}/`)) fail(`${source} is outside ${enterprise.id}'s own section`);
  if (pool === "offices") {
    const kinds = Object.values(record["deontic-profile"] ?? {});
    if (kinds.some((kind) => kind !== "duty")) fail("founding an office conveys duties only: powers, immunities and liberties are not the enterprise's to grant");
    if (record.jurisdiction !== line?.jurisdiction) fail(`a founded office stands in its line office's jurisdiction (${line?.jurisdiction})`);
    if (strings(record["authority-scope"]).some((scope) => !within(scope.replace(/^lib\//u, "").replace(/\/+$/u, ""), enterprise.sectionPath))) fail("a founded office's authority stays within the enterprise's section");
  }
  if (pool === "skills") {
    const verbs = new Set(enterpriseOffices(agency, enterprise).flatMap((office) => officeReading(agency, office.key).verbs ?? []));
    const added = strings(record["requires-capabilities"]).filter((verb) => !verbs.has(verb));
    if (added.length > 0) fail(`a skill founded by ${enterprise.id} requires only verbs its offices already have (not ${added.join(", ")})`);
  }
  if (pool === "incumbencies") {
    const office = resolve(agency, "offices", record.office, enterprise.sectionPath);
    if (office === undefined || !enterpriseOffices(agency, enterprise, { own: true }).some((own) => own.key === office.key)) fail(`${record.office} is not one of ${enterprise.id}'s own offices`);
    if (record["recognized-by"] !== enterprise.id) fail("a seat's recognition is told by the enterprise whose personnel right reaches it");
    if (typeof record["inducted-by"]?.by !== "string") fail("a seat's induction is the bidder's own bid");
    if (bidderOf(agency, record["inducted-by"]) !== record.holder) fail("the induction is told by the holder or its hand, never for another");
    if (byDoer && actor.bearer === record.holder) fail("no bearer recognizes itself");
  }
  return Object.freeze({ right, enterprise: enterprise.id });
}

/**
 * Who may tell a seat's recognition (the honor axis) for `officeRef`, when a party tells it directly
 * rather than by deed or through qiangdan: the body whose personnel right reaches the office. An
 * enterprise's own office is recognized by one of that enterprise's doers (`doersOf(enterprise)`, the
 * bearers who did its work), never by the bearer being seated; an office no enterprise holds as its own
 * is recognized under an office it reports up to (appointment along the line). `held` are the office
 * keys the caller holds. Returns `{ right, office }`, the right and the mask the recognition is told
 * under (the enterprise itself, or the superior office), or throws.
 * @param {{ held?: string[], bearer?: string, incumbent?: string, doersOf?: (enterprise: object) => ReadonlyArray<string> }} [options]
 */
export function recognitionRightOf(agency, officeRef, { held = [], bearer, incumbent, doersOf: doers = (enterprise) => doersOf(agency, enterprise) } = {}) {
  const office = resolve(agency, "offices", officeRef);
  if (office === undefined) fail(`${officeRef} is no office of the agency records`);
  if (bearer !== undefined && bearer === incumbent) fail("no bearer recognizes itself: the bid is its own, the recognition another's");
  const owning = [...agency.enterprises.values()].find((enterprise) => enterpriseOffices(agency, enterprise, { own: true }).some((own) => own.key === office.key));
  if (owning !== undefined) {
    if (!doers(owning).includes(bearer)) fail(`${office.key} is ${owning.id}'s own office: its recognition is told by one who does ${owning.id}'s work, and ${bearer ?? "the caller"} has done none`);
    return Object.freeze({ right: "personnel", office: owning.id, enterprise: owning.id });
  }
  const line = officeReading(agency, office.key).reportsTo ?? [];
  const superior = line.find((key) => held.includes(key));
  if (superior === undefined) fail(`${office.key} is recognized along its line (${line.join(" → ") || "it reports to no office"}); the caller holds none of it`);
  return Object.freeze({ right: "line", office: superior });
}
