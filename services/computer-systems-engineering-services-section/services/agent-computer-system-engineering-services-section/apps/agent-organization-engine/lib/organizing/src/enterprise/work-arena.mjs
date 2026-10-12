/**
 * enterprise/work-arena — how micro-enterprises speak to one another about work, as a concurrent
 * game (gaming faculty, "Arenas, Plays, and Strategies"; notes 2026-10-01 "Work between
 * micro-enterprises is a concurrent game", "The work arena's second edition" and "The work
 * arena's third edition").
 *
 * The board is the parallel composition of conversations, one arena per thread. A thread is opened
 * by one of six moves, each a different speech act with a different conversation behind it
 * (Searle's illocutionary classes; Winograd and Flores' conversation for action; the Contract Net's
 * announce, bid, award):
 *
 *   aim      a purpose that never finishes (aim-generative work): what a micro-enterprise strives
 *            toward, with the measures it reads its progress by, and when it is an outside party's
 *            outcome, its user. Followed by wager (a player stakes a target on a measure, and so
 *            holds it), hold (holds it without one), observe (a measure's value, on evidence),
 *            leave (iyúhá-šni: a holder withdraws its engagement, the relation stays on record)
 *            and withdraw. Requests serve aims; an aim is never accepted.
 *   request  a directive: bring about this state. It carries the need, the requirements (each one
 *            "shall" statement with its class, priority and rationale, ISO/IEC/IEEE 29148), the
 *            conditions of satisfaction the assayer reads (each naming the requirements it
 *            verifies and its verification method), the scope and, when it is an outside party's
 *            need, its user. Followed by promise, decline,
 *            refine, counter, agree, release, deliver, accept, reject, withdraw.
 *   propose  an idea: it obliges nobody. Followed by adopt or withdraw.
 *   report   an assertion about a condition: friction, an incident, a law a check finds broken.
 *            It is not work. A report naming its law and subject is that condition's one thread:
 *            another party reporting it again corroborates it, the same party restates it (a
 *            witness counts once while it stands), and corroborating a resolved condition
 *            reopens it.
 *            Followed by corroborate, adopt, resolve, withdraw.
 *   ask      a question. Followed by answer, accept (the asker's), withdraw.
 *   declare  a ruling: the declarer makes something so by saying it, within its own authority (a
 *            leader's decision, an office's architecture decision, a policy). It is neither work
 *            nor a finding, so nobody takes it up; it stands in force until its declarer withdraws
 *            it or declares again superseding it. Work that must wait on it comes `after` it, and
 *            the arena records the ruling without judging the authority behind it.
 *
 * Every opening may `serve` a request or aim (the decomposition of work: subcontracting), come
 * `after` other threads (precedence: it is not ready until they settle), `supersede` earlier
 * threads of the same player (a revision is a new opening, never a second demand beside the first)
 * and `relate` to others. Ids are content addresses, so these relations cannot form cycles.
 *
 * Moves are monotone facts, so playing needs no coordination and several players may promise one
 * request. A thread's standing is a position reached by replaying its moves under the arena's
 * legal-move rule (`workArenaRules`, the faculty's `gameRules`): a move outside En(x) is refused.
 * A move's player is the office (or micro-enterprise) that answers for it; the account that played
 * it, when another, is its `hand`, recorded beside the move and never part of what it says.
 *
 * Nothing on the board says who or which model does the work. Staffing is the promiser's strategy,
 * derived inside its own root (work/staffing), so a move naming a doer is refused
 * (`doerPrescriptionsIn`). Who takes a thread up is derived too: by the taker's own policy, and by
 * territory, the section a thread is about being the home of the micro-enterprise seated over it.
 * A thread at home nowhere stays open: it is the market's signal of work no enterprise is seated
 * for, never swept up by a residual taker.
 *
 * What follows from the record is never stored on it (third edition). A thread's horizon is read
 * from its modality (`horizonOf`), whose move the thread awaits from its standing (`owesOf`), how
 * much a taker may hold open from what it has delivered (`capacityOf`), and a taker's delivery or
 * resolution from its own root's work settling (`settlingMovesOf`).
 *
 * What a move says is said well or refused (fourth edition, note 2026-10-02 "The work arena's
 * fourth edition"). A need, purpose, idea, question or statement is one statement, bounded
 * (`STATEMENT_LIMITS`); background goes in `context`. A requirement is singular and conforming
 * (29148 §5.2.5): one `shall`, its subject before it, its response after (`requirementBreachesOf`),
 * written in an EARS template (`earsPatternOf`). A requirement allocated from a served thread
 * traces it (`<thread>#<requirement>`), so flow-down is read requirement by requirement
 * (`allocationOf`). A request asks for a state, never for a request to be made; a scope subject is
 * typed and a section is spelled one way; a tag is a topic, never a section; a player is spelled
 * from the agency root. A class of doer ("a free model") is a doer. What a request still lacks to be
 * worked (its definition of ready) is read as its `gaps` (`gapsOf`), and the move a thread awaits
 * from whoever owes it is read from its standing (`awaitsOf`).
 *
 * A request asks for an end, never the means (fifth edition, note 2026-10-02 "The work arena's
 * fifth edition"). Its need states the state of the world wanted, not an activity in the
 * imperative (`meansOf`). A requirement's subject is the thing delivered, never the party that
 * delivers it (`doerSubjectOf`), and nobody asks for staffing (`STAFFING_NEED`): the hands are the
 * taker's. What stops a commitment is an obstacle (KAOS obstacle analysis): a report that
 * `obstructs` a request or aim, one thread per obstacle kind and thread, so a recurring obstacle
 * corroborates instead of piling up; a taker whose own staffing of a thread is obstructed reports
 * it there itself, and resolves it when the work allocates (`obstacleMovesOfAllocation`). An idea is a position on an issue (IBIS): a proposal
 * `addresses` the question, report or request it answers, or serves an aim, and anyone may
 * `argue` for or against it. A promise is read as a commitment (Singh: C(debtor, creditor,
 * antecedent, consequent)) whose state is derived (`commitmentsOf`), and a request superseding one
 * that was promised awaits its promisers' novation. Who owes which move next is read from one
 * table, the conversation each opening holds (`PROTOCOL`, `duesOf`), so each player's agenda is
 * derived (`agendaOf`). The same player opening the same thing again in other words is refused
 * (`twinOf`): it refines or supersedes what it already said.
 *
 * Each kind of speech carries what it is, and what it implies is derived (sixth edition, note
 * 2026-10-02 "The work arena's sixth edition"). A measurement that finds a law broken reports a
 * nonconformity and never demands work: its thread is its law and subject, the territory's holder
 * adopts it, and the measurer resolves it or, finding it again, corroborates it open
 * (`reconcileDerivedOpenings`), so a repair is verified by measuring. The imperative is read by its
 * syntax as well as its verb (`meansOf`). An obstacle of the taker's own is never reported to
 * itself: lacking the capability, it releases or leaves the thread with the obstacle named, and
 * home passes to the next enterprise enclosing it (`homeOf`, `departedOf`, `TAKER_OBSTACLES`);
 * lacking hands, it says nothing. Each request's requirements are traced to how they are verified
 * and where that stands (`verificationOf`). How the work is broken down stays the taker's: the
 * board carries ends and their verification, and the means are the taker's side of the wager.
 *
 * A judgement is told evidence, and what work goes first is the user's order (seventh edition,
 * note 2026-10-02 "The work arena's seventh edition"). Accepting or rejecting a delivery tells a
 * witness into it, claim by claim (each condition of satisfaction, and the need): the assayer may
 * presume, anyone else but the deliverer witnesses with evidence, and nothing told is ever taken
 * back, so each claim reads in Belnap's FOUR (held, denied, contested, unknown) and the verdict is
 * derived from those readings (`judgedDelivery`, as Obsmetrologia's `Valued` and SignCell's
 * evidence), a judgement on no evidence marked presumed. An aim or request may name its `user`,
 * the outside party whose need it is (Rendanheyi's 单), and every thread's distance from one is
 * derived through what it serves. Which work goes first is read from that distance and then from
 * the contradiction settling it removes (`attentionOf`, Obsmetrologia's attention allocation),
 * never from a priority the requester assigned itself.
 *
 * Holding an aim is a wager (eighth edition, note 2026-10-02 "The work arena's eighth edition";
 * Rendanheyi's 对赌, 引领目标, 抢单 and 增值分享). An aim is a chain group's one contract to its
 * user, and lacks one without a user, measures, or a unit on each (`gapsOf`). A player takes it up
 * by wagering: on one quantified measure, a target at or beyond a benchmark that is another
 * operator's best comparable performance, never the house's own history, for a period, with a
 * stake binding both ways, a share of the value added above target and a forfeit on a miss
 * (`benchmarkOf`, `stakeOf`). Anyone with evidence observes a measure's value; each wager reads its
 * period's latest observations in FOUR, and is running, met, missed, contested or unread
 * (`wagersOf`). Who owes what follows: a holder with no wager running owes one, a holder whose last
 * two ended wagers missed owes its leaving and the order is open to bids again (`forfeitedOf`), and
 * an ended wager nobody read is the opener's to read. What the aim created is its value-added
 * statement (`valueAddedOf`): its user, its parties, the ecosystem whose accepted work served it,
 * and each wager settled.
 *
 * Telling needs no turn (CALM; Obsmetrologia's `calm_monotone_coordination_free` and
 * `crdt_merge_order_independent`). The moves that only tell evidence or a position into a
 * grow-only record (`TOLD_MOVES`: an observation, an argument, a corroboration, an answer, a
 * witness on a delivery) merge as a join, so the same tellings in any order and any number of
 * times read the same board: they are never refused for what was or was not played before, and
 * stay admissible after a thread closes, where they are kept as knowledge but reopen nothing and
 * oblige nobody. Every other move retracts something or reads an absence (a hold, a wager, a
 * withdrawal, a release, a supersession, an acceptance that chooses), and is the coordinated part,
 * refused out of turn.
 *
 * A calibration is a held judgment, never the arena's law (Huidu glossary: huidu, fa). How many
 * threads a taker takes up in a turn, how long a thread at home nowhere waits before others play on
 * it, how much work a taker holds open before it has delivered, and how far back its delivered work
 * earns it more are points on grey bands (`WORK_AXES`), held by each enterprise in its own dated,
 * attributed setting records (enterprise/settings) and revisited there, never fixed here.
 *
 * What coordination costs is read, never stated (Obsmetrologia's CurrencyCocone `PricedNerve` and
 * QuantumContextuality's merge). Each coordinated move states its player's current value of one
 * register of the thread: its own taking (in or out), the contract (refined, countered, agreed) or
 * the standing (withdrawn, superseded, resolved, an answer chosen). A thread's coordination
 * (`coordinationOf`) is read from SignGraph's priced nerve over those current stances: a register
 * where the players' values agree merges without a held ⊤ and glues, so it costs nothing; every
 * player telling a value another player denies is contradiction mass a total order must settle,
 * which the thread's own board supplies. One player's revision replaces its stance and contradicts
 * nothing, and a player's own taking is told by that player alone. The mass is a cost of attending
 * (`attentionOf`), beside the job's size. A telling whose thread is not yet on the
 * board waits for it (`awaiting`) and is read the moment the thread opens, so a peer's tellings are
 * read the same whatever order they and their thread arrive in.
 *
 * An order is completed, never handed to a smarter hand (fourteenth edition; notes 2026-07-24 "The
 * Central Dogma of Code Fabrication" and "Fabrication with fidelity"). Whoever takes a request up
 * is a ribosome: it makes what the order says and is blind to intent the order did not carry. So a
 * delivery is judged against the order it answered, the operative contract at its `revision`
 * (`orderOf`, its content address), never against terms written after it; and a miss is the
 * order's to answer. A delivery rejected under the order in force, or a taker reporting that
 * carriers of different models missed it alike (an `information` obstacle, work/staffing), shows
 * the order incomplete (`orderGapOf`), and the turn is its opener's (`PROTOCOL`'s `rejected` step):
 * it completes the order (`ordersToComplete`, work its own root does) by a refinement naming the
 * order it `completes` and the evidence of the miss, admissible after a delivery once none awaits
 * its verdict, and only where it adds to the order. Completing re-keys the takers' work
 * (`intentOfThread`), so each takes up the completed order anew, and what they worked before lapses
 * on the record (`retaken`, `lapsedSubjectsOf`), never rewritten.
 * @packageDocumentation
 */
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { slugify } from "@red-cup-engineering/computer-text-content-engineering-services-section/slugify-text";
import { gameRules, hashPosition } from "@red-cup-engineering/gaming/running/rules";
import { readingOfSides, truthMeetReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { evidence as toldEvidence } from "@red-cup-engineering/signcell/cell";
import { pricedNerve } from "@red-cup-engineering/signgraph/cohomology";
import { ORDER_CHANNELS } from "../work/staffing.mjs";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { validateDeterministicExecution, validateResultCodomain } from "../work/schema.mjs";
import { EIGHTEENTH_EDITION, editionAt, readForward, REALIZED_EDITION, SEVENTEENTH_EDITION, unmigratedReason } from "./work-arena-law.mjs";

export const OPENING_MOVES = Object.freeze(["aim", "request", "propose", "report", "ask", "declare", "supply"]);

/**
 * The field naming what each opening says, in its own words: the arena owns this vocabulary, and
 * every telling, listing and comparison of openings reads it here and keeps no list of its own.
 * A supply says nothing in a single field (a pool, a quantity, a window), so its field is null and
 * `gistOfOpening` renders its structure.
 */
export const OPENING_GIST_FIELD = Object.freeze({
  aim: "purpose", request: "need", propose: "idea", report: "observation", ask: "question", declare: "ruling", supply: null,
});

/** What an opening says, in a line (not clipped): its gist field's words, or its structure rendered when it has none. */
export function gistOfOpening(opening) {
  const field = OPENING_GIST_FIELD[opening?.move];
  if (field === null && opening.move === "supply") return `Supply ${opening.amount} ${opening.unit} of ${opening.resource} until ${opening.until}`;
  const said = field === undefined
    ? (opening?.purpose ?? opening?.need ?? opening?.idea ?? opening?.observation ?? opening?.question ?? opening?.ruling)
    : opening[field];
  return typeof said === "string" ? said.trim().split("\n")[0] : "";
}
export const RESPONSE_MOVES = Object.freeze({
  aim: Object.freeze(["hold", "wager", "observe", "attach", "leave", "withdraw"]),
  request: Object.freeze(["promise", "attach", "decline", "refine", "counter", "agree", "release", "deliver", "accept", "reject", "withdraw"]),
  propose: Object.freeze(["adopt", "argue", "attach", "withdraw"]),
  report: Object.freeze(["corroborate", "adopt", "attach", "resolve", "withdraw"]),
  ask: Object.freeze(["answer", "accept", "withdraw"]),
  declare: Object.freeze(["withdraw"]),
  supply: Object.freeze(["draw", "return", "observe", "withdraw"]),
});
/** The moves only a thread's other side plays (work-game's Opponent): taking it up, working under that taking and giving it back. */
export const TAKER_MOVES = Object.freeze(["promise", "decline", "hold", "wager", "adopt", "attach", "deliver", "release", "leave", "draw", "return"]);
/** The coordination-free fragment of each kind's responses: moves that only tell into a grow-only record (CALM). */
export const TOLD_MOVES = Object.freeze({
  aim: Object.freeze(["observe"]),
  request: Object.freeze(["accept", "reject"]),
  propose: Object.freeze(["argue"]),
  report: Object.freeze(["corroborate"]),
  ask: Object.freeze(["answer"]),
  declare: Object.freeze([]),
  supply: Object.freeze(["observe"]),
});
/**
 * The moves told on every kind of thread that answers with them: a telling of one of these whose
 * thread is not yet on the board waits for it, since whatever thread it turns out to answer, it is a
 * join there. (An acceptance chooses an answer to a question, so it is coordinated there and waits
 * for nothing.)
 */
export const ALWAYS_TOLD_MOVES = Object.freeze([...new Set(Object.values(RESPONSE_MOVES).flat())]
  .filter((move) => Object.entries(RESPONSE_MOVES).every(([kind, moves]) => !moves.includes(move) || TOLD_MOVES[kind].includes(move))));
/**
 * The register of a thread each coordinated move states a value of, and the value its player
 * states: whether it takes the thread up (in) or gives it back (out), how it states the contract,
 * or how the thread stands. A register is one cell of the thread's cover; its players' current
 * stances are the cell's local sections (`coordinationOf`). A register in `OWN_REGISTERS` is each
 * player's own: several players may hold one thread, so a player's taking is its own cell and no
 * other player's stance contradicts it.
 */
export const COORDINATED_REGISTERS = Object.freeze({
  hold: ["taking", "in"], promise: ["taking", "in"], adopt: ["taking", "in"], attach: ["taking", "in"], wager: ["taking", "in"], deliver: ["taking", "in"],
  leave: ["taking", "out"], release: ["taking", "out"], decline: ["taking", "out"], draw: ["taking", "in"], return: ["taking", "out"],
  refine: ["contract", "refined"], counter: ["contract", "countered"], agree: ["contract", "agreed"],
  withdraw: ["standing", "withdrawn"], supersede: ["standing", "superseded"], resolve: ["standing", "resolved"], accept: ["standing", "chosen"],
});
export const OWN_REGISTERS = Object.freeze(["taking"]);
export const THREAD_STANDINGS = Object.freeze({
  aim: Object.freeze(["open", "held", "withdrawn", "superseded"]),
  request: Object.freeze(["open", "declined", "promised", "delivered", "accepted", "withdrawn", "superseded"]),
  propose: Object.freeze(["open", "adopted", "withdrawn", "superseded"]),
  report: Object.freeze(["open", "adopted", "resolved", "withdrawn", "superseded"]),
  ask: Object.freeze(["open", "answered", "accepted", "withdrawn", "superseded"]),
  declare: Object.freeze(["in-force", "withdrawn", "superseded"]),
  supply: Object.freeze(["open", "drawn", "withdrawn", "superseded"]),
});
/** The standings after which nobody plays on a thread (a resolved report may still be corroborated). */
export const CLOSED_STANDINGS = Object.freeze(["accepted", "withdrawn", "superseded", "resolved"]);
/** The standing at which a thread no longer holds back the threads that come after it. An aim never settles. */
export const SETTLED_STANDINGS = Object.freeze({
  aim: Object.freeze([]),
  request: Object.freeze(["accepted"]),
  propose: Object.freeze(["adopted"]),
  report: Object.freeze(["resolved"]),
  ask: Object.freeze(["answered", "accepted"]),
  declare: Object.freeze(["in-force"]),
  supply: Object.freeze([]),
});
/**
 * The horizons of the modality note (2026-09-04), each read from a thread's modality, never stated:
 * determined (someone is committed and nothing holds it back) is now, necessary (a must-requirement
 * nothing holds back) soon, possible later, and what cannot proceed as it stands eventually.
 */
export const HORIZONS = Object.freeze(["now", "soon", "later", "eventually"]);
/** ISO/IEC/IEEE 29148: what a requirement constrains, how much it matters (MoSCoW), how a condition verifies it. */
export const REQUIREMENT_CLASSES = Object.freeze(["functional", "quality", "constraint", "interface"]);
export const PRIORITIES = Object.freeze(["must", "should", "could", "wont"]);
export const VERIFICATION_METHODS = Object.freeze(["test", "analysis", "inspection", "demonstration"]);
/**
 * What can stop a commitment from being kept (KAOS obstacle analysis, van Lamsweerde and Letier
 * 2000), by what is missing: hands to do it (capacity), a service qualified to do it (capability),
 * knowledge (information), a decision or permission (authority), other work outside the thread
 * (dependency), money, compute or an account (resource), or requirements that cannot all hold
 * together (conflict, KAOS divergence). Capacity and capability are the taker's own; the rest hold
 * the thread back from anyone (`BLOCKING_OBSTACLES`).
 */
export const OBSTACLE_KINDS = Object.freeze(["capacity", "capability", "information", "authority", "dependency", "resource", "conflict"]);
export const BLOCKING_OBSTACLES = Object.freeze(["information", "authority", "dependency", "resource", "conflict"]);
/**
 * The obstacles that are the taker's own (sixth edition). A taker that cannot do what it holds does
 * not report to itself on the market: it gives the work back (KAOS obstacle resolution by agent
 * substitution; *qiangdan* in reverse), releasing a request or leaving an aim with the obstacle
 * named, and the thread's home passes to the next enterprise enclosing it (`homeOf`). Capacity is
 * never said at all: hands all busy is the taker's own queue, priced by its flow (`capacityOf`).
 */
export const TAKER_OBSTACLES = Object.freeze(OBSTACLE_KINDS.filter((kind) => !BLOCKING_OBSTACLES.includes(kind)));
/** An argument's stance toward the position it answers (IBIS: issue, position, argument). */
export const ARGUMENT_STANCES = Object.freeze(["for", "against"]);
/** Which way a quantified measure is better: a reading meets a target at or above it (more), or at or below it (less). */
export const MEASURE_DIRECTIONS = Object.freeze(["more", "less"]);

const DAY_MS = 86_400_000;
const ID = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/;

const named = (value, what) => {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${what} is a non-empty string`);
  return value.trim();
};
const instant = (value, what) => {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${what} is an ISO time`);
  return value;
};
const oneOf = (value, among, fallback, what) => {
  const chosen = value ?? fallback;
  if (!among.includes(chosen)) throw new TypeError(`${what} is one of ${among.join(", ")}`);
  return chosen;
};
const strings = (list, what) => Object.freeze([...new Set([...(list ?? [])].map((value) => named(value, what)))].sort());
const optional = (key, value) => (value === undefined || (Array.isArray(value) && value.length === 0) ? {} : { [key]: value });
const text = (value, what) => (value === undefined ? undefined : named(value, what));
const quantity = (value, what) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${what} is a finite number`);
  return value;
};

/**
 * What a move says is said in statements, not documents (fourth edition). A need, purpose, idea or
 * question is one statement a reader takes in at once (Volere's description, 29148's stakeholder
 * need); an observation or ruling may run a little longer. Background goes in `context`, and
 * anything longer than that is a document the opening names among its `sources`.
 */
export const STATEMENT_LIMITS = Object.freeze({ statement: 400, finding: 800, rationale: 1200, context: 4000 });
const bounded = (value, what, limit) => {
  const said = named(value, what);
  if (said.length > STATEMENT_LIMITS[limit]) throw new TypeError(`${what} is at most ${STATEMENT_LIMITS[limit]} characters (it is ${said.length}); put background in context and documents in sources`);
  return said;
};
const boundedText = (value, what, limit) => (value === undefined ? undefined : bounded(value, what, limit));

/**
 * A player as the house spells it: an office is `<section>#<office>`, its section read by the
 * section law (`houseSectionOf`), so one office has one spelling on the board whichever tree its
 * speaker wrote from. Any other player (a micro-enterprise, a package) is its own name.
 */
const playerOf = (value, what) => {
  const player = named(value, what);
  const mark = player.indexOf("#");
  if (mark < 0) return player;
  return `${houseSectionOf(player.slice(0, mark)) ?? player.slice(0, mark)}${player.slice(mark)}`;
};
const optionalPlayer = (value, what) => (value === undefined ? undefined : playerOf(value, what));

/**
 * The statement law for requirements (fourth edition). A requirement is one `shall` statement:
 * singular and conforming (ISO/IEC/IEEE 29148 §5.2.5), a subject owing one response, written in
 * one of the EARS templates (Mavin et al. 2009): ubiquitous ("The <subject> shall <response>"),
 * event-driven ("When <trigger>, the <subject> shall …"), state-driven ("While <state>, …"),
 * unwanted behaviour ("If <condition>, then the <subject> shall …"), optional feature ("Where
 * <feature>, …"), or a combination. The template is read from the words (`earsPatternOf`), never
 * stated. A statement owing two responses is two requirements, and a `shall` followed by a noun
 * phrase ("The system shall The pipeline …") owes nothing, so both are refused.
 */
export function requirementBreachesOf(says) {
  const shalls = says.match(/\bshall\b/gi) ?? [];
  if (shalls.length === 0) return Object.freeze(["it states no `shall`: a requirement is what a subject shall do or be"]);
  if (shalls.length > 1) return Object.freeze([`it states ${shalls.length} \`shall\`s: each response is its own requirement`]);
  const at = says.search(/\bshall\b/i);
  const breaches = [];
  // The subject stands right before `shall`; a clause set off by commas before it is a trigger
  // (EARS `When …, the system shall`) or an apposition, so the subject is missing only where nothing
  // stands before `shall`, or a trigger clause runs straight into it.
  const head = says.slice(0, at).trim();
  const last = head.split(/[,;:]/).at(-1).replace(/\bthen\b/i, "").trim();
  if (head === "" || (last === "" && earsPatternOf(says) !== "ubiquitous")) breaches.push("it names no subject before `shall`");
  // A floating quantifier (`shall each`, `shall all`, `shall both`) distributes the response; it is not the response.
  const response = /\bshall\s+(?:not\s+)?(?:(?:each|all|both|also|always|never|only|still)\s+)*([^\s,.;:]+)/i.exec(says)?.[1];
  if (response === undefined || /^(?:the|a|an|this|that|these|those|its|their|our|every)$/i.test(response) || /^[A-Z][a-z]/.test(response)) {
    breaches.push(`\`shall\` is followed by "${response ?? ""}", not the response the subject owes`);
  }
  return Object.freeze(breaches);
}

/** The EARS template a requirement is written in, read from the clauses before its `shall`. */
export function earsPatternOf(says) {
  const head = says.slice(0, Math.max(0, says.search(/\bshall\b/i))).toLowerCase();
  const leads = [["when", "event-driven"], ["while", "state-driven"], ["if", "unwanted-behaviour"], ["where", "optional-feature"]]
    .filter(([word]) => new RegExp(String.raw`(?:^|[,;]\s*)${word}\b`).test(head.trim()))
    .map(([, pattern]) => pattern);
  return leads.length === 0 ? "ubiquitous" : leads.length === 1 ? leads[0] : "complex";
}

/**
 * The unbounded or ambiguous terms in a statement (ISO/IEC/IEEE 29148 §5.2.7): loopholes,
 * open-ended lists, subjective qualities, superlatives and comparatives with nothing to compare
 * to. They are read, never refused: a must-requirement carrying one is not yet ready to promise.
 */
const AMBIGUOUS = /\b(?:as appropriate|as applicable|as needed|as required|if possible|where possible|if practical|as much as possible|but not limited to|and\/or|etc|user[- ]friendly|easy to use|easily|seamless(?:ly)?|robust(?:ly)?|flexible|adequate(?:ly)?|sufficient(?:ly)?|reasonabl[ey]|efficient(?:ly)?|quickly|state[- ]of[- ]the[- ]art|optimal(?:ly)?|optimi[sz]e[sd]?|maximi[sz]e[sd]?|minimi[sz]e[sd]?|best|better|improved?|enhanced?|several|various|significant(?:ly)?|minimal)\b/gi;
export function ambiguitiesOf(says) {
  return Object.freeze([...new Set([...String(says ?? "").matchAll(AMBIGUOUS)].map((match) => match[0].toLowerCase()))].sort());
}

/** An opening is the request: a need that asks for a request (a work item, a ticket) to be made is refused. */
const META_REQUEST = /^\s*(?:please\s+)?(?:create|open|file|make|add|raise|record|post|write)\s+(?:a|an|one|the)?\s*(?:new\s+)?(?:work[\s-]?items?|requests?|demands?|threads?|tickets?|issues?|tasks?)\b/i;

/**
 * The verbs a need may not open with in the imperative (fifth edition). A request asks for an end,
 * a state of the world its assayer can check (a KAOS goal is a state assertion: Achieve, Maintain),
 * never the activity that reaches it: "Implement the catalog" prescribes the means and leaves the
 * end unsaid, and choosing the means is the taker's side of the wager (*duidu*). Restate it as the
 * state wanted: "The catalog lists every sibling series."
 *
 * A list of verbs leaks ("Execute the batch", "Receive and deploy the node", "Activate the
 * service"), so the imperative is also read by its syntax (sixth edition): a statement whose first
 * word is no function word and whose second is a determiner ("Activate the …", "Trial a …"), or
 * whose first two words join two verbs before one ("Receive and deploy the …"), opens with a verb
 * acting on an object, with no subject: the imperative mood. A declarative opens with its subject
 * ("The service is active"), which is a determiner or a noun phrase, never a bare verb.
 */
