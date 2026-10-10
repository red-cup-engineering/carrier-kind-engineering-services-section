/**
 * A peer's liveness as FOUR-valued modal suspicion over heartbeat windows (Obsmetrologia,
 * predication-failure-detection-as-bilattice-modal-suspicion).
 *
 * The predication is alive(observer, peer) per observation window. A delivery the peer answered is
 * a heartbeat: evidence for, at the window it arrived in. A delivery that found the peer away is no
 * heartbeat and no refusal: it is kept told neither way (⊥), so absence reads unknown and is never
 * written false. Only when a window has elapsed past the policy threshold θ since the last heartbeat
 * (the V-graded ◇¬alive reaching θ, phi-accrual read as elapsed time) is evidence against written,
 * at the window where θ was crossed. A known-intermittent peer's θ is unbounded: its silence stays ⊥.
 *
 * Every window is a grow-only pair of evidence sides, so suspicion only moves forward in the
 * knowledge order: ⊥ → t, ⊥ → f, t → ⊤, f → ⊤. A heartbeat that arrives late is evidence at its own
 * window and never lowers a later suspected one. Two observers that disagree on one window join to
 * ⊤ (split-brain), surfaced by the same reading. A Boolean detector is a projection of the reading
 * chosen by policy (optimistic collapses ⊥ to alive, pessimistic to not alive), never a second
 * detector.
 *
 * Witnesses are semantic records in the node's own journal (`record-semantic-record`), told for,
 * against or neither, so liveness is substrate content a peer can federate and an audit can read.
 */
import { readingOfSides } from "@red-cup-engineering/computer-data-services-section/four";

/** The journal object kind and category liveness witnesses are kept under. */
export const PEER_LIVENESS_KIND = "peer-liveness";
const CATEGORY = "heartbeat";

/** The default observation window and suspicion threshold, in seconds. */
export const LIVENESS_WINDOW_SECONDS = 300;
export const SUSPICION_THRESHOLD_SECONDS = 3600;

/** The window an instant falls in, as its start (ISO 8601). */
export function windowOf(at, windowSeconds = LIVENESS_WINDOW_SECONDS) {
  const ms = Date.parse(at);
  if (!Number.isFinite(ms)) throw new TypeError(`peer liveness: not an instant: ${at}`);
  const width = windowSeconds * 1000;
  return new Date(Math.floor(ms / width) * width).toISOString();
}

/** A heartbeat witness: the peer answered at `at`. */
export const heartbeat = ({ observer, peer, at, windowSeconds }) =>
  Object.freeze({ observer, peer, window: windowOf(at, windowSeconds), at, side: "for", why: "answered" });

/** An away witness: a delivery found the peer away at `at`. Told neither way. */
export const away = ({ observer, peer, at, windowSeconds }) =>
  Object.freeze({ observer, peer, window: windowOf(at, windowSeconds), at, side: "none", why: "away" });

/** The last heartbeat from `peer` (any observer) at or before `now`, or undefined. */
const lastHeartbeat = (witnesses, peer, now) => witnesses
  .filter((w) => w.peer === peer && w.side === "for" && Date.parse(w.at) <= Date.parse(now))
  .reduce((latest, w) => (latest === undefined || Date.parse(w.at) > Date.parse(latest) ? w.at : latest), undefined);

/** The first time `peer` was looked for (any witness), the origin of elapsed time when it was never heard. */
const firstSought = (witnesses, peer) => witnesses
  .filter((w) => w.peer === peer)
  .reduce((first, w) => (first === undefined || Date.parse(w.at) < Date.parse(first) ? w.at : first), undefined);

/**
 * The V-graded ◇¬alive at `now`: seconds since the peer's last heartbeat, or since it was first
 * sought when it was never heard. Undefined when the peer was never sought.
 */
export function elapsedSinceHeard(witnesses, peer, now) {
  const since = lastHeartbeat(witnesses, peer, now) ?? firstSought(witnesses, peer);
  return since === undefined ? undefined : Math.max(0, (Date.parse(now) - Date.parse(since)) / 1000);
}

/**
 * The suspicion witness the threshold rule fires at `now`, or undefined: evidence against, at the
 * window of `now`, when the elapsed time has reached θ and that window holds no heartbeat. A
 * known-intermittent peer's θ is unbounded, so the rule never fires for it.
 */
