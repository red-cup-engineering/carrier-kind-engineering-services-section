/**
 * @red-cup-engineering/knowing/dreaming/nightly — the node's nightly finite dream, as ports.
 *
 * Once a night the finite corner re-reads the settled records admitted since the last dream and
 * lands each latent cell it finds as an unsettled opening for the office that owns it. The dream
 * itself (`latentCellDream`) is pure; this module holds what surrounds it: the I/O pressure check,
 * the cursor-bounded window, the proposal identity, suppression against the board, the caps, and
 * the run record. Every effect goes through a port the entry script binds to the node, so the run
 * holds no section's data, name or brand: sections, offices and thresholds are parameters.
 */

import { createHash } from "node:crypto";

/** The exit status of a night skipped for pressure or refused for its width: a temporary failure. */
export const temporaryFailure = 75;

/** The ten-second average of "some" I/O pressure, read from a `/proc/pressure/io` text. */
export function ioPressureOf(text) {
  const match = /^some\b.*\bavg10=([0-9.]+)/mu.exec(String(text));
  if (match === null) throw new TypeError("io pressure: no \"some avg10\" line");
  return Number(match[1]);
}

/**
 * The memory terms admitted after `cursor`, read through the node's settled-record reader once per
 * record class, never by listing a directory. `read({ recordClass, after, through, limit })` answers
 * `{ records }`, each record `{ admission, section, term, topics }` in admission order. A window
 * wider than `maxTerms` is refused with the admission it should be narrowed through.
 */
export async function windowOfSettledRecords({ cursor = null, through = null, recordClasses, sections = [], maxTerms, read }) {
  const records = [];
  let bytesRead = 0;
  for (const recordClass of recordClasses) {
    const answer = await read({ recordClass, after: cursor, through, limit: maxTerms + 1 });
    bytesRead += Buffer.byteLength(JSON.stringify(answer));
    for (const record of answer.records) {
      if (sections.length === 0 || sections.includes(record.section)) records.push(record);
    }
  }
  records.sort((left, right) => compareAdmission(left.admission, right.admission));
  if (records.length > maxTerms) {
    return Object.freeze({ refused: true, termsRead: records.length, bytesRead, narrowThrough: records[maxTerms - 1].admission, terms: Object.freeze([]) });
  }
  return Object.freeze({
    refused: false,
    termsRead: records.length,
    bytesRead,
    last: records.length === 0 ? cursor : records[records.length - 1].admission,
    terms: Object.freeze(records),
  });
}

/** A proposal's identity: the content address of its agent, predicate and topic (R13). */
export function proposalIdentity(proposal) {
  const { subject, predicate, object } = proposal.task;
  return `sha256:${sha256(canonical([subject, predicate, object]))}`;
}

/** The content address of a proposal's witness terms: the opening's `source`. */
export function witnessAddress(witnesses) {
  return `sha256:${sha256(canonical([...witnesses].map(canonical).sort()))}`;
}

/** A short content key of one witness term, as an opening's context carries it on the board. */
export function witnessKey(term) {
  return sha256(canonical(term)).slice(0, 16);
}

/** How many witness keys an opening carries: enough to judge a new witness, inside the board's 4000-character context. */
const maxWitnessKeys = 150;

/** The witness terms a latent-cell proposal carries in its note, after its regime and support marks. */
export function witnessesOf(proposal) {
  return proposal.note.slice(4);
}

/**
 * The owning section of a proposal: the lowest section containing all its witness terms' sections
 * (sections are slash paths, outermost first). No common section leaves the proposal unowned.
 */
export function owningSection(sectionsOfWitnesses) {
  const paths = [...new Set(sectionsOfWitnesses)].map((section) => section.split("/").filter(Boolean));
  if (paths.length === 0) return null;
  const common = [];
  for (let index = 0; paths.every((path) => index < path.length && path[index] === paths[0][index]); index++) common.push(paths[0][index]);
  return common.length === 0 ? null : common.join("/");
}

