/**
 * agency — the one registry of the house's authored agency records.
 *
 * Every section may seat its own agency: offices, the duties they bear, the works those duties
 * are owed toward, the skills they need, the characters (org-owned holders that harnesses
 * mask), the masks characters and bodies wear, the bodies bearers form (./kinds.mjs: bands,
 * sects, troupes, guilds, polities; an enterprise is read as a micro-enterprise body) and the
 * incumbencies seating characters in offices. Who plays wearing what is ./cast.mjs. They are authored under
 * `<section>/lib/agency/<pool>/`; harness sections also keep skills directly under
 * `<section>/skills/`.
 *
 * The chain it composes: a holder (a character — a harness's or a person's — or an account no organ
 * hands to a character) holds an office at dignitas
 * when its incumbency is recognized and inducted (socializing's incumbencyState); the office
 * bears duties and provides skills; a duty names the skills its work needs; a skill requires
 * operation verbs (`requires-capabilities`) and has a closure kind (inquiry, derivation,
 * procedure, process). So an office's verbs are the requirements of every skill it provides
 * or its duties need, and a holder's are those of the offices it holds.
 *
 * Who may perform what is the theory of work's organisational form (its Theorem 10): the
 * offices are positions, `reports-to` makes them the authority-dispatched tree, and the
 * position-permission cost of an act is the unit when a held office's skills require it and
 * the quantale's top (forbidden) otherwise. `governanceOf` reads the same records as a
 * governance (socializing): sections and offices as collectives, incumbents as members, and
 * each office's duties as norms binding its members.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { decodeYaml } from "@red-cup-engineering/yaml-frontmatter-codec-service";
import { incumbencyState } from "@red-cup-engineering/socializing/office";
import { governance } from "@red-cup-engineering/socializing/governance";
import { costQuantale } from "@red-cup-engineering/metrologic/models/order/quantale";
import { normalizeRule, ruleNorms } from "./rules.mjs";
import { BODY_KINDS, MASK_KINDS } from "./kinds.mjs";
import { knowledgeJoinAll, readingAs, readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { agencyActsLog, foldAgencyActs, readAgencyActs, revisionOf } from "./acts.mjs";


export const AGENCY_POOLS = Object.freeze(["offices", "duties", "works", "skills", "characters", "masks", "bodies", "organs", "incumbencies", "rules", "enterprises", "contracts", "entities", "principals", "requirements", "deontic-powers", "deontic-immunities", "liberties", "axioms", "directives", "policies", "packets"]);
// `vendor` holds copies of other packages' records, which are authored in the package that owns
// them; reading the copy seats the same office or skill twice.
const SKIP = new Set(["node_modules", ".git", "legacy", "_archive", "vendor", "dist", ".cache", ".tmp", "coverage"]);
const POOL_PARENT = /(?:^|\/)lib\/agency$/u;
const SECTION_DIR = /-(?:section|service)$/u;
const DUTY_PREFIX = /^(?:[a-z0-9-]+\/)?duty\//u;

function frontmatterOf(source) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/u.exec(source);
  if (!match) return { head: undefined, body: source };
  let head;
  try { head = decodeYaml(match[1]); } catch { head = undefined; }
  return { head, body: source.slice(match[0].length) };
}

/** A record: a JSON file, or a Markdown file's frontmatter with its body kept for prose sections. */
function parseRecord(source, text) {
  if (source.endsWith(".json")) return JSON.parse(text);
  const { head, body } = frontmatterOf(text);
  return head === undefined && body.trim() === "" ? undefined : { ...(head ?? {}), body };
}