const MEANS_VERBS = new Set(`add adapt adopt align allocate analyse analyze apply archive assay assess assign audit bind bound build centralize centralise change check choose clarify clean collect complete compute configure consolidate continue converge convert coordinate create debug decide decompose define delete deliver deploy derive design develop document draft edit enable enforce ensure establish evaluate expand expose extend extract finish fix found gather generate handle harden identify implement improve integrate investigate keep launch make map measure merge migrate monitor move operate orchestrate organize organise place plan prepare produce provide publish read rebuild recover redesign refactor reconcile reorganize reorganise remove rename repair replace research resolve restore restructure retire review rewrite run seat seed select separate set ship sort specify split staff standardize standardise start stop submit support survey sync test track triage unify update use verify wire write`.split(" "));
const NOUN_FOLLOWERS = new Set(["of", "is", "are", "was", "were", "has", "have", "for", "that", "which", "needs", "exists"]);
const OBJECT_DETERMINERS = new Set("the a an every each all any some no its their our this that these those one both either another".split(" "));
/** Words a declarative or a question may open with: determiners, prepositions, subordinators, pronouns, modals, question words. */
const NON_VERB_OPENERS = new Set([...OBJECT_DETERMINERS, ..."his her my your two three neither such when while if where once after before until unless as since because for in on at by with without within under over across among between from to of into onto upon through throughout during per given there it we they he she i you nothing nobody none everyone everything someone something anyone anything here now today whenever wherever whether how what why who which will would shall should can could may might must do does did is are was were has have had".split(" ")]);
/** The imperative verb a statement opens with, if it prescribes an activity rather than stating an end. */
export function meansOf(says) {
  const words = String(says ?? "").trim().replace(/^please\s+/i, "").split(/\s+/);
  if (words.length > 2 && /^[a-z]+ly$/i.test(words[0])) words.shift(); // "Independently assay …"
  const word = (at) => words[at]?.toLowerCase().replace(/[^a-z]/g, "");
  const verb = word(0);
  if (verb === undefined || verb === "") return undefined;
  if (MEANS_VERBS.has(verb)) return word(1) === undefined || NOUN_FOLLOWERS.has(word(1)) ? undefined : verb;
  // A label ("Context: …"), a possessive, an acronym or a number opens no imperative; nor does a
  // gerund ("Using the …") or a third-person form ("Sets the …"), which lack only their subject.
  if (/[:'’]/.test(words[0]) || /^[0-9A-Z]{2,}/.test(words[0]) || NON_VERB_OPENERS.has(verb) || /ing$|[^su]s$/.test(verb)) return undefined;
  if (OBJECT_DETERMINERS.has(word(1))) return verb;
  return ["and", "or"].includes(word(1)) && OBJECT_DETERMINERS.has(word(3)) ? verb : undefined;
}

/**
 * A need for hands is not a need of the world (fifth edition). "A qualified available carrier is
 * admitted", "an execution slot", "an actual qualified worker": who staffs work is decided by
 * whoever takes it (*sanquan*), derived inside its root (work/staffing). A taker that cannot staff
 * what it holds says so on that thread, as an obstacle (`obstructs`, kind capacity or capability);
 * the board shows the market where nobody is seated.
 */
export const STAFFING_NEED = /\b(?:qualified|available|unassigned|eligible|actual)\s+(?:(?:and\s+)?[a-z-]+\s+){0,3}(?:carriers?|workers?|characters?|executors?|staff(?:ers?)?|assignees?|execution\s+(?:slots?|offices?|carriers?))\b|\bexecution\s+slots?\b|\bstaffing\b/i;

/**
 * Words naming a party who does work, not a thing delivered: a requirement whose subject is one of
 * them ("The Chief Financial Officer office shall produce …") names the doer. 29148 states a
 * requirement of the system of interest; the requester states the target and the taker picks the
 * hands, so the subject is what is delivered: "The Group financial readout shall be dated."
 */
const DOER_NOUNS = new Set(["office", "offices", "officer", "officers", "lead", "team", "teams", "agent", "agents", "worker", "workers", "carrier", "carriers", "staff", "staffer", "staffers", "assistant", "assistants", "director", "directors", "manager", "managers", "engineer", "engineers", "assignee", "promiser", "taker", "deliverer"]);
/** The doer a requirement names as its subject, if its subject's head noun is a party rather than a thing. */
export function doerSubjectOf(says) {
  const at = String(says ?? "").search(/\bshall\b/i);
  if (at <= 0) return undefined;
  const subject = says.slice(0, at).split(/[,;:]/).at(-1).replace(/\bthen\b/i, "").trim();
  let words = subject.split(/\s+/);
  // "At the end of each phase the office shall …": past a leading adverbial, the subject is the last noun phrase.
  if (LEADING_WORDS.has(words[0]?.toLowerCase())) {
    const last = words.findLastIndex((word) => DETERMINERS.has(word.toLowerCase()));
    if (last > 0) words = words.slice(last);
  }
  // "Names and offices shall …": a coordinated subject names a doer only when every conjunct does.
  const conjuncts = words.join(" ").split(/\s+(?:and|or)\s+/i).map((conjunct) => conjunct.split(/\s+/));
  return conjuncts.every(headIsDoer) ? subject : undefined;
}
/** Whether a noun phrase's head noun is a party: "Methods moved between carriers" heads on methods,
 *  since the head comes before what modifies it. */
function headIsDoer(words) {
  const modified = words.findIndex((word, index) => index > 0 && MODIFIER_WORDS.has(word.toLowerCase()));
  const phrase = modified > 0 ? words.slice(0, modified) : words;
  const head = phrase.at(-1)?.toLowerCase().replace(/['’]s$/, "").replace(/[^a-z]/g, "");
  return head !== undefined && DOER_NOUNS.has(head);
}
const LEADING_WORDS = new Set(["at", "before", "after", "when", "while", "if", "once", "upon", "during", "within", "on", "in", "for", "where", "whenever"]);
const DETERMINERS = new Set(["the", "a", "an", "each", "every", "all", "any", "its", "their"]);
const MODIFIER_WORDS = new Set(["of", "between", "in", "for", "with", "from", "to", "at", "on", "by", "under", "over", "within", "across", "through", "into", "that", "which", "who", "whose", "moved", "named", "listed", "held", "used"]);

/**
 * Tags are words a taking policy matches, lowercase slugs. A section is never a tag: what a thread
 * is about, and so where it is at home, is its scope.
 */
const tagsOf = (list) => Object.freeze([...new Set([...(list ?? [])].map((value) => {
  const tag = named(value, "a tag").toLowerCase();
  if (houseSectionOf(tag) !== undefined) throw new TypeError(`a section is scope, not a tag (${tag})`);
  if (!ID.test(tag)) throw new TypeError(`a tag is a lowercase slug (${tag})`);
  return tag;
}))].sort());

/**
 * Who does the work is never part of what is said about it. Keys that name a doer, a model or a
 * scale are refused anywhere in a move; phrases that hand the work to a named model or harness are
 * refused in what a move asks or proposes (its need, idea, purpose, requirements, conditions,
 * measures and plan). A requirement *about* a model, "serve gpt-6 through the inference engine",
 * is about the deliverable and passes, as does a model named as the object of a noun phrase ("with
 * ChatGPT image generation as the first adapter"): the phrase hands work over only where the model
 * name closes it; a report's observation and an answer say what happened, and
 * are not read for phrases. A class of doer ("a free model", "a frontier agent") is a doer too:
 * what it stands in for is a constraint on the work (its cash cost, its latency), stated as one.
 */
export const DOER_KEYS = Object.freeze(["model", "models", "provider", "scale", "effort", "reasoningEffort", "character", "carrier", "harness", "harnessModels", "assignee", "staff"]);
const DOER_NAMES = String.raw`(?:gpt-[\w.-]+|o[1-9](?:-[\w.-]+)?|chatgpt|claude(?:[\s-][\w.-]+)?|codex|copilot|cursor|opus|sonnet|haiku|fable|luna|sol|gemini[\w.-]*|gemma[\w.-]*|notebooklm|llama[\w.-]*|qwen[\w.-]*|mistral[\w.-]*|deepseek[\w.-]*|grok[\w.-]*|kimi[\w.-]*|glm[\w.-]*|(?:free|cheap|cheaper|cheapest|frontier|local|small|smaller|large|larger|premium|paid|zero-cash|strong|stronger|weak|weaker)(?:\s+(?:inference|language|coding))?\s+(?:models?|llms?|agents?))\b`;
const DOER_PHRASE = new RegExp(String.raw`\b(?:(?:have|let)\s+(?:the\s+)?${DOER_NAMES}|(?:by|on|with|using|via|through|assign(?:ed)?\s+to|hand(?:ed)?\s+to|run(?:\s+it)?\s+(?:on|with))\s+(?:a\s+|an\s+|the\s+)?${DOER_NAMES}(?:\s+(?:model|agent|session|worker)\b)?(?=\s*(?:$|[.,;:!?)]|\b(?:and|or|to|for|in|at|then|instead|only|alone|again|through|via|on|with)\b)))`, "gi");
const ASKING_TEXTS = ["need", "idea", "purpose", "rationale", "context"];
const ASKING_LISTS = ["requirements", "conditions", "measures"];

/** The doer prescriptions in a move's content: keys naming a doer, and phrases handing the work to a model. */
export function doerPrescriptionsIn(content) {
  const found = [];
  const walk = (value, path) => {
    if (Array.isArray(value)) value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
    else if (value !== null && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (DOER_KEYS.includes(key)) found.push({ at: `${path}.${key}`, kind: "doer-key" });
        walk(entry, `${path}.${key}`);
      }
    }
  };
  walk(content, "$");
  const read = (words, at) => {
    for (const match of String(words ?? "").matchAll(DOER_PHRASE)) found.push({ at, kind: "doer-phrase", phrase: match[0] });
  };
  for (const key of ASKING_TEXTS) read(content?.[key], `$.${key}`);
  for (const list of ASKING_LISTS) {
    for (const [index, entry] of (content?.[list] ?? []).entries()) read(typeof entry === "string" ? entry : entry?.says, `$.${list}[${index}].says`);
  }
  for (const [index, item] of (content?.plan?.items ?? []).entries()) read(item?.text, `$.plan.items[${index}].text`);
  return Object.freeze(found);
}

const refuseDoers = (content, what) => {
  const prescriptions = doerPrescriptionsIn(content);
  if (prescriptions.length > 0) {
    throw new TypeError(`${what} says what is wanted, never who or which model does it; the promiser derives its staffing (${prescriptions.map((p) => p.phrase ?? p.at).join("; ")})`);
  }
};

function statementsOf(list, what, shape) {
  const seen = new Set();
  return Object.freeze([...(list ?? [])].map((entry, index) => {
    const statement = typeof entry === "string" ? { says: entry } : entry;
    const id = statement?.id ?? `${what[0]}${index + 1}`;
    if (!ID.test(id) || seen.has(id)) throw new TypeError(`${what} ids are distinct lowercase slugs (${id})`);
    seen.add(id);
    return Object.freeze({
      id,
      says: bounded(statement.says, `a ${what} statement`, "statement"),
      ...optional("kind", text(statement.kind, `a ${what} kind`)),
      ...shape(statement),
    });
  }));
}

const assayOf = (assay) => assay === undefined ? undefined : validateDeterministicExecution(assay);

/**
 * Where a requirement was allocated from (requirement flow-down, INCOSE): `<thread>#<requirement>`,
 * a requirement (or an aim's measure) of a thread the opening serves. Traces make decomposition
 * readable requirement by requirement (`allocationOf`), not only thread by thread.
 */
const traceOf = (value) => {
  const trace = named(value, "a traced requirement");
  const mark = trace.lastIndexOf("#");
  if (mark <= 0 || !ID.test(trace.slice(mark + 1))) throw new TypeError(`a trace names <thread>#<requirement> (${trace})`);
  return trace;
};
const splitTrace = (trace) => ({ thread: trace.slice(0, trace.lastIndexOf("#")), requirement: trace.slice(trace.lastIndexOf("#") + 1) });
/** A whole thread, or one requirement of it (`<thread>#<requirement>`): what an obstacle obstructs. */
const traceOrThreadOf = (value) => (value.includes("#") ? traceOf(value) : value);
const threadOfTrace = (value) => (value.includes("#") ? splitTrace(value).thread : value);

const requirementsOf = (list) => statementsOf(list, "requirement", (statement) => {
  if (statement.assay !== undefined) throw new TypeError("a requirement carries no assay; a condition verifying it does");
  const breaches = requirementBreachesOf(String(statement.says ?? ""));
  if (breaches.length > 0) throw new TypeError(`requirement "${String(statement.says).slice(0, 80)}" is not one conforming shall statement: ${breaches.join("; ")}`);
  const doer = doerSubjectOf(String(statement.says));
  if (doer !== undefined) throw new TypeError(`requirement "${String(statement.says).slice(0, 80)}" names its doer (${doer}) as its subject; its subject is what is delivered, and the taker chooses the hands`);
  if (STAFFING_NEED.test(String(statement.says))) throw new TypeError(`requirement "${String(statement.says).slice(0, 80)}" asks for staffing; staffing is the taker's, and a taker that cannot staff reports an obstacle on the thread it holds`);
  return {
    class: oneOf(statement.class, REQUIREMENT_CLASSES, "functional", "a requirement's class"),
    priority: oneOf(statement.priority, PRIORITIES, "must", "a requirement's priority"),
    ...optional("rationale", boundedText(statement.rationale, "a requirement's rationale", "rationale")),
    ...optional("traces", Object.freeze([...new Set([...(statement.traces ?? [])].map(traceOf))].sort())),
  };
});

const conditionsOf = (list) => statementsOf(list, "condition", (statement) => {
  const assay = assayOf(statement.assay);
  return {
    method: oneOf(statement.method, VERIFICATION_METHODS, assay === undefined ? "inspection" : "test", "a condition's verification method"),
    ...optional("verifies", strings(statement.verifies, "a verified requirement")),
    ...optional("assay", assay),
  };
});

/**
 * An aim's measures. A measure stating its `unit` is a quantity, read better one way (`better`,
 * more by default), and only a quantity can carry a wager's target (eighth edition).
 */
const measuresOf = (list) => statementsOf(list, "measure", (statement) => {
  if (statement.unit === undefined && statement.better !== undefined) throw new TypeError("a measure is better one way only once it states its unit");
  return {
    ...optional("assay", assayOf(statement.assay)),
    ...(statement.unit === undefined ? {} : {
      unit: named(statement.unit, "a measure's unit"),
      better: oneOf(statement.better, MEASURE_DIRECTIONS, "more", "which way a measure is better"),
    }),
  };
});

/** Whether a reading meets a target on a quantified measure. */
const meets = (measure, value, target) => (measure.better === "less" ? value <= target : value >= target);

/**
 * A leading goal's reference (eighth edition; Rendanheyi's 引领目标): the best comparable
 * performance of another operator, whoever and wherever it is, named as a typed subject and shown
 * by evidence. The house's own history is never a benchmark: a target set by increment from one's
 * own past is met by a declining business all the way down, and rewards having been bad before.
 */
function benchmarkOf(benchmark) {
  if (benchmark === undefined) throw new TypeError("a wager's target is a leading goal, set from a benchmark: another operator's best comparable performance, with evidence");
  const of = named(benchmark.of, "whose performance a benchmark is");
  if (!SCOPE_SUBJECT.test(of)) throw new TypeError(`a benchmark names whose performance it is as a typed subject, <kind>:<value> (${of})`);
  const [kind, ...rest] = of.split(":");
  if (["section", "office", "player", "enterprise", "house"].includes(kind) || houseSectionOf(rest.join(":")) !== undefined) {
    throw new TypeError(`a benchmark is another operator's performance, never the house's own (${of}); a target set from one's own past is incremental`);
  }
  const evidence = strings(benchmark.evidence, "benchmark evidence");
  if (evidence.length === 0) throw new TypeError("a benchmark carries the evidence of the performance it reads");
  return Object.freeze({ of, value: quantity(benchmark.value, "a benchmark's value"), evidence });
}

/**
 * What a wager puts at stake (eighth edition; Rendanheyi's 对赌): the share of the value added
 * above the target that is the holder's (`upside`), and the share of its value-added pay it
 * forfeits on a miss (`downside`). Both are owed: a commitment with upside only is a bonus scheme,
 * which can be declined without anything following.
 */
function stakeOf(stake) {
  const share = (value, what) => {
    if (typeof value !== "number" || !(value > 0 && value <= 1)) throw new TypeError(`${what} is a share in (0, 1]: a wager binds both ways, and one with upside only is a bonus scheme`);
    return value;
  };
  return Object.freeze({
    upside: share(stake?.upside, "a stake's upside, the holder's share of the value added above target"),
    downside: share(stake?.downside, "a stake's downside, the share forfeited on a miss"),
  });
}

/**
 * A contract: requirements and the conditions that verify them, each condition naming only
 * requirements it states. From the seventeenth edition a contract is a meaning-closure: it may state
 * its result's codomain (`returns`, an anonymous JSON Schema, as a work item's) and admitted
 * examples (`closureOf`), so any taker can make what it orders from the order alone.
 */
function contractOf(input, edition = REALIZED_EDITION) {
  const requirements = requirementsOf(input.requirements);
  const conditions = conditionsOf(input.conditions);
  const ids = new Set(requirements.map((requirement) => requirement.id));
  for (const condition of conditions) {
    const stray = (condition.verifies ?? []).filter((id) => !ids.has(id));
    if (stray.length > 0) throw new TypeError(`condition ${condition.id} verifies requirements the contract does not state (${stray.join(", ")})`);
  }
  return { requirements, conditions, ...(edition.edition >= SEVENTEENTH_EDITION.edition ? closureOf(input) : {}) };
}

/** How many examples an order may admit: enough to pin a codomain's cases, few enough to read. */
export const EXAMPLE_LIMIT = 12;

/**
 * An order's closure (seventeenth edition; fabrication science specification 2026-09-04, "the work
 * order is the meaning-closure"): the codomain its result is of, and examples, each an output the
 * codomain types with the input it answers and what it shows. An example is one acceptance case
 * among others: an output outside the codomain is refused, since an order cannot show what it
 * forbids. Examples need a codomain to be read against.
 */
function closureOf(input) {
  if (input.returns === undefined) {
    if (input.examples !== undefined) throw new TypeError("an order's examples are read against its codomain: state returns with them");
    return {};
  }
  const returns = validateResultCodomain(input.returns);
  if (input.examples === undefined) return { returns };
  if (!Array.isArray(input.examples) || input.examples.length === 0 || input.examples.length > EXAMPLE_LIMIT) {
    throw new TypeError(`an order admits 1 to ${EXAMPLE_LIMIT} examples`);
  }
  const codomain = schemaFrom(returns);
  const examples = input.examples.map((example, index) => {
    if (example === null || typeof example !== "object" || Array.isArray(example) || !Object.hasOwn(example, "output")) throw new TypeError(`example ${index + 1} states the output it shows`);
    const extra = Object.keys(example).filter((key) => !["says", "input", "output"].includes(key));
    if (extra.length > 0) throw new TypeError(`example ${index + 1} carries only says, input and output (${extra.join(", ")})`);
    if (!codomain.validate(example.output)) throw new TypeError(`example ${index + 1}'s output is outside the order's codomain: ${codomain.errors(example.output).slice(0, 2).join("; ")}`);
    return Object.freeze({
      ...optional("says", example.says === undefined ? undefined : bounded(example.says, "what an example shows", "statement")),
      ...(Object.hasOwn(example, "input") ? { input: example.input } : {}),
      output: example.output,
    });
  });
  return { returns, examples: Object.freeze(examples) };
}

/**
 * The must-requirements no condition verifies. A condition naming no requirements answers for the
 * whole contract.
 */
export function uncoveredOf({ requirements = [], conditions = [] }) {
  const covers = (condition, requirement) => condition.verifies === undefined || condition.verifies.includes(requirement.id);
  return Object.freeze(requirements
    .filter((requirement) => (requirement.priority ?? "must") === "must" && !conditions.some((condition) => covers(condition, requirement)))
    .map((requirement) => requirement.id));
}

/**
 * A request's requirements traced to how each is verified (sixth edition; ISO/IEC/IEEE 29148
 * traceability, the right arm of the V-model), read from its operative contract and its judged
 * deliveries and never stated: for each requirement, the conditions that verify it (a condition
 * naming no requirement answers for all), by which method, which of them a machine can re-run (it
 * carries an assay), and where it stands. The delivery read is the accepted one, else the latest
 * any witness judged (`judgedDelivery`); a requirement reads the truth-meet of its conditions'
 * readings there (seventh edition), and stands `uncovered` when no condition verifies it,
 * `verified` when it reads held on evidence, `presumed` when it reads held only because a witness
 * presumed it, `failed` when denied, `contested` when told both ways, and `unverified` while
 * nothing is told. Verification asks whether the thing was built as specified, and is anyone's
 * evidence; whether it was the right thing is the assayer's acceptance (validation).
 * @param {object} thread a request
 */
export function verificationOf(thread) {
  const { requirements, conditions } = thread.operative ?? operativeOf(thread);
  // A delivery answered the order of its own revision: one under an order since completed verifies nothing of this one.
  const witnessed = thread.deliveries.filter((delivery) => delivery.readings !== undefined && (delivery.revision ?? thread.refinements.length) === thread.refinements.length);
  const read = witnessed.find((delivery) => delivery.verdict === "accepted") ?? witnessed.at(-1);
  return Object.freeze(requirements.map((requirement) => {
    const verifying = conditions.filter((condition) => condition.verifies === undefined || condition.verifies.includes(requirement.id));
    const reading = read === undefined || verifying.length === 0 ? "unknown"
      : verifying.map((condition) => read.readings[condition.id] ?? "unknown").reduce(truthMeetReading, "held");
    const measured = read !== undefined && !verifying.some((condition) => (read.presumed ?? []).includes(condition.id));
    const standing = verifying.length === 0 ? "uncovered"
      : reading === "held" ? (measured ? "verified" : "presumed")
        : reading === "denied" ? "failed" : reading === "contested" ? "contested" : "unverified";
    return Object.freeze({
      requirement: requirement.id,
      priority: requirement.priority ?? "must",
      conditions: Object.freeze(verifying.map((condition) => condition.id)),
      methods: Object.freeze([...new Set(verifying.map((condition) => condition.method ?? "inspection"))].sort()),
      rerunnable: Object.freeze(verifying.filter((condition) => condition.assay !== undefined).map((condition) => condition.id)),
      reading,
      standing,
    });
  }));
}

/**
 * Each wager on an aim, read at a time (eighth edition; Rendanheyi's 对赌 read in Belnap's FOUR).
 * Its period runs from when it was made until `until`. It reads the latest value observed in its
 * period, every observation at that instant told for it (the value meets the target) or against
 * it, as SignCell evidence, so readers disagreeing is contested and nobody reading is unknown;
 * readers agreeing on the side but not the value are read at the margin all of them concede.
 * While the period runs the wager is `running`, with the reading so far; once it ends it is `met`
 * (held), `missed` (denied), `contested`, or `unread`: nothing observed, neither won nor lost, and
 * its reading owed. A met wager carries the value added above its target (`surplus`) and the
 * holder's share of it by its upside (`share`); a missed one its `shortfall` and the share of
 * value-added pay it forfeits by its downside (`forfeit`). Leaving the aim takes nothing back.
 * @param {object} thread an aim
 * @param {string} [at] the time read at; without one, every wager reads as running
 */
export function wagersOf(thread, at) {
  if (thread.opening.move !== "aim") return Object.freeze([]);
  const measures = new Map((thread.opening.measures ?? []).map((measure) => [measure.id, measure]));
  return Object.freeze((thread.wagers ?? []).map((wager) => {
    const measure = measures.get(wager.measure);
    const ended = at !== undefined && Date.parse(at) >= Date.parse(wager.until);
    const end = Math.min(Date.parse(wager.until), at === undefined ? Infinity : Date.parse(at));
    const within = (thread.observations ?? []).filter((observation) => observation.measure === wager.measure
      && Date.parse(observation.observed) >= Date.parse(wager.at) && Date.parse(observation.observed) <= end);
    const latest = Math.max(-Infinity, ...within.map((observation) => Date.parse(observation.observed)));
    const read = within.filter((observation) => Date.parse(observation.observed) === latest);
    const sides = toldEvidence({
      for: read.filter((observation) => meets(measure, observation.value, wager.target)).map((observation) => observation.player),
      against: read.filter((observation) => !meets(measure, observation.value, wager.target)).map((observation) => observation.player),
    });
    const reading = readingOfSides("extremal", sides.for.length > 0, sides.against.length > 0);
    const values = [...new Set(read.map((observation) => observation.value))].sort((a, b) => a - b);
    const standing = !ended ? "running" : { held: "met", denied: "missed", contested: "contested", unknown: "unread" }[reading];
    // Readers agreeing on the side but not the value: the margin read is the one every reader concedes.
    const margin = values.length === 0 ? undefined : Math.min(...values.map((value) => Math.abs(value - wager.target)));
    return Object.freeze({
      player: wager.player,
      measure: wager.measure,
      unit: measure.unit,
      target: wager.target,
      until: wager.until,
      benchmark: wager.benchmark,
      stake: wager.stake,
      at: wager.at,
      standing,
      reading,
      ...(values.length === 1 ? { value: values[0] } : optional("values", values)),
      ...optional("observed", read.length === 0 ? undefined : read[0].observed),
      ...(standing === "met" ? { surplus: margin, share: margin * wager.stake.upside } : {}),
      ...(standing === "missed" ? { shortfall: margin, forfeit: wager.stake.downside } : {}),
    });
  }));
}

/**
 * The holders an aim's wagers have found wanting (eighth edition): whose last two ended wagers on
 * it were both missed. A sustained miss costs the holder the order (对赌's downside, removal of
 * the unit's holder), and the order is open to bids again (抢单).
 * @param {object} thread an aim
 * @param {ReadonlyArray<object>} [readings] its wagers read at a time (`wagersOf`)
 */
export function forfeitedOf(thread, readings = thread.wagerReadings ?? []) {
  const holding = new Set(thread.holders.map((holder) => holder.player));
  const ended = readings.filter((wager) => !["running", "unread"].includes(wager.standing))
    .sort((a, b) => a.until.localeCompare(b.until) || a.measure.localeCompare(b.measure));
  return Object.freeze([...holding].filter((player) => {
    const own = ended.filter((wager) => wager.player === player).slice(-2);
    return own.length === 2 && own.every((wager) => wager.standing === "missed");
  }).sort());
}

function offerOf(offer) {
  if (offer === undefined) return undefined;
  const amount = Number(offer.amount ?? 0);
  const perDay = Number(offer.perDay ?? 0);
  const ceiling = offer.ceiling === undefined ? undefined : Number(offer.ceiling);
  if (![amount, perDay].every(Number.isFinite) || amount < 0 || perDay < 0) throw new TypeError("an offer is a non-negative amount and daily growth");
  if (ceiling !== undefined && (!Number.isFinite(ceiling) || ceiling < amount)) throw new TypeError("an offer's ceiling is at least its amount");
  return Object.freeze({ amount, perDay, ...(ceiling === undefined ? {} : { ceiling }), currency: named(offer.currency ?? "USD", "an offer's currency") });
}

/** Where an opening came from: a person's words, an issue, a check, a legacy record. Evidence, not content. */
function sourcesOf(list) {
  return Object.freeze([...(list ?? [])].map((source) => Object.freeze({
    kind: named(source.kind, "a source kind"),
    ...optional("locator", text(source.locator, "a source locator")),
    ...optional("commitment", text(source.commitment, "a source commitment")),
  })));
}

/**
 * A request may carry the asker's suggested breakdown of the work, as a structured work intent. It
 * is a suggestion the promiser may adopt or refine away, never an instruction about who does it.
 */
function planOf(plan) {
  if (plan === undefined) return undefined;
  if (plan?.kind !== "metroplat.work.structured-intent" || !Array.isArray(plan.items) || plan.items.length === 0) throw new TypeError("a request's plan is a structured work intent");
  return plan;
}

/**
 * What an opening is about: typed subjects, `<kind>:<value>`. A house section is spelled one way,
 * `section:<path from the agency root>` (`houseSectionOf`), whichever root or checkout it was
 * written from, and never ends in a bare `services/` step.
 */
const SCOPE_SUBJECT = /^[a-z][a-z0-9-]*:\S/;
const scopeOf = (input) => {
  if (input.scope === undefined) return {};
  if (typeof input.scope === "string" || !Array.isArray(input.scope)) throw new TypeError("a scope is a list of subjects");
  const subjects = strings(input.scope, "a scope subject").map((subject) => {
    const section = houseSectionOf(subject.replace(/\/services\/*$/, ""));
    if (section !== undefined) return `section:${section}`;
    if (!SCOPE_SUBJECT.test(subject)) throw new TypeError(`a scope subject is typed, <kind>:<value> (${subject})`);
    return subject;
  });
  return optional("scope", Object.freeze([...new Set(subjects)].sort()));
};

/**
 * Whose need an aim or request is (seventh edition; Rendanheyi's 单, the order of a specific,
 * identified user): a typed subject, `<kind>:<value>`, naming a party outside the house's own
 * proxies (a customer, a reader, a counterparty), never the office that writes it down.
 */
const userOf = (input) => {
  if (input.user === undefined) return {};
  const user = named(input.user, "a user");
  if (!SCOPE_SUBJECT.test(user)) throw new TypeError(`a user is a typed subject, <kind>:<value> (${user})`);
  return { user };
};

const CONTENT = {
  aim: (input) => {
    const purpose = bounded(input.purpose, "an aim's purpose", "statement");
    // An aim is a goal (KAOS Maintain): the state the house keeps, never the campaign that keeps it.
    const means = meansOf(purpose);
    if (means !== undefined) throw new TypeError(`an aim's purpose states what is kept so, not the activity ("${means} …")`);
    return {
    purpose,
    ...optional("measures", measuresOf(input.measures)),
    ...scopeOf(input),
    ...userOf(input),
    };
  },
  request(input, edition) {
    const need = bounded(input.need, "a request's need", "statement");
    if (META_REQUEST.test(need)) throw new TypeError("a request is the work item: its need says what is needed, not that a request be made");
    const means = meansOf(need);
    if (means !== undefined) throw new TypeError(`a request's need states the end wanted, not the activity ("${means} …"): say what will be so when it is met, and leave the means to its taker`);
    if (STAFFING_NEED.test(need)) throw new TypeError("a request's need is a state of the world, never hands to do work: staffing is its taker's, and a taker that cannot staff reports an obstacle that obstructs the thread it holds");
    const { requirements, conditions, returns, examples } = contractOf(input, edition);
    return {
      need,
      ...optional("requirements", requirements),
      ...optional("conditions", conditions),
      ...optional("returns", returns),
      ...optional("examples", examples),
      ...scopeOf(input),
      ...userOf(input),
      // A stated horizon is not part of what is asked: the horizon is read from the thread (horizonOf).
      ...optional("to", optionalPlayer(input.to, "a request's addressee")),
      ...optional("assayer", optionalPlayer(input.assayer, "a request's assayer")),
      ...optional("offer", offerOf(input.offer)),
      ...optional("plan", planOf(input.plan)),
    };
  },
  propose: (input) => {
    const addresses = strings(input.addresses, "an addressed issue");
    if (addresses.length === 0 && (input.serves ?? []).length === 0) {
      throw new TypeError("a proposal is a position on an issue (IBIS): it addresses the question, report or request it answers, or serves an aim; an idea with no issue states the issue first, as an ask");
    }
    return {
      idea: bounded(input.idea, "a proposal's idea", "statement"),
      ...optional("rationale", boundedText(input.rationale, "a proposal's rationale", "rationale")),
      ...optional("addresses", addresses),
      ...scopeOf(input),
    };
  },
  report: (input) => {
    const obstructs = strings(input.obstructs, "an obstructed thread").map(traceOrThreadOf);
    if ((obstructs.length > 0) !== (input.obstacle !== undefined)) throw new TypeError("an obstacle names its kind and the threads it obstructs, both or neither");
    return {
      observation: bounded(input.observation, "a report's observation", "finding"),
      ...optional("law", text(input.law, "the law a report finds broken")),
      ...optional("subject", text(input.subject, "what a report's law is broken at")),
      ...(obstructs.length === 0 ? {} : { obstacle: oneOf(input.obstacle, OBSTACLE_KINDS, undefined, "an obstacle's kind"), obstructs: Object.freeze(obstructs) }),
      ...optional("evidence", strings(input.evidence, "report evidence")),
      ...scopeOf(input),
    };
  },
  declare: (input) => ({
    ruling: bounded(input.ruling, "a declaration's ruling", "finding"),
    ...optional("rationale", boundedText(input.rationale, "a declaration's rationale", "rationale")),
    ...scopeOf(input),
  }),
  /**
   * A supply (eighteenth edition): a resource's holder binds itself to supply `amount` `unit`s of
   * `resource` until `until`, the guaranteed floor of what is left (organizing/enterprise/resources
   * names the resource; never a doer). `costs` says what one unit of each kind it makes takes, as
   * [lo, hi] in the pool's unit (hi null when unknown), and `admits` whether the pool admits work
   * while any is left (`open`, the last unit may overdraw) or only work that fits whole.
   */
  supply: (input, edition) => {
    if (edition.edition < EIGHTEENTH_EDITION.edition) throw new TypeError("a supply is admitted from the eighteenth edition of the arena's law");
    return {
      resource: named(input.resource, "a supply's resource"),
      amount: quantity(input.amount, "a supply's amount"),
      unit: named(input.unit, "a supply's unit"),
      until: instant(input.until, "when a supply lapses"),
      ...optional("costs", costsOf(input.costs)),
      ...optional("admits", input.admits === undefined ? undefined : oneOf(input.admits, ["open", "whole"], undefined, "what a supply admits")),
      ...scopeOf(input),
    };
  },
  ask: (input, edition) => ({
    question: bounded(input.question, "a question", "statement"),
    ...scopeOf(input),
    ...optional("to", optionalPlayer(input.to, "a question's addressee")),
    // A question names who chooses its answer, as a request names who assays it (seventeenth edition).
    ...(edition.edition >= SEVENTEENTH_EDITION.edition ? optional("assayer", optionalPlayer(input.assayer, "a question's assayer")) : {}),
  }),
};

/**
 * A thread's id: its opening's content without the time. A report naming the law it finds broken
 * and where is that condition's thread, whoever reports it and however it is worded.
 */
function threadIdOf(content) {
  // An obstacle of one kind on one thread is one condition: reporting it again corroborates it.
  if (content.move === "report" && content.obstacle !== undefined) {
    return semanticId({ move: "report", obstacle: content.obstacle, obstructs: content.obstructs });
  }
  if (content.move === "report" && content.law !== undefined && content.subject !== undefined) {
    return semanticId({ move: "report", law: content.law, subject: content.subject });
  }
  return semanticId(content);
}

const handOf = (input) => optional("hand", text(input.hand, "the account that played a move"));

/**
 * The edition a move is admitted under: the one its admitter names (the edition in force where it
 * is played), else the one a stored move records, else the newest this release realizes.
 */
function admittingEdition(input, options) {
  if (options?.law !== undefined) return options.law;
  if (input?.edition === undefined) return REALIZED_EDITION;
  const edition = editionAt(input.edition);
  if (edition === undefined) throw new TypeError(`a move admitted under law edition ${input.edition} is read only by a release that realizes it`);
  return edition;
}

/**
 * An opening move: its kind, its player, its content and how it stands to other threads (serves,
 * after, supersedes, relates), admitted under one edition of the law, whose address it records
 * (`edition`, beside its time, outside its content; a report's `law` is the law it finds broken,
 * which is content). Its id is its content without the time or edition, so opening the same thing
 * twice is one thread.
 */
export function openingOf(input, options) {
  const kind = input?.move;
  if (!OPENING_MOVES.includes(kind)) throw new TypeError(`an opening move is one of ${OPENING_MOVES.join(", ")}`);
  const edition = admittingEdition(input, options);
  const { hand, edition: _edition, ...said } = input;
  refuseDoers(said, `${kind === "aim" ? "an" : "a"} ${kind}`);
  const content = Object.freeze({
    move: kind,
    by: playerOf(input.by, "an opening's player"),
    ...CONTENT[kind](input, edition),
    ...optional("context", boundedText(input.context, "an opening's context", "context")),
    ...optional("tags", tagsOf(input.tags)),
    ...optional("serves", strings(input.serves, "a served thread")),
    ...optional("after", strings(input.after, "a preceding thread")),
    ...optional("supersedes", strings(input.supersedes, "a superseded thread")),
    ...optional("relates", strings(input.relates, "a related thread")),
    ...optional("sources", sourcesOf(input.sources)),
  });
  return built(Object.freeze({ id: input.id ?? threadIdOf(content), ...content, ...handOf(input), at: instant(input.at, "an opening's time"), edition: edition.address }));
}

// The moves this module built, so replay never judges a move it has just admitted twice.
const BUILT = new WeakSet();
const built = (move) => { BUILT.add(move); return move; };

/** What one unit of each kind a supply makes takes, in the supply's unit: { <kind>: [lo, hi | null] }. */
function costsOf(costs) {
  if (costs === undefined) return undefined;
  if (costs === null || typeof costs !== "object" || Array.isArray(costs)) throw new TypeError("a supply's costs map each kind to [lo, hi]");
  return Object.freeze(Object.fromEntries(Object.entries(costs).map(([kind, bounds]) => {
    if (!Array.isArray(bounds) || bounds.length !== 2) throw new TypeError(`a supply's cost of ${kind} is [lo, hi]`);
    const lo = quantity(bounds[0], `the least a ${kind} takes`);
    const hi = bounds[1] === null ? null : quantity(bounds[1], `the most a ${kind} takes`);
    if (hi !== null && hi < lo) throw new TypeError(`a supply's cost of ${kind} has its most below its least`);
    return [named(kind, "a kind a supply makes"), Object.freeze([lo, hi])];
  })));
}

/** A refinement or counter-offer's terms: a full contract, never naming who does the work. */
function termsOf(input, what, edition) {
  const fields = { ...contractOf(input, edition), ...scopeOf(input) };
  if (fields.requirements.length === 0 || fields.conditions.length === 0) throw new TypeError(`${what} states at least one requirement and one condition of satisfaction`);
  refuseDoers(fields, what);
  return fields;
}

const RESPONSE_FIELDS = {
  hold: (input) => optional("subject", text(input.subject, "the work subject a hold is worked under")),
  wager: (input) => ({
    measure: named(input.measure, "the measure a wager is on"),
    target: quantity(input.target, "a wager's target"),
    until: instant(input.until, "the end of a wager's period"),
    benchmark: benchmarkOf(input.benchmark),
    stake: stakeOf(input.stake),
  }),
  draw: (input) => ({
    amount: quantity(input.amount, "a draw's amount"),
    ...optional("kind", input.kind === undefined ? undefined : named(input.kind, "the kind a draw makes")),
    ...optional("count", input.count === undefined ? undefined : quantity(input.count, "how many of its kind a draw makes")),
    serves: (() => { const served = strings(input.serves, "the request a draw serves"); if (served.length === 0) throw new TypeError("a draw names the request it serves"); return served; })(),
  }),
  return: (input) => ({ amount: quantity(input.amount, "how much of a draw is returned") }),
  observe: (input) => {
    const evidence = strings(input.evidence, "observation evidence");
    // A reading is measured or it is not told (Obsmetrologia's Measured): there is no presumed reading.
    if (evidence.length === 0) throw new TypeError("an observation carries the evidence of the reading it tells");
    return {
      measure: named(input.measure, "the measure observed"),
      value: quantity(input.value, "an observed value"),
      ...optional("observed", input.observed === undefined ? undefined : instant(input.observed, "when an observed value held")),
      evidence,
    };
  },
  attach: (input) => {
    const allowed = new Set(["move", "thread", "by", "subject", "hand", "at", "edition"]);
    const extra = Object.keys(input).filter((key) => !allowed.has(key));
    if (extra.length > 0) throw new TypeError(`attach carries only a work subject; it cannot replace taking terms (${extra.join(", ")})`);
    return { subject: named(input.subject, "the work subject attached to a taking") };
  },
  leave: (input) => ({ ...optional("reason", text(input.reason, "why a holder leaves")), ...optional("obstacle", input.obstacle === undefined ? undefined : oneOf(input.obstacle, TAKER_OBSTACLES, undefined, "the taker's own obstacle a holder leaves for")) }),
  promise: (input) => optional("subject", text(input.subject, "the work subject a promise is held under")),
  decline: (input) => ({ reason: named(input.reason, "a decline's reason") }),
  refine: (input, edition) => ({
    ...termsOf(input, "a refinement", edition),
    ...optional("completes", text(input.completes, "the order a refinement completes")),
    ...optional("evidence", strings(input.evidence, "the evidence of the miss a completion answers")),
  }),
  counter: (input, edition) => ({ ...termsOf(input, "a counter-offer", edition), ...optional("reason", text(input.reason, "a counter-offer's reason")) }),
  agree: (input) => ({ to: playerOf(input.to, "the player whose counter-offer is agreed") }),
  release: (input) => ({ ...optional("reason", input.reason === undefined ? undefined : String(input.reason)), ...optional("obstacle", input.obstacle === undefined ? undefined : oneOf(input.obstacle, TAKER_OBSTACLES, undefined, "the taker's own obstacle a promise is released for")) }),
  deliver: (input) => ({
    evidence: strings(input.evidence, "delivery evidence"),
    ...optional("claims", [...(input.claims ?? [])].map((claim) => Object.freeze({ condition: named(claim.condition, "a claimed condition"), evidence: strings(claim.evidence, "claim evidence") }))),
  }),
  accept: (input) => ({ of: playerOf(input.of, "the player whose delivery or answer is accepted"), ...optional("evidence", strings(input.evidence, "assay evidence")) }),
  reject: (input) => ({ of: playerOf(input.of, "the player whose delivery is rejected"), unmet: strings(input.unmet, "an unmet condition"), ...optional("reason", input.reason === undefined ? undefined : String(input.reason)), ...optional("evidence", strings(input.evidence, "assay evidence")) }),
  withdraw: (input) => optional("reason", input.reason === undefined ? undefined : String(input.reason)),
  adopt: (input) => ({ ...optional("request", text(input.request, "the request an adoption holds")), ...optional("subject", text(input.subject, "the work subject an adoption is worked under")) }),
  argue: (input) => ({
    stance: oneOf(input.stance, ARGUMENT_STANCES, undefined, "an argument's stance"),
    says: bounded(input.says, "an argument", "statement"),
    ...optional("evidence", strings(input.evidence, "argument evidence")),
  }),
  corroborate: (input) => ({ evidence: strings(input.evidence, "corroborating evidence"), ...optional("observation", text(input.observation, "a corroborating observation")) }),
  resolve: (input) => ({ evidence: strings(input.evidence, "resolving evidence") }),
  answer: (input) => ({ says: named(input.says, "an answer"), ...optional("evidence", strings(input.evidence, "answer evidence")) }),
};

/** A response move on a thread, admitted under one edition of the law, whose address it records. */
export function responseOf(input, options) {
  const move = input?.move;
  if (!(move in RESPONSE_FIELDS)) throw new TypeError(`a response move is one of ${Object.keys(RESPONSE_FIELDS).join(", ")}`);
  const edition = admittingEdition(input, options);
  return built(Object.freeze({
    move,
    thread: named(input.thread, "a response's thread"),
    by: playerOf(input.by, "a response's player"),
    ...RESPONSE_FIELDS[move](input, edition),
    ...handOf(input),
    at: instant(input.at, "a response's time"),
    edition: edition.address,
  }));
}

/**
 * Any move: an opening when its kind opens a thread, else a response. `options.law` is the edition
 * that admits it (the edition in force where it is played); a stored move keeps the one it records.
 */
export const moveOf = (input, options) => (OPENING_MOVES.includes(input?.move) ? openingOf(input, options) : responseOf(input, options));

/** Whose assay accepts a request's deliveries, or an ask's answers: the named assayer, else the opener. */
export const assayerOf = (thread) => thread.opening.assayer ?? thread.opening.by;

/** Who a thread is addressed to: the player whose counter-offer was agreed (its award), else the opening's addressee. */
export const addresseeOf = (thread) => thread.awarded ?? thread.opening.to;

/**
 * The operative contract of a request: the opener's own statements, or the latest refinement or
 * agreed counter-offer; at `revision`, as it stood after that many of them (what a delivery made
 * then answered).
 */
export function operativeOf(thread, revision = thread.refinements.length) {
  const refinement = thread.refinements.slice(0, revision).at(-1);
  const requirements = refinement?.requirements ?? thread.opening.requirements ?? [];
  const conditions = refinement?.conditions ?? thread.opening.conditions ?? [];
  // The closure stands with the terms that state it: a refinement restates the whole contract.
  const terms = refinement ?? thread.opening;
  return Object.freeze({
    need: thread.opening.need,
    requirements,
    conditions,
    ...optional("returns", terms.returns),
    ...optional("examples", terms.examples),
    scope: refinement?.scope ?? thread.opening.scope ?? [],
    uncovered: uncoveredOf({ requirements, conditions }),
  });
}

/**
 * The order a request's takers work to (fourteenth edition): the content address of its operative
 * contract, the need, requirements, conditions and scope, at `revision` (by default, now). Every
 * taker reads the same order, and a delivery answers the order of its own revision.
 */
export function orderOf(thread, revision) {
  const { need, requirements, conditions, scope, returns, examples } = operativeOf(thread, revision);
  // An order without a closure keeps the address it had before orders could carry one.
  return semanticId({ need, requirements, conditions, scope, ...optional("returns", returns), ...optional("examples", examples) });
}

/** How many times a request's order has been completed after a miss. */
export const completionsOf = (thread) => thread.refinements.filter((refinement) => refinement.completes !== undefined).length;

/**
 * The delivery that shows a request's order incomplete, if any: the latest judged under the order
 * in force, when it was rejected and no delivery awaits a verdict.
 */
function rejectedUnderOrder(thread) {
  if (thread.opening.move !== "request" || thread.deliveries.some((delivery) => delivery.verdict === undefined)) return undefined;
  const revision = thread.refinements.length;
  const judged = thread.deliveries.findLast((delivery) => delivery.verdict !== undefined && (delivery.revision ?? revision) === revision);
  return judged?.verdict === "rejected" ? judged : undefined;
}

/**
 * A request is refined when its operative contract states requirements and conditions of
 * satisfaction, and every must-requirement is verified by some condition.
 */
export const isRefined = (thread) => {
  const operative = operativeOf(thread);
  return operative.requirements.length > 0 && operative.conditions.length > 0 && operative.uncovered.length === 0;
};

function standingOf(thread) {
  if (thread.supersededBy !== undefined) return "superseded";
  if (thread.withdrawn !== undefined) return "withdrawn";
  switch (thread.opening.move) {
    case "aim": return thread.holders.length > 0 ? "held" : "open";
    case "request": {
      if (thread.accepted !== undefined) return "accepted";
      if (thread.deliveries.some((delivery) => delivery.verdict === undefined)) return "delivered";
      if (thread.promisers.length > 0) return "promised";
      if (thread.declines.length > 0 && addresseeOf(thread) !== undefined) return "declined";
      return "open";
    }
    case "propose": return thread.adoptions.length > 0 ? "adopted" : "open";
    case "report": return thread.resolution !== undefined ? "resolved" : thread.adoptions.length > 0 ? "adopted" : "open";
    case "ask": return thread.accepted !== undefined ? "accepted" : thread.answers.length > 0 ? "answered" : "open";
    case "declare": return "in-force";
    case "supply": return supplyLeftOf(thread) > 0 ? "open" : "drawn";
    default: throw new TypeError(`unknown opening ${thread.opening.move}`);
  }
}

/**
 * What is left of a supply (eighteenth edition), read from the record: its supplier's latest reading
 * of what remains (the least of those sharing the latest time), else its stated floor, less what was drawn after that reading and plus what was
 * returned after it.
 */
export function supplyLeftOf(thread) {
  const readings = (thread.observations ?? []).filter((observation) => observation.player === thread.opening.by && observation.measure === "remaining");
  const latest = readings.reduce((best, observation) => (best === undefined || observation.observed > best.observed || (observation.observed === best.observed && observation.value < best.value) ? observation : best), undefined);
  const since = latest?.observed ?? "";
  const after = (entry) => entry.at > since;
  const drawn = (thread.draws ?? []).filter(after).reduce((sum, draw) => sum + draw.amount, 0);
  const returned = (thread.returns ?? []).filter(after).reduce((sum, entry) => sum + entry.amount, 0);
  return (latest?.value ?? thread.opening.amount) - drawn + returned;
}

/** How much of a supply a player holds drawn: its draws less its returns. */
function drawnBy(thread, player, same = (a, b) => a === b) {
  const sum = (list) => list.filter((entry) => same(entry.player, player)).reduce((total, entry) => total + entry.amount, 0);
  return sum(thread.draws ?? []) - sum(thread.returns ?? []);
}

const freshThread = (opening) => ({
  opening, holders: [], left: [], promisers: [], releases: [], declines: [], refinements: [], counters: [], deliveries: [], adoptions: [], corroborations: [], restatements: [], answers: [], arguments: [],
});

/** The players holding a thread up, by its kind: holders, promisers, answerers or adopters. */
export function takersOf(thread) {
  switch (thread.opening.move) {
    case "aim": return thread.holders.map((holder) => holder.player);
    case "request": return thread.promisers.map((promiser) => promiser.player);
    case "ask": return thread.answers.map((answer) => answer.player);
    case "supply": return [...new Set((thread.draws ?? []).filter((draw) => drawnBy(thread, draw.player) > 0).map((draw) => draw.player))];
    default: return thread.adoptions.map((adoption) => adoption.player);
  }
}

/** The active board record by which one player currently holds this thread, if any. */
export function activeTakingOf(thread, player, playerIdentity = (value) => value) {
  const entries = thread.opening.move === "aim" ? thread.holders
    : thread.opening.move === "request" ? thread.promisers
      : ["propose", "report"].includes(thread.opening.move) ? thread.adoptions : [];
  return Object.freeze(entries.filter((entry) => playerIdentity(entry.player) === playerIdentity(player)));
}

/** Whether this player has already released this thread rather than carrying a current taking. */
export function hasReleasedTakingOf(thread, player, playerIdentity = (value) => value) {
  return (thread.releases ?? []).some((release) => playerIdentity(release.player) === playerIdentity(player));
}

/** Whether that taking still carries work in the taker's own root rather than awaiting another receiver. */
export function hasCurrentTakingObligation(thread) {
  const standing = thread.standing ?? standingOf(thread);
  if (thread.opening.move === "aim") return standing === "held";
  if (thread.opening.move === "request") return standing === "promised";
  if (["propose", "report"].includes(thread.opening.move)) return standing === "adopted";
  return false;
}

/**
 * Discover the current thread from the work subject a taking admitted, rather
 * than treating a historical source receipt as the thread's current address.
 * Opening subjects retain their existing lookup semantics. Released, closed
 * and delivered takings no longer identify current work in the taker's root.
 */
export function workSubjectMatchesThread(thread, subject) {
  if (typeof subject !== "string" || subject.length === 0) return false;
  if (thread.opening.subject === subject) return true;
  if (!hasCurrentTakingObligation(thread)) return false;
  const entries = thread.opening.move === "aim" ? thread.holders
    : thread.opening.move === "request" ? thread.promisers : thread.adoptions;
  return entries.some((entry) => entry.subject === subject);
}

/** Existing, open commitments whose canonical admission has not yet been attached to the taking. */
export function threadsNeedingWorkWitness(player, board, playerIdentity = (value) => value) {
  return Object.freeze(board.threads.filter((thread) => {
    if (CLOSED_STANDINGS.includes(thread.standing) || !["aim", "request", "propose", "report"].includes(thread.opening.move)) return false;
    return hasCurrentTakingObligation(thread) && activeTakingOf(thread, player, playerIdentity).some((entry) => entry.subject === undefined);
  }));
}

/**
 * Who has said a report's condition since it last opened: its reporter and each corroborator, or,
 * once a resolved condition was found again, whoever found it and those after. Corroboration is
 * independent attestation, so each party counts once while the condition stands; a witness's
 * repeat is kept as a restatement.
 */
export function witnessesOf(thread) {
  const reopened = thread.corroborations.findLastIndex((corroboration) => corroboration.recurs);
  const said = reopened < 0 ? [{ player: thread.opening.by }, ...thread.corroborations] : thread.corroborations.slice(reopened);
  return Object.freeze([...new Set(said.map((entry) => entry.player))]);
}

const operativeAt = (thread, revision) => (revision === undefined ? thread.operative ?? operativeOf(thread) : operativeOf(thread, revision));

/** What a request's delivery answers for: each condition of satisfaction of its order (`revision`, else the operative one) by id, and the need itself. */
export const claimsOf = (thread, revision) => Object.freeze([...operativeAt(thread, revision).conditions.map((condition) => condition.id), "need"]);

/**
 * The claims a judgement names unmet, read against the contract: a condition by its id, a
 * requirement as the conditions that verify it, and anything else (or a requirement nothing
 * verifies) as the need.
 */
function unmetClaimsOf(thread, named, revision) {
  const { requirements, conditions } = operativeAt(thread, revision);
  const claims = claimsOf(thread, revision);
  const verifying = (id) => conditions.filter((condition) => condition.verifies === undefined || condition.verifies.includes(id)).map((condition) => condition.id);
  return Object.freeze([...new Set(named.flatMap((id) => {
    if (claims.includes(id)) return [id];
    const verifiers = requirements.some((requirement) => requirement.id === id) ? verifying(id) : [];
    return verifiers.length > 0 ? verifiers : ["need"];
  }))].sort());
}

const JUDGED_FIELDS = Object.freeze(["verdict", "unmet", "reason", "assay", "judgedAt", "reading", "readings", "presumed"]);

/**
 * A delivery read from what its witnesses told (seventh edition; Obsmetrologia's `Valued`, as
 * SignCell's evidence): each claim (`claimsOf`) collects the players who told it met and those who
 * told it unmet, two grow-only sets that merge as a join, so a judgement replays the same whatever
 * order its witnesses came in and a witness saying it again adds nothing. A claim reads `unknown`,
 * `held`, `denied` or `contested` by which sides were told (Belnap's FOUR), and the delivery reads
 * the truth-meet of its claims. A claim told by a witness who brought no evidence is `presumed`
 * (Obsmetrologia's `presumeFree`, the only sanctioned breach of measurement, and marked as one).
 *
 * The verdict the rest of the house reads is derived: `rejected` when the delivery reads denied or
 * contested, `accepted` when it reads held and its assayer told the need met (verification is
 * anyone's evidence; validation, that it was the right thing, is the assayer's), else none yet.
 */
function judgedDelivery(delivery, claims, judge, identity) {
  const base = Object.fromEntries(Object.entries(delivery).filter(([key]) => !JUDGED_FIELDS.includes(key)));
  const witnesses = delivery.witnesses ?? [];
  if (witnesses.length === 0) return base;
  const readings = {};
  const presumed = [];
  for (const claim of claims) {
    const telling = (side) => witnesses.filter((witness) => witness[side].includes(claim));
    const sides = toldEvidence({ for: telling("met").map((witness) => identity(witness.player)), against: telling("unmet").map((witness) => identity(witness.player)) });
    readings[claim] = readingOfSides("extremal", sides.for.length > 0, sides.against.length > 0);
    if ([...telling("met"), ...telling("unmet")].some((witness) => (witness.evidence ?? []).length === 0)) presumed.push(claim);
  }
  const reading = claims.map((claim) => readings[claim]).reduce(truthMeetReading, "held");
  const validated = witnesses.some((witness) => identity(witness.player) === identity(judge) && witness.met.includes("need"));
  const verdict = reading === "denied" || reading === "contested" ? "rejected" : reading === "held" && validated ? "accepted" : undefined;
  const against = witnesses.filter((witness) => witness.unmet.length > 0);
  return {
    ...base,
    reading,
    readings: Object.freeze(readings),
    ...optional("presumed", presumed),
    ...(verdict === undefined ? {} : {
      verdict,
      ...(verdict === "rejected" ? { unmet: Object.freeze(claims.filter((claim) => ["denied", "contested"].includes(readings[claim]))), ...optional("reason", against.findLast((witness) => witness.reason !== undefined)?.reason) } : {}),
      ...optional("assay", [...new Set(witnesses.flatMap((witness) => witness.evidence ?? []))]),
      judgedAt: witnesses.at(-1).at,
    }),
  };
}

/** The legal-move rule for one thread: refuses (throws) a move outside En(x). */
function extendThread(thread, move, playerIdentity) {
  const same = (left, right) => playerIdentity(left) === playerIdentity(right);
  const kind = thread.opening.move;
  const fail = (why) => { throw new TypeError(`${move.move} on ${kind} ${thread.opening.id}: ${why}`); };
  if (!RESPONSE_MOVES[kind].includes(move.move)) fail(`a ${kind} is not answered by ${move.move}`);
  const standing = standingOf(thread);
  const recurring = standing === "resolved" && move.move === "corroborate";
  // A telling is a join into what is known (`TOLD_MOVES`): it is admitted after the thread closes,
  // where it reopens nothing; only a coordinated move is refused for the thread's standing.
  const told = TOLD_MOVES[kind].includes(move.move);
  const ended = ["withdrawn", "superseded"].includes(standing);
  if (CLOSED_STANDINGS.includes(standing) && !told) fail(`the thread is ${standing}`);
  const opener = thread.opening.by;
  const judge = assayerOf(thread);
  // A thread is a game between its opener's side (the opener and the assayer it names) and the rest
  // (work-game's polarity): nobody takes up, delivers on or gives back a thread it speaks for, which
  // would leave a delivery no one but its deliverer may assay. Work an office owes itself is its own
  // root's, never the board's.
  if (TAKER_MOVES.includes(move.move) && (same(move.by, opener) || same(move.by, judge))) fail(`${move.by} speaks for its ${kind}, so it does not play its takers' side`);
  const promised = (player) => thread.promisers.some((promiser) => same(promiser.player, player));
  const delivered = thread.deliveries.length > 0;
  const quantifiedMeasure = (id) => {
    const measure = (thread.opening.measures ?? []).find((statement) => statement.id === id);
    if (measure === undefined) fail(`the aim states no measure ${id}`);
    if (measure.unit === undefined) fail(`measure ${id} states no unit, so no value of it can be read against a target`);
    return measure;
  };
  const next = { ...thread };
  switch (move.move) {
    case "attach": {
      if (!hasCurrentTakingObligation(thread)) fail("the taking no longer owns current work (a delivered request awaits its assayer)");
      const entries = activeTakingOf(thread, move.by, playerIdentity);
      if (entries.length !== 1) fail(`${move.by} has no unique standing taking to attach work to`);
      if (entries[0].subject !== undefined) fail(`${move.by}'s taking already has a work subject`);
      const expected = `structured-work-intent-${slugify(intentOfThread(thread).id) || "slug"}`;
      if (move.subject !== expected) fail(`the attached subject must be this taking's admitted work (${expected})`);
      const field = kind === "aim" ? "holders" : kind === "request" ? "promisers" : "adoptions";
      next[field] = thread[field].map((entry) => playerIdentity(entry.player) === playerIdentity(move.by)
        ? { ...entry, subject: move.subject, subjectAttachedAt: move.at }
        : entry);
      break;
    }
    case "hold":
      if (thread.holders.some((holder) => same(holder.player, move.by))) fail(`${move.by} holds it already`);
      next.holders = [...thread.holders, { player: move.by, at: move.at, ...optional("subject", move.subject), ...optional("hand", move.hand) }];
      break;
    case "wager": {
      const measure = quantifiedMeasure(move.measure);
      if (Date.parse(move.until) <= Date.parse(move.at)) fail("a wager's period ends after it is made");
      if (!meets(measure, move.target, move.benchmark.value)) {
        fail(`target ${move.target} ${measure.unit} falls short of the benchmark ${move.benchmark.value} (${move.benchmark.of}): a leading goal is set at the best comparable performance or beyond, never by increment`);
      }
      const running = (thread.wagers ?? []).find((wager) => same(wager.player, move.by) && wager.measure === move.measure && Date.parse(wager.until) > Date.parse(move.at));
      if (running !== undefined) fail(`${move.by}'s wager on ${move.measure} runs until ${running.until}; a wager is not renegotiated while it runs`);
      // A holder found wanting by a sustained miss does not stake its way back in: it leaves, and others bid.
      if (forfeitedOf(thread, wagersOf(thread, move.at)).some((player) => same(player, move.by))) fail(`${move.by}'s last two wagers on it missed; it leaves the aim, and the order is open to others' bids`);
      next.wagers = [...(thread.wagers ?? []), { player: move.by, measure: move.measure, target: move.target, until: move.until, benchmark: move.benchmark, stake: move.stake, at: move.at }];
      // The order is grabbed by wagering on it (qiangdan): a bidder not yet holding the aim holds it.
      if (!thread.holders.some((holder) => same(holder.player, move.by))) next.holders = [...thread.holders, { player: move.by, at: move.at }];
      break;
    }
    case "observe": {
      if (kind === "supply") {
        // The supplier restates what is left, holds and other sessions included; nobody else's reading counts.
        if (move.measure !== "remaining") fail("a supply is observed by what remains of it (measure remaining)");
        if (Date.parse(move.observed ?? move.at) > Date.parse(move.at)) fail("a reading of what remains is read once it has held, never ahead of its telling");
        next.observations = [...(thread.observations ?? []), { player: move.by, measure: move.measure, value: move.value, observed: move.observed ?? move.at, evidence: move.evidence, at: move.at }];
        break;
      }
      quantifiedMeasure(move.measure);
      const observed = move.observed ?? move.at;
      if (Date.parse(observed) > Date.parse(move.at)) fail("a value is observed once it has held, never ahead of it");
      next.observations = [...(thread.observations ?? []), { player: move.by, measure: move.measure, value: move.value, observed, evidence: move.evidence, at: move.at }];
      break;
    }
    case "draw": {
      if (Date.parse(move.at) > Date.parse(thread.opening.until)) fail(`the supply lapsed at ${thread.opening.until}`);
      if (!(move.amount > 0)) fail("a draw takes some of the supply");
      const left = supplyLeftOf(thread);
      // Admitting while any is left lets the last draw overdraw the floor; a whole supply admits only what fits.
      if (thread.opening.admits === "open" ? left <= 0 : move.amount > left) fail(`${move.amount} ${thread.opening.unit} is more than the ${left} left`);
      next.draws = [...(thread.draws ?? []), { player: move.by, amount: move.amount, ...optional("kind", move.kind), ...optional("count", move.count), serves: move.serves, at: move.at }];
      break;
    }
    case "return":
      if (move.amount > drawnBy(thread, move.by, same)) fail(`${move.by} holds less than ${move.amount} of the supply to return`);
      next.returns = [...(thread.returns ?? []), { player: move.by, amount: move.amount, at: move.at }];
      break;
    case "leave":
      if (!thread.holders.some((holder) => same(holder.player, move.by))) fail(`${move.by} does not hold it`);
      next.holders = thread.holders.filter((holder) => !same(holder.player, move.by));
      next.left = [...thread.left, { player: move.by, at: move.at, ...optional("subject", thread.holders.find((holder) => same(holder.player, move.by)).subject), ...optional("reason", move.reason), ...optional("obstacle", move.obstacle) }];
      break;
    case "promise": {
      const to = addresseeOf(thread);
      if (to !== undefined && !same(to, move.by)) fail(`it is addressed to ${to}`);
      if (promised(move.by)) fail(`${move.by} has promised it already`);
      next.promisers = [...thread.promisers, { player: move.by, at: move.at, ...optional("subject", move.subject), ...optional("hand", move.hand) }];
      break;
    }
    case "decline":
      if (!same(addresseeOf(thread), move.by)) fail("only its addressee declines a request");
      next.declines = [...thread.declines, { player: move.by, reason: move.reason, at: move.at }];
      break;
    case "refine": {
      const terms = { player: move.by, ...termsOf(move, "a refinement", editionAt(move.edition) ?? REALIZED_EDITION) };
      if (move.completes !== undefined) {
        // Completing the order (fourteenth edition): a miss is the order's, so its opener or assayer
        // restates it whole, naming the order it completes and the evidence of the miss. The
        // takers' work under the old order lapses (`retaken`) and each takes the completed one anew.
        if (!same(move.by, opener) && !same(move.by, judge)) fail("only its opener or assayer completes its order; a taker never writes the order it makes");
        if (move.completes !== orderOf(thread)) fail(`it completes the order in force (${orderOf(thread)}), not ${move.completes}`);
        if (thread.deliveries.some((delivery) => delivery.verdict === undefined)) fail("its order is completed once no delivery awaits a verdict");
        if ((move.evidence ?? []).length === 0) fail("a completion carries the evidence of the miss it answers");
        if (orderOf({ ...thread, refinements: [...thread.refinements, terms] }) === move.completes) fail("a completion adds to the order; restating the same terms is the same order");
        const retaken = thread.promisers.filter((promiser) => promiser.subject !== undefined).map((promiser) => ({ player: promiser.player, subject: promiser.subject }));
        next.refinements = [...thread.refinements, { ...terms, completes: move.completes, evidence: move.evidence, ...optional("retaken", retaken), at: move.at }];
        next.promisers = thread.promisers.map(({ subject: _subject, subjectAttachedAt: _attached, ...promiser }) => promiser);
        break;
      }
      // The asker restates its own contract until something is delivered; a promiser elicits one
      // only where the asker stated none. Changing terms the asker stated is a counter-offer.
      if (delivered) fail("it is refined before anything is delivered, or completed after a miss");
      if (!same(move.by, opener) && !same(move.by, judge) && !(promised(move.by) && !isRefined(thread))) fail("only its opener or assayer refines it, or a promiser while it states no contract; others counter-offer");
      next.refinements = [...thread.refinements, { ...terms, at: move.at }];
      break;
    }
    case "counter":
      if (delivered) fail("terms are countered before anything is delivered");
      if (same(move.by, opener)) fail("its opener refines it rather than countering");
      next.counters = [...thread.counters.filter((counter) => !same(counter.player, move.by)), { player: move.by, ...termsOf(move, "a counter-offer", editionAt(move.edition) ?? REALIZED_EDITION), ...optional("reason", move.reason), at: move.at }];
      break;
    case "agree": {
      if (!same(move.by, opener) && !same(move.by, judge)) fail(`only ${opener} or its assayer agrees to terms`);
      if (delivered) fail("terms are agreed before anything is delivered");
      const counter = thread.counters.find((candidate) => same(candidate.player, move.to));
      if (counter === undefined) fail(`${move.to} has offered no terms`);
      const to = addresseeOf(thread);
      if (to !== undefined && !same(to, move.to) && !promised(move.to)) fail(`it is addressed to ${to}`);
      const { reason: _reason, ...terms } = counter;
      next.refinements = [...thread.refinements, { ...terms, agreedBy: move.by, at: move.at }];
      next.counters = thread.counters.filter((candidate) => !same(candidate.player, move.to));
      if (!promised(move.to)) next.awarded = move.to;
      break;
    }
    case "release":
      if (!promised(move.by)) fail(`${move.by} holds no promise on it`);
      // A released promise leaves the standing but not the record: what it committed is priced as lapsed.
      next.releases = [...(thread.releases ?? []), { ...thread.promisers.find((promiser) => same(promiser.player, move.by)), released: move.at, ...optional("reason", move.reason), ...optional("obstacle", move.obstacle) }];
      next.promisers = thread.promisers.filter((promiser) => !same(promiser.player, move.by));
      if (same(thread.awarded, move.by)) next.awarded = undefined;
      break;
    case "deliver":
      if (!promised(move.by)) fail(`${move.by} delivers only what it promised`);
      if (thread.deliveries.some((delivery) => same(delivery.player, move.by) && delivery.verdict === undefined)) fail(`${move.by}'s last delivery awaits its assay`);
      // A delivery answers the order in force when it is made (fourteenth edition).
      next.deliveries = [...thread.deliveries, { player: move.by, evidence: move.evidence, ...optional("claims", move.claims), revision: thread.refinements.length, at: move.at }];
      break;
    case "accept":
    case "reject": {
      if (kind === "ask") {
        if (!same(move.by, judge)) fail(`only ${judge} accepts an answer`);
        if (move.move === "reject" || !thread.answers.some((answer) => same(answer.player, move.of))) fail(`${move.of} has not answered it`);
        next.accepted = move.of;
        break;
      }
      // A judgement is a witness told into the delivery's evidence (seventh edition, `judgedDelivery`):
      // the assayer may presume, anyone else but the deliverer witnesses only with evidence, and
      // what was told before stays told, so a later witness against an accepted delivery contests it.
      const index = thread.deliveries.findLastIndex((delivery) => same(delivery.player, move.of));
      if (index < 0) {
        // A judgment is a telling (seventh and ninth editions), and a telling is never refused for
        // what was or was not played before it (seventeenth edition; ObsmetrologiaComputing
        // WorkArena `fragment_law`): one told before the delivery it would judge stands is kept as
        // knowledge on the thread and bears on no delivery.
        if ((editionAt(move.edition) ?? REALIZED_EDITION).edition < SEVENTEENTH_EDITION.edition) fail(`${move.of} has delivered nothing`);
        next.early = [...(thread.early ?? []), { player: move.by, of: move.of, move: move.move, ...optional("unmet", move.unmet), ...optional("evidence", move.evidence), at: move.at }];
        break;
      }
      if (same(move.by, move.of)) fail("a deliverer does not witness its own delivery");
      if (!same(move.by, judge) && (move.evidence ?? []).length === 0) fail(`a witness other than ${judge} brings evidence`);
      // Judged against the order it answered, never terms written after it.
      const revision = thread.deliveries[index].revision;
      const claims = claimsOf(thread, revision);
      const witness = {
        player: move.by,
        met: move.move === "accept" ? claims : Object.freeze([]),
        unmet: move.move === "reject" ? unmetClaimsOf(thread, move.unmet, revision) : Object.freeze([]),
        ...optional("evidence", move.evidence),
        ...optional("reason", move.reason),
        at: move.at,
      };
      const delivery = thread.deliveries[index];
      const judged = judgedDelivery({ ...delivery, witnesses: [...(delivery.witnesses ?? []), witness] }, claims, judge, playerIdentity);
      next.deliveries = thread.deliveries.map((entry, at) => (at === index ? judged : entry));
      const accepted = next.deliveries.find((entry) => entry.verdict === "accepted")?.player;
      // A contract withdrawn or superseded keeps the knowledge told into it, but nobody is accepted under it.
      if (ended) break;
      if (accepted === undefined) delete next.accepted;
      else next.accepted = accepted;
      break;
    }
    case "withdraw":
      if (!same(move.by, opener)) fail(`only ${opener} withdraws it`);
      next.withdrawn = { at: move.at, ...optional("reason", move.reason) };
      break;
    case "adopt":
      if (thread.adoptions.some((adoption) => same(adoption.player, move.by))) fail(`${move.by} has adopted it already`);
      next.adoptions = [...thread.adoptions, { player: move.by, at: move.at, ...optional("request", move.request), ...optional("subject", move.subject), ...optional("hand", move.hand) }];
      break;
    case "argue":
      next.arguments = [...(thread.arguments ?? []), { player: move.by, stance: move.stance, says: move.says, ...optional("evidence", move.evidence), at: move.at }];
      break;
    case "corroborate":
      // A party saying again what it already said is no second witness (sixth edition): it
      // restates, which keeps what it adds without counting it twice.
      if (!recurring && witnessesOf(thread).some((player) => same(player, move.by))) {
        next.restatements = [...(thread.restatements ?? []), { player: move.by, evidence: move.evidence, ...optional("observation", move.observation), at: move.at }];
        break;
      }
      next.corroborations = [...thread.corroborations, { player: move.by, evidence: move.evidence, ...optional("observation", move.observation), at: move.at, ...(recurring ? { recurs: true } : {}) }];
      if (recurring) delete next.resolution;
      break;
    case "resolve":
      next.resolution = { player: move.by, evidence: move.evidence, at: move.at };
      break;
    case "answer":
      next.answers = [...thread.answers, { player: move.by, says: move.says, ...optional("evidence", move.evidence), at: move.at }];
      break;
    default: fail("unknown move");
  }
  return next;
}

/** How an opening stands to the threads it names: what it serves is open work or an aim, and what it comes after exists. */
function relateOpening(threads, move) {
  for (const id of move.serves ?? []) {
    const served = threads[id];
    if (served === undefined) throw new TypeError(`${move.move} ${move.id} serves ${id}, which is not on this board`);
    if (!["request", "aim"].includes(served.opening.move)) throw new TypeError(`${move.move} ${move.id} serves ${id}, a ${served.opening.move}; work serves requests and aims`);
    if (["withdrawn", "superseded"].includes(standingOf(served))) throw new TypeError(`${move.move} ${move.id} serves ${id}, which is ${standingOf(served)}`);
  }
  for (const id of move.after ?? []) {
    if (threads[id] === undefined) throw new TypeError(`${move.move} ${move.id} comes after ${id}, which is not on this board`);
  }
  for (const id of move.addresses ?? []) {
    const issue = threads[id];
    if (issue === undefined) throw new TypeError(`proposal ${move.id} addresses ${id}, which is not on this board`);
    if (!["ask", "report", "request", "propose"].includes(issue.opening.move)) throw new TypeError(`proposal ${move.id} addresses ${id}, a ${issue.opening.move}; a position answers a question, a report, a request or another position`);
    if (CLOSED_STANDINGS.includes(standingOf(issue))) throw new TypeError(`proposal ${move.id} addresses ${id}, which is ${standingOf(issue)}`);
  }
  for (const target of move.obstructs ?? []) {
    const id = threadOfTrace(target);
    const obstructed = threads[id];
    if (obstructed === undefined) throw new TypeError(`obstacle ${move.id} obstructs ${id}, which is not on this board`);
    if (!["request", "aim"].includes(obstructed.opening.move)) throw new TypeError(`obstacle ${move.id} obstructs ${id}, a ${obstructed.opening.move}; an obstacle stands in the way of work or an aim`);
    if (CLOSED_STANDINGS.includes(standingOf(obstructed))) throw new TypeError(`obstacle ${move.id} obstructs ${id}, which is ${standingOf(obstructed)}`);
    if (target.includes("#")) {
      const { requirement } = splitTrace(target);
      const stated = obstructed.opening.move === "aim" ? (obstructed.opening.measures ?? []) : operativeOf(obstructed).requirements;
      if (!stated.some((statement) => statement.id === requirement)) throw new TypeError(`obstacle ${move.id} obstructs ${target}, which that thread does not state`);
    }
  }
  for (const requirement of move.requirements ?? []) {
    for (const trace of requirement.traces ?? []) {
      const { thread, requirement: traced } = splitTrace(trace);
      if (!(move.serves ?? []).includes(thread)) throw new TypeError(`requirement ${requirement.id} traces to ${thread}, which ${move.move} ${move.id} does not serve`);
      const served = threads[thread];
      const stated = served.opening.move === "aim" ? (served.opening.measures ?? []) : operativeOf(served).requirements;
      if (!stated.some((statement) => statement.id === traced)) throw new TypeError(`requirement ${requirement.id} traces to ${trace}, which that thread does not state`);
    }
  }
}

/**
 * The words an opening says, as a set: its headline statement and its requirements and measures,
 * lowercased, without short or function words (a word carrying a digit is kept however short: it
 * names). Two openings saying the same thing in other words share most of them.
 */
const FUNCTION_WORDS = new Set("the and for with from that this these those its their our shall must should will are was were has have been being into onto over under than then when while where which who whom whose what each every all any both not only also such can may might would could does did per via about after before".split(" "));
const wordsSaid = new WeakMap();
const saidOf = (opening) => [
  gistOfOpening(opening),
  ...(opening.requirements ?? []).map((statement) => statement.says),
  ...(opening.measures ?? []).map((statement) => statement.says),
];
export function wordsOf(opening) {
  if (wordsSaid.has(opening)) return wordsSaid.get(opening);
  const said = saidOf(opening).join(" ").toLowerCase();
  const words = new Set(said.split(/[^a-z0-9]+/).filter((word) => /[0-9]/.test(word) || (word.length > 2 && !FUNCTION_WORDS.has(word))));
  wordsSaid.set(opening, words);
  return words;
}
/**
 * The names an opening carries: a word bearing a digit (a number, a version, an issue) or a proper
 * name, capitalized where a sentence does not begin. A name refers rather than describes, so
 * openings naming different objects (two recipients, two titles) ask for different things however
 * alike the rest of their words are; only their sense is compared by `likeness`.
 */
const namesSaid = new WeakMap();
function namesOf(opening) {
  if (namesSaid.has(opening)) return namesSaid.get(opening);
  const names = new Set();
  for (const sentence of saidOf(opening).join(". ").split(/[.!?;:]\s+/u)) {
    for (const [at, word] of sentence.split(/[^\p{L}\p{N}]+/u).filter((part) => part !== "").entries()) {
      if (/\p{N}/u.test(word) || (at > 0 && /^\p{Lu}/u.test(word))) names.add(word.toLowerCase());
    }
  }
  namesSaid.set(opening, names);
  return names;
}
const sameNames = (left, right) => left.size === right.size && [...left].every((name) => right.has(name));
const likeness = (left, right) => {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
};
/** How alike two openings must be, by shared words (Jaccard), to say the same thing. A setting (Huidu calibration), held until revisited. */
export const TWIN_LIKENESS = 0.6;

/**
 * The live thread a player already opened that a new opening of its says again (fifth edition):
 * same player, same kind, overlapping or equally absent scope, words alike at `TWIN_LIKENESS`
 * or more, and the same names (numbers, versions, issues) among them. A player says a thing once; to say it better it refines or supersedes what it said, so a
 * twin is refused. A report naming a law, an obstacle or a declaration is keyed by what it is
 * about, not its words, and is not read here. Openings by other players are not twins: two parties
 * wanting one thing is two demands, and the board relates them.
 */
export function twinOf(threads, move, playerIdentity = exactPlayer) {
  if (!["request", "propose", "ask", "aim"].includes(move.move)) return undefined;
  const scope = new Set((move.scope ?? []));
  const words = wordsOf(move);
  const replaced = new Set(move.supersedes ?? []);
  for (const thread of Object.values(threads)) {
    const opening = thread.opening;
    if (opening.move !== move.move || replaced.has(opening.id) || playerIdentity(opening.by) !== playerIdentity(move.by)) continue;
    if (CLOSED_STANDINGS.includes(standingOf(thread))) continue;
    const theirs = opening.move === "request" ? operativeOf(thread).scope : (opening.scope ?? []);
    const overlaps = theirs.length === 0 && scope.size === 0 ? true : theirs.some((subject) => scope.has(subject));
    if (!overlaps) continue;
    const alike = likeness(words, wordsOf(opening));
    if (alike >= TWIN_LIKENESS && sameNames(namesOf(move), namesOf(opening))) return Object.freeze({ thread: opening.id, likeness: Math.round(alike * 100) / 100 });
  }
  return undefined;
}

function exactPlayer(player) { return player; }

/** Compute the complete bounded effect before applying any part of a move. */
function workArenaTransition(position, input, playerIdentity = exactPlayer) {
  // A move replay has read and built is judged on its legality alone: its content was judged once,
  // under the edition that admitted it.
  const move = BUILT.has(input) ? input : moveOf(input);
  const threads = position.threads;
  if (OPENING_MOVES.includes(move.move)) {
    if (threads[move.id] !== undefined) return { changes: [] };
    relateOpening(threads, move);
    const twin = twinOf(threads, move, playerIdentity);
    if (twin !== undefined) throw new TypeError(`${move.by} already said this as ${twin.thread} (likeness ${twin.likeness}); refine it or supersede it rather than opening it again`);
    const changes = [];
    for (const superseded of move.supersedes ?? []) {
      const earlier = threads[superseded];
      if (earlier === undefined) continue;
      if (playerIdentity(earlier.opening.by) !== playerIdentity(move.by)) throw new TypeError(`${move.by} supersedes only its own threads, not ${superseded}`);
      changes.push([superseded, stated({ ...earlier, supersededBy: move.id }, "supersede", playerIdentity(move.by))]);
    }
    changes.push([move.id, freshThread(move)]);
    return { changes };
  }
  const thread = threads[move.thread];
  if (thread === undefined) throw new TypeError(`no thread ${move.thread} on this board`);
  const next = extendThread(thread, move, playerIdentity);
  return { changes: [[move.thread, TOLD_MOVES[thread.opening.move].includes(move.move) ? next : stated(next, move.move, playerIdentity(move.by))]] };
}

/** The players' current stances: the last value each player stated of each register. */
const currentStances = (stances) => [...new Map(stances.map((entry) => [`${entry.player}\u0000${entry.register}`, entry])).values()];

/** A thread with its player's current value of the register the move states; the player's earlier value is replaced. */
function stated(thread, move, player) {
  const [register, stance] = COORDINATED_REGISTERS[move];
  const stances = currentStances(thread.stances ?? []);
  if (stances.some((entry) => entry.player === player && entry.register === register && entry.stance === stance)) return thread;
  return { ...thread, stances: [...stances.filter((entry) => !(entry.player === player && entry.register === register)), { player, register, stance }] };
}

/**
 * What a thread's standing costs to coordinate, read from SignGraph's priced nerve over the players'
 * current stances (Obsmetrologia CurrencyCocone `PricedNerve`): `top` counts the held-⊤ values of the
 * merge, and is 0 exactly when the players agree, so the thread glues coordination-free
 * (`mergeRecord_topfree_iff_compatible`); `mass` is the contradiction mass (`massSum`), the price, never
 * below `top`; `rank` is the base nerve's cycle rank, reported beside them. A register in
 * `OWN_REGISTERS` is read per player. Tellings state no register: they are a join and cost nothing.
 * @returns {{top: number, mass: number, rank: number, registers: ReadonlyArray<string>}}
 */
export function coordinationOf(thread) {
  const priced = pricedNerve(currentStances(thread.stances ?? []).map((entry) => ({
    source: entry.player,
    cell: OWN_REGISTERS.includes(entry.register) ? `${entry.register}:${entry.player}` : entry.register,
    stance: entry.stance,
  })));
  return Object.freeze({ top: priced.top, mass: priced.mass, rank: priced.rank, registers: priced.cells });
}

/**
 * The work arena presented by its rules (gaming faculty `gameRules`): public extension remains
 * immutable; private readers apply the same pure transition's small delta in place.
 */
export const workArenaRulesFor = (playerIdentity = exactPlayer) => gameRules(
  () => ({ threads: {} }),
  (position, input) => {
    const { changes } = workArenaTransition(position, input, playerIdentity);
    if (changes.length === 0) return { state: position, events: [] };
    const threads = { ...position.threads };
    for (const [id, thread] of changes) threads[id] = thread;
    return { state: { threads }, events: [] };
  },
);

export const workArenaRules = workArenaRulesFor();

/** Apply a fully validated transition to the reader-owned position without a board-sized copy. */
function extendPrivatePosition(position, input, playerIdentity) {
  const { changes } = workArenaTransition(position, input, playerIdentity);
  for (const [id, thread] of changes) position.threads[id] = thread;
  return changes.length > 0;
}

// A play is a sequence: moves are replayed in time, openings first at one instant, and moves at the
// same instant keep the order they were played in (the sort is stable over the journal's order).
const order = (a, b) => a.at.localeCompare(b.at) || (OPENING_MOVES.includes(b.move) - OPENING_MOVES.includes(a.move));

/** What a request offers at a time: its amount grown by its daily rate, up to its ceiling. */
export function offerAt(opening, at) {
  if (opening.offer === undefined) return undefined;
  const days = Math.max(0, (Date.parse(at) - Date.parse(opening.at)) / DAY_MS);
  const grown = opening.offer.amount + opening.offer.perDay * days;
  return Object.freeze({ amount: Math.round(Math.min(grown, opening.offer.ceiling ?? Infinity) * 100) / 100, currency: opening.offer.currency });
}

/**
 * The position the stored moves reach at a time, replayed in order under the legal-move rule, the
 * moves the rule refused on the way, the tellings awaiting their thread and the moves this release
 * cannot read. A new move is legal exactly when it extends this position.
 */
export function playedPosition(moves, at, { playerIdentity = exactPlayer } = {}) {
  const rules = workArenaRulesFor(playerIdentity);
  let position = rules.initialPosition();
  const refused = [];
  const unread = [];
  const awaiting = new Map();
  const extend = (move) => { position = rules.extend(position, move).state; };
  for (const move of [...moves].filter((candidate) => candidate.at <= at).sort(order)) {
    replayMove(position.threads, move, extend, awaiting, (entry) => refused.push(Object.freeze(entry)), (entry) => unread.push(Object.freeze(entry)));
  }
  return { position, refused, awaiting: awaitingOf(awaiting), unread };
}

/*
 * Where each thread is at home, as the node reading the board knows it: `() => { revision, hostOf(thread) }`,
 * given to the reader (`createWorkArenaReader({ homes })`) by the host; no process-wide state. A decision a peer node sent (a stored move carrying `decidedBy`, the host that
 * decided it) counts only when that host is the thread's home at the read: one for a thread not yet on the board,
 * or read where no homes are known, is kept unread, and one its decider is not home for is refused. Replays are
 * judged again when `revision` changes.
 */
/**
 * Why a move is unread on this board under the edition that admitted it, or undefined when it is read
 * there (legal or not at its position is replay's to judge): an edition this release does not realize,
 * a meaning an edition cannot carry forward, or a move that names no edition and does not hold under
 * the sixteenth (work-arena-law `unmigratedReason`). A peer's move unread here is kept as it was said,
 * never refused, so both boards hold the same facts.
 */
export function unreadReasonOf(move) {
  const read = readForward(move);
  if (read.unread !== undefined) return read.unread;
  if (move.edition !== undefined) return undefined;
  const { decidedBy: _decidedBy, ...said } = read.move;
  try {
    const { id: named, ...content } = said;
    const derived = moveOf(content, { law: read.edition });
    // An opening's id is its content's address; one stored before moves named their law may address
    // it under an earlier rule, which is the same unmigrated case.
    if (OPENING_MOVES.includes(said.move) && named !== undefined && named !== derived.id) return unmigratedReason(`its id ${named} addresses its content under an earlier rule (now ${derived.id})`);
    return undefined;
  } catch (error) {
    return unmigratedReason(error.message);
  }
}

/**
 * Replay one stored move. Its meaning is read forward from the edition that admitted it
 * (work-arena-law `readForward`); a move this release cannot read is `unread`, kept with why and
 * played by no reading, never refused for a law it was not admitted under; so is a move that names no
 * edition and does not hold under the sixteenth (`unreadReasonOf`). Its content stands as
 * its own edition judged it, and its legality is judged under that edition. A telling
 * (`ALWAYS_TOLD_MOVES`) whose thread is not on the board yet waits for it rather than being
 * refused, and every telling waiting for a thread is played the moment the thread opens, in the
 * order it was told. A join is read the same whichever arrived first.
 */
function replayMove(threads, stored, extend, awaiting, refuse, unread = () => {}, homes = undefined) {
  const read = readForward(stored);
  if (read.unread !== undefined) {
    unread({ move: stored, why: read.unread });
    return;
  }
  const { decidedBy, ...said } = read.move;
  if (decidedBy !== undefined) {
    if (homes === undefined) return unread({ move: stored, why: "a peer's decision cannot be judged where no homes are known" });
    if (threads[said.thread] === undefined) return unread({ move: stored, why: `its thread ${said.thread} is not on this board yet` });
    const home = homes.hostOf(threads[said.thread]);
    if (home !== decidedBy) return refuse({ move: stored, why: `${decidedBy} is not home for ${said.thread} (${home ?? "no node"} is)` });
  }
  let move;
  try {
    move = moveOf(said, { law: read.edition });
  } catch (error) {
    if (stored.edition === undefined) unread({ move: stored, why: unmigratedReason(error.message) });
    else refuse({ move: stored, why: error.message });
    return;
  }
  if (!OPENING_MOVES.includes(move.move) && threads[move.thread] === undefined && ALWAYS_TOLD_MOVES.includes(move.move)) {
    awaiting.set(move.thread, [...(awaiting.get(move.thread) ?? []), move]);
    return;
  }
  const play = (played) => {
    try {
      extend(played);
      return true;
    } catch (error) {
      refuse({ move: played, why: error.message });
      return false;
    }
  };
  if (!play(move) || !OPENING_MOVES.includes(move.move)) return;
  const told = awaiting.get(move.id) ?? [];
  awaiting.delete(move.id);
  for (const telling of told) play(telling);
}

const awaitingOf = (awaiting) => Object.freeze([...awaiting.values()].flat());

/**
 * Read a native work arena from verified, content-addressed move records. The
 * private replay follows the same chronological ordering and legal-move rule as
 * playedPosition. A changed or shortened prefix rebuilds it; an appended prefix
 * extends only by its new moves. Source queries still run on every observation.
 * Returned positions are detached copies. Board readings share a deeply immutable
 * snapshot detached from the private replay, replaced whenever its source changes.
 * A move replaces the threads it changes and never edits one in place, so each
 * private thread is detached and frozen once: a snapshot after an append costs the
 * threads that move touched, not the board. A snapshot's address is hashed only
 * when a reading's `position` is read.
 */
export function createWorkArenaReader({ players, homes: homesOf } = {}) {
  let identityRevision;
  let canonical = exactPlayer;
  let ids = [];
  let openingSources = new Map();
  let position = workArenaRules.initialPosition();
  let refused = [];
  let unread = [];
  let awaiting = new Map();
  let snapshot;
  let addressOf;
  let placed;
  let placedTerritories;
  let reading;
  let readingAt;
  let selectedSnapshots = new Map();
  const immutable = new WeakSet();
  const freezeReading = (value) => {
    if (value === null || typeof value !== "object" || immutable.has(value)) return value;
    immutable.add(value);
    for (const nested of Object.values(value)) freezeReading(nested);
    return Object.freeze(value);
  };
  const detached = new WeakMap();
  const detach = (value) => {
    let frozen = detached.get(value);
    if (frozen === undefined) detached.set(value, frozen = freezeReading(structuredClone(value)));
    return frozen;
  };
  const replay = (records, at) => {
    // Capture one identity snapshot for the entire replay and its subsequent validation.
    // Identity changes invalidate a cached position even when journal bytes did not change.
    const identity = players?.();
    const decided = records.some(({ record }) => record.decidedBy !== undefined);
    const homes = decided ? homesOf?.() : undefined;
    const revision = [identity?.revision ?? identity, homes?.revision];
    const changedIdentity = identityRevision === undefined || revision[0] !== identityRevision[0] || revision[1] !== identityRevision[1];
    identityRevision = revision;
    canonical = identity?.canonical ?? exactPlayer;
    const eligible = records.filter(({ record }) => record.at <= at)
      .sort((left, right) => order(left.record, right.record));
    if (eligible.some(({ id }) => typeof id !== "string" || id.length === 0)) {
      throw new TypeError("work arena replay requires verified move record identifiers");
    }
    if (changedIdentity || ids.length > eligible.length || ids.some((id, index) => id !== eligible[index].id)) {
      ids = [];
      openingSources = new Map();
      position = workArenaRules.initialPosition();
      refused = [];
      unread = [];
      awaiting = new Map();
      snapshot = undefined;
      selectedSnapshots = new Map();
    }
    // Refused records also change the public reading, even when the legal
    // position's address remains the same.
    if (ids.length !== eligible.length) {
      snapshot = undefined;
      selectedSnapshots = new Map();
    }
    let replayingSource;
    const extend = (move) => {
      const hadOpening = OPENING_MOVES.includes(move.move) && position.threads[move.id] !== undefined;
      const changed = extendPrivatePosition(position, move, canonical);
      // Capture source identity at the actual accepted transition, not by matching
      // a later projection. Refused, unread and duplicate openings cannot replace it.
      if (OPENING_MOVES.includes(move.move) && !hadOpening && position.threads[move.id] !== undefined) {
        openingSources.set(move.id, Object.freeze({ id: replayingSource.id }));
      }
      return changed;
    };
    for (let index = ids.length; index < eligible.length; index++) {
      replayingSource = eligible[index];
      replayMove(position.threads, structuredClone(replayingSource.record), extend, awaiting, (entry) => refused.push(entry), (entry) => unread.push(entry), homes);
    }
    ids = eligible.map(({ id }) => id);
  };
  return Object.freeze({
    /** The stored record selected by replay for each accepted opening (its address in the store). */
    openingSourcesAt(records, at) {
      replay(records, at);
      return Object.freeze(Object.fromEntries(openingSources));
    },
    /** Inspect one thread without projecting the whole position: the thread as the board reads
     * it (`boardAt`), detached; validation uses the same move rules without copying the full
     * thread map. */
    inspectAt(records, at, threadId, { territories } = {}) {
      replay(records, at);
      const playerIdentity = canonical;
      const thread = threadId === undefined ? undefined : position.threads[threadId];
      return Object.freeze({
        ...(thread === undefined ? {} : { thread: projectThread(position.threads, structuredClone(thread), at, territories),
          openingSource: openingSources.get(threadId) }),
        validate: (move) => workArenaTransition(position, move, playerIdentity),
      });
    },
    positionAt(records, at) {
      replay(records, at);
      return structuredClone({ position, refused, awaiting: [...awaiting.values()].flat(), unread });
    },
    boardAt(records, at, { territories, sources } = {}) {
      replay(records, at);
      if (sources !== undefined) {
        if (!Array.isArray(sources) || sources.length < 1 || sources.length > 200
          || sources.some((source) => typeof source !== "string" || source.length === 0 || source.length > 4096)
          || new Set(sources).size !== sources.length) {
          throw new TypeError("work arena source selection requires 1 to 200 unique nonempty source locators");
        }
        const territoryKey = territories === undefined ? undefined
          : JSON.stringify(territories.map(({ id, section }) => [id, section]));
        const cacheKey = JSON.stringify([sources, territoryKey]);
        let selected = selectedSnapshots.get(cacheKey);
        if (selected === undefined) {
          const raw = position.threads;
          const sourceSet = new Set(sources);
          const selectedIds = new Set(Object.values(raw)
            .filter((thread) => (thread.opening.sources ?? []).some(({ locator }) => sourceSet.has(locator)))
            .map((thread) => thread.opening.id));
          const standings = new Map();
          const standing = (id) => {
            if (!standings.has(id)) standings.set(id, standingOf(raw[id]));
            return standings.get(id);
          };
          const children = Object.fromEntries([...selectedIds].map((id) => [id, []]));
          for (const thread of Object.values(raw)) {
            for (const served of thread.opening.serves ?? []) {
              if (selectedIds.has(served)) children[served].push(thread.opening.id);
            }
          }
          const relations = relationsForTargets(raw, selectedIds, standing);
          const distance = distancesOf(raw);
          const threads = [...selectedIds]
            .map((id) => raw[id])
            .sort((a, b) => a.opening.at.localeCompare(b.opening.at) || a.opening.id.localeCompare(b.opening.id))
            .map((thread) => freezeReading(placedThread(raw, detach(thread), territories, {
              standing,
              children: children[thread.opening.id] ?? [],
              relations,
              distance,
            })));
          selected = Object.freeze({
            threads: Object.freeze(threads),
            refused: Object.freeze(refused.map(detach)),
            awaiting: Object.freeze([...awaiting.values()].flat().map(detach)),
            unread: Object.freeze(unread.map(detach)),
            position: hashPosition(position),
          });
          selectedSnapshots.set(cacheKey, selected);
        }
        return Object.freeze({
          threads: Object.freeze(selected.threads.map((thread) => atTime(thread, at))),
          refused: selected.refused,
          awaiting: selected.awaiting,
          unread: selected.unread,
          get position() { return selected.position; },
        });
      }
      if (snapshot === undefined) {
        const threads = {};
        for (const [id, thread] of Object.entries(position.threads)) threads[id] = detach(thread);
        const reached = snapshot = freezeReading({ position: { threads }, refused: refused.map(detach), awaiting: [...awaiting.values()].flat().map(detach), unread: unread.map(detach) });
        let address;
        addressOf = () => (address ??= hashPosition(reached.position));
        placed = undefined;
      }
      // Home depends only on these territory fields. Callers may construct a
      // fresh array or change an existing one; neither may hide a changed home.
      const territoryKey = territories === undefined ? undefined
        : JSON.stringify(territories.map(({ id, section }) => [id, section]));
      if (placed === undefined || placedTerritories !== territoryKey) {
        placed = placedThreads(snapshot.position, territories);
        for (const thread of placed) freezeReading(thread);
        placedTerritories = territoryKey;
        reading = undefined;
      }
      // Only the clock moves between readings of one position: each thread is one shallow copy.
      if (reading === undefined || readingAt !== at) {
        reading = projectWorkBoard(snapshot.position, snapshot.refused, at, territories, addressOf, placed, snapshot.awaiting, snapshot.unread);
        readingAt = at;
      }
      return reading;
    },
  });
}

/**
 * A section of the house as its agency spells it: the path from the agency root (`services/…`),
 * whichever root it was written from. A `section:` marker, a `lib/` checkout prefix and the
 * agency's own place in an enclosing tree (`<owner>/services/<agency>/`) are spelling, not
 * meaning, so `section:lib/emsenn/services/561-group/services/x`, `emsenn/services/561-group/services/x`
 * and `services/x` are one section. Anything else is not a section.
 * @param {string} subject
 * @returns {string | undefined}
 */
export function houseSectionOf(subject) {
  if (typeof subject !== "string") return undefined;
  const section = subject.replace(/^section:/, "").replace(/^(?:lib\/)?[^/]+\/services\/[^/]+\/(?=services\/)/, "").replace(/\/+$/, "");
  return section.startsWith("services/") ? section : undefined;
}

/**
 * The sections of the house a thread is about: its scope subjects that name a section, as paths
 * from the agency root (a tag never names a section: `tagsOf` refuses one). An opening that names
 * no section is about where its speaker stands, as an unmarked utterance refers to its speaker's own
 * context: the section its opening office sits in. An opening by a party holding no office, naming no section, is about no section.
 */
export function sectionsOf(thread) {
  const opening = thread.opening ?? thread;
  const named = [...new Set((opening.scope ?? [])
    .map(houseSectionOf).filter((section) => section !== undefined))].sort();
  if (named.length > 0) return Object.freeze(named);
  const spoken = typeof opening.by === "string" && opening.by.includes("#") ? houseSectionOf(opening.by.split("#")[0]) : undefined;
  return Object.freeze(spoken === undefined ? [] : [spoken]);
}

/**
 * The micro-enterprise a thread is at home with: the one seated over the deepest section enclosing
 * what the thread is about. Territory is derived from where each enterprise's record sits in the
 * house, never assigned. A thread about no held section (it names none, or only sections no seated
 * enterprise holds) is at home where its speaker stands, as an unmarked utterance is: with the
 * enterprise holding its opening office's section.
 *
 * Home is never a party that gave the thread back (sixth edition): an enterprise that released it
 * or left it is passed over, and the thread is at home with the next enterprise enclosing it, as an
 * order a micro-enterprise cannot fill goes up to the platform it stands on, and past the root to
 * the market. Nor is home the enterprise that opened it: nobody contracts with itself.
 * @param {object} thread
 * @param {ReadonlyArray<{id: string, section: string}>} territories
 */
export function homeOf(thread, territories = []) {
  const by = (thread.opening ?? thread).by;
  const departed = departedOf(thread);
  // A report on a party's own conformance (its subject names the enterprise) is owed by that party,
  // whoever made it: the subject of a law is who must keep it (enterprise/governance).
  const party = reportPartyOf(thread);
  if (party !== undefined) {
    const own = territories.find((territory) => territory.id === party && !departed.has(territory.id));
    if (own !== undefined) return own;
  }
  const eligible = territories.filter((territory) => territory.id !== by && !departed.has(territory.id));
  const deepest = (sections) => {
    let home;
    for (const section of sections) {
      for (const territory of eligible) {
        if (section !== territory.section && !section.startsWith(`${territory.section}/`)) continue;
        if (home === undefined || territory.section.length > home.section.length) home = territory;
      }
    }
    return home;
  };
  const named = deepest(sectionsOf(thread));
  if (named !== undefined) return named;
  if (typeof by !== "string" || !by.includes("#")) return undefined;
  return deepest([houseSectionOf(by.split("#")[0])].filter((section) => section !== undefined));
}

/** The enterprise whose own conformance a report reports: the one its subject names (`enterprise:<id>`). */
export const reportPartyOf = (thread) => {
  const opening = thread.opening ?? thread;
  const subject = opening.move === "report" && typeof opening.subject === "string" && opening.subject.startsWith("enterprise:") ? opening.subject.slice("enterprise:".length) : "";
  return subject === "" ? undefined : subject;
};

/** The players that gave a thread back: released their promise on it or left it. */
export function departedOf(thread) {
  return new Set([...(thread.releases ?? []), ...(thread.left ?? [])].map((entry) => entry.player));
}

/**
 * The board read at a time: the moves played up to then, replayed in order under the legal-move
 * rule. A stored move the rule refuses (an acceptance by someone other than the assayer, a promise
 * on a closed thread) does not count and is listed in `refused`, so a bad writer cannot change a
 * standing. A telling whose thread is not on the board yet is listed in `awaiting` and read once it
 * opens. Each thread carries its standing and age; a request its operative contract and whether
 * it is refined; every thread the threads serving it (`children`), the threads it comes after that
 * have not settled (`blockedBy`), whether it is `ready`, and its `home` given seated territories.
 * @param {ReadonlyArray<object>} moves
 * @param {string} at
 * @param {{territories?: ReadonlyArray<{id: string, section: string}>}} [options]
 */
export function workBoard(moves, at, { territories } = {}) {
  const { position, refused, awaiting, unread } = playedPosition(moves, at);
  return projectWorkBoard(position, refused, at, territories, () => hashPosition(position), undefined, awaiting, unread);
}

/**
 * One thread as the board reads it at a time: its stored moves with what is derived from them and
 * from the threads it names (its standing, age, operative contract, the openings serving it, what
 * still holds it back, its home). `standing` and `children` read the rest of the position.
 */
/**
 * What a request still lacks before it can be promised (a definition of ready, read from its
 * operative contract, never stated): a contract at all, a condition verifying each
 * must-requirement, must-requirements free of ambiguous terms (29148 §5.2.7), and a section it is
 * about. An empty list is a request ready to promise, once nothing it comes after holds it back.
 *
 * An aim is a chain group's one contract to its user (eighth edition; Rendanheyi's 链群合约), and
 * lacks what such a contract cannot be without: a `user` whose outcome it is (`no-user`, the house
 * serving itself), measures (`unmeasured`), and a unit on each measure so a target on it can be
 * read (`unquantified:<measure>`).
 */
export function gapsOf(thread) {
  if (thread.opening.move === "aim") {
    const measures = thread.opening.measures ?? [];
    return Object.freeze([
      ...(thread.opening.user === undefined ? ["no-user"] : []),
      ...(measures.length === 0 ? ["unmeasured"] : []),
      ...measures.filter((measure) => measure.unit === undefined).map((measure) => `unquantified:${measure.id}`),
    ]);
  }
  if (thread.opening.move !== "request") return Object.freeze([]);
  const operative = operativeOf(thread);
  const gaps = [];
  if (operative.requirements.length === 0) gaps.push("no-requirements");
  if (operative.conditions.length === 0) gaps.push("no-conditions");
  for (const id of operative.uncovered) gaps.push(`unverified:${id}`);
  for (const requirement of operative.requirements) {
    if ((requirement.priority ?? "must") === "must" && ambiguitiesOf(requirement.says).length > 0) gaps.push(`ambiguous:${requirement.id}`);
  }
  if (!operative.scope.some((subject) => houseSectionOf(subject) !== undefined)) gaps.push("unscoped");
  return Object.freeze(gaps);
}

/**
 * How a request's requirements are allocated to the work serving it (requirement flow-down): for
 * each of its operative requirements, the live requirements of serving threads that trace to it.
 * A requirement no live part traces to is the parent's own to meet.
 * @param {object} thread a projected or raw request
 * @param {Iterable<object>} parts the threads serving it
 */
export function allocationOf(thread, parts) {
  if (thread.opening.move !== "request") return Object.freeze([]);
  const id = thread.opening.id;
  const live = [...parts].filter((part) => !["withdrawn", "superseded"].includes(part.standing ?? standingOf(part)));
  return Object.freeze(operativeOf(thread).requirements.map((requirement) => Object.freeze({
    requirement: requirement.id,
    allocated: Object.freeze(live.flatMap((part) => (part.opening.move === "request" ? operativeOf(part).requirements : [])
      .filter((child) => (child.traces ?? []).includes(`${id}#${requirement.id}`))
      .map((child) => `${part.opening.id}#${child.id}`)).sort()),
  })));
}

/**
 * The relations a board reads backwards from openings that name other threads (fifth edition): for
 * each thread, the open obstacle reports that obstruct it and the live positions that address it.
 */
function relationsOf(raw, standing) {
  const obstacles = {};
  const positions = {};
  for (const other of Object.values(raw)) {
    const opening = other.opening;
    const live = !CLOSED_STANDINGS.includes(standing(opening.id));
    if (!live) continue;
    for (const target of opening.obstructs ?? []) {
      const { thread: id, requirement } = target.includes("#") ? splitTrace(target) : { thread: target };
      (obstacles[id] ??= []).push(Object.freeze({ id: opening.id, obstacle: opening.obstacle, by: opening.by, ...optional("requirement", requirement), standing: standing(opening.id) }));
    }
    for (const id of opening.addresses ?? []) {
      const weighed = other.arguments ?? [];
      (positions[id] ??= []).push(Object.freeze({
        id: opening.id,
        by: opening.by,
        standing: standing(opening.id),
        for: weighed.filter((argument) => argument.stance === "for").length,
        against: weighed.filter((argument) => argument.stance === "against").length,
      }));
    }
  }
  return { obstacles, positions };
}

/** The same backwards relations as relationsOf, restricted to the selected target set. */
function relationsForTargets(raw, targets, standing) {
  const obstacles = {};
  const positions = {};
  for (const id of targets) {
    obstacles[id] = [];
    positions[id] = [];
  }
  for (const other of Object.values(raw)) {
    const opening = other.opening;
    const currentStanding = standing(opening.id);
    if (CLOSED_STANDINGS.includes(currentStanding)) continue;
    for (const target of opening.obstructs ?? []) {
      const { thread: id, requirement } = target.includes("#") ? splitTrace(target) : { thread: target };
      if (!targets.has(id)) continue;
      obstacles[id].push(Object.freeze({ id: opening.id, obstacle: opening.obstacle, by: opening.by, ...optional("requirement", requirement), standing: currentStanding }));
    }
    for (const id of opening.addresses ?? []) {
      if (!targets.has(id)) continue;
      const weighed = other.arguments ?? [];
      positions[id].push(Object.freeze({
        id: opening.id,
        by: opening.by,
        standing: currentStanding,
        for: weighed.filter((argument) => argument.stance === "for").length,
        against: weighed.filter((argument) => argument.stance === "against").length,
      }));
    }
  }
  return { obstacles, positions };
}

/**
 * The commitments a request carries (Singh 1999; Chopra and Singh 2009): each one C(debtor,
 * creditor, antecedent, consequent), its debtor the promiser, its creditor the opener, its
 * consequent the operative conditions of satisfaction, and its antecedent that the contract is
 * settled and nothing holds the work back. Its state is read from the thread, never stated:
 * `conditional` while the antecedent does not hold, `detached` once it does, `discharged` by a
 * recognised delivery, `cancelled` by its debtor's release, `released` by its creditor's
 * withdrawal or another's discharge, `novated` when the superseding thread carries it and
 * `pending-novation` when it does not yet.
 * @param {object} thread a projected request
 * @param {(id: string) => object | undefined} [threadOf] reads another thread of the board
 */
export function commitmentsOf(thread, threadOf = () => undefined) {
  if (thread.opening.move !== "request") return Object.freeze([]);
  const creditor = thread.opening.by;
  const held = (thread.blockedBy ?? []).length > 0 || (thread.obstructed ?? []).length > 0;
  const antecedent = (thread.refined ?? isRefined(thread)) && !held;
  const successor = thread.supersededBy === undefined ? undefined : threadOf(thread.supersededBy);
  const stateOf = (debtor) => {
    if (thread.accepted !== undefined) return thread.accepted === debtor ? "discharged" : "released";
    if (thread.withdrawn !== undefined) return "released";
    if (thread.supersededBy !== undefined) return takersOf(successor ?? { opening: { move: "request" }, promisers: [] }).includes(debtor) ? "novated" : "pending-novation";
    return antecedent ? "detached" : "conditional";
  };
  return Object.freeze([
    ...(thread.releases ?? []).map((release) => Object.freeze({ debtor: release.player, creditor, state: "cancelled", since: release.released })),
    ...thread.promisers.map((promiser) => Object.freeze({ debtor: promiser.player, creditor, state: stateOf(promiser.player), since: promiser.at })),
  ]);
}

/**
 * The promisers of the requests a request supersedes that have not promised it (novation: the
 * old commitment is extinguished and a new one stands in its place only by its debtor's uptake).
 * Each owes the new thread its promise, or the release of what it held.
 */
function novationsOf(raw, thread) {
  if (thread.opening.move !== "request") return [];
  const promised = new Set(takersOf(thread));
  const owing = new Set();
  for (const id of thread.opening.supersedes ?? []) {
    for (const promiser of raw[id]?.promisers ?? []) if (!promised.has(promiser.player)) owing.add(promiser.player);
  }
  return [...owing].sort();
}

/** What a thread reads as at a time, beyond what its position fixes: its age, and a request's grown offer. */
function clockOf(thread, at) {
  return {
    ageDays: Math.max(0, (Date.parse(at) - Date.parse(thread.opening.at)) / DAY_MS),
    ...(thread.opening.move === "request" ? optional("offer", offerAt(thread.opening, at)) : {}),
    // A wager runs or has ended by the clock, so its reading is read at a time (eighth edition).
    ...(thread.opening.move === "aim" ? optional("wagerReadings", wagersOf(thread, at)) : {}),
  };
}

/** A placed thread read at a time. */
const atTime = (placed, at) => Object.freeze({ ...placed, ...clockOf(placed, at) });

function projectThread(raw, thread, at, territories, options) {
  return atTime(placedThread(raw, thread, territories, options), at);
}

/**
 * How far each thread stands from a user's need (seventh edition; Rendanheyi's zero distance): 0
 * for an aim or request naming its `user`, else one more than the nearest thread it serves (a
 * superseded one read as what superseded it), and none when no thread it serves reaches a user. Distance is read, never stated: work at no
 * distance from anyone outside is the house serving its own proxies.
 * @returns {(id: string) => number | undefined}
 */
function distancesOf(raw) {
  const known = new Map();
  const visiting = new Set();
  const distance = (id) => {
    if (known.has(id)) return known.get(id);
    const thread = raw[id];
    if (thread === undefined || visiting.has(id)) return undefined;
    visiting.add(id);
    let nearest = thread.opening.user === undefined ? undefined : 0;
    for (const served of nearest === 0 ? [] : thread.opening.serves ?? []) {
      // What serves a revised thread serves its revision.
      let current = served;
      const revised = new Set();
      while (raw[current]?.supersededBy !== undefined && !revised.has(current)) { revised.add(current); current = raw[current].supersededBy; }
      const through = distance(current);
      if (through !== undefined && (nearest === undefined || through + 1 < nearest)) nearest = through + 1;
    }
    visiting.delete(id);
    known.set(id, nearest);
    return nearest;
  };
  return distance;
}

/** A thread as its position places it: standing, relations, contract and home, but no clock. */
function placedThread(raw, thread, territories, { standing = (id) => standingOf(raw[id]), children, relations, distance = distancesOf(raw) } = {}) {
  const id = thread.opening.id;
  // A superseded precedent is followed to what replaced it; a withdrawn one no longer holds anything back.
  const holdsBack = (precedent) => {
    const seen = new Set();
    let current = precedent;
    while (raw[current]?.supersededBy !== undefined && !seen.has(current)) { seen.add(current); current = raw[current].supersededBy; }
    const held = raw[current];
    if (held === undefined || standing(current) === "withdrawn") return false;
    return !SETTLED_STANDINGS[held.opening.move].includes(standing(current));
  };
  const blockedBy = (thread.opening.after ?? []).filter(holdsBack);
  const refined = thread.opening.move === "request" ? isRefined(thread) : undefined;
  const home = territories === undefined ? undefined : homeOf(thread, territories)?.id;
  const served = children ?? Object.values(raw).filter((other) => (other.opening.serves ?? []).includes(id)).map((other) => other.opening.id);
  const request = thread.opening.move === "request";
  const gaps = gapsOf(thread);
  const allocation = request && served.length > 0
    ? allocationOf(thread, served.map((child) => ({ ...raw[child], standing: standing(child) }))).filter((entry) => entry.allocated.length > 0)
    : [];
  const { obstacles: obstaclesBy, positions: positionsBy } = relations ?? relationsOf(raw, standing);
  const obstacles = obstaclesBy[id] ?? [];
  const obstructed = [...new Set(obstacles.map((entry) => entry.obstacle).filter((kind) => BLOCKING_OBSTACLES.includes(kind)))].sort();
  const novated = novationsOf(raw, thread);
  const projected = {
    ...thread,
    id,
    standing: standing(id),
    ...(request ? { operative: operativeOf(thread), refined } : {}),
    ...optional("gaps", gaps),
    ...optional("allocation", allocation),
    children: Object.freeze([...served].sort()),
    blockedBy: Object.freeze(blockedBy),
    ...optional("obstacles", obstacles),
    ...optional("obstructed", obstructed),
    ...optional("positions", positionsBy[id] ?? []),
    ...optional("novated", novated),
    ...optional("distance", distance(id)),
    ready: blockedBy.length === 0 && obstructed.length === 0 && refined !== false && !gaps.some((gap) => gap.startsWith("ambiguous:")),
    ...optional("home", home),
  };
  if (request) {
    projected.commitments = commitmentsOf(projected, (other) => raw[other]);
    projected.verification = verificationOf(projected);
  }
  return Object.freeze(projected);
}

/** Place every thread of one reached position (standing, relations, territory), in opening order. */
function placedThreads(position, territories) {
  const raw = position.threads;
  const standings = Object.fromEntries(Object.entries(raw).map(([id, thread]) => [id, standingOf(thread)]));
  const standing = (id) => standings[id];
  const children = {};
  for (const thread of Object.values(raw)) {
    for (const served of thread.opening.serves ?? []) (children[served] ??= []).push(thread.opening.id);
  }
  const relations = relationsOf(raw, standing);
  const distance = distancesOf(raw);
  const threads = Object.values(raw)
    .sort((a, b) => a.opening.at.localeCompare(b.opening.at) || a.opening.id.localeCompare(b.opening.id))
    .map((thread) => placedThread(raw, thread, territories, { standing, children: children[thread.opening.id] ?? [], relations, distance }));
  return Object.freeze(threads);
}

/**
 * Project time-dependent offers, standing and territory from one reached position. A reader that
 * holds the position passes its `placed` threads, so a later time costs only the clock. `addressOf`
 * is asked only when the reading's `position` is read: hashing the whole position is the costliest
 * part of a reading, and most readers look only at its threads.
 */
function projectWorkBoard(position, refused, at, territories, addressOf, placed = placedThreads(position, territories), awaiting = [], unread = []) {
  let address;
  return Object.freeze(Object.defineProperty({ threads: Object.freeze(placed.map((thread) => atTime(thread, at))), refused: Object.freeze(refused), awaiting: Object.freeze(awaiting), unread: Object.freeze(unread) }, "position", {
    enumerable: true,
    get: () => (address ??= addressOf()),
  }));
}

/**
 * An aim's win-win value-added statement (eighth edition; Rendanheyi's 共赢增值表), read from the
 * board and never stated: the account a chain group keeps of its one contract to a user in place
 * of a profit-and-loss account. It carries the `user` whose outcome the aim is; its `parties`, every
 * player that wagered on or held it (leaving takes no wager back); its `ecosystem`, each player
 * whose delivery was accepted on work serving the aim at any depth (through revisions of it too),
 * with how many; and each ended wager `settled`, met with the value it added above target, the
 * holder's share and what is left `unshared` for the contract's other parties, or missed with its
 * shortfall and forfeit. The value added is reported in each measure's own unit: what it is worth
 * in credit, and how the unshared part divides, is the contract's, and is not yet on the board.
 * @param {{threads: ReadonlyArray<object>}} board
 * @param {string} id an aim's id
 */
export function valueAddedOf(board, id) {
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const aim = byId.get(id);
  if (aim?.opening.move !== "aim") return undefined;
  const revisions = [];
  for (const queue = [id]; queue.length > 0;) {
    const current = byId.get(queue.shift());
    if (current === undefined || revisions.includes(current.id)) continue;
    revisions.push(current.id);
    queue.push(...(current.opening.supersedes ?? []));
  }
  const ecosystem = new Map();
  const seen = new Set(revisions);
  const queue = revisions.flatMap((revision) => byId.get(revision).children ?? []);
  while (queue.length > 0) {
    const thread = byId.get(queue.shift());
    if (thread === undefined || seen.has(thread.id)) continue;
    seen.add(thread.id);
    if (thread.opening.move === "request" && thread.accepted !== undefined) ecosystem.set(thread.accepted, (ecosystem.get(thread.accepted) ?? 0) + 1);
    queue.push(...(thread.children ?? []));
  }
  const readings = aim.wagerReadings ?? wagersOf(aim);
  return Object.freeze({
    aim: id,
    ...optional("user", aim.opening.user),
    parties: Object.freeze([...new Set([...aim.holders, ...aim.left, ...readings].map((entry) => entry.player))].sort()),
    ecosystem: Object.freeze([...ecosystem].map(([player, accepted]) => Object.freeze({ player, accepted })).sort((a, b) => a.player.localeCompare(b.player))),
    settled: Object.freeze(readings.filter((wager) => ["met", "missed"].includes(wager.standing)).map((wager) => Object.freeze({
      player: wager.player,
      measure: wager.measure,
      unit: wager.unit,
      until: wager.until,
      standing: wager.standing,
      ...(wager.standing === "met"
        ? { added: wager.surplus, share: wager.share, unshared: wager.surplus - wager.share }
        : { shortfall: wager.shortfall, forfeit: wager.forfeit }),
    }))),
  });
}

const GIST_LENGTH = 200;

/** The words a thread opens with. */
const openingWords = gistOfOpening;

/**
 * A thread as a listing shows it: what it opens with in a line, where it stands, who holds it,
 * how it stands to other threads and how much of its contract is stated, without the moves'
 * content. The thread itself is read by id.
 */
export function threadSummary(thread) {
  const opening = thread.opening;
  const words = openingWords(opening).trim().split("\n")[0];
  const operative = opening.move === "request" ? operativeOf(thread) : undefined;
  const takers = takersOf(thread);
  return Object.freeze({
    id: thread.id,
    move: opening.move,
    standing: thread.standing,
    by: opening.by,
    at: opening.at,
    gist: words.length > GIST_LENGTH ? `${words.slice(0, GIST_LENGTH - 1)}…` : words,
    ...optional("tags", opening.tags),
    ...optional("to", addresseeOf(thread)),
    ...optional("home", thread.home),
    ...optional("horizon", horizonOf(thread)),
    ...optional("step", stepOf(thread)),
    ...optional("owes", owesOf(thread)),
    ...optional("awaits", awaitsOf(thread)),
    ...optional("gaps", thread.gaps),
    ...((thread.allocation ?? []).length === 0 ? {} : { allocated: thread.allocation.length }),
    ...optional("law", opening.law),
    ...optional("subject", opening.subject),
    ...optional("serves", opening.serves),
    ...optional("after", opening.after),
    ...optional("blockedBy", thread.blockedBy),
    ...optional("obstructs", opening.obstructs),
    ...optional("obstacle", opening.obstacle),
    ...optional("addresses", opening.addresses),
    ...((thread.obstacles ?? []).length === 0 ? {} : { obstacles: thread.obstacles.map((entry) => `${entry.obstacle}:${entry.id}`) }),
    ...optional("obstructed", thread.obstructed),
    ...((thread.positions ?? []).length === 0 ? {} : { positions: thread.positions.length }),
    ...((thread.arguments ?? []).length === 0 ? {} : { arguments: { for: thread.arguments.filter((argument) => argument.stance === "for").length, against: thread.arguments.filter((argument) => argument.stance === "against").length } }),
    ...((thread.commitments ?? []).length === 0 ? {} : { commitments: thread.commitments.map((commitment) => `${commitment.debtor}:${commitment.state}`) }),
    ...optional("novated", thread.novated),
    ...(thread.ready === false ? { ready: false } : {}),
    ...(operative === undefined ? {} : { requirements: operative.requirements.length, conditions: operative.conditions.length, refined: thread.refined, ...optional("uncovered", operative.uncovered) }),
    ...optional("offer", thread.offer),
    ...(takers.length === 0 ? {} : { [{ aim: "holders", request: "promisers", ask: "answerers" }[opening.move] ?? "adopters"]: takers }),
    ...optional("user", opening.user),
    ...((thread.wagerReadings ?? []).length === 0 ? {} : { wagers: thread.wagerReadings.map((wager) => `${wager.player}:${wager.measure}:${wager.standing}`) }),
    ...(thread.counters.length === 0 ? {} : { counters: thread.counters.map((counter) => counter.player) }),
    ...(thread.corroborations.length === 0 ? {} : { corroborations: thread.corroborations.length }),
    ...((thread.restatements ?? []).length === 0 ? {} : { restatements: thread.restatements.length }),
    ...(coordinationOf(thread).mass === 0 ? {} : { coordination: coordinationOf(thread).mass }),
    ...((thread.children ?? []).length === 0 ? {} : { children: thread.children.length }),
    ...optional("supersededBy", thread.supersededBy),
  });
}

/**
 * A thread's horizon, read from its modality (note 2026-09-04): `now` when a player is committed to
 * it (promised, held, adopted, answered or delivered) and nothing holds it back; `soon` when it is
 * necessary (a request with a must-requirement, a report of a broken law, an addressed question)
 * and ready; `later` when it is merely possible; `eventually` when it cannot proceed as it stands
 * (held back by what it comes after or by an open blocking obstacle, or nothing but won't).
 * A settled or in-force thread has no horizon.
 */
export function horizonOf(thread) {
  const standing = thread.standing ?? standingOf(thread);
  const kind = thread.opening.move;
  if (CLOSED_STANDINGS.includes(standing) || kind === "declare") return undefined;
  if ((thread.blockedBy ?? []).length > 0 || (thread.obstructed ?? []).length > 0) return "eventually";
  if (["promised", "held", "adopted", "answered", "delivered"].includes(standing)) return "now";
  if (kind === "request") {
    const priorities = operativeOf(thread).requirements.map((requirement) => requirement.priority ?? "must");
    if (priorities.length > 0 && priorities.every((priority) => priority === "wont")) return "eventually";
    return priorities.includes("must") ? "soon" : "later";
  }
  if (kind === "report" && thread.opening.law !== undefined) return "soon";
  if (kind === "ask" && addresseeOf(thread) !== undefined) return "soon";
  return "later";
}

/**
 * The conversation each kind of thread is, as data (fifth edition; Winograd and Flores' conversation
 * for action, read as an information protocol after Singh's BSPL): for each step a thread can stand
 * at, which roles' moves it awaits (`turn`) and which roles may also move (`may`). The step is read
 * from the thread (`stepOf`), the players from the roles (`duesOf`), so who owes what is derived
 * from the board and never stated by an opener. Roles:
 *
 * - `opener`, the thread's creditor; `assayer`, whose acceptance recognises a delivery or answer;
 * - `addressee`, the player it is addressed or awarded to;
 * - `takers`, the players holding it up (promisers, holders, adopters);
 * - `novated`, promisers of a superseded request who have not taken up its successor;
 * - `home`, the addressee if any, else the seated enterprise whose territory it sits in, else
 *   `market`, open to any enterprise whose policy takes it (qiangdan: the work is grabbed, not
 *   assigned);
 * - an aim is `unframed` while it names no user or no measure with a unit (`gapsOf`): nothing on it
 *   can be wagered, so its opener owes restating it (`supersede`, a new aim naming what it lacked)
 *   or withdrawing it, and its holders may leave;
 * - on an aim (eighth edition, `aimRolesOf`): `unwagered`, holders with no wager running on it,
 *   who owe one (an aim held without a wager is a bonus scheme); `forfeited`, holders found
 *   wanting by a sustained miss (`forfeitedOf`), who owe their leaving; `reader`, the opener while
 *   a wager that has ended reads unread or contested, who owes the reading.
 */
export const PROTOCOL = Object.freeze({
  aim: Object.freeze({
    unframed: [{ role: "opener", turn: ["supersede", "withdraw"] }, { role: "takers", may: ["leave", "observe"] }],
    open: [{ role: "home", turn: ["wager"], may: ["hold"] }, { role: "opener", may: ["withdraw", "observe"] }],
    held: [
      { role: "unwagered", turn: ["wager"] }, { role: "forfeited", turn: ["leave"] }, { role: "reader", turn: ["observe"] },
      { role: "takers", may: ["leave", "attach", "wager", "observe"] }, { role: "home", may: ["wager"] }, { role: "opener", may: ["withdraw", "observe"] },
    ],
  }),
  request: Object.freeze({
    obstructed: [{ role: "opener", turn: ["refine", "withdraw"] }, { role: "takers", may: ["release"] }],
    unrefined: [{ role: "opener", turn: ["refine", "withdraw"] }, { role: "novated", turn: ["promise"] }, { role: "home", may: ["counter"] }],
    refined: [{ role: "home", turn: ["promise"], may: ["counter", "decline"] }, { role: "novated", turn: ["promise"] }, { role: "opener", may: ["refine", "agree", "withdraw"] }],
    declined: [{ role: "opener", turn: ["refine", "withdraw"] }],
    promised: [{ role: "takers", turn: ["deliver"], may: ["attach", "release", "counter"] }, { role: "novated", turn: ["promise"] }, { role: "opener", may: ["agree", "withdraw"] }],
    delivered: [{ role: "assayer", turn: ["accept", "reject"] }],
    rejected: [{ role: "opener", turn: ["refine", "withdraw"] }, { role: "takers", may: ["deliver", "release"] }],
  }),
  propose: Object.freeze({
    open: [{ role: "home", turn: ["adopt"], may: ["argue"] }, { role: "opener", may: ["withdraw"] }],
    adopted: [{ role: "takers", may: ["attach"] }],
  }),
  report: Object.freeze({
    obstacle: [{ role: "home", turn: ["adopt", "resolve"], may: ["corroborate"] }, { role: "opener", may: ["withdraw"] }],
    open: [{ role: "home", turn: ["adopt", "resolve"], may: ["corroborate"] }, { role: "opener", may: ["withdraw"] }],
    adopted: [{ role: "takers", turn: ["resolve"], may: ["attach"] }, { role: "home", may: ["corroborate"] }],
  }),
  ask: Object.freeze({
    open: [{ role: "home", turn: ["answer"] }, { role: "opener", may: ["withdraw"] }],
    answered: [{ role: "assayer", turn: ["accept"] }, { role: "home", may: ["answer"] }],
  }),
  declare: Object.freeze({}),
  supply: Object.freeze({
    open: [{ role: "home", may: ["draw"] }, { role: "takers", may: ["draw", "return"] }, { role: "opener", may: ["observe", "withdraw"] }],
    drawn: [{ role: "takers", may: ["return"] }, { role: "opener", may: ["observe", "withdraw"] }],
  }),
});

/** Whether an aim lacks a user or any quantified measure, so it awaits its opener's restating (`gapsOf`). */
function isUnframed(thread) {
  const gaps = thread.gaps ?? gapsOf(thread);
  return gaps.includes("no-user") || gaps.includes("unmeasured") || (thread.opening.measures ?? []).every((measure) => gaps.includes(`unquantified:${measure.id}`));
}

/** An aim's wager roles (`PROTOCOL`), read from its wagers at the time the thread was read. */
function aimRolesOf(thread) {
  const readings = thread.wagerReadings ?? wagersOf(thread);
  const forfeited = forfeitedOf(thread, readings);
  const running = new Set(readings.filter((wager) => wager.standing === "running").map((wager) => wager.player));
  return {
    unwagered: takersOf(thread).filter((player) => !running.has(player) && !forfeited.includes(player)),
    forfeited,
    reader: readings.some((wager) => ["unread", "contested"].includes(wager.standing)) ? [thread.opening.by] : [],
  };
}

/** The step of its conversation a thread stands at (a key of `PROTOCOL[kind]`), or undefined when it awaits nothing. */
export function stepOf(thread) {
  const standing = thread.standing ?? standingOf(thread);
  const kind = thread.opening.move;
  if (CLOSED_STANDINGS.includes(standing) || kind === "declare") return undefined;
  if (kind === "request") {
    // A delivery is assayed whatever stands in the way; an obstacle halts everything else.
    if (standing === "delivered") return "delivered";
    if ((thread.obstructed ?? []).length > 0) return "obstructed";
    // A rejection under the order in force shows the order incomplete: completing it is its opener's turn.
    if (standing === "promised") return rejectedUnderOrder(thread) === undefined ? "promised" : "rejected";
    if (standing === "declined") return "declined";
    return (thread.refined ?? isRefined(thread)) ? "refined" : "unrefined";
  }
  if (kind === "report" && standing === "open" && thread.opening.obstacle !== undefined) return "obstacle";
  // An aim that names no user, or no measure a target can be read on, is no contract to wager on.
  if (kind === "aim" && isUnframed(thread)) return "unframed";
  return PROTOCOL[kind][standing] === undefined ? undefined : standing;
}

/**
 * Who owes which moves on a thread, read from its step and the roles of its players: one entry
 * per player, its `turn` the moves the thread awaits from it and its `may` the moves it may also
 * make. A role no player fills (no addressee, nothing novated) contributes nobody.
 */
export function duesOf(thread) {
  const step = stepOf(thread);
  if (step === undefined) return Object.freeze([]);
  const to = addresseeOf(thread);
  const players = {
    opener: [thread.opening.by],
    assayer: [assayerOf(thread)],
    addressee: to === undefined ? [] : [to],
    takers: takersOf(thread),
    novated: thread.novated ?? [],
    home: [to ?? thread.home ?? "market"],
    ...(thread.opening.move === "aim" ? aimRolesOf(thread) : {}),
  };
  const dues = new Map();
  for (const { role, turn = [], may = [] } of PROTOCOL[thread.opening.move][step]) {
    for (const player of players[role]) {
      const due = dues.get(player) ?? { player, roles: [], turn: [], may: [] };
      due.roles.push(role);
      due.turn.push(...turn.filter((move) => !due.turn.includes(move)));
      due.may.push(...may.filter((move) => !due.may.includes(move)));
      dues.set(player, due);
    }
  }
  return Object.freeze([...dues.values()]
    .map((due) => Object.freeze({ ...due, may: due.may.filter((move) => !due.turn.includes(move)) }))
    .filter((due) => due.turn.length > 0 || due.may.length > 0));
}

/** Whose turn a thread awaits: the players `duesOf` gives a turn. */
export function owesOf(thread) {
  const owing = duesOf(thread).filter((due) => due.turn.length > 0).map((due) => due.player);
  return owing.length === 0 ? undefined : Object.freeze(owing);
}

/** Which moves a thread awaits from whoever owes it (`owesOf`): the union of their turns. */
export function awaitsOf(thread) {
  const moves = [...new Set(duesOf(thread).flatMap((due) => due.turn))];
  return moves.length === 0 ? undefined : Object.freeze(moves);
}

const HORIZON_ORDER = Object.freeze(["now", "soon", "later", "eventually"]);
/**
 * What attending to each thread is worth, read from the board and never stated (seventh edition;
 * Obsmetrologia's `AttentionAllocation` under Rendanheyi's zero distance). A requester's own words
 * (a requirement's priority, a kind's standing) weigh nothing here: the order is the user's, and
 * then the evidence's. Each thread reads:
 *
 * - `distance`: how far it stands from a user's need (`distancesOf`), none when it reaches none;
 * - `benefit`: the contradiction settling it removes, Obsmetrologia's held-⊤: an open report is a
 *   law told held and found broken, weighed by its independent witnesses (`witnessesOf`); an open
 *   request is a need told and not yet met, and each of its deliveries left contested is one more;
 *   an open question is one; an aim is each of its ended wagers not met (eighth edition); with
 *   `enablement` added, the open threads it frees (those after it, those it obstructs, an aim
 *   someone holds that it serves);
 * - `criticality`: how time presses on it, its horizon (now 3 … eventually 0, `horizonOf`);
 * - `size`: the job's duration as the board can see it, a request's requirement count (at least one);
 * - `coordination`: what its standing costs to coordinate (`coordinationOf`), the contradiction mass
 *   of the players' current stances: each player telling a value another denies, to be ordered.
 *
 * `byAttention` orders by them lexicographically: a thread reaching a user first and the nearer
 * first, then greater benefit, then greater criticality, then the cheaper (size and coordination
 * together), then the older; a tie
 * left after all of them is broken by id, which is the recorded choice (Obsmetrologia's solver
 * records ties as choice bits rather than pretending one value is larger).
 * @param {{threads: ReadonlyArray<object>}} board
 * @returns {ReadonlyMap<string, {distance?: number, benefit: number, enablement: number, criticality: number, size: number, coordination: number}>}
 */
export function attentionOf(board) {
  const open = board.threads.filter((thread) => !CLOSED_STANDINGS.includes(thread.standing));
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const freed = new Map();
  const frees = (id) => freed.set(id, (freed.get(id) ?? 0) + 1);
  for (const thread of open) {
    for (const before of thread.blockedBy ?? []) frees(before);
    for (const target of thread.opening.obstructs ?? []) if (!CLOSED_STANDINGS.includes(byId.get(target.split("#")[0])?.standing)) frees(thread.id);
  }
  const contradiction = (thread) => {
    if (CLOSED_STANDINGS.includes(thread.standing)) return 0;
    switch (thread.opening.move) {
      case "report": return witnessesOf(thread).length;
      case "request": return 1 + thread.deliveries.filter((delivery) => delivery.reading === "contested").length;
      case "ask": return 1;
      // A wager is a target told held; one ended missed, contested or unread is that told and not met.
      case "aim": return (thread.wagerReadings ?? []).filter((wager) => ["missed", "contested", "unread"].includes(wager.standing)).length;
      default: return 0;
    }
  };
  const attention = new Map();
  for (const thread of board.threads) {
    const horizon = horizonOf(thread);
    const servesHeld = (thread.opening.serves ?? []).some((served) => byId.get(served)?.opening.move === "aim" && (byId.get(served).holders ?? []).length > 0);
    const enablement = (freed.get(thread.id) ?? 0) + (servesHeld ? 1 : 0);
    attention.set(thread.id, Object.freeze({
      ...optional("distance", thread.distance),
      benefit: contradiction(thread) + enablement,
      enablement,
      criticality: horizon === undefined ? 0 : 3 - HORIZON_ORDER.indexOf(horizon),
      size: sizeOf(thread),
      coordination: coordinationOf(thread).mass,
    }));
  }
  return attention;
}

const FAR = Number.MAX_SAFE_INTEGER;
/** An order of threads (or entries naming a thread `id` and its opening `at`) by attention (`attentionOf`). */
export const byAttention = (attention) => (a, b) => {
  const left = attention.get(a.id);
  const right = attention.get(b.id);
  return (left.distance ?? FAR) - (right.distance ?? FAR) || right.benefit - left.benefit || right.criticality - left.criticality
    || left.size + left.coordination - (right.size + right.coordination)
    || (a.opening?.at ?? a.at).localeCompare(b.opening?.at ?? b.at) || a.id.localeCompare(b.id);
};

/**
 * A player's agenda: every thread on the board awaiting its turn, with the step it stands at, the
 * moves owed and what attending to it is worth (`attentionOf`), nearest horizon first and by
 * attention within one. `market` reads what nobody is seated for; a player is matched under the
 * house's spelling of players (`playerIdentity`).
 */
export function agendaOf(board, player, { playerIdentity = exactPlayer } = {}) {
  const agenda = [];
  const attention = attentionOf(board);
  const seat = player === "market" ? player : playerIdentity(player);
  for (const thread of board.threads) {
    const due = duesOf(thread).find((entry) => (entry.player === "market" ? entry.player : playerIdentity(entry.player)) === seat && entry.turn.length > 0);
    if (due === undefined) continue;
    const { distance, benefit } = attention.get(thread.id);
    agenda.push(Object.freeze({ id: thread.id, step: stepOf(thread), moves: due.turn, roles: due.roles, ...optional("horizon", horizonOf(thread)), ...optional("distance", distance), benefit, at: thread.opening.at }));
  }
  const rank = (entry) => HORIZON_ORDER.indexOf(entry.horizon ?? "eventually");
  const order = byAttention(attention);
  return Object.freeze(agenda.sort((a, b) => rank(a) - rank(b) || order(a, b)));
}

/** Standings in which a taker still owes work on a thread it took up. */
const OWING_STANDINGS = Object.freeze(["promised", "adopted"]);
/**
 * How many attempts the house's own assessing work (an assay, an order's completion) gets before
 * it stands held, visibly. That work is an order like any other (fifteenth edition): an attempt
 * whose result its codomain or the arena's law refused, or whose carriers of different models
 * missed it alike, was let down by its order, so the next attempt is that order completed with
 * what refused the earlier ones (`assessingRefusalLines`). The first attempt, one renewal naming
 * its refusal and one naming both; a third refusal shows the assessing service cannot write it.
 * It is the default of the `assessing-attempts` axis, which each enterprise holds as its own point.
 */
export const ASSESSING_ATTEMPTS = 3;

/**
 * The arena's grey bands (Huidu glossary: huidu): each enterprise holds a point on every one in its
 * own setting records (enterprise/settings), and its record may declare its own default. The law
 * reads the point; it never states it. How many independent carriers missing one responsibility
 * show its order incomplete (`order-channels`, work/staffing `ORDER_CHANNELS`) and how many
 * attempts its own assessing work gets (`assessing-attempts`) are its points too: the threshold at
 * which a miss is the order's is a held judgment of the enterprise that staffs it, never a law.
 */
export const WORK_AXES = Object.freeze([
  { axis: "taking-limit", means: "how many threads it takes up in one turn", unit: "threads", poles: [1, 64], default: 4 },
  { axis: "taking-after-hours", means: "how long a thread at home nowhere waits before it plays on it", unit: "hours", poles: [0, 720], default: 0 },
  { axis: "wip-floor", means: "the work in progress it holds open before it has delivered anything", unit: "requirements", poles: [0, 320], default: 20 },
  { axis: "flow-window", means: "how far back its settled work earns it capacity", unit: "days", poles: [1, 90], default: 14 },
  { axis: "order-channels", means: "how many carriers of different models must each miss one responsibility before the miss is its order's", unit: "carriers", poles: [1, 8], default: ORDER_CHANNELS },
  { axis: "assessing-attempts", means: "how many attempts its own assessing work (an assay, an order's completion) gets before it stands held", unit: "attempts", poles: [1, 12], default: ASSESSING_ATTEMPTS },
].map((axis) => Object.freeze({ ...axis, poles: Object.freeze(axis.poles) })));

/**
 * The arena's calibrations read from a player's current points (`settingValues`), each else its
 * axis's default. Counts are whole.
 * @param {Readonly<Record<string, number>>} [values]
 */
export function workSettingsOf(values = {}) {
  const point = (axis) => values[axis] ?? WORK_AXES.find((declared) => declared.axis === axis).default;
  return Object.freeze({
    limit: Math.max(1, Math.floor(point("taking-limit"))),
    afterHours: point("taking-after-hours"),
    floor: Math.floor(point("wip-floor")),
    windowDays: point("flow-window"),
    orderChannels: Math.max(1, Math.floor(point("order-channels"))),
    assessingAttempts: Math.max(1, Math.floor(point("assessing-attempts"))),
  });
}

/**
 * An enterprise's calibrations: its current points (`settings`, `settingValues`), else the
 * defaults its record declares (`workSettingsOf`).
 * @param {{settings?: ReadonlyArray<{axis: string, default: number}>}} enterprise
 * @param {Readonly<Record<string, number>>} [settings]
 */
export const enterpriseWorkSettingsOf = (enterprise, settings) =>
  workSettingsOf(settings ?? Object.fromEntries((enterprise.settings ?? []).map((axis) => [axis.axis, axis.default])));

/**
 * How much work a thread is, in the flow unit capacity is counted in: a request is as large as its
 * operative requirements (each singular, fourth edition), every other thread one.
 */
export function sizeOf(thread) {
  return thread.opening.move === "request" ? Math.max(1, (thread.operative ?? operativeOf(thread)).requirements.length) : 1;
}

/**
 * How much work a taker may hold open, read from its own flow (Little's law: work in progress is
 * throughput times lead time, both in one flow unit, `sizeOf`): its floor, plus the size of each
 * thread it settled within its flow window (a delivery accepted, a report resolved, an answer
 * accepted), against the size of what it holds. Settling a request of six requirements earns six,
 * and holding one costs six. A taker that promises and never delivers takes no more. The floor and
 * the window are the taker's own settings (`wip-floor`, `flow-window`, `workSettingsOf`).
 *
 * Work in progress is bounded per level, as in a hierarchical kanban: a thread the taker owes whose
 * work is in its own hands (`open`) is one column, and a thread it decomposed into requests that
 * are still open (`coordinating`: it awaits its parts, which are work in their takers' hands) is
 * another, each bounded by the same capacity. Refining a request into parts thus frees the
 * taker's hands without letting decomposition grow unbounded. `available` is what it may still
 * take up: a thread taken up is work in hand until it is decomposed.
 */
export function capacityOf(player, board, at, { floor, windowDays } = workSettingsOf()) {
  const since = Date.parse(at) - windowDays * DAY_MS;
  const recent = (when) => when !== undefined && Date.parse(when) >= since;
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const awaitsParts = (thread) => (thread.children ?? []).some((child) => {
    const part = byId.get(child);
    return part !== undefined && part.opening.move === "request" && !CLOSED_STANDINGS.includes(part.standing);
  });
  let open = 0;
  let coordinating = 0;
  let settled = 0;
  for (const thread of board.threads) {
    if (OWING_STANDINGS.includes(thread.standing) && takersOf(thread).includes(player)) {
      if (awaitsParts(thread)) coordinating += sizeOf(thread);
      else open += sizeOf(thread);
    }
    settled += sizeOf(thread) * thread.deliveries.filter((delivery) => delivery.player === player && delivery.verdict === "accepted" && recent(delivery.judgedAt)).length;
    if (thread.resolution?.player === player && recent(thread.resolution.at)) settled += sizeOf(thread);
    if (thread.opening.move === "ask" && thread.accepted === player && recent(thread.answers.findLast((answer) => answer.player === player)?.at)) settled += sizeOf(thread);
  }
  const capacity = floor + settled;
  return Object.freeze({ capacity, open, coordinating, settled, idle: open === 0 && coordinating === 0, available: Math.max(0, Math.min(capacity - open, capacity - coordinating)) });
}

/**
 * Whether taking `thread` next stays within a taking order's size budget, `spent` already taken this
 * turn and `taken` threads so: the thread fits what is left, or the taker holds nothing and has
 * taken nothing and has some capacity, so one thread larger than its whole budget is still taken
 * alone (a kanban's oversize item) and no large request starves.
 * @param {{budget: number, idle: boolean}} order
 */
export function fitsBudget(order, thread, spent = 0, taken = 0) {
  const size = sizeOf(thread);
  return spent + size <= order.budget || (order.idle && taken === 0 && spent === 0 && order.capacity > 0);
}

/** Readings by which a settled work item failed rather than discharged (Belnap: false, or both). */
const FAILED_READINGS = Object.freeze(["false", "f", "both", "b", "contested", "denied"]);
const isDischarged = (item) => item.state === "settled" && !FAILED_READINGS.includes(item.reading);

/**
 * The moves a taker's own root has earned on the board (third edition: delivery is derived from the
 * work, never played by hand). `itemsOf(subject)` reads the taker's root: the latest state of each
 * work item admitted under a subject, `{item, state: "open" | "settled", reading, witness?}`. An
 * item is discharged when it has settled and nothing settled it as false or contested (a received
 * work result settles its item without asserting a truth value: its reading stays `unknown`, and
 * that is discharge, `workItemStatusOfScope`). When every item of a promised request's subject is
 * discharged, the taker delivers, the settling witnesses as its evidence; it delivers again after
 * a rejection only once its work has settled anew. When every item of an adopted report's subject
 * is discharged, it resolves the report. Work that settled otherwise earns nothing: the thread
 * keeps owing, visibly (`owesOf`).
 *
 * A thread decomposed into requests serving it (its `children`) is earned only once every one of
 * them has closed: a work breakdown is done when its parts are, so the work that only planned the
 * parts never delivers the whole. `only` narrows which threads are read for this turn; the children
 * are read on the whole board.
 */
export function settlingMovesOf(board, player, itemsOf, { only } = {}) {
  const moves = [];
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const partsOpen = (thread) => (thread.children ?? []).some((child) => {
    const part = byId.get(child);
    return part !== undefined && part.opening.move === "request" && !CLOSED_STANDINGS.includes(part.standing);
  });
  const earned = (subject) => {
    const items = itemsOf(subject) ?? [];
    if (items.length === 0 || items.some((item) => !isDischarged(item))) return undefined;
    return Object.freeze([...new Set([`work-subject:${subject}`, ...items.map((item) => item.witness).filter(Boolean)])].sort());
  };
  for (const thread of board.threads) {
    if (CLOSED_STANDINGS.includes(thread.standing) || (only !== undefined && !only.has(thread.id)) || partsOpen(thread)) continue;
    if (thread.opening.move === "request") {
      const promise = thread.promisers.find((promiser) => promiser.player === player && promiser.subject !== undefined);
      if (promise === undefined) continue;
      const own = thread.deliveries.filter((delivery) => delivery.player === player);
      if (own.some((delivery) => delivery.verdict === undefined)) continue;
      const evidence = earned(promise.subject);
      if (evidence === undefined || JSON.stringify(own.at(-1)?.evidence) === JSON.stringify(evidence)) continue;
      moves.push(Object.freeze({ move: "deliver", thread: thread.id, by: player, evidence }));
    } else if (thread.opening.move === "report" && thread.standing === "adopted") {
      const adoption = thread.adoptions.find((candidate) => candidate.player === player && candidate.subject !== undefined);
      const evidence = adoption === undefined ? undefined : earned(adoption.subject);
      if (evidence !== undefined) moves.push(Object.freeze({ move: "resolve", thread: thread.id, by: player, evidence }));
    }
  }
  return Object.freeze(moves);
}

/**
 * The deliveries awaiting a player's assay (work arena: acceptance is derived, as delivery is).
 * `judges(assayer, thread)` says whether a thread's assayer is one the player answers for: an office
 * it staffs, or itself, or a party no player can judge for, on a thread at home with the player. Each entry names the thread, the assayer it judges as, the delivery awaiting
 * its verdict and that delivery's ordinal on the thread, which keys the assay.
 */
export function deliveriesToAssay(board, judges) {
  const owed = [];
  for (const thread of board.threads) {
    if (thread.opening.move !== "request" || thread.standing !== "delivered") continue;
    const assayer = assayerOf(thread);
    if (!judges(assayer, thread)) continue;
    thread.deliveries.forEach((delivery, index) => {
      if (delivery.verdict === undefined) owed.push(Object.freeze({ thread, assayer, delivery, ordinal: index + 1 }));
    });
  }
  return Object.freeze(owed);
}

/**
 * The carriers that carried a delivery, as an assay's evidence: allocation never staffs its assay or
 * verification with any of them (feltos allocation-control `deliverer-carrier`), since a verifier
 * never attests its own work and two passes of one model on one work are one channel.
 */
const deliveredByCarriers = (carriers) => [...new Set(carriers.filter((carrier) => typeof carrier === "string" && carrier !== ""))].sort().map((carrier) => `delivered-by-carrier:${carrier}`);

/** An assessing intent's id at an attempt: the first keeps the bare id, a renewal names its attempt. */
const assessingIdOf = (id, refusals) => (refusals.length === 0 ? id : `${id}-attempt-${refusals.length + 1}`);

/** What refused the earlier attempts at an assessing order, as lines of its renewal. */
const assessingRefusalLines = (refusals) => (refusals.length === 0 ? [] : [
  "Earlier attempts at this order were refused; each refusal names what the result lacked, so this attempt must not repeat it:",
  ...refusals.map((refusal, index) => `- attempt ${index + 1}: ${String(refusal).slice(0, STATEMENT_LIMITS.finding)}`),
]);

/** The words of a list of non-empty strings, for codomains. */
const WORDS = Object.freeze({ type: "array", items: { type: "string", minLength: 1 } });
/** Keys naming a doer are refused anywhere in a move (`refuseDoers`), so no codomain admits them. */
const NO_DOER_KEYS = Object.freeze({ not: { enum: DOER_KEYS } });

/**
 * The codomain of an assay of a delivery under an operative contract (fifteenth edition): what its
 * work result's value is, as an anonymous JSON Schema its item declares (`returns`), so a result
 * of any other shape is the assayer's miss at admission and renews the work, never a verdict the
 * receiver cannot read. Unmet names conditions of this contract only (the need, when it states
 * none); `assayVerdictOf` reads it.
 * @param {{conditions: ReadonlyArray<{id: string}>}} operative
 */
export function assayVerdictCodomainOf(operative) {
  const conditions = operative.conditions.length === 0 ? ["need"] : operative.conditions.map((condition) => condition.id);
  return Object.freeze({
    type: "object", required: ["verdict", "evidence"], propertyNames: NO_DOER_KEYS,
    properties: {
      verdict: { enum: ["met", "unmet", "unverified"], description: "met when every condition of satisfaction holds, unmet when inspected evidence shows one does not, unverified when the evidence could not be inspected (a tool or read failed)" },
      unmet: { type: "array", minItems: 1, uniqueItems: true, items: { enum: conditions }, description: "when unmet, each condition the delivery does not meet" },
      reason: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.finding, description: "when unmet, why" },
      evidence: { ...WORDS, description: "what was inspected; a verdict naming none is recorded as presumed, not measured" },
    },
    if: { properties: { verdict: { const: "unmet" } } }, then: { required: ["unmet", "reason"] },
  });
}

/**
 * A delivery as the assay work its assayer admits into its own root: one endeavor, reading the
 * delivery's evidence against the operative contract (the need, each requirement and each
 * condition of satisfaction by id, with its method and the requirements it verifies) and returning
 * a verdict of `assayVerdictCodomainOf`, which its item declares as its codomain. A condition
 * carrying a deterministic assay is read by running it. The assay is content-addressed by thread
 * and delivery ordinal, so one delivery is assayed once, and a redelivery after a rejection is
 * assayed anew; `refusals` are what refused its earlier attempts (its `assessing-attempts` point,
 * `ASSESSING_ATTEMPTS` by default); `carriers` are the models that carried the delivery, which never
 * carry its assay.
 */
export function assayIntentOf(thread, delivery, ordinal, refusals = [], { carriers = [], judging } = {}) {
  if (thread.opening.move !== "request") throw new TypeError("only a request's delivery is assayed");
  const id = assessingIdOf(`assay-${keyOf(thread)}-${ordinal}`, refusals);
  const operative = operativeOf(thread, delivery.revision);
  const text = [
    `Assay the delivery by ${delivery.player} of the request: ${operative.need}`,
    ...(operative.requirements.length === 0 ? [] : ["Requirements:", ...operative.requirements.map(requirementLine)]),
    ...(operative.conditions.length === 0
      ? ["No conditions of satisfaction are stated: judge whether the delivery meets the need as stated, and name what you inspected, since a verdict without evidence is recorded as presumed, not measured."]
      : ["Conditions of satisfaction:", ...operative.conditions.map(conditionLine)]),
    ...((delivery.claims ?? []).length === 0 ? [] : ["The deliverer claims:", ...delivery.claims.map((claim) => `- ${claim.condition}: ${claim.evidence.join(", ")}`)]),
    ...assessingRefusalLines(refusals),
    "Inspect the delivery's evidence against each condition; do not redo or extend the delivered work. Return the verdict as the value this order's codomain types: met when every condition holds, else unmet naming each condition that does not and why, with what you inspected as its evidence. If you could not inspect the evidence (a tool failed, a read timed out, something was unreachable), return unverified and say what you could not read: what was not inspected is unknown, never unmet.",
  ].join("\n");
  return Object.freeze({
    kind: "metroplat.work.structured-intent", id, producer: { id: assayerOf(thread) },
    sources: [{ id: "assay", kind: "work-arena-assay", locator: thread.id }],
    items: [{ cell: `endeavor:${id}`, text, returns: assayVerdictCodomainOf(operative), ...judgingWorkOf(judging), evidence: [...new Set([`assay-of:${thread.id}`, `delivered-by:${delivery.player}`, ...deliveredByCarriers(carriers), ...delivery.evidence])], provenance: [{ source: "assay" }] }],
  });
}

/**
 * The work and skill an assay or verification is admitted as: the judging enterprise's own
 * (`judges`), so it is received against what makes a judgment complete, never against the
 * assessing of taken demand; none when the enterprise declares none (it is then assessed).
 */
const judgingWorkOf = (judging) => (judging?.work && judging?.skill ? { work: judging.work, skill: judging.skill } : {});

/** An assay's work result value as its verdict, or undefined when it states none. */
export function assayVerdictOf(value) {
  const verdict = value?.verdict;
  // An assay that could not inspect the delivery states no verdict: the delivery stays unjudged
  // (unknown, never denied) and the assay is renewed.
  if (verdict === "unverified") return undefined;
  if (verdict === "none") return Object.freeze({ verdict, evidence: Object.freeze((value.evidence ?? []).filter((entry) => typeof entry === "string" && entry !== "")) });
  if (verdict === "met") return Object.freeze({ verdict, evidence: Object.freeze((value.evidence ?? []).filter((entry) => typeof entry === "string" && entry !== "")) });
  if (verdict !== "unmet") return undefined;
  const unmet = (value.unmet ?? []).filter((entry) => typeof entry === "string" && entry.trim() !== "");
  return Object.freeze({
    verdict,
    unmet: Object.freeze(unmet.length === 0 ? ["need"] : unmet),
    ...(typeof value.reason === "string" && value.reason.trim() !== "" ? { reason: value.reason } : {}),
    evidence: Object.freeze((value.evidence ?? []).filter((entry) => typeof entry === "string" && entry !== "")),
  });
}

/**
 * The judgements an assayer's own work has earned (acceptance is derived from its assay, never
 * played by hand): for each delivery awaiting it (`deliveriesToAssay`), `verdictOf(entry)` reads
 * the assay admitted for it in the assayer's root, undefined until that work is discharged with a
 * verdict, else `{verdict, unmet?, reason?, evidence}`. Met accepts the delivery; unmet rejects
 * it, naming the conditions it does not meet. The judgement is played as the assayer, with the
 * assay's witnesses as its evidence.
 */
export function assayingMovesOf(owed, verdictOf) {
  const moves = [];
  for (const entry of owed) {
    const judged = verdictOf(entry);
    // An assay judges; only a rehearsal finds nothing to judge.
    if (judged === undefined || judged.verdict === "none") continue;
    const common = { thread: entry.thread.id, by: entry.assayer, of: entry.delivery.player, ...optional("evidence", judged.evidence) };
    moves.push(Object.freeze(judged.verdict === "met"
      ? { move: "accept", ...common }
      : { move: "reject", ...common, unmet: judged.unmet, ...optional("reason", judged.reason) }));
  }
  return Object.freeze(moves);
}

/**
 * The four verifier roles (the Four Armies, 561 Group glossary "four verifier roles"): each answers
 * a differently shaped question about a delivery, none ranks another, and a verifier never attests
 * its own work, so the four sit at four loci. Each tells its finding into the delivery as a witness
 * with evidence (seventh edition): a role that finds a condition unmet denies it, and the delivery
 * reads contested or denied, rejected whatever its assayer said; a role that finds nothing to deny
 * holds the claims it checked. None validates: that the delivery was the right thing stays its
 * assayer's (`judgedDelivery`). Red rehearses a planned traversal; a delivery that plans none is
 * nothing for red to rehearse, and red tells nothing of it.
 */
export const VERIFIER_ROLES = Object.freeze({
  white: Object.freeze({ question: "Does the delivered work's own internal structure hold?",
    instruction: "Open the delivered work's own structure (its reasoning, proofs, rules, code paths) and judge whether it holds on its own terms. For each finding, state the internal rule the structure satisfies or fails, so another verifier could re-derive the same finding from the same structure. Do not check it against an outside standard and do not attack it." }),
  black: Object.freeze({ question: "Does the delivered work conform to the named standard?",
    instruction: "Check the delivered work from the outside against the conditions of satisfaction and any standard they name, applying each check exactly as written, the same as for any other work. For each finding, state the standard or observed fact it was checked against, so another verifier could re-run the same check and reach the same answer. Do not open its internal structure and do not attack it." }),
  blue: Object.freeze({ question: "Does the delivered work survive an adversary?",
    instruction: "Try to break the delivered work: probe it under adversarial inputs, hostile use and edge conditions, independent of whoever produced it. For each finding, state what you broke and how, so another verifier could reproduce it. State findings; do not negotiate them, and do not check it against a standard at rest." }),
  red: Object.freeze({ question: "Would the delivery's planned traversal, run for real, deviate from the territory?",
    instruction: "Rehearse the traversal the delivery plans to run (a deployment, a migration, a release, a payment) against the territory it would cross, before it runs, and predict where it would deviate. For each prediction, state the traversal simulated, the territory and where it deviates, so another verifier could re-run the rehearsal. If the delivery plans no traversal, return verdict none. Attack nothing." }),
});

/** The roles, in the order a traversal meets them: structure, standard, adversary, rehearsal. */
export const VERIFIER_ROLE_NAMES = Object.freeze(Object.keys(VERIFIER_ROLES));

/**
 * The codomain of a verifier role's finding: met or unmet, as an assay's (`assayVerdictCodomainOf`),
 * with evidence required (a verifier who is not the assayer witnesses only with evidence), and for
 * red a third verdict, none, when the delivery plans no traversal.
 */
export function verifierFindingCodomainOf(role, operative) {
  const base = assayVerdictCodomainOf(operative);
  return Object.freeze({
    ...base,
    properties: Object.freeze({
      ...base.properties,
      verdict: role === "red" ? { enum: ["met", "unmet", "none", "unverified"], description: "met when the rehearsed traversal deviates nowhere, unmet naming each condition it would break, none when no traversal is planned, unverified when the territory could not be read" } : base.properties.verdict,
      evidence: { ...base.properties.evidence, minItems: 1 },
    }),
  });
}

/**
 * The deliveries awaiting a verifier office's finding: requests delivered and not yet judged or
 * judged but still standing, by a player other than the office, whose delivery the office has not
 * witnessed. A delivery accepted or rejected already stays open to a witness (telling is
 * coordination-free); this reads only what is still owed: deliveries with no verdict.
 */
export function deliveriesToVerify(board, office, identity = (player) => player) {
  const owed = [];
  for (const thread of board.threads) {
    if (thread.opening.move !== "request" || thread.standing !== "delivered") continue;
    thread.deliveries.forEach((delivery, index) => {
      if (delivery.verdict !== undefined || identity(delivery.player) === identity(office)) return;
      if ((delivery.witnesses ?? []).some((witness) => identity(witness.player) === identity(office))) return;
      owed.push(Object.freeze({ thread, office, delivery, ordinal: index + 1 }));
    });
  }
  return Object.freeze(owed);
}

/**
 * A delivery as one verifier role's work, admitted into the verifying office's root like an assay
 * (`assayIntentOf`): its text asks the role's question of the delivery under the operative contract
 * and its codomain is the role's finding. Content-addressed by role, thread and delivery ordinal, so
 * each role verifies each delivery once.
 */
export function verifierIntentOf(role, thread, delivery, ordinal, office, refusals = [], { carriers = [], judging } = {}) {
  const shape = VERIFIER_ROLES[role];
  if (shape === undefined) throw new TypeError(`no verifier role ${role}: the roles are ${VERIFIER_ROLE_NAMES.join(", ")}`);
  if (thread.opening.move !== "request") throw new TypeError("only a request's delivery is verified");
  const id = assessingIdOf(`verify-${role}-${keyOf(thread)}-${ordinal}`, refusals);
  const operative = operativeOf(thread, delivery.revision);
  const text = [
    `As the ${role} verifier (${shape.question}), verify the delivery by ${delivery.player} of the request: ${operative.need}`,
    shape.instruction,
    ...(operative.requirements.length === 0 ? [] : ["Requirements:", ...operative.requirements.map(requirementLine)]),
    ...(operative.conditions.length === 0 ? [] : ["Conditions of satisfaction:", ...operative.conditions.map(conditionLine)]),
    ...((delivery.claims ?? []).length === 0 ? [] : ["The deliverer claims:", ...delivery.claims.map((claim) => `- ${claim.condition}: ${claim.evidence.join(", ")}`)]),
    ...assessingRefusalLines(refusals),
    "Do not redo or extend the delivered work. Return your finding as the value this order's codomain types: met when you find nothing to deny, else unmet naming each condition (or the need) your finding denies and why, with what you inspected as its evidence. If you could not inspect the delivery (a tool failed, a read timed out), return unverified saying what you could not read: never deny what you did not inspect.",
  ].join("\n");
  return Object.freeze({
    kind: "metroplat.work.structured-intent", id, producer: { id: office },
    sources: [{ id: "verify", kind: "work-arena-verification", locator: thread.id }],
    items: [{ cell: `endeavor:${id}`, text, returns: verifierFindingCodomainOf(role, operative), ...judgingWorkOf(judging), evidence: [...new Set([`assay-of:${thread.id}`, `verifier-role:${role}`, `delivered-by:${delivery.player}`, ...deliveredByCarriers(carriers), ...delivery.evidence])], provenance: [{ source: "verify" }] }],
  });
}

/**
 * The witnesses a verifier office's findings tell: for each owed delivery whose finding `findingOf`
 * reads (`assayVerdictOf`, or `{verdict: "none"}`), met holds the delivery's claims as an accept by the
 * office, unmet denies the named ones as a reject, none tells nothing. Every witness carries its
 * evidence, since a verifier is not the assayer.
 */
export function verifyingMovesOf(owed, findingOf) {
  const moves = [];
  for (const entry of owed) {
    const finding = findingOf(entry);
    if (finding === undefined || finding.verdict === "none" || (finding.evidence ?? []).length === 0) continue;
    const common = { thread: entry.thread.id, by: entry.office, of: entry.delivery.player, evidence: finding.evidence };
    moves.push(Object.freeze(finding.verdict === "met"
      ? { move: "accept", ...common }
      : { move: "reject", ...common, unmet: finding.unmet, ...optional("reason", finding.reason) }));
  }
  return Object.freeze(moves);
}

/**
 * What shows a request's order incomplete (fourteenth edition), or undefined: a delivery rejected
 * under the order in force while none awaits a verdict, or a taker's report, said since the order
 * was last stated, that it cannot staff the work for want of information (carriers of different
 * models missed it alike, work/staffing). Either names its evidence.
 * @param {object} thread a projected request
 * @param {(id: string) => object | undefined} [threadOf] reads another thread of the board
 */
export function orderGapOf(thread, threadOf = () => undefined) {
  if (thread.opening.move !== "request" || CLOSED_STANDINGS.includes(thread.standing ?? standingOf(thread))) return undefined;
  const rejected = rejectedUnderOrder(thread);
  if (rejected !== undefined) {
    const ordinal = thread.deliveries.indexOf(rejected) + 1;
    return Object.freeze({ kind: "rejected", delivery: rejected, ordinal, evidence: Object.freeze([...new Set([`rejected-delivery:${thread.id}#${ordinal}`, ...(rejected.assay ?? [])])].sort()) });
  }
  if (thread.deliveries.some((delivery) => delivery.verdict === undefined)) return undefined;
  const stated = Date.parse(thread.refinements.at(-1)?.at ?? thread.opening.at);
  const reports = (thread.obstacles ?? []).filter((entry) => entry.obstacle === "information")
    .map((entry) => threadOf(entry.id)).filter((report) => report !== undefined && lastSaidOf(report) > stated);
  if (reports.length === 0) return undefined;
  return Object.freeze({ kind: "information", reports: Object.freeze(reports), evidence: Object.freeze(reports.map((report) => report.id).sort()) });
}

/** What a report says now: its latest observation, restated or corroborated, else its opening's. */
const latestObservationOf = (report) => [...(report.restatements ?? []), ...report.corroborations]
  .filter((entry) => entry.observation !== undefined).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).at(-1)?.observation ?? report.opening.observation;

/** When a thread was last said: its opening, or a corroboration or restatement of it. */
const lastSaidOf = (thread) => Math.max(...[thread.opening, ...(thread.corroborations ?? []), ...(thread.restatements ?? [])].map((entry) => Date.parse(entry.at)));

/**
 * The order a player handed back on an obstacle report (sixteenth edition), or undefined: the
 * `completes:<order>` its latest saying of the report (its opening, a corroboration or a
 * restatement) names among its evidence.
 */
function handedBackOf(report, player) {
  if (report === undefined) return undefined;
  const sayings = [{ player: report.opening.by, evidence: report.opening.evidence, at: report.opening.at }, ...report.corroborations, ...(report.restatements ?? [])]
    .filter((entry) => entry.player === player).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return sayings.at(-1)?.evidence?.find((entry) => entry.startsWith("completes:"))?.slice("completes:".length);
}

/**
 * The orders a player owes completing (fourteenth edition): each request whose order a miss shows
 * incomplete (`orderGapOf`), whose opener or else assayer the player answers for (`judges`, as for
 * `deliveriesToAssay`). Each entry names the thread, the player completing it, the gap, the order
 * in force and the completion's ordinal, which keys the completion work. An assayer that handed
 * the order in force back to its opener (sixteenth edition, `orderCompletionMovesOf`) owes nothing
 * more until the opener states the order again.
 */
export function ordersToComplete(board, judges) {
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const owed = [];
  for (const thread of board.threads) {
    if (thread.opening.move !== "request") continue;
    const completer = [thread.opening.by, assayerOf(thread)].find((player) => judges(player, thread));
    if (completer === undefined) continue;
    const gap = orderGapOf(thread, (id) => byId.get(id));
    if (gap === undefined) continue;
    const order = orderOf(thread);
    if (completer !== thread.opening.by && (thread.obstacles ?? []).some((entry) => handedBackOf(byId.get(entry.id), completer) === order)) continue;
    owed.push(Object.freeze({ thread, completer, gap, order, ordinal: completionsOf(thread) + 1 }));
  }
  return Object.freeze(owed);
}

/** A statement of a contract in a codomain: its id a lowercase slug, what it says one statement. */
const statementCodomain = (properties, says) => Object.freeze({
  type: "object", required: ["id", "says"], propertyNames: NO_DOER_KEYS,
  properties: {
    id: { type: "string", pattern: ID.source, description: "a lowercase slug, distinct within its list" },
    says: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.statement, description: says },
    ...properties,
  },
});

/** A completion's terms: the whole contract restated, never alongside the key of its other outcome. */
const completionTermsCodomain = (other) => Object.freeze({
  type: "object", required: ["requirements", "conditions"], not: { required: [other] }, propertyNames: NO_DOER_KEYS,
  properties: {
    requirements: { type: "array", minItems: 1, items: statementCodomain({
      priority: { enum: PRIORITIES }, class: { enum: REQUIREMENT_CLASSES },
      rationale: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.rationale, description: "why it is required" },
      traces: { type: "array", items: { type: "string", pattern: "#[a-z0-9]+(?:[-.][a-z0-9]+)*$" }, description: "<thread>#<requirement> it is allocated from" },
    }, "one `shall` statement whose subject is the thing delivered, never who delivers it") },
    conditions: { type: "array", minItems: 1, items: statementCodomain({
      method: { enum: VERIFICATION_METHODS },
      verifies: { type: "array", items: { type: "string", pattern: ID.source }, description: "the ids of the requirements of this contract it verifies; none answers for all" },
      assay: { type: "object", required: ["operation", "acceptance"], properties: { operation: { type: "string", minLength: 1 }, acceptance: { type: "object", required: ["kind"], properties: { kind: { type: "string", minLength: 1 } } } } },
    }, "what is read to verify the requirements it names") },
    returns: { type: "object", description: "the complete anonymous JSON Schema of the result; admitted by the same closure law as a refinement" },
    examples: { type: "array", minItems: 1, maxItems: EXAMPLE_LIMIT, items: {
      type: "object", required: ["output"], additionalProperties: false,
      properties: {
        says: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.statement },
        input: {}, output: {},
      },
    }, description: "acceptance cases typed by returns, never inferred from the maker's output" },
    scope: { type: "array", items: { type: "string", pattern: SCOPE_SUBJECT.source }, description: "typed subjects <kind>:<value>, only when the scope changes" },
  },
});
const NO_TERMS = Object.freeze({ anyOf: [{ required: ["requirements"] }, { required: ["conditions"] }] });

/** The opener's completion: its terms, or only its withdrawal of the need no order could carry. */
const OPENER_COMPLETION_CODOMAIN = Object.freeze({
  oneOf: [
    completionTermsCodomain("withdraw"),
    {
      type: "object", required: ["withdraw"], not: NO_TERMS,
      properties: { withdraw: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.finding, description: "why no order could carry this need" } },
    },
  ],
});

/**
 * The assayer's completion: its terms, or only the obstacle that holds the need back from any
 * order, which hands the order back to its opener; the need is the opener's, so an assayer never
 * withdraws it.
 */
const ASSAYER_COMPLETION_CODOMAIN = Object.freeze({
  oneOf: [
    completionTermsCodomain("obstacle"),
    {
      type: "object", required: ["obstacle", "observation"], not: NO_TERMS,
      properties: {
        obstacle: { enum: BLOCKING_OBSTACLES, description: "what no order could supply: knowledge (information), a decision or permission (authority), other work (dependency), money, compute or an account (resource), or requirements that cannot all hold together (conflict)" },
        observation: { type: "string", minLength: 1, maxLength: STATEMENT_LIMITS.finding, description: "why no order could carry this need, said to its opener" },
      },
    },
  ],
});

/**
 * The codomain of an order's completion (fifteenth edition) is what its completer may lawfully
 * play (sixteenth edition): the whole contract restated, or else, for the opener, a withdrawal
 * naming why no order can carry the need, and for an assayer completing in the opener's stead, the
 * blocking obstacle that hands the order back to the opener. It is an anonymous JSON Schema the
 * completion's item declares (`returns`). The statement law (one conforming `shall` whose subject
 * is the thing delivered, no doer, each verified id stated) is the arena's, read by
 * `orderCompletionOf`; what it refuses renews the completion with the refusal stated (its
 * `assessing-attempts` point, `ASSESSING_ATTEMPTS` by default).
 * @param {{thread: object, completer: string}} entry an order owed completing (`ordersToComplete`)
 */
export const orderCompletionCodomainOf = (entry) => (entry.completer === entry.thread.opening.by ? OPENER_COMPLETION_CODOMAIN : ASSAYER_COMPLETION_CODOMAIN);

/**
 * An order's completion as the work its completer admits into its own root (fourteenth edition):
 * one endeavor, reading the order in force and the miss that shows it incomplete, and returning
 * the whole contract restated so that any maker reading only it would meet the need, of the
 * codomain its completer may play (`orderCompletionCodomainOf`), which its item declares. It writes the order; it
 * never does the work or judges the maker. The completion is content-addressed by thread and
 * ordinal, so one miss is answered once; `refusals` are what refused its earlier attempts.
 * @param {{thread: object, completer: string, gap: object, order: string, ordinal: number}} entry
 * @param {ReadonlyArray<string>} [refusals]
 */
export function orderCompletionIntentOf(entry, refusals = []) {
  const { thread, gap, order, ordinal } = entry;
  if (thread.opening.move !== "request") throw new TypeError("only a request's order is completed");
  const id = assessingIdOf(`complete-${keyOf(thread)}-${ordinal}`, refusals);
  const operative = operativeOf(thread);
  const miss = gap.kind === "rejected"
    ? [`The delivery by ${gap.delivery.player} was rejected${(gap.delivery.unmet ?? []).length === 0 ? "" : `, unmet: ${gap.delivery.unmet.join(", ")}`}${gap.delivery.reason === undefined ? "" : ` (${gap.delivery.reason})`}.`,
      ...((gap.delivery.assay ?? []).length === 0 ? [] : [`Its assay inspected: ${gap.delivery.assay.join(", ")}`])]
    : gap.reports.map((report) => `${report.opening.by} reports: ${latestObservationOf(report)}`);
  const text = [
    `Complete the order of the request: ${operative.need}`,
    `The order in force (${order}):`,
    ...(operative.requirements.length === 0 ? ["No requirements are stated."] : ["Requirements:", ...operative.requirements.map(requirementLine)]),
    ...(operative.conditions.length === 0 ? ["No conditions of satisfaction are stated."] : ["Conditions of satisfaction:", ...operative.conditions.map(conditionLine)]),
    ...(operative.scope.length === 0 ? [] : [`Scope: ${operative.scope.join(", ")}`]),
    ...(operative.returns === undefined ? [] : [`Result codomain (anonymous JSON Schema): ${JSON.stringify(operative.returns)}`]),
    ...(operative.examples === undefined ? [] : ["Examples (each one acceptance case among others):", ...operative.examples.map(exampleLine)]),
    "What shows it incomplete:",
    ...miss,
    "Whoever takes this order up makes exactly what it says and knows nothing it does not say, and any capable maker may be the one: a miss means the order let a capable maker make the wrong thing, or left it unable to make anything. Restate the whole contract so that any maker reading only it would meet the need: keep what held, sharpen each condition the miss slipped past, and state the requirements, interfaces, examples or prohibitions the maker was left to guess. Each requirement is one \"shall\" statement whose subject is the thing delivered, never who delivers it, and each must-requirement is verified by some condition. Do not do the work, and do not judge the maker.",
    ...assessingRefusalLines(refusals),
    entry.completer === thread.opening.by
      ? "Return as the value this order's codomain types the complete requirements, conditions and result closure (returns and examples when stated; scope only when it changes), or only withdraw, naming why, when no order could carry this need."
      : `Return as the value this order's codomain types the complete requirements, conditions and result closure (returns and examples when stated; scope only when it changes), or, when no order could carry this need, only the obstacle no order could supply and an observation saying why, which hands the order back to ${thread.opening.by}, whose need it is.`,
  ].join("\n");
  return Object.freeze({
    kind: "metroplat.work.structured-intent", id, producer: { id: entry.completer },
    sources: [{ id: "completion", kind: "work-arena-completion", locator: thread.id }],
    items: [{ cell: `endeavor:${id}`, text, returns: orderCompletionCodomainOf(entry), evidence: [...new Set([`completes:${order}`, `order-of:${thread.id}`, ...gap.evidence])], provenance: [{ source: "completion" }] }],
  });
}

/**
 * A completion's work result value as the terms it states (normalized as a refinement's), or
 * `{withdraw}`, or the `{obstacle, observation}` that hands it back, or `{refused}` naming why the
 * value states no lawful contract; undefined when it states nothing at all.
 */
export function orderCompletionOf(value) {
  if (value === null || typeof value !== "object") return undefined;
  if (value.requirements === undefined && value.conditions === undefined) {
    if (typeof value.withdraw === "string" && value.withdraw.trim() !== "") return Object.freeze({ withdraw: value.withdraw.trim().slice(0, STATEMENT_LIMITS.finding) });
    if (BLOCKING_OBSTACLES.includes(value.obstacle) && typeof value.observation === "string" && value.observation.trim() !== "") {
      return Object.freeze({ obstacle: value.obstacle, observation: value.observation.trim().slice(0, STATEMENT_LIMITS.finding) });
    }
    return undefined;
  }
  try {
    // A completed order is the same full contract a refinement admits. A
    // requirements-only projection would erase its result type and examples
    // before the next maker or receiver could read them.
    return Object.freeze(termsOf({
      requirements: value.requirements, conditions: value.conditions,
      ...optional("returns", value.returns), ...optional("examples", value.examples),
      ...((value.scope ?? []).length === 0 ? {} : { scope: value.scope }),
    }, "an order's completion"));
  } catch (error) {
    return Object.freeze({ refused: error.message });
  }
}

/**
 * The moves an order's completer has earned (fourteenth edition): for each order owed completing
 * (`ordersToComplete`), `completionOf(entry)` reads the completion admitted for it in the
 * completer's root, undefined until that work is discharged. Its terms refine the request as a
 * completion of the order in force, the scope kept unless they change it, with the miss as
 * evidence (and whatever witnesses `completionOf` names for the completion work itself); terms that
 * restate the same order earn nothing. A withdrawal is played only by the request's opener; an
 * assayer completing in the opener's stead hands the order back (sixteenth edition): it reports
 * the obstacle against the request, naming the order it was to complete (`completes:<order>`) and
 * the miss as evidence, so the request stands obstructed with the opener's turn; an obstacle of
 * that kind already said on the request (`threadOf`, as for `orderGapOf`) is corroborated.
 * @param {(id: string) => object | undefined} [threadOf] reads another thread of the board
 */
export function orderCompletionMovesOf(owed, completionOf, threadOf = () => undefined) {
  const moves = [];
  for (const entry of owed) {
    const completion = completionOf(entry);
    if (completion === undefined || completion.refused !== undefined) continue;
    const common = { thread: entry.thread.id, by: entry.completer };
    const opener = entry.completer === entry.thread.opening.by;
    if (completion.withdraw !== undefined) {
      if (opener) moves.push(Object.freeze({ move: "withdraw", ...common, reason: completion.withdraw }));
      continue;
    }
    if (completion.obstacle !== undefined) {
      if (!opener) moves.push(handBackOf(entry, completion, threadOf));
      continue;
    }
    const terms = {
      requirements: completion.requirements, conditions: completion.conditions,
      ...optional("returns", completion.returns), ...optional("examples", completion.examples),
      ...optional("scope", completion.scope ?? operativeOf(entry.thread).scope),
    };
    if (orderOf({ ...entry.thread, refinements: [...entry.thread.refinements, terms] }) === entry.order) continue;
    moves.push(Object.freeze({ move: "refine", ...common, ...terms, completes: entry.order, evidence: [...new Set([...entry.gap.evidence, ...(completion.evidence ?? [])])].sort() }));
  }
  return Object.freeze(moves);
}

/** An assayer's completion handed back to the request's opener: its obstacle reported, or corroborated where already said. */
function handBackOf(entry, completion, threadOf) {
  const evidence = [...new Set([`completes:${entry.order}`, ...entry.gap.evidence, ...(completion.evidence ?? [])])].sort();
  const observation = `${entry.completer} cannot complete the order of ${entry.thread.id}; it is ${entry.thread.opening.by}'s: ${completion.observation}`.slice(0, STATEMENT_LIMITS.finding);
  const { at: _at, ...report } = openingOf({
    move: "report", by: entry.completer, obstacle: completion.obstacle, obstructs: [entry.thread.id], evidence, observation,
    ...optional("scope", entry.thread.opening.scope), at: new Date(0).toISOString(),
  });
  if (threadOf(report.id) === undefined) return Object.freeze(report);
  return Object.freeze({ move: "corroborate", thread: report.id, by: entry.completer, evidence, observation });
}

/**
 * The resolutions an assayer owes the orders it handed back (sixteenth edition): each live
 * obstacle report it said as the completion of an order (`completes:<order>`) on a request whose
 * assayer the player answers for (`judges`), once that order is no longer in force (its opener
 * stated it again) or the request has closed, with the order now in force or the request's
 * standing as evidence. A taker still obstructed corroborates its own report again
 * (`obstacleMovesOfAllocation`), so resolving never hides a standing obstacle.
 */
export function handbackResolutionsOf(board, judges) {
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const moves = [];
  for (const report of board.threads) {
    if (report.opening.move !== "report" || !BLOCKING_OBSTACLES.includes(report.opening.obstacle) || CLOSED_STANDINGS.includes(report.standing)) continue;
    const thread = byId.get(report.opening.obstructs[0]?.split("#")[0]);
    if (thread === undefined || thread.opening.move !== "request") continue;
    const assayer = assayerOf(thread);
    const handed = handedBackOf(report, assayer);
    if (handed === undefined || assayer === thread.opening.by || !judges(assayer, thread)) continue;
    const closed = CLOSED_STANDINGS.includes(thread.standing);
    if (!closed && handed === orderOf(thread)) continue;
    moves.push(Object.freeze({ move: "resolve", thread: report.id, by: assayer, evidence: [closed ? `${thread.standing}:${thread.id}` : `in-force:${orderOf(thread)}`] }));
  }
  return Object.freeze(moves);
}

/**
 * The work a taker admitted into its own root that it no longer owes (the converse of derived
 * delivery): every subject one of its taking moves recorded, less the subjects of its takings that
 * still stand on a thread still open. A released promise, a left aim, and a thread withdrawn,
 * superseded or settled all end what the taking admitted; the taker's root then withdraws whatever
 * of that work is still open, so its book holds only what the board says it owes. Each entry names
 * the thread and why the subject lapsed.
 * @returns {ReadonlyArray<{subject: string, thread: string, why: string}>}
 */
export function lapsedSubjectsOf(board, player) {
  const standing = new Set();
  const recorded = new Map();
  const note = (entries, thread, why) => {
    for (const entry of entries) if (entry.player === player && entry.subject !== undefined && !recorded.has(entry.subject)) recorded.set(entry.subject, { thread: thread.id, why });
  };
  for (const thread of board.threads) {
    const open = !CLOSED_STANDINGS.includes(thread.standing);
    for (const entry of [...thread.promisers, ...thread.adoptions, ...thread.holders]) {
      if (open && entry.player === player && entry.subject !== undefined) standing.add(entry.subject);
    }
    note(thread.releases ?? [], thread, "released");
    note(thread.left, thread, "left");
    note(thread.refinements.flatMap((refinement) => refinement.retaken ?? []), thread, "order-completed");
    note([...thread.promisers, ...thread.adoptions, ...thread.holders], thread, open ? "standing" : thread.standing);
  }
  return Object.freeze([...recorded].filter(([subject]) => !standing.has(subject))
    .map(([subject, { thread, why }]) => Object.freeze({ subject, thread, why })));
}

/**
 * What an allocation reason says stands in the way, as an obstacle kind (KAOS), or nothing when
 * the reason is a fault of the taker's own records (an undeclared work or skill, a revised
 * obligation, a refused admission): those are repaired in its root, not reported to the market.
 * A thread waiting on other coordinated work is a dependency; a missing grant or firm authority is
 * authority; no admitted service for the duty is capability; qualified carriers all busy is capacity.
 */
const OBSTACLE_OF_REASON = Object.freeze([
  [/^firm-authority-unavailable:|^provider-delegation-unavailable:/, "authority"],
  [/^coordination-obstructed$/, "dependency"],
  [/^order-incomplete$/, "information"],
  [/^no-current-provider-admission$|^office-duty-service-missing$|^capability-missing:/, "capability"],
  [/^provider-(?:in-flight|reserved|unavailable|result-awaiting-receipt)$|^staffing-exhausted$/, "capacity"],
]);
const OBSTACLE_PRECEDENCE = Object.freeze(["authority", "dependency", "information", "capability", "capacity"]);
const CLEARED_ALLOCATIONS = Object.freeze(["allocatable", "allocated", "already-allocated"]);

/** The most binding obstacle kind among some reasons, or undefined when none is an obstacle. */
const bindingOf = (reasons) => {
  const kinds = new Set(reasons.flatMap((reason) => OBSTACLE_OF_REASON.filter(([pattern]) => pattern.test(reason)).map(([, kind]) => kind)));
  return OBSTACLE_PRECEDENCE.find((kind) => kinds.has(kind));
};

/**
 * The obstacle kind an obstructed allocation item stands for, or undefined when nothing in it is
 * an obstacle another party could see. The item's own reasons bind every carrier, so their most
 * binding kind is the obstacle. Otherwise each candidate carrier is held back by the most binding
 * kind among its own reasons, and the work waits only on the carrier nearest to clearing: the
 * least binding of those. A carrier that never serves the duty does not make the work wait on
 * capability while another qualified carrier is merely busy.
 * @param {{reasons?: ReadonlyArray<string>, candidates?: ReadonlyArray<{reasons?: ReadonlyArray<string>}>}} item
 */
export function obstacleOfAllocation(item) {
  const own = bindingOf(item.reasons ?? []);
  if (own !== undefined) return own;
  const held = (item.candidates ?? []).map((candidate) => bindingOf(candidate.reasons ?? []));
  if (held.length === 0 || held.includes(undefined)) return undefined;
  return OBSTACLE_PRECEDENCE.findLast((kind) => held.includes(kind));
}

/** The distinct misses an obstructed allocation's candidates name (work/staffing attempts), by witness. */
function missesOfAllocation(item) {
  const misses = new Map();
  for (const miss of (item.candidates ?? []).flatMap((candidate) => candidate.misses ?? [])) {
    const key = miss.witness ?? JSON.stringify([miss.carrier, miss.outcome, miss.error ?? miss.reason]);
    if (!misses.has(key)) misses.set(key, miss);
  }
  return [...misses.values()];
}

/** A miss as said: its carrier, its outcome, and why (a failure's error, a rejection's reason). */
const missLine = (miss) => `${miss.carrier ?? "an unrecorded carrier"} ${miss.outcome}${(miss.error ?? miss.reason) === undefined ? "" : `: ${miss.error ?? miss.reason}`}`;

/**
 * What a taker says on the board about staffing the work it holds (fifth and sixth editions):
 * staffing is derived in its root (allocation control), and where that derivation is obstructed
 * the market sees why the commitment is not moving instead of a request for hands. An obstacle that
 * holds the thread back from anyone (authority, dependency) is reported against it: one report per
 * kind and thread (the report's name is its kind and target), a resolved obstacle that comes back
 * corroborated as recurring, and once the thread's work allocates the taker resolves what it
 * reported there, with the allocation as evidence. An obstacle of its own is not reported to
 * itself (`TAKER_OBSTACLES`): lacking the capability, it releases the request or leaves the aim with
 * the obstacle named, and the thread's home passes on (`homeOf`); lacking only hands, it says
 * nothing and its flow prices it (`capacityOf`). Only threads this player currently holds are
 * spoken for.
 * @param {{threads: ReadonlyArray<object>}} board
 * @param {string} player
 * @param {ReadonlyArray<{scope: string, state: string, subject?: string, reasons?: ReadonlyArray<string>, candidates?: ReadonlyArray<object>}>} items
 * @returns {ReadonlyArray<object>} the moves to play, without `at`
 */
export function obstacleMovesOfAllocation(board, player, items, { playerIdentity = exactPlayer } = {}) {
  const byId = new Map(board.threads.map((thread) => [thread.id, thread]));
  const reportsOn = (id) => board.threads.filter((thread) => thread.opening.move === "report" && thread.opening.obstacle !== undefined
    && thread.opening.obstructs.some((target) => target.split("#")[0] === id));
  const moves = [];
  const said = new Set();
  for (const item of items) {
    if (typeof item.subject !== "string") continue;
    const thread = board.threads.find((candidate) => ["request", "aim"].includes(candidate.opening.move)
      && !CLOSED_STANDINGS.includes(candidate.standing) && workSubjectMatchesThread(candidate, item.subject)
      && activeTakingOf(candidate, player, playerIdentity).length > 0);
    if (thread === undefined) continue;
    if (item.state === "obstructed") {
      const obstacle = obstacleOfAllocation(item);
      if (obstacle === undefined || obstacle === "capacity") continue;
      const reasons = [...new Set([...(item.reasons ?? []), ...(item.candidates ?? []).flatMap((candidate) => candidate.reasons ?? [])])].join(", ");
      // An incomplete order is told with the misses that show it, so its opener completes it from them.
      const misses = obstacle === "information" ? missesOfAllocation(item) : [];
      const evidence = [item.subject, ...misses.flatMap((miss) => miss.witness === undefined ? [] : [miss.witness])];
      const told = misses.length === 0 ? "" : `; ${misses.map(missLine).join("; ")}`;
      if (TAKER_OBSTACLES.includes(obstacle)) {
        if (said.has(thread.id)) continue;
        said.add(thread.id);
        const reason = `its allocation of ${item.scope} is obstructed (${reasons})`.slice(0, STATEMENT_LIMITS.finding);
        moves.push(Object.freeze({ move: thread.opening.move === "aim" ? "leave" : "release", thread: thread.id, by: player, obstacle, reason }));
        continue;
      }
      const report = openingOf({
        move: "report", by: player, obstacle, obstructs: [thread.id], evidence,
        observation: `${player} holds ${thread.id} and cannot staff it: its allocation of ${item.scope} is obstructed (${reasons})${told}`.slice(0, STATEMENT_LIMITS.finding),
        ...optional("scope", thread.opening.scope), at: new Date(0).toISOString(),
      });
      if (said.has(report.id)) continue;
      said.add(report.id);
      const standing = byId.get(report.id);
      const { at: _at, ...opening } = report;
      if (standing === undefined) moves.push(Object.freeze(opening));
      // A recurring obstacle is told with what holds it now, not what held it when first said.
      else if (standing.standing === "resolved") moves.push(Object.freeze({ move: "corroborate", thread: report.id, by: player, evidence, observation: report.observation }));
      // An order completed since the report was said, and missed again, is said again (a
      // restatement), so its opener reads the new misses rather than the old order's.
      else if (standing.standing === "open" && obstacle === "information" && thread.refinements.length > 0
        && Date.parse(thread.refinements.at(-1).at) > lastSaidOf(standing)) {
        moves.push(Object.freeze({ move: "corroborate", thread: report.id, by: player, evidence, observation: report.observation }));
      }
    } else if (CLEARED_ALLOCATIONS.includes(item.state)) {
      const evidence = [item.subject];
      for (const report of reportsOn(thread.id)) {
        if (said.has(report.id) || report.standing !== "open" || playerIdentity(report.opening.by) !== playerIdentity(player)) continue;
        said.add(report.id);
        moves.push(Object.freeze({ move: "resolve", thread: report.id, by: player, evidence }));
      }
    }
  }
  return Object.freeze(moves);
}

/**
 * What a player that derives its openings from a measurement does to stand where the derivation
 * says: open each derived opening the board lacks; for each of its own openings still standing that
 * the derivation no longer asks, settle it by its kind. A request with a delivery awaiting assay is
 * accepted (the measurement is the assay), a report is resolved with the derivation as evidence, and
 * anything else is withdrawn. A report of its own that stands resolved and that the derivation finds
 * again is corroborated, which reopens it (sixth edition): a nonconformity's repair is verified by
 * measuring, never by its doer's word. A finding is said as it is now: a recurrence carries what the
 * measurement observes, and an open report it observes otherwise is restated. Threads other
 * players opened are not its to touch, and an opening the derivation names under another player is
 * refused rather than played.
 *
 * A derivation answers only for its domain, the laws its reports are under and the tags its
 * openings carry, as a controller garbage-collects only what its selector owns: a player that also
 * opens by other means (a taker's obstacle, an order handed back) or measures more than one thing
 * never has one measurement settle what another said. An opening outside its own domain is refused.
 * @param {{threads: ReadonlyArray<object>}} board
 * @param {{poster: string, domain: {laws?: ReadonlyArray<string>, tags?: ReadonlyArray<string>}, openings: ReadonlyArray<{id: string, by: string}>, evidence?: string}} derivation
 */
export function reconcileDerivedOpenings(board, { poster, domain, openings, evidence }) {
  const within = derivationDomainOf(domain);
  const foreign = openings.find((opening) => opening.by !== poster);
  if (foreign !== undefined) throw new TypeError(`a derivation by ${poster} names an opening by ${foreign.by}`);
  const stray = openings.find((opening) => !within(opening));
  if (stray !== undefined) throw new TypeError(`a derivation by ${poster} names ${stray.id}, outside its domain`);
  const asked = new Set(openings.flatMap((opening) => [opening.id, ...(opening.supersedes ?? [])]));
  // Superseded contracts close by revision when their replacements open, never by receiving
  // a delivery merely because their old content address is absent from the new derivation.
  const own = board.threads.filter((thread) => thread.opening.by === poster && within(thread.opening));
  const opened = new Set(board.threads.filter((thread) => thread.opening.by === poster).map((thread) => thread.id));
  const settled = own.filter((thread) => !asked.has(thread.id) && !CLOSED_STANDINGS.includes(thread.standing));
  // A report's id is its law and subject, so a measurement finding its condition again finds it as it
  // is now: a resolved one recurs with what it now observes, and an open one it observes otherwise is
  // said again (a restatement), so whoever repairs it reads the condition, not its first reading.
  const derived = new Map(openings.map((opening) => [opening.id, opening]));
  const said = (thread) => evidence !== undefined && thread.opening.move === "report" && derived.has(thread.id);
  const recurring = own.filter((thread) => said(thread) && thread.standing === "resolved");
  const restated = own.filter((thread) => said(thread) && !CLOSED_STANDINGS.includes(thread.standing)
    && derived.get(thread.id).observation !== latestObservationOf(thread));
  const awaiting = (thread) => thread.deliveries.find((delivery) => delivery.verdict === undefined);
  const settle = (thread) => {
    if (thread.opening.move === "request" && awaiting(thread) !== undefined) return { move: "accept", thread: thread.id, of: awaiting(thread).player, ...optional("evidence", evidence === undefined ? undefined : [evidence]) };
    if (thread.opening.move === "report" && evidence !== undefined) return { move: "resolve", thread: thread.id, evidence: [evidence] };
    return { move: "withdraw", thread: thread.id, reason: "its measurement no longer asks it" };
  };
  return Object.freeze({
    open: Object.freeze(openings.filter((opening) => !opened.has(opening.id))),
    settle: Object.freeze([
      ...settled.map((thread) => Object.freeze({ ...settle(thread), by: poster })),
      ...[...recurring, ...restated].map((thread) => Object.freeze({ move: "corroborate", thread: thread.id, by: poster, evidence: [evidence], observation: derived.get(thread.id).observation })),
    ]),
  });
}

/** Whether an opening is within a derivation's domain: under one of its laws, or carrying one of its tags. */
function derivationDomainOf(domain) {
  const laws = domain?.laws ?? [];
  const tags = domain?.tags ?? [];
  if (!Array.isArray(laws) || !Array.isArray(tags) || laws.length + tags.length === 0 || [...laws, ...tags].some((entry) => typeof entry !== "string" || entry === "")) {
    throw new TypeError("a derivation names its domain: the laws its reports are under or the tags its openings carry");
  }
  return (opening) => laws.includes(opening.law) || (opening.tags ?? []).some((tag) => tags.includes(tag));
}

/** The words a thread is about, for a taking policy to read. */
export function threadText(thread) {
  const opening = thread.opening;
  const operative = opening.move === "request" ? operativeOf(thread) : {};
  return [
    ...(opening.tags ?? []), ...(opening.scope ?? []), opening.purpose, opening.need, opening.idea, opening.observation, opening.question, opening.ruling, opening.law, opening.subject,
    ...(opening.measures ?? []).map((statement) => statement.says),
    ...(operative.requirements ?? []).map((statement) => statement.says),
    ...(operative.conditions ?? []).map((statement) => statement.says),
  ].filter(Boolean).join("\n").toLowerCase();
}

/**
 * A micro-enterprise's taking policy, held in its own record (its decision right): which openings
 * it plays on (requests and reports by default, since whoever holds a territory answers for the
 * nonconformities found in it, ISO 9001 §10.2; a frontier office adopts proposals, a knowledge
 * office answers questions, a steward holds aims), the words or tags or
 * scope prefixes a thread must carry (any of), and whether it promises alongside others. How old a
 * thread must be before it plays and how many it takes up in a turn are not policy but its settings
 * (`taking-after-hours`, `taking-limit`, `WORK_AXES`).
 */
export function takingPolicyOf(takes) {
  if (takes === undefined || takes === null) return undefined;
  const words = (list, what) => Object.freeze([...(list ?? [])].map((word) => named(word, what).toLowerCase()));
  if (takes.limit !== undefined || takes.afterHours !== undefined) throw new TypeError("how many threads it takes in a turn and how long a thread waits are the enterprise's settings (taking-limit, taking-after-hours), not its taking policy");
  if (takes.any !== undefined) throw new TypeError("a taking policy takes by kind, words, tags, scopes and territory; a residual taker of anything is not a policy (a thread at home nowhere stays open as the market's signal)");
  const kinds = [...(takes.kinds ?? ["request", "report"])];
  if (kinds.some((kind) => TAKING_MOVE[kind] === undefined)) throw new TypeError(`a taking policy's kinds are among ${Object.keys(TAKING_MOVE).join(", ")}`);
  return Object.freeze({
    kinds: Object.freeze(kinds),
    words: words(takes.words, "a taking word"),
    tags: words(takes.tags, "a taking tag"),
    scopes: words(takes.scopes, "a taking scope prefix"),
    alongside: takes.alongside === true,
  });
}

/** The move by which a player takes up a thread of each kind. A declaration is not taken up. */
export const TAKING_MOVE = Object.freeze({ aim: "hold", request: "promise", propose: "adopt", report: "adopt", ask: "answer" });

/**
 * The seated micro-enterprises as territories: each one's id, the section its record sits in, the
 * kinds of opening its own policy takes, and the legal entity that signs for it.
 * @param {ReadonlyArray<{id: string, sectionPath?: string, section?: string, takes?: object}>} records
 */
export function territoriesOf(records) {
  return Object.freeze(records
    .filter((record) => typeof record.sectionPath === "string" && record.sectionPath !== "")
    .map((record) => Object.freeze({ id: record.id, section: houseSectionOf(record.sectionPath) ?? record.sectionPath, kinds: takingPolicyOf(record.takes)?.kinds ?? Object.freeze([]), ...optional("entity", record.entity) })));
}

/**
 * The host a thread is at home on: the host of the enterprise whose territory holds it (`homeOf`).
 * @param {object} thread
 * @param {ReadonlyArray<{id: string, host?: string}>} enterprises the seated enterprise records
 */
export function homeHostOf(thread, enterprises) {
  const home = homeOf(thread, territoriesOf(enterprises));
  return home === undefined ? undefined : enterprises.find((record) => record.id === home.id)?.host;
}

/**
 * The `homes` a reader is given (`createWorkArenaReader`), read from an agency each time the board is
 * read: `() => { revision, hostOf(thread) }`. `enterprises`, when given, replaces the agency's own.
 * @param {() => {revision?: unknown, enterprises: Map<string, object>}} agencyOf
 * @param {() => ReadonlyArray<object>} [enterprises]
 */
export const workHomesOf = (agencyOf, enterprises) => () => {
  const agency = agencyOf();
  return { revision: agency.revision, hostOf: (thread) => homeHostOf(thread, enterprises?.() ?? [...agency.enterprises.values()]) };
};

/**
 * The threads a micro-enterprise takes up this turn, by its own policy and its territory:
 *
 * - a thread addressed (or awarded) to it, whatever its policy;
 * - a thread at home with it, of a kind its policy takes;
 * - a thread open to all and at home nowhere (or at home with an enterprise that takes no such
 *   kind), matching its words, tags or scopes;
 *
 * - a request superseding one it promised (novation: its commitment moves only by its uptake);
 *
 * old enough, not closed, not obstructed, ready (nothing it comes after still unsettled), not opened by it, not
 * already taken up by it, never given back by it and, unless it plays alongside others, not yet
 * taken up by anyone. A thread at home elsewhere is left to its home. A request whose contract is
 * not yet refined is promised only by an enterprise with its own office to assess (refine) it.
 *
 * The candidates come in the order of what attending to them is worth (seventh edition,
 * `attentionOf`): what is owed to it (addressed, novated) first, then the rest, each nearest a
 * user's need and then by the contradiction settling it removes. `limit`
 * is how many it may take up this turn; a taker whose taking of one is refused goes on down the
 * order, so a thread it cannot admit never fixes its frontier. `settings` are its current points
 * (`settingValues`); without them, the defaults its record declares.
 * @param {{id: string, takes?: object, assesses?: object, settings?: ReadonlyArray<{axis: string, default: number}>}} enterprise
 * @param {ReturnType<typeof workBoard>} board
 * @param {{territories?: ReturnType<typeof territoriesOf>, at?: string, settings?: Readonly<Record<string, number>>}} [options]
 * @returns {{limit: number, budget: number, idle: boolean, capacity: number, candidates: ReadonlyArray<object>}}
 */
export function takingOrderOf(enterprise, board, { territories = [], at, settings } = {}) {
  const policy = takingPolicyOf(enterprise.takes);
  const calibrated = enterpriseWorkSettingsOf(enterprise, settings);
  const chosen = [];
  for (const thread of board.threads) {
    const kind = thread.opening.move;
    if (CLOSED_STANDINGS.includes(thread.standing) || TAKING_MOVE[kind] === undefined) continue;
    if ((thread.blockedBy ?? []).length > 0 || (thread.obstructed ?? []).length > 0) continue;
    const players = takersOf(thread);
    const ownReport = reportPartyOf(thread) === enterprise.id;
    if (players.includes(enterprise.id) || (thread.opening.by === enterprise.id && !ownReport) || departedOf(thread).has(enterprise.id)) continue;
    // A promiser of what this request superseded owes it its promise, as an addressee does.
    const novated = (thread.novated ?? []).includes(enterprise.id);
    if (kind === "request" && !thread.refined && !enterprise.assesses && !novated) continue;
    const to = addresseeOf(thread);
    if (to !== enterprise.id && !novated) {
      if (policy === undefined || to !== undefined || !policy.kinds.includes(kind)) continue;
      if (players.length > 0 && !policy.alongside) continue;
      const home = homeOf(thread, territories);
      const atHome = home?.id === enterprise.id;
      if (home !== undefined && !atHome && home.kinds.includes(kind)) continue;
      if (thread.ageDays * 24 < calibrated.afterHours) continue;
      if (!atHome) {
        const words = threadText(thread);
        const matches = policy.words.some((word) => words.includes(word))
          || policy.tags.some((tag) => (thread.opening.tags ?? []).includes(tag))
          || policy.scopes.some((prefix) => (thread.opening.scope ?? []).some((subject) => subject.startsWith(prefix)));
        if (!matches) continue;
      }
    }
    chosen.push(thread);
  }
  // Work in progress is bounded by what the taker has delivered, addressed work included: an
  // enterprise owing more than its flow carries settles before it promises again. `limit` counts
  // threads (`taking-limit`); `budget` is the size it may still take up (`capacityOf`, `fitsBudget`).
  const flow = at === undefined ? { available: Infinity, idle: false, capacity: Infinity } : capacityOf(enterprise.id, board, at, calibrated);
  const budgeted = { budget: flow.available, idle: flow.idle, capacity: flow.capacity };
  const limit = flow.available === 0 && !(flow.idle && flow.capacity > 0) ? 0 : calibrated.limit;
  if (limit === 0) return Object.freeze({ limit, ...budgeted, candidates: Object.freeze([]) });
  // Direct requests exercise the addressee's decision right before market intake.
  const owed = (thread) => addresseeOf(thread) === enterprise.id || (thread.novated ?? []).includes(enterprise.id);
  const order = byAttention(attentionOf(board));
  const addressed = chosen.filter(owed).sort(order);
  const residual = chosen.filter((thread) => !owed(thread)).sort(order);
  return Object.freeze({ limit, ...budgeted, candidates: Object.freeze([...addressed, ...residual]) });
}

/**
 * The threads a micro-enterprise takes up this turn: down its taking order (`takingOrderOf`), each
 * that still fits its budget (`fitsBudget`), until `limit` threads are taken.
 */
export function threadsToTake(enterprise, board, options = {}) {
  const order = takingOrderOf(enterprise, board, options);
  const taken = [];
  let spent = 0;
  for (const thread of order.candidates) {
    if (taken.length >= order.limit) break;
    if (!fitsBudget(order, thread, spent, taken.length)) continue;
    taken.push(thread);
    spent += sizeOf(thread);
  }
  return Object.freeze(taken);
}

const keyOf = (thread) => (thread.id ?? thread.opening.id).replace(/^ni:\/\/\/sha-256;/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24).toLowerCase();

/** What a player holding a thread works on: the endeavor each kind of opening asks of its taker. */
const ENDEAVOR = {
  aim: (opening) => [
    `Pursue the aim: ${opening.purpose}`,
    ...((opening.measures ?? []).length === 0 ? [] : ["Measures:", ...opening.measures.map((measure) => `- ${measure.id}: ${measure.says}${measure.assay === undefined ? "" : ` (assayed by ${measure.assay.operation})`}`)]),
    "An aim never closes: open requests that serve it, and leave it when it is no longer yours to pursue.",
  ].join("\n"),
  propose: (opening) => `Develop the proposal: ${opening.idea}${opening.rationale === undefined ? "" : ` (${opening.rationale})`}`,
  report: (opening) => `${opening.law === undefined ? "Address the reported condition" : `Restore the law "${opening.law}"${opening.subject === undefined ? "" : ` at ${opening.subject}`}`}: ${opening.observation}`,
  ask: (opening) => `Answer: ${opening.question}`,
  supply: (opening) => `Supply ${opening.amount} ${opening.unit} of ${opening.resource} until ${opening.until}`,
};

const requirementLine = (statement) => `- ${statement.id} [${statement.priority ?? "must"} ${statement.class ?? "functional"}]: ${statement.says}${statement.rationale === undefined ? "" : ` (because ${statement.rationale})`}`;
const conditionLine = (statement) => `- ${statement.id} [${statement.method ?? "inspection"}${statement.verifies === undefined ? "" : ` of ${statement.verifies.join(", ")}`}]: ${statement.says}${statement.assay === undefined ? "" : ` (assayed by ${statement.assay.operation})`}`;

/**
 * A thread as the structured work intent its taker admits into its own root: one endeavor, which
 * the taker's assessing office breaks into its own hierarchy (house work levels run endeavor,
 * campaign, project, plan, task; how deep this work goes is the taker's call). A request's endeavor
 * carries its operative contract, the need, each requirement (with its class and priority) and each
 * condition of satisfaction (with its method and the requirements it verifies) by id, so the
 * breakdown answers to them. An asker's suggested plan remains on the thread; it does not
 * become the taker's staffing or executable hierarchy. An aim,
 * proposal, report or question is the endeavor of pursuing, developing, restoring or answering it.
 * The threads it serves and comes after ride along as evidence.
 */
export function intentOfThread(thread) {
  const kind = thread.opening.move;
  // A completed order is new work: its takers admit it afresh rather than finding the old order done.
  const completions = kind === "request" ? completionsOf(thread) : 0;
  const id = `${kind}-${keyOf(thread)}${completions === 0 ? "" : `-completion-${completions}`}`;
  const sources = [{ id: kind, kind: `work-arena-${kind}`, locator: thread.id }];
  const operative = kind === "request" ? operativeOf(thread) : undefined;
  const text = kind !== "request" ? ENDEAVOR[kind](thread.opening) : [
    operative.need,
    ...(operative.requirements.length === 0 ? [] : ["Requirements:", ...operative.requirements.map(requirementLine)]),
    ...(operative.conditions.length === 0 ? [] : ["Conditions of satisfaction:", ...operative.conditions.map(conditionLine)]),
    ...(operative.examples === undefined ? [] : ["Examples (each one acceptance case among others):", ...operative.examples.map(exampleLine)]),
  ].join("\n");
  const scope = (operative?.scope ?? thread.opening.scope ?? []).map((subject) => `scope:${subject}`);
  const relations = [
    ...(thread.opening.serves ?? []).map((served) => `serves:${served}`),
    ...(thread.opening.after ?? []).map((before) => `after:${before}`),
    ...(thread.opening.obstructs ?? []).map((obstructed) => `obstructs:${obstructed}`),
  ];
  return Object.freeze({
    kind: "metroplat.work.structured-intent", id, producer: { id: thread.opening.by }, sources,
    // An order that states its codomain types its takers' results (seventeenth edition): a result outside it is a miss.
    // A request's item names its order, so whoever prices its carriers reads its misses by it.
    items: [{ cell: `endeavor:${id}`, text, ...(operative?.returns === undefined ? {} : { returns: operative.returns }), ...(kind === "request" ? { order: orderOf(thread) } : {}), evidence: [...new Set([...scope, ...relations, ...(thread.opening.plan === undefined ? [] : [`suggested-plan:${thread.opening.plan.id}`]), ...(thread.opening.evidence ?? []), ...(completions === 0 ? [] : [`order:${orderOf(thread)}`])])], provenance: [{ source: kind }] }],
  });
}

/** One admitted example of an order, as its endeavor's text states it. */
const exampleLine = (example, index) => `- e${index + 1}${example.says === undefined ? "" : ` (${example.says})`}: ${Object.hasOwn(example, "input") ? `input ${JSON.stringify(example.input)} → ` : ""}output ${JSON.stringify(example.output)}`;

/**
 * A structured work intent arriving at a settlement's intake, as the request it amounts to. An
 * intent is a plan, and a plan operationalizes a goal (KAOS): the request's need is the end the
 * intent names (`need`). An intent naming none is read by its top-level items (the first alone when
 * together they say more than one statement), which the law refuses when they state the activity
 * rather than the end. An item is a requirement only where it says one (one conforming `shall`); every
 * item carrying a deterministic execution is a condition the assayer can run, verifying that item's
 * requirement when it is one and otherwise answering for the whole contract. The intent rides along
 * as the request's plan, so its hierarchy is never lost; a request whose items state no requirement
 * is open with gaps, awaiting refinement, never refused for how its outline was worded.
 */
export function requestOfIntent(intent, { at, to, assayer, tags, serves } = {}) {
  const top = intent.items.filter((item) => item.parent === undefined && item.parentWitness === undefined);
  const slug = (cell) => cell.replace(/^[a-z-]+:/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
  const seen = new Set();
  const distinct = (base) => { let id = base; for (let n = 2; seen.has(id); n += 1) id = `${base}-${n}`; seen.add(id); return id; };
  const stated = intent.items.filter((item) => item.text.length <= STATEMENT_LIMITS.statement && requirementBreachesOf(item.text).length === 0);
  const requirementIds = new Map(stated.map((item) => [item, distinct(`r-${slug(item.cell)}`)]));
  const assayed = intent.items.filter((item) => item.deterministicExecution !== undefined);
  const heads = (top.length > 0 ? top : intent.items).map((item) => item.text);
  const outline = heads.join("; ");
  const need = intent.need ?? (outline.length <= STATEMENT_LIMITS.statement ? outline : heads[0]);
  if (intent.need === undefined && meansOf(need) !== undefined) {
    throw new TypeError(`structured work intent ${intent.id} outlines the activity ("${meansOf(need)} …"); name its \`need\`, the end its items serve, so the board carries a goal and the outline rides as its plan`);
  }
  return openingOf({
    move: "request",
    by: intent.producer.id,
    need,
    ...(stated.length === 0 ? {} : { requirements: stated.map((item) => ({ id: requirementIds.get(item), says: item.text })) }),
    ...(assayed.length === 0 ? {} : {
      conditions: assayed.map((item) => ({ id: distinct(`c-${slug(item.cell)}`), says: `the assay of ${slug(item.cell)} passes`, method: "test",
        ...(requirementIds.has(item) ? { verifies: [requirementIds.get(item)] } : {}), assay: item.deterministicExecution })),
    }),
    plan: intent,
    ...(intent.user === undefined ? {} : { user: intent.user }),
    sources: intent.sources.map(({ kind, locator, commitment }) => ({ kind, ...(locator === undefined ? {} : { locator }), ...(commitment === undefined ? {} : { commitment }) })),
    ...(to === undefined ? {} : { to }),
    ...(assayer === undefined ? {} : { assayer }),
    ...(tags === undefined ? {} : { tags }),
    ...(serves === undefined ? {} : { serves }),
    at,
  });
}