/** The tag every dream opening carries, so the board's `work-board` reader can list them by `tag`. */
export const dreamTag = "nightly-dream";

/** The tag naming one proposal's identity on the board (a lowercase slug, as the board requires). */
export function identityTag(identity) {
  return `dream-${identity.replace(/^sha256:/u, "")}`;
}

/** The standings of an `ask` thread that close it without the dream's question still open. */
const closedStandings = Object.freeze(["answered", "accepted", "withdrawn", "superseded"]);

/**
 * The dream's openings as the board holds them, read from whole `ask` threads of `work-board`
 * (`{ kind: "ask", tag: dreamTag, full: true }`): each one's identity, standing and witnesses.
 */
export function openingsOfBoard(threads) {
  return Object.freeze(threads.flatMap((thread) => {
    const tag = (thread.opening?.tags ?? []).find((each) => each.startsWith("dream-"));
    if (tag === undefined) return [];
    let witnesses = [];
    try { witnesses = JSON.parse(thread.opening.context ?? "{}").witnesses ?? []; } catch { witnesses = []; }
    return [Object.freeze({ thread: thread.id, identity: `sha256:${tag.slice("dream-".length)}`, standing: thread.standing, witnesses })];
  }));
}

/**
 * Whether a proposal is suppressed by an opening already on the board (R13, R14): an open one
 * always; one the owning office has answered, or that was withdrawn or superseded, until a witness
 * term appears that it did not carry.
 */
export function suppressionOf(proposal, openings) {
  const identity = proposalIdentity(proposal);
  const prior = openings.filter((opening) => opening.identity === identity);
  if (prior.some((opening) => opening.standing === "open")) return "already-open";
  const witnesses = witnessesOf(proposal).map(witnessKey);
  const closed = prior.filter((opening) => closedStandings.includes(opening.standing));
  if (closed.some((opening) => witnesses.every((witness) => opening.witnesses.includes(witness)))) return "answered-without-new-witness";
  return null;
}

/**
 * Open a proposal on the work board as an unsettled question addressed to its owning office: the
 * board's `work-open` verb with move `ask` (the board's kind for a question), its owning section as
 * scope, `sources` the content address of its witness terms, no `serves`, and no allocation, offer,
 * taking or deadline (R11, R12). `open` calls `work-open`. The board names a thread by its content,
 * so the same proposal over the same witnesses opens the same thread.
 */
export async function openProposalOnBoard({ proposal, owner, open }) {
  const witnesses = witnessesOf(proposal);
  const identity = proposalIdentity(proposal);
  const sections = [owner.section, ...(owner.otherSections ?? [])].filter(Boolean);
  const opening = Object.freeze({
    move: "ask",
    question: `Is "${String(proposal.task.object).slice(0, 200)}" a cell of its own? It recurs across ${witnesses.length} settled terms and none names it.`,
    ...(owner.office === undefined ? {} : { to: owner.office }),
    ...(sections.length === 0 ? {} : { scope: Object.freeze(sections.map((section) => `section:${section}`)) }),
    context: JSON.stringify({ kind: "knowing.nightly-dream.proposal", identity, regime: proposal.note[2], topic: String(proposal.task.object).slice(0, 200), support: witnesses.length, witnesses: witnesses.slice(0, maxWitnessKeys).map(witnessKey) }),
    tags: Object.freeze([dreamTag, identityTag(identity)]),
    sources: Object.freeze([Object.freeze({ kind: "dream-witnesses", commitment: witnessAddress(witnesses) })]),
  });
  const receipt = await open(opening);
  return Object.freeze({ opening, identity, receipt, bytesWritten: Buffer.byteLength(JSON.stringify(opening)) });
}

/**
 * One night: pressure check, cursor read, window read, dream, suppression, openings, cursor write,
 * run record (R16 to R18, R22). `ports` binds the node; `dream` maps the window to proposals.
 * A dry run reads and dreams, prints the run record, and writes no opening, cursor or record.
 */