/** The bullet items under a Markdown `## heading` of a record's body. */
function bulletsUnder(body, heading) {
  if (typeof body !== "string") return [];
  const section = new RegExp(`^##\\s+${heading}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, "mu").exec(body);
  return section ? [...section[1].matchAll(/^\s*[-*]\s+(.+)$/gmu)].map((m) => m[1].trim()) : [];
}

const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.length > 0) : typeof value === "string" && value.length > 0 ? [value] : []);
const dutyId = (ref) => ref.replace(DUTY_PREFIX, "");

/** Whether the walk for pools enters a directory of this name. */
export const agencyWalksInto = (name) => !SKIP.has(name);

/** The pool the directory `name` in `dir` is, `{ pool, section, sectionPath, dir }`, or undefined:
 *  a pool directory under a section's `lib/agency`, or `skills` directly in a section. */
export function agencyPoolAt(root, dir, name) {
  const rel = path.relative(root, dir).split(path.sep).join("/");
  const sectionSkills = name === "skills" && SECTION_DIR.test(path.basename(dir));
  if (!AGENCY_POOLS.includes(name) || !(POOL_PARENT.test(rel) || sectionSkills)) return undefined;
  const sectionDir = sectionSkills ? dir : path.join(root, rel.replace(POOL_PARENT, ""));
  return { pool: name, section: path.basename(sectionDir), sectionPath: path.relative(root, sectionDir).split(path.sep).join("/"), dir: path.join(dir, name) };
}

/** Walk `from` (by default `root`) for agency pools, yielding each `agencyPoolAt`; `enter` is
 *  told every directory the walk reads, before it reads it. */
export function* agencyPools(root, { from = root, enter } = {}) {
  const stack = [from];
  while (stack.length > 0) {
    const dir = stack.pop();
    enter?.(dir);
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || !agencyWalksInto(entry.name)) continue;
      const pool = agencyPoolAt(root, dir, entry.name);
      if (pool) yield pool; else stack.push(path.join(dir, entry.name));
    }
  }
}

const SINGULAR = Object.freeze({ offices: "office", duties: "duty", works: "work", skills: "skill", characters: "character", masks: "mask", bodies: "body", organs: "organ", incumbencies: "incumbency", rules: "rule" });

/** The record files of one pool directory: `<id>.json`, `<id>.md`, `<id>.schema.json`,
 *  `<id>/<id>.md`, `<id>/<id>.json`, `<id>/SKILL.md`, or `<id>/<singular>.json|md` (skill.json). */
function recordFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_") || entry.name.startsWith(".") || /^(index|README)\.md$/iu.test(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isFile() && /\.(json|md)$/u.test(entry.name)) {
      out.push({ id: entry.name.replace(/(\.schema)?\.(json|md)$/u, ""), file: full });
    } else if (entry.isDirectory()) {
      for (const name of [`${entry.name}.json`, `${entry.name}.md`, "SKILL.md", `${SINGULAR[path.basename(dir)]}.json`, `${SINGULAR[path.basename(dir)]}.md`]) {
        const candidate = path.join(full, name);
        try { if (statSync(candidate).isFile()) { out.push({ id: entry.name, file: candidate }); break; } } catch { /* not this shape */ }
      }
    }
  }
  return out;
}

/** A mask's or body's commitments: claim → FOUR value (t, f, b), the face it shows on each claim. */
const commitsOf = (value) => Object.freeze(Object.fromEntries(Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
  .map(([claim, reading]) => [claim, settled(reading)]).filter(([, reading]) => reading !== "absurd")));

function normalize(pool, id, raw) {
  const r = raw ?? {};
  // Normalized convenience fields do not replace the authored ontology.
  const common = { ...r, id: typeof r.id === "string" ? r.id : id, name: r.name ?? id };
  switch (pool) {
    case "offices": {
      // An office's Hohfeldian positions are recorded in several registers: `bears-duty`, a
      // `duties` list, a `deontic-profile` naming each position duty, deontic-power,
      // deontic-immunity or liberty, and a Markdown office's Duties and Powers sections.
      const profile = r["deontic-profile"] && typeof r["deontic-profile"] === "object" ? r["deontic-profile"] : {};
      const positioned = (position) => Object.entries(profile).filter(([, value]) => value === position).map(([name]) => name);
      const namedDuties = [...strings(r["bears-duty"]), ...strings(r.duties)].map(dutyId);
      return {
        ...common,
        reportsTo: strings(r["reports-to"])[0],
        presidesOver: strings(r["presides-over"]),
        peers: strings(r["peer-offices"]),
        // Historical replacement is continuity metadata only. It never recreates the
        // predecessor as a resolvable office or grants its powers to the successor.
        replacesOffice: strings(r["replaces-office"]),
        // Explicit duty references name records. Older offices without them use
        // their profile as the duty vocabulary; with explicit records, profile
        // keys can instead name the work those duties govern.
        bearsDuty: [...new Set(namedDuties.length > 0 ? namedDuties : positioned("duty").map(dutyId))],
        powers: positioned("deontic-power"),
        immunities: positioned("deontic-immunity"),
        liberties: positioned("liberty"),
        authority: [...strings(r.authority), ...bulletsUnder(r.body, "Powers")],
        dutyClaims: bulletsUnder(r.body, "Duties"),
        charter: r.charter,
        providesSkill: strings(r["provides-skill"]),
        deonticProfile: profile,
        authorityScope: strings(r["authority-scope"]),
        jurisdiction: r.jurisdiction,
        serves: r.serves,
        normativeStructure: r["normative-structure"],
      };
    }
    case "duties":
      return {
        ...common,
        authority: r.authority,
        claim: r.claim,
        // A duty that carries its own closure (from, to) is its own work: one record read two ways.
        work: r.work ?? (closureOf(r) === undefined ? undefined : common.id),
        skills: strings(r.skills),
        delegation: r.delegation === true,
        requiredCapabilities: strings(r["required-capabilities"]),
        allowedEffects: strings(r["allowed-effects"]),
        receiverCondition: r["receiver-condition"],
        // A personal duty (the migrated 2019 personal-directives numbering: `owed-to`, `number`,
        // `status`) names a bearer's obligation to someone specific, not an office's work-closure
        // duty; both live under a section's `lib/agency/duties/`, so both are carried here rather
        // than the personal shape being silently dropped.
        owedTo: r["owed-to"],
        number: r.number,
        status: r.status,
        migratedFrom: r["migrated-from"],
      };
    case "works":
      return {
        ...common,
        from: r.from,
        to: r.to,
        cost: r.cost,
        otherwise: r.otherwise,
        needs: strings(r.needs),
        requiredCapabilities: strings(r["required-capabilities"]),
        allowedEffects: strings(r["allowed-effects"]),
      };
    case "skills":
      return {
        ...common,
        description: r.description,
        method: r.method ?? r.body,
        closureKind: r["skill-closure-kind"] ?? r["closure-kind"],
        requiresCapabilities: strings(r["requires-capabilities"]),
      };
    case "characters":
      return { ...common, kind: r.kind, office: strings(r.office), description: r.description ?? r.disposition, harness: r.harness, host: r.host };
    case "masks":
      return { ...common, kind: r.kind ?? "persona", wornBy: strings(r["worn-by"]), carrier: r.carrier, commits: commitsOf(r.commits) };
    case "organs":
      // An organ of a body natural: a hand (an account), a harness, a device — what one of its handedness
      // coordinates binds to, and the FOUR reading it carries there (./organs.mjs).
      return { ...common, of: strings(r.of), platform: r.platform, account: r.account, handedness: commitsOf(r.handedness) };
    case "bodies":
      return {
        ...common, kind: r.kind, head: r.head, founders: strings(r.founders), partOf: strings(r["part-of"]), serves: r.serves, seat: r.seat,
        discipline: strings(r.discipline), situation: r.situation, closed: r.closed === true, commits: commitsOf(r.commits),
        members: (Array.isArray(r.members) ? r.members : []).map((m) => typeof m === "string" ? { who: m, recognizedBy: [], withdrawn: false }
          : { who: m.who, recognizedBy: strings(m["recognized-by"]), withdrawn: m.withdrawn === true || m.expelled === true }).filter((m) => typeof m.who === "string"),
      };
    case "rules":
      return { ...common, ...normalizeRule(id, r) };
    case "incumbencies":
      return { ...common, office: r.office, holder: r.holder ?? r.incumbent, recognition: r.recognition, induction: r.induction, from: r.from };
    // A micro-enterprise, a contract, a legal entity and a principal carry their own terms whole (organizing/enterprise reads them).
    case "enterprises":
    case "contracts":
    case "entities":
    case "principals":
      return { ...r, ...common };
    default:
      return common;
  }
}

/** The closure type a duty carries itself (the work it is owed toward, read off the same record): its
 *  `from` and `to`, with `cost`, `otherwise`, `needs` and the capability and effect labels; undefined
 *  when it carries none and names its work in the `works` pool instead. */
function closureOf(r) {
  if (r === null || typeof r !== "object" || (r.from === undefined && r.to === undefined)) return undefined;
  return { from: r.from, to: r.to, cost: r.cost, otherwise: r.otherwise, needs: strings(r.needs), requiredCapabilities: strings(r["required-capabilities"]), allowedEffects: strings(r["allowed-effects"]) };
}

/** A record's key: its id qualified by the section that seats it. */
export const agencyKey = (record) => `${record.sectionPath}#${record.id}`;

/** Read every agency pool under `root` into one registry, each pool keyed by section-qualified
 *  id. Records name one another by plain id; `resolve` reads such a name from the referring
 *  record's section outward. The same id seated in two sections is kept in both and listed in
 *  `shared`. A source a governing act reached reads as the head of its act chain (./acts.mjs);
 *  the acts come from the process's configured act log unless given. The registry's `revision` is a
 *  digest of its records' revisions, equal across reads of unchanged records. */
/**
 * The fields by which a record would name the model, harness or worker that serves it. An office,
 * enterprise, duty, work or skill never names one: its carrier is derived from the house's own outcomes
 * (organizing/work/staffing), and a record naming one is a problem on the registry.
 */
export const CARRIER_PRESCRIPTIONS = Object.freeze(["service-carrier", "model", "models", "carrier", "harness", "harnessModels", "provider", "effort", "reasoningEffort"]);

/** The pools whose records are work or the offices that do it; a character's model is its identity, so characters are not here. */
export const CARRIER_PRESCRIBING_POOLS = Object.freeze(["offices", "enterprises", "duties", "works", "skills"]);

/** The carrier fields a record prescribes, at its top level or inside a nested `x-agent` hint object. */
export function prescribedCarrier(pool, record) {
  if (!CARRIER_PRESCRIBING_POOLS.includes(pool) || !record || typeof record !== "object") return [];
  const nested = record["x-agent"] && typeof record["x-agent"] === "object" ? record["x-agent"] : {};
  return [
    ...CARRIER_PRESCRIPTIONS.filter((field) => record[field] !== undefined),
    ...CARRIER_PRESCRIPTIONS.filter((field) => nested[field] !== undefined).map((field) => `x-agent.${field}`),
  ];
}

/** Where the house's agency records are read from for a process at `from` (a file or directory):
 *  METROPLAT_AGENCY_ROOT when set, else the `lib` of the repository `from` sits in. */
export function agencyRootFrom(from, environment = process.env) {
  if (environment.METROPLAT_AGENCY_ROOT) return environment.METROPLAT_AGENCY_ROOT;
  for (let dir = path.resolve(from); dir !== path.dirname(dir); dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, ".git"))) return path.join(dir, "lib");
  }
  throw new Error(`no repository holds ${from}, and METROPLAT_AGENCY_ROOT is unset`);
}