export function suspicion(witnesses, { observer, peer, now, presence = "continuous", thresholdSeconds = SUSPICION_THRESHOLD_SECONDS, windowSeconds = LIVENESS_WINDOW_SECONDS }) {
  if (presence === "known-intermittent") return undefined;
  const elapsed = elapsedSinceHeard(witnesses, peer, now);
  if (elapsed === undefined || elapsed < thresholdSeconds) return undefined;
  const window = windowOf(now, windowSeconds);
  const held = witnesses.filter((w) => w.peer === peer && w.window === window);
  if (held.some((w) => w.side === "for")) return undefined;
  if (held.some((w) => w.side === "against" && w.observer === observer)) return undefined;
  return Object.freeze({ observer, peer, window, at: now, side: "against", why: `no heartbeat for ${Math.round(elapsed)} s (θ ${thresholdSeconds} s)` });
}

/** The FOUR reading of alive(*, peer) at one window, every observer joined: unknown, held, denied or contested. */
export function readingAt(witnesses, peer, window) {
  const held = witnesses.filter((w) => w.peer === peer && w.window === window);
  return readingOfSides("extremal", held.some((w) => w.side === "for"), held.some((w) => w.side === "against"));
}

/** The reading at the latest window that holds a told witness for `peer`; unknown when none does. */
export function currentReading(witnesses, peer) {
  const told = witnesses.filter((w) => w.peer === peer && w.side !== "none");
  if (told.length === 0) return "unknown";
  const latest = told.reduce((max, w) => (w.window > max ? w.window : max), told[0].window);
  return readingAt(witnesses, peer, latest);
}

/** A Boolean detector as a policy projection of the reading. Contested projects to not alive. */
export function projectLiveness(reading, policy = "optimistic") {
  if (reading === "held") return true;
  if (reading === "denied" || reading === "contested") return false;
  if (policy === "optimistic") return true;
  if (policy === "pessimistic") return false;
  throw new TypeError(`peer liveness: unknown projection policy ${policy}`);
}

const toldOf = (side) => ({ for: side === "for", against: side === "against" });
const sideOf = (told) => (told.for ? "for" : told.against ? "against" : "none");

/** The liveness witnesses kept in a node journal (`createSemanticRecordJournal`). */
export const witnessesIn = (journal) => journal.query({ objectKind: PEER_LIVENESS_KIND, category: CATEGORY })
  .map(({ record, told }) => Object.freeze({ ...record, side: sideOf(told) }));

/** Keep one witness in the journal, told as its side says. */
export function keepWitness(journal, witness) {
  const { side, ...record } = witness;
  journal.record({ objectKind: PEER_LIVENESS_KIND, category: CATEGORY, recordedAt: witness.at, record, told: toldOf(side) });
}

/**
 * Note one catch-up run against a peer: a heartbeat when it answered any delivery, an away witness
 * when every delivery found it away, and then, for such a run only, the threshold rule. Returns the peer's reading and its
 * elapsed silence. A refusal is the peer answering: it is a heartbeat here, and a matter of trust,
 * not liveness.
 */
export function notePeerRun(journal, { observer, peer, now, shipped, failed, presence, thresholdSeconds, windowSeconds }) {
  const answered = shipped > 0 || failed.some(({ away: wasAway }) => !wasAway);
  const reachedFor = shipped + failed.length > 0;
  if (answered) keepWitness(journal, heartbeat({ observer, peer, at: now, windowSeconds }));
  else if (reachedFor) keepWitness(journal, away({ observer, peer, at: now, windowSeconds }));
  const witnesses = witnessesIn(journal);
  // Only a run that sought the peer and found it away can fire the threshold: a run with nothing to
  // send is no observation of the peer at all.
  const fired = reachedFor && !answered ? suspicion(witnesses, { observer, peer, now, presence, thresholdSeconds, windowSeconds }) : undefined;
  if (fired !== undefined) keepWitness(journal, fired);
  const all = fired === undefined ? witnesses : [...witnesses, fired];
  return Object.freeze({ reading: currentReading(all, peer), silentSeconds: elapsedSinceHeard(all, peer, now) });
}