export async function runNightlyDream({ ports, dream, options }) {
  const { minSupport = 2, maxProposals = 25, maxTerms = 5000, maxPressure = 60, recordClasses, sections = [], offices = {}, fallbackOffice, dryRun = false } = options;
  const run = { kind: "knowing.nightly-dream.run", dryRun, recordClasses, sections, minSupport, maxProposals, maxTerms, bytesRead: 0, bytesWritten: 0 };
  const finish = async (status, fields) => {
    const record = Object.freeze({ ...run, ...fields, status });
    if (!dryRun) run.bytesWritten += await ports.writeRunRecord(record) ?? 0;
    return Object.freeze({ status, record: Object.freeze({ ...record, bytesWritten: run.bytesWritten }) });
  };

  const pressure = ioPressureOf(await ports.readPressure());
  run.pressure = pressure;
  if (pressure > maxPressure) return finish(temporaryFailure, { outcome: "skipped-for-pressure" });

  const cursorState = (await ports.readCursor()) ?? { after: null, narrowThrough: null };
  run.cursorBefore = cursorState;
  const window = await windowOfSettledRecords({ cursor: cursorState.after, through: cursorState.narrowThrough ?? null, recordClasses, sections, maxTerms, read: ports.readRecords });
  run.bytesRead += window.bytesRead;
  run.termsRead = window.termsRead;
  if (window.refused) {
    const narrowed = { after: cursorState.after, narrowThrough: window.narrowThrough };
    if (!dryRun) run.bytesWritten += await ports.writeCursor(narrowed) ?? 0;
    return finish(temporaryFailure, { outcome: "refused-window-exceeds-max-terms", cursorAfter: narrowed });
  }

  const proposals = dream(window.terms, { minSupport, maxProposals: Infinity }).observations;
  const sectionOfTerm = new Map(window.terms.map((record) => [canonical(record.term), record.section]));
  const openings = await ports.readOpenings();
  const opened = [];
  const suppressed = [];
  const capped = [];
  for (const proposal of proposals) {
    const reason = suppressionOf(proposal, openings);
    if (reason !== null) {
      suppressed.push({ identity: proposalIdentity(proposal), topic: proposal.task.object, reason });
      continue;
    }
    if (opened.length >= maxProposals) {
      capped.push({ identity: proposalIdentity(proposal), topic: proposal.task.object });
      continue;
    }
    const witnessSections = witnessesOf(proposal).map((witness) => sectionOfTerm.get(canonical(witness)));
    const section = owningSection(witnessSections.filter(Boolean));
    const office = section === null ? fallbackOffice : offices[section] ?? fallbackOffice;
    const owner = { office, section, otherSections: [...new Set(witnessSections)].filter((other) => other && other !== section) };
    if (dryRun) {
      opened.push({ identity: proposalIdentity(proposal), topic: proposal.task.object, office, written: false });
      continue;
    }
    const landed = await openProposalOnBoard({ proposal, owner, open: ports.openOnBoard });
    run.bytesWritten += landed.bytesWritten;
    opened.push({ identity: landed.identity, topic: proposal.task.object, office, receipt: landed.receipt });
  }

  const cursorAfter = { after: window.last, narrowThrough: null };
  if (!dryRun) run.bytesWritten += await ports.writeCursor(cursorAfter) ?? 0;
  return finish(0, {
    outcome: dryRun ? "dry-run" : "dreamed",
    cursorAfter,
    derived: proposals.length,
    opened,
    suppressed,
    capped,
  });
}

function compareAdmission(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  const a = String(left);
  const b = String(right);
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

function canonical(value) {
  return JSON.stringify(value, (_, part) => (part !== null && typeof part === "object" && !Array.isArray(part)
    ? Object.fromEntries(Object.keys(part).sort().map((key) => [key, part[key]]))
    : part));
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}