/** The registry under `root`, read whole. `pools` spares the walk where the caller already knows
 *  where the pools sit (a held registry does: see ./held.mjs). */
export function readAgency(root, { acts = readAgencyActs(agencyActsLog()), pools = agencyPools(root) } = {}) {
  const registry = Object.fromEntries(AGENCY_POOLS.map((pool) => [pool, new Map()]));
  const problems = [];
  const authored = (source) => {
    try { return readFileSync(path.resolve(root, source)); } catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
  };
  const { heads, stale } = foldAgencyActs(acts, authored);
  const seen = new Set();
  const namespaces = new Set([""]);
  const place = ({ pool, id, section, sectionPath, source, bytes }) => {
    let raw;
    try { raw = parseRecord(source, bytes.toString("utf8")); } catch (error) { problems.push({ file: source, reason: error.message }); return; }
    if (raw["formed-from"] !== undefined) { problems.push({ file: source, reason: "retired form binding: author the office or duty obligation directly" }); return; }
    const prescribed = prescribedCarrier(pool, raw);
    if (prescribed.length > 0) {
      problems.push({ file: source, reason: `names who does its work (${prescribed.join(", ")}); staffing is derived, never authored` });
    }
    if (pool === "masks" && MASK_KINDS[raw?.kind ?? "persona"]?.derived !== false) {
      problems.push({ file: source, reason: `a ${raw?.kind} mask is ${MASK_KINDS[raw?.kind] ? "derived, never authored" : "of no known kind"}` });
    }
    if (pool === "organs") {
      const stray = Object.keys(raw?.handedness ?? {}).filter((c) => !["recv", "send", "actuate", "observe"].includes(c));
      if (stray.length > 0) problems.push({ file: source, reason: `an organ's handedness has only recv, send, actuate and observe (not ${stray.join(", ")})` });
    }
    if (pool === "bodies" && BODY_KINDS[raw?.kind] === undefined) problems.push({ file: source, reason: `a body of no known kind (${raw?.kind}); kinds: ${Object.keys(BODY_KINDS).join(", ")}` });
    const record = { ...normalize(pool, id, raw), authored: raw, revision: revisionOf(bytes), section, sectionPath, source };
    record.key = agencyKey(record);
    registry[pool].set(record.key, Object.freeze(record));
  };
  for (const { pool, section, sectionPath, dir } of pools) {
    namespaces.add(sectionPath);
    for (const { id, file } of recordFiles(dir)) {
      const source = path.relative(root, file).split(path.sep).join("/");
      seen.add(source);
      const head = heads.get(source);
      place({ pool, id, section, sectionPath, source, bytes: head === undefined ? readFileSync(file) : Buffer.from(head.text) });
    }
  }
  // An act that seats a record no authored file holds yet.
  for (const [source, head] of heads) {
    if (seen.has(source)) continue;
    const { pool, id, section: sectionPath } = head.act;
    place({ pool, id, section: path.posix.basename(sectionPath), sectionPath, source, bytes: Buffer.from(head.text) });
  }
  // A duty and the work it is owed toward are one record read two ways: the deontic position and its
  // closure type. A duty carrying its closure is read as a work under its own key as well; an authored
  // work under that key besides is the same work said twice, a registry problem, never two records.
  for (const duty of registry.duties.values()) {
    const effective = duty.effective ?? duty.authored;
    const closure = closureOf(effective);
    if (closure === undefined) continue;
    const key = `${duty.sectionPath}#${duty.work}`;
    if (registry.works.has(key)) { problems.push({ file: duty.source, reason: `carries the closure of work ${duty.work}, which ${registry.works.get(key).source} also authors: one work, one record` }); continue; }
    const authored = Object.fromEntries(Object.entries({ id: duty.work, name: duty.name, from: closure.from, to: closure.to, cost: closure.cost, otherwise: closure.otherwise, needs: effective.needs, "required-capabilities": effective["required-capabilities"], "allowed-effects": effective["allowed-effects"] }).filter(([, value]) => value !== undefined));
    const work = { ...normalize("works", duty.work, authored), authored, revision: duty.revision, section: duty.section, sectionPath: duty.sectionPath, source: duty.source, derivedFrom: duty.key };
    work.key = key;
    registry.works.set(key, Object.freeze(work));
  }
  // A character that names its office seats itself there by that record.
  for (const character of registry.characters.values()) {
    for (const office of character.office) {
      const record = { id: `${character.id}-as-${office}`, office, holder: character.id, recognition: "t", induction: "t", section: character.section, sectionPath: character.sectionPath, source: character.source };
      record.key = agencyKey(record);
      if (!registry.incumbencies.has(record.key)) registry.incumbencies.set(record.key, Object.freeze(record));
    }
  }
  const byId = Object.fromEntries(AGENCY_POOLS.map((pool) => {
    const index = new Map();
    for (const record of registry[pool].values()) index.set(record.id, [...(index.get(record.id) ?? []), record]);
    return [pool, index];
  }));
  // Each discovered agency pool establishes a namespace. A reference relative to such a root
  // addresses the very same seated record. Ambiguous references establish no office identity.
  const officeReferences = new Map();
  for (const office of registry.offices.values()) {
    for (const namespace of namespaces) {
      if (namespace !== "" && office.sectionPath !== namespace && !office.sectionPath.startsWith(`${namespace}/`)) continue;
      const section = namespace === "" ? office.sectionPath : office.sectionPath.slice(namespace.length + (office.sectionPath === namespace ? 0 : 1));
      const ref = `${section}#${office.id}`;
      if (!officeReferences.has(ref)) officeReferences.set(ref, office);
      else if (officeReferences.get(ref)?.key !== office.key) officeReferences.set(ref, undefined);
    }
  }
  // A moved office declares the addresses it was seated at before (`supersedes`): a reference told
  // against a former address, as a runtime claim keeps it, reaches the successor. Declared, never
  // guessed from a basename; a former address two offices declare reaches neither.
  for (const office of registry.offices.values()) {
    for (const former of strings(office.supersedes)) {
      officeReferences.set(former, officeReferences.has(former) && officeReferences.get(former)?.key !== office.key ? undefined : office);
    }
  }
  // An exact registry key always denotes its own record, even if a relative spelling collides.
  for (const [key, office] of registry.offices) officeReferences.set(key, office);
  const sections = new Set(AGENCY_POOLS.flatMap((pool) => [...registry[pool].values()].map((record) => record.sectionPath)));
  const shared = AGENCY_POOLS.flatMap((pool) => [...byId[pool]].filter(([, records]) => records.length > 1).map(([id, records]) => ({ pool, id, sections: records.map((r) => r.section) })));
  // The registry's content identity: every placed record's pool, key and carrier revision, and every
  // unreadable source. Two reads of unchanged records carry the same revision.
  const revision = revisionOf(Buffer.from(JSON.stringify([root, [...namespaces].sort(),
    AGENCY_POOLS.flatMap((pool) => [...registry[pool].values()].filter((record) => record.revision !== undefined).map((record) => `${pool}\0${record.key}\0${record.revision}`)).sort(),
    problems.map(({ file, reason }) => `${file}\0${reason}`).sort()])));
  return Object.freeze({ kind: "organizing.agency", root, revision, ...registry, byId, sections, officeReferences, shared: Object.freeze(shared), problems: Object.freeze(problems),
    governed: Object.freeze([...heads.keys()]), staleActs: stale,
    /** A source's current carrier text: its act chain's head, else its authored file. */
    carrier: (source) => heads.get(source)?.text ?? readFileSync(path.resolve(root, source), "utf8") });
}

/** Read a plain-id reference from `fromSectionPath` outward: the record seated in the same
 *  section, else in the nearest enclosing section, else the only record with that id. A key
 *  (`section#id`) resolves directly. Office keys additionally resolve relative to discovered
 *  agency namespaces; an unknown qualified office never gains authority through its basename.
 *  Other descriptive pools retain plain-id lookup for an absent historical section. */
export function resolve(agency, pool, ref, fromSectionPath = "") {
  if (ref === undefined) return undefined;
  if (ref.includes("#")) {
    // Office authority follows seated records and declared namespaces, never a guessed basename
    // of a vanished or unregistered section. Other descriptive pools retain their historical lookup.
    if (pool === "offices") return agency.offices.get(ref) ?? agency.officeReferences?.get(ref);
    const keyed = agency[pool].get(ref);
    const [sectionPath, id] = ref.split("#");
    if (keyed !== undefined || agency.sections?.has(sectionPath)) return keyed;
    const moved = agency.byId[pool].get(id) ?? [];
    return moved.length === 1 ? moved[0] : undefined;
  }
  const candidates = agency.byId[pool].get(ref) ?? [];
  if (candidates.length <= 1) return candidates[0];
  const enclosing = candidates.filter((c) => fromSectionPath === c.sectionPath || fromSectionPath.startsWith(`${c.sectionPath}/`));
  if (enclosing.length > 0) return enclosing.sort((a, b) => b.sectionPath.length - a.sectionPath.length)[0];
  return undefined;
}

/** Institutional player identity for comparison only; account and external names stay exact.
 * Unresolved historical office values remain intact, without guessed succession or authority. */
export function canonicalPlayer(agency, player) {
  return typeof player === "string" && player.includes("#") ? resolve(agency, "offices", player)?.key ?? player : player;
}

const SETTLEMENT = Object.freeze({ t: "potential", true: "potential", held: "potential", f: "active", false: "active", denied: "active", b: "stable", both: "stable", contested: "stable" });
const settled = (value) => SETTLEMENT[String(value ?? "").toLowerCase()] ?? "absurd";
const seatState = (incumbency) => incumbencyState(settled(incumbency.recognition), settled(incumbency.induction));

/** An incumbency read as a seat: the office it seats (resolved from its section) and its state. */
export const seatOf = (agency, incumbency) => Object.freeze({ office: seatedOffice(agency, incumbency)?.key, state: seatState(incumbency) });

/** The office an incumbency seats, resolved from the incumbency's section. */
const seatedOffice = (agency, incumbency) => resolve(agency, "offices", incumbency.office, incumbency.sectionPath);

/** Every recorded seat of an office (key or plain id) with its incumbency state. */
export function incumbenciesOf(agency, officeRef) {
  const office = resolve(agency, "offices", officeRef);
  if (office === undefined) return [];
  return [...agency.incumbencies.values()]
    .filter((i) => seatedOffice(agency, i)?.key === office.key)
    .map((i) => Object.freeze({ holder: i.holder, state: seatState(i), recognition: settled(i.recognition), induction: settled(i.induction), source: i.source }));
}

/** The bearers an account is a hand of: each character an authored organ whose `account` is that
 *  account names as `of` (or the name as authored, when no character holds it), and the body whose
 *  own address the account is. A signed-in account acts for its bearer as a harness session acts for
 *  its character: the seat is the bearer's, the account only its organ (./organs.mjs). A constituted
 *  actor (a character whose id is the account the platform authenticates) and a micro-enterprise
 *  playing under its own id are their own hands, so they need no organ record. Indexed once per
 *  registry. */
const handIndex = new WeakMap();
export function bearersHandedBy(agency, account) {
  let index = handIndex.get(agency);
  if (index === undefined) {
    index = new Map();
    for (const organ of agency.organs.values()) {
      if (typeof organ.account !== "string") continue;
      const bearers = organ.of.map((of) => resolve(agency, "characters", of, organ.sectionPath)?.id ?? of);
      index.set(organ.account, [...new Set([...(index.get(organ.account) ?? []), ...bearers])]);
    }
    for (const body of [...agency.characters.values(), ...agency.enterprises.values()]) {
      if (typeof body.id === "string") index.set(body.id, [...new Set([...(index.get(body.id) ?? []), body.id])]);
    }
    handIndex.set(agency, index);
  }
  return Object.freeze([...(index.get(account) ?? [])]);
}

/** The registry with told seats folded in: incumbency claims (`{ office, incumbent, predicate:
 *  "recognition" | "induction", reading }`, as a platform admits them at runtime) are the same
 *  recognition × induction testimony an authored incumbency records, so they seat through the same
 *  reading rather than a second store. Each (office, incumbent) becomes one seat whose recognition and
 *  induction are the told readings joined: held and denied both told is contested (⊤, held, never
 *  exploded). A claim naming no office the registry holds seats nothing; one told for an account that is
 *  the hand of exactly one bearer seats that bearer. Held per registry and claims. */
const seatedViews = new WeakMap();
export function withSeatClaims(agency, claims) {
  if (claims.length === 0) return agency;
  const held = seatedViews.get(agency);
  if (held?.claims === claims) return held.view;
  const told = new Map();
  for (const claim of claims) {
    const office = resolve(agency, "offices", claim.office);
    if (office === undefined || (claim.predicate !== "recognition" && claim.predicate !== "induction")) continue;
    const hands = bearersHandedBy(agency, claim.incumbent), holder = hands.length === 1 ? hands[0] : claim.incumbent;
    const key = `claim:${office.key}:${holder}`;
    const seat = told.get(key) ?? { office: office.key, holder, recognition: new Set(), induction: new Set() };
    seat[claim.predicate].add(settled(claim.reading));
    told.set(key, seat);
  }
  // The told readings joined in the knowledge order, named as claim readings are.
  const reading = (sides) => readingAs("extremal", knowledgeJoinAll([...sides], "knowledge"));
  const incumbencies = new Map(agency.incumbencies);
  for (const [key, seat] of told) {
    incumbencies.set(key, Object.freeze({ key, id: key, name: key, office: seat.office, holder: seat.holder, sectionPath: "",
      recognition: reading(seat.recognition), induction: reading(seat.induction), source: "told:office-incumbency-claim" }));
  }
  const view = Object.freeze({ ...agency, incumbencies });
  seatedViews.set(agency, { claims, view });
  return view;
}

/** Where a told hand comes from: an organ a platform admitted at runtime, not one the registry authors. */
export const TOLD_HAND = "told:character-mask";

/** The registry with told hands folded in: a platform's testimony that an account (a harness session,
 *  a signed-in client) is a hand of a character (`{ account, character, reading }`, as MetroPlat admits
 *  them in its `character-masks` feed) is the same relation an authored organ records, so it hands
 *  through the same `bearersHandedBy` rather than a second index. Each (account, character) pair is
 *  settled over its told readings: it hands only while it is told held and never told denied (a
 *  withdrawn session is a denied testimony). Told hands come before authored ones, so an account's
 *  authored associations for each testified pair are replaced, so withdrawal cannot fall
 *  back to an authored alias. Unmentioned pairs remain intact. Held per registry and testimony. */
const handedViews = new WeakMap();
export function withToldHands(agency, testimony) {
  if (testimony.length === 0) return agency;
  const held = handedViews.get(agency);
  if (held?.testimony === testimony) return held.view;
  const characterKey = (ref, sectionPath = "") => resolve(agency, "characters", ref, sectionPath)?.key ?? ref;
  const sides = new Map();
  for (const told of testimony) {
    const key = JSON.stringify([told.account, characterKey(told.character)]);
    sides.set(key, [...(sides.get(key) ?? []), readingAs("extremal", told.reading)]);
  }
  const organs = new Map();
  for (const [key, told] of sides) {
    if (!told.includes("held") || told.includes("denied") || told.includes("contested")) continue;
    const [account, characterRef] = JSON.parse(key);
    const record = resolve(agency, "characters", characterRef);
    const character = record?.sectionPath ? record.key : record?.id ?? characterRef;
    const id = `told:${account}:${character}`;
    organs.set(id, Object.freeze({ key: id, id, name: id, of: Object.freeze([character]), platform: account.split(":")[0], account, handedness: Object.freeze({ recv: "potential", send: "potential" }), sectionPath: "", source: TOLD_HAND }));
  }
  // Runtime testimony governs the specific account/bearer relation, including
  // withdrawal and contradiction. Authored topology must not resurrect it.
  for (const [key, organ] of agency.organs) {
    const of = organ.of.filter((ref) => !sides.has(JSON.stringify([organ.account, characterKey(ref, organ.sectionPath)])));
    if (of.length === 0) continue;
    organs.set(key, of.length === organ.of.length ? organ : Object.freeze({ ...organ, of: Object.freeze(of) }));
  }
  const view = Object.freeze({ ...agency, organs });
  handedViews.set(agency, { testimony, view });
  return view;
}

/** The bearers a told hand (not an authored organ) makes `account` a hand of. */
export const toldBearersOf = (agency, account) => Object.freeze([...new Set([...agency.organs.values()]
  .filter((organ) => organ.source === TOLD_HAND && organ.account === account).flatMap((organ) => organ.of))]);

/** Whether some told hand makes `bearer` a hand's bearer: a character a connected account carries. */
export const isToldBearer = (agency, bearer) => [...agency.organs.values()].some((organ) => organ.source === TOLD_HAND && organ.of.includes(bearer));

/** A body record (the `bodies` pool, or an `enterprises` record read as a micro-enterprise) and its kind. */
export function bodyOf(agency, bodyRef, fromSectionPath = "") {
  const body = resolve(agency, "bodies", bodyRef, fromSectionPath);
  if (body !== undefined) return { body, kind: body.kind };
  const enterprise = resolve(agency, "enterprises", bodyRef, fromSectionPath);
  return enterprise === undefined ? undefined : { body: enterprise, kind: "micro-enterprise" };
}

/** A body's members, each read by its kind's recognition regime (./kinds.mjs) as a FOUR value:
 *  `potential` recognized, `active` withdrawn, expelled or dissolved, `stable` both told (held, never
 *  exploded), `absurd` unknown. A micro-enterprise or polity reads its members off the seats of its
 *  offices (dignitas recognizes, a failed seat denies, a seat under repair is both); the other kinds
 *  close `recognized-by` from their seeds. A band's records seed nothing: kin are recognized by living
 *  kin, never by a record, so a record describes a band's members only as unknown or withdrawn. */
export function bodyMembers(agency, bodyRef, fromSectionPath = "") {
  const found = bodyOf(agency, bodyRef, fromSectionPath);
  const regime = found && BODY_KINDS[found.kind];
  if (regime === undefined) return Object.freeze([]);
  const { body, kind } = found;
  const told = new Map();
  const tell = (who, forTold, againstTold, via) => {
    const prior = told.get(who) ?? { for: false, against: false, via: [] };
    told.set(who, { for: prior.for || forTold, against: prior.against || againstTold, via: via === undefined ? prior.via : [...prior.via, via] });
  };
  if (regime.recognizes === "offices") {
    const seat = body.seat ?? body.sectionPath;
    const offices = kind === "micro-enterprise"
      ? strings(body.authored.offices).map((id) => resolve(agency, "offices", id, body.sectionPath)).filter(Boolean)
      : [...agency.offices.values()].filter((office) => seat === "" || office.sectionPath === seat || office.sectionPath.startsWith(`${seat}/`));
    for (const office of offices) {
      for (const s of incumbenciesOf(agency, office.key)) tell(s.holder, s.state === "dignitas" || s.state === "repair", s.state === "failed" || s.state === "repair", office.key);
    }
  } else {
    const seeds = regime.fromRecords ? regime.seeds.flatMap((field) => field === "members" ? body.members.map((m) => m.who) : strings(body[field])) : [];
    const recognized = new Set(seeds);
    for (let grown = regime.fromRecords; grown;) {
      grown = false;
      for (const m of body.members) if (!recognized.has(m.who) && m.recognizedBy.some((r) => recognized.has(r))) { recognized.add(m.who); grown = true; }
    }
    for (const who of new Set([...seeds, ...body.members.map((m) => m.who)])) {
      tell(who, recognized.has(who) && !body.closed, body.members.some((m) => m.who === who && m.withdrawn) || body.closed);
    }
  }
  return Object.freeze([...told].map(([who, t]) => Object.freeze({ who, reading: readingOfSides("knowledge", t.for, t.against), via: Object.freeze(t.via) })));
}

/** The bodies (keys) a bearer is a recognized member of. */
export function bodiesOf(agency, bearer) {
  return [...agency.bodies.values(), ...agency.enterprises.values()]
    .filter((body) => bodyMembers(agency, body.key).some((m) => m.who === bearer && m.reading === "potential"))
    .map((body) => body.key);
}

/** Who bears a body's head: its `head` when that names a character, or every holder at dignitas of the
 *  office it names (a polity's head is its apex office, borne by whoever is seated there). */
export function headsOf(agency, body) {
  if (body.head === undefined) return [];
  const office = resolve(agency, "offices", body.head, body.sectionPath);
  if (office === undefined) return [body.head];
  return incumbenciesOf(agency, office.key).filter((seat) => seat.state === "dignitas").map((seat) => seat.holder);
}

/** The offices (keys) a holder holds at dignitas by the records. */
export function officesOf(agency, holder) {
  return [...new Set([...agency.incumbencies.values()]
    .filter((i) => i.holder === holder && seatState(i) === "dignitas")
    .map((i) => seatedOffice(agency, i)?.key)
    .filter(Boolean))];
}

/** An office read through the chain: its duties, their works, the skills it provides or its
 *  duties need, the verbs those skills require, where it stands in the authority tree, and its
 *  seats. References resolve from the office's section; unresolved ones are listed. */
export function officeReading(agency, officeRef) {
  const office = resolve(agency, "offices", officeRef);
  if (office === undefined) return Object.freeze({ kind: "organizing.agency.office-obstruction", office: officeRef, reason: (agency.byId.offices.get(officeRef)?.length ?? 0) > 1 ? "ambiguous: seated in several sections" : "no such office" });
  const at = office.sectionPath;
  const unresolved = [];
  const find = (pool, id, tag) => resolve(agency, pool, id, at) ?? (unresolved.push(`${tag}:${id}`), undefined);
  const duties = office.bearsDuty.map((id) => find("duties", id, "duty") ?? { id, work: undefined, claim: undefined, delegation: false, skills: [], requiredCapabilities: [], recorded: false });
  const works = duties.map((d) => d.work && find("works", d.work, "work")).filter(Boolean);
  const skillIds = [...new Set([...office.providesSkill, ...duties.flatMap((d) => d.skills), ...works.flatMap((w) => w.needs)])];
  const skills = skillIds.map((id) => find("skills", id, "skill")).filter(Boolean);
  const verbs = [...new Set(skills.flatMap((s) => s.requiresCapabilities))].sort();
  const capabilities = [...new Set([...duties.flatMap((d) => d.requiredCapabilities), ...works.flatMap((w) => w.requiredCapabilities)])].sort();
  const chain = [];
  for (let up = resolve(agency, "offices", office.reportsTo, at); up !== undefined && !chain.includes(up.key); up = resolve(agency, "offices", up.reportsTo, up.sectionPath)) chain.push(up.key);
  const relationships = Object.fromEntries(["reports-to", "presides-over", "peer-offices", "served-by"].map((relation) => [relation,
    strings((office.effective ?? office.authored)[relation]).map((id) => {
      const related = find("offices", id, relation);
      return related ? { office: related.key, id: related.id, source: related.source, revision: related.revision } : { id, unresolved: true };
    })]));
  const powerRecords = office.powers.map((id) => find("deontic-powers", id, "power")).filter(Boolean);
  return Object.freeze({
    kind: "organizing.agency.office",
    authored: office.authored,
    source: office.source,
    revision: office.revision,
    jurisdiction: office.jurisdiction,
    authorityScope: office.authorityScope,
    normativeStructure: office.normativeStructure,
    deonticProfile: office.deonticProfile,
    charter: office.charter,
    serves: office.serves,
    servedBy: office["served-by"],
    serviceOfferings: office["service-offerings"],
    governanceContract: office["governance-contract"],
    office: office.key,
    id: office.id,
    name: office.name,
    section: office.section,
    duties: Object.freeze(duties.map((d) => ({ ...d, recorded: d.recorded !== false }))),
    dutyClaims: office.dutyClaims,
    powers: office.powers,
    powerRecords: Object.freeze(powerRecords),
    relationships: Object.freeze(relationships),
    immunities: office.immunities,
    liberties: office.liberties,
    authority: office.authority,
    peers: office.peers,
    replacesOffice: Object.freeze([...(office.replacesOffice ?? [])]),
    works: Object.freeze(works.map((w) => ({ ...w }))),
    skills: Object.freeze(skills.map((s) => ({ ...s, requires: s.requiresCapabilities }))),
    verbs: Object.freeze(verbs),
    capabilities: Object.freeze(capabilities),
    reportsTo: Object.freeze(chain),
    presidesOver: office.presidesOver,
    seats: Object.freeze(incumbenciesOf(agency, office.key)),
    unresolved: Object.freeze([...new Set(unresolved)]),
  });
}

/** The organisational form's position-permission cost ρ*: the unit when an office one of
 *  `holders` holds at dignitas has a skill requiring `verb`, the quantale's top (forbidden)
 *  otherwise. */
export function positionCost(agency, holders, verb, Q = costQuantale) {
  const offices = holders.flatMap((h) => officesOf(agency, h));
  return offices.some((o) => officeReading(agency, o).verbs?.includes(verb)) ? Q.unit : Q.top;
}

/** The agency read as a governance: sections and offices as collectives (an office is part of
 *  its section, a section of the nearest section enclosing it), incumbents at dignitas as
 *  members, and each office's duties as a norm binding its members to their work. */
export function governanceOf(agency) {
  const sectionPaths = new Set(AGENCY_POOLS.flatMap((pool) => [...agency[pool].values()].map((r) => r.sectionPath)));
  const parentOf = (sp) => {
    const parts = sp.split("/").slice(0, -1);
    for (; parts.length > 0; parts.pop()) if (sectionPaths.has(parts.join("/"))) return parts.join("/");
    return undefined;
  };
  const collectives = [...sectionPaths].map((sp) => ({ id: `section:${sp}`, members: [], partOf: parentOf(sp) ? [`section:${parentOf(sp)}`] : [] }));
  const norms = [];
  for (const office of agency.offices.values()) {
    const members = incumbenciesOf(agency, office.key).filter((s) => s.state === "dignitas").map((s) => s.holder);
    collectives.push({ id: office.key, members, partOf: [`section:${office.sectionPath}`] });
    norms.push({
      id: `${office.key}:duties`,
      of: office.key,
      binds: office.bearsDuty.map((d) => ({ constraint: { require: resolve(agency, "duties", d, office.sectionPath)?.work ?? d } })),
    });
  }
  // Each body (and each micro-enterprise) is a collective of its recognized members, part of its section
  // and of the bodies it names; a body naming an unknown body stays part of its section alone.
  const bodies = [...agency.bodies.values(), ...agency.enterprises.values()];
  const bodyIds = new Map(bodies.map((body) => [body.key, `body:${body.key}`]));
  for (const body of bodies) {
    const members = bodyMembers(agency, body.key).filter((m) => m.reading === "potential").map((m) => m.who);
    const parts = strings(body.partOf ?? body.authored["part-of"]).map((ref) => bodyOf(agency, ref, body.sectionPath)?.body.key).filter((key) => bodyIds.has(key));
    collectives.push({ id: bodyIds.get(body.key), members, partOf: [`section:${body.sectionPath}`, ...parts.map((key) => bodyIds.get(key))] });
  }
  // Each rule's subject pattern is a collective its norm binds (members are whoever acts under it).
  const rules = ruleNorms(agency);
  for (const of of new Set(rules.map((norm) => norm.of))) collectives.push({ id: of, members: [] });
  return governance({ collectives, norms: [...norms, ...rules] });
}

/** A reading of the registry as it stands: what is seated, vacant, without verbs, unresolved,
 *  or seated under one id in several sections. */
export function agencyCensus(agency) {
  const offices = [...agency.offices.keys()].map((key) => officeReading(agency, key));
  return Object.freeze({
    kind: "organizing.agency.census",
    counts: Object.fromEntries(AGENCY_POOLS.map((pool) => [pool, agency[pool].size])),
    sections: [...new Set(AGENCY_POOLS.flatMap((pool) => [...agency[pool].values()].map((r) => r.section)))].sort(),
    seatedOffices: offices.filter((o) => o.seats.some((s) => s.state === "dignitas")).map((o) => o.office),
    vacantOffices: offices.filter((o) => !o.seats.some((s) => s.state === "dignitas")).map((o) => o.office),
    officesWithoutVerbs: offices.filter((o) => o.verbs.length === 0).map((o) => o.office),
    unresolved: offices.filter((o) => o.unresolved.length > 0).map((o) => ({ office: o.office, unresolved: o.unresolved })),
    shared: agency.shared,
    problems: agency.problems,
  });
}

/** The office relationships and declared jurisdiction under which results may
 * be received. This is organizational authority, not a process appointment or
 * an operation grant: consumers must still verify the holder and required verb.
 * Assignment keeps its explicitly related offices. Receiving also includes the
 * offices inside the receiver's authored authority scope, excluding itself, and,
 * for an office whose standing charge is to verify (`verifies`: one of the work
 * arena's four roles), every other office of its own in the enterprises that list it: whom a
 * verifier receives from is read off the enterprise it serves, never amended in by
 * an office above it. A distinct session still receives (no bearer accepts its own
 * delivery); that is the receiving path's, not the boundary's. */
const coordinationBoundaries = new WeakMap();
export function officeCoordinationBoundary(agency, officeRef) {
  const office = resolve(agency, "offices", officeRef);
  if (office === undefined) throw new TypeError("office service: office is absent or ambiguous");
  const held = coordinationBoundaries.get(agency) ?? new Map();
  coordinationBoundaries.set(agency, held);
  if (held.has(office.key)) return held.get(office.key);
  const spelled = candidate => resolve(agency, "offices", candidate.id)?.key === candidate.key ? candidate.id : candidate.key;
  const named = new Set([...office.peers, ...office.presidesOver]
    .map(ref => resolve(agency, "offices", ref, office.sectionPath)?.key).filter(Boolean));
  const offices = [...agency.offices.values()];
  const related = offices.filter(candidate => named.has(candidate.key)
    || officeReading(agency, candidate.key).reportsTo?.includes(office.key));
  // Scope is a canonical section path, not a substring, glob or inferred title.
  const sectionPath = scope => {
    if (typeof scope !== "string") return undefined;
    const value = scope.replace(/^lib\//u, "").replace(/\/+$/u, "");
    if (value === "" || value.startsWith("/") || value.includes("\\") || value.includes("#")
      || value.split("/").some(part => part === "" || part === "." || part === "..")) return undefined;
    return value;
  };
  const scopes = (office.authorityScope ?? []).map(sectionPath).filter(Boolean);
  const scoped = offices.filter(candidate => candidate.key !== office.key && scopes.some(scope => {
    const section = sectionPath(candidate.sectionPath);
    return section === scope || section?.startsWith(`${scope}/`) === true;
  }));
  // A verifier serves its enterprises' deliveries: it receives from their other own offices (those
  // seated in the enterprise's own section; an office listed from a wider section answers to that one).
  const ownSection = (candidate, enterprise) => candidate.sectionPath === enterprise.sectionPath || candidate.sectionPath.startsWith(`${enterprise.sectionPath}/`);
  const served = typeof office.authored?.verifies === "string"
    ? [...agency.enterprises.values()].map(enterprise => (enterprise.authored?.offices ?? []).map(ref => resolve(agency, "offices", ref, enterprise.sectionPath))
      .filter(candidate => candidate !== undefined && ownSection(candidate, enterprise)))
      .filter(listed => listed.some(candidate => candidate.key === office.key)).flat().filter(candidate => candidate.key !== office.key)
    : [];
  // A predecessor office remains historical and absent from the registry. Its identity may
  // cross only a receiving comparison through an explicitly authored current successor.
  // Assignment, staffing, authority and source provenance continue to use current offices only.
  const historical = candidate => (candidate.replacesOffice ?? []).flatMap(ref => ref.includes("#")
    ? [ref]
    : [ref, `${candidate.sectionPath}#${ref}`]);
  const neighbours = Object.freeze(related.map(spelled).sort());
  const boundary = Object.freeze({
    office: spelled(office), officeKey: office.key,
    receivesFrom: Object.freeze([...new Set([...related, ...scoped, ...served]
      .flatMap(candidate => [spelled(candidate), ...historical(candidate)]))].sort()),
    assignsTo: neighbours,
    verbs: officeReading(agency, office.key).verbs,
  });
  held.set(office.key, boundary);
  return boundary;
}
