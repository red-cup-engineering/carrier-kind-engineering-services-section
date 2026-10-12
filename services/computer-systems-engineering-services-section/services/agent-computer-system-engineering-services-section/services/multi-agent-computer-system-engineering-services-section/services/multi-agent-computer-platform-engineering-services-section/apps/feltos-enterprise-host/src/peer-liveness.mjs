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
 * Witnesses are `peer-liveness` records of the node's own store, each carrying the side it was told
 * on (for, against or neither), so liveness is substrate content a peer can federate and an audit can read.
 */
import { each, put } from "@red-cup-engineering/semiotic-eavt-services-section/store";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The store type liveness witnesses are kept under. */
export const PEER_LIVENESS_TYPE = "peer-liveness";

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

/** The liveness witnesses kept in a node's store at `root`. */
export const witnessesIn = (root) => [...each(root, PEER_LIVENESS_TYPE)].map(({ record }) => Object.freeze({ ...record }));

/** Keep one witness in the store, as it was told (its `side`). */
export function keepWitness(root, witness) {
  put(root, PEER_LIVENESS_TYPE, { ...witness });
}

/**
 * Note one catch-up run against a peer: a heartbeat when it answered any delivery, an away witness
 * when every delivery found it away, and then, for such a run only, the threshold rule. Returns the peer's reading and its
 * elapsed silence. A refusal is the peer answering: it is a heartbeat here, and a matter of trust,
 * not liveness.
 */
export function notePeerRun(root, { observer, peer, now, shipped, failed, presence, thresholdSeconds, windowSeconds }) {
  const answered = shipped > 0 || failed.some(({ away: wasAway }) => !wasAway);
  const reachedFor = shipped + failed.length > 0;
  return noteObservation(root, { observer, peer, now, answered, reachedFor, presence, thresholdSeconds, windowSeconds });
}

function noteObservation(root, { observer, peer, now, answered, reachedFor, presence, thresholdSeconds, windowSeconds, why, serviceHealth }) {
  if (answered) keepWitness(root, { ...heartbeat({ observer, peer, at: now, windowSeconds }), ...(why === undefined ? {} : { why }), ...(serviceHealth === undefined ? {} : { serviceHealth }) });
  else if (reachedFor) keepWitness(root, { ...away({ observer, peer, at: now, windowSeconds }), ...(why === undefined ? {} : { why }), ...(serviceHealth === undefined ? {} : { serviceHealth }) });
  const witnesses = witnessesIn(root);
  // Only a run that sought the peer and found it away can fire the threshold: a run with nothing to
  // send is no observation of the peer at all.
  const fired = reachedFor && !answered ? suspicion(witnesses, { observer, peer, now, presence, thresholdSeconds, windowSeconds }) : undefined;
  if (fired !== undefined) keepWitness(root, fired);
  const all = fired === undefined ? witnesses : [...witnesses, fired];
  return Object.freeze({ reading: currentReading(all, peer), silentSeconds: elapsedSinceHeard(all, peer, now) });
}

/** An idle catch-up still observes its existing peer, without sending a fabricated work move.
 * Only this host's actual supervised health contract can supply a heartbeat. An HTTP success
 * alone is not recovery. These reads use no actor keys, grants, redirects or request credentials.
 * Their deadline also covers the response body, even when a provider ignores AbortSignal. */
export const PEER_HEALTH_TIMEOUT_MS = 2_000;
export const PEER_HEALTH_MAX_BYTES = 65_536;

export async function observePeerHealth(peer, { contract, probe = globalThis.fetch, timeoutMs = PEER_HEALTH_TIMEOUT_MS } = {}) {
  let actor;
  try { actor = new URL(peer); } catch { return Object.freeze({ observed: false, ready: false, reason: "health-peer-unobservable" }); }
  if (actor.protocol !== "https:" || actor.username !== "" || actor.password !== "") return Object.freeze({ observed: false, ready: false, reason: "health-peer-unobservable" });
  if (contract?.actor !== actor.href || contract?.kind !== "metroplat-supervised-health"
    || typeof contract.service !== "string" || contract.service.trim() === "")
    return Object.freeze({ observed: false, ready: false, reason: "health-contract-unavailable" });
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > PEER_HEALTH_TIMEOUT_MS) throw new TypeError("peer health deadline is bounded");
  const url = new URL("/healthz", actor.origin).href;
  const controller = new AbortController();
  let timer, reader;
  let stopped = false;
  const cancelBody = () => {
    const held = reader;
    reader = undefined;
    if (held === undefined) return;
    // A provider's cancellation promise may itself stall. Initiate cleanup, never await it.
    try { Promise.resolve(held.cancel()).catch(() => {}); } catch {}
    try { held.releaseLock(); } catch {}
  };
  const observe = async () => {
    try {
      const response = await probe(url, { method: "GET", redirect: "error", credentials: "omit", cache: "no-store",
        headers: { accept: "application/json", "cache-control": "no-cache" }, signal: controller.signal });
      if (stopped) {
        try { Promise.resolve(response.body?.cancel?.()).catch(() => {}); } catch {}
        return Object.freeze({ ready: false, reason: "health-timeout" });
      }
      if (![200, 503].includes(response.status)) {
        void response.body?.cancel?.().catch?.(() => {});
        return Object.freeze({ ready: false, reason: "health-http-status", status: response.status });
      }
      if (typeof response.body?.getReader !== "function") return Object.freeze({ ready: false, reason: "health-body-unreadable" });
      reader = response.body.getReader();
      const bodyReader = reader;
      const chunks = [];
      let length = 0;
      try {
        for (;;) {
          const { done, value } = await bodyReader.read();
          if (done) break;
          length += value.byteLength;
          if (length > PEER_HEALTH_MAX_BYTES) return Object.freeze({ ready: false, reason: "health-body-too-large" });
          chunks.push(value);
        }
      } finally { cancelBody(); }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let body;
      try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { return Object.freeze({ ready: false, reason: "health-body-invalid" }); }
      if (body?.service !== contract.service) return Object.freeze({ ready: false, reason: "health-service-mismatch" });
      const ready = response.status === 200 && body.ok === true && ["ready", "degraded"].includes(body.state) && body.nativeActor?.ok === true;
      const failed = body.ok === false || body.nativeActor?.ok === false || ["failed", "unready", "stopped"].includes(body.state);
      const readiness = ready || failed ? Object.freeze({ state: ready ? "ready" : "failed", service: body.service,
        ...(typeof body.ok === "boolean" ? { ok: body.ok } : {}),
        ...(typeof body.state === "string" ? { serviceState: body.state } : {}),
        ...(typeof body.nativeActor?.ok === "boolean" ? { nativeActorOk: body.nativeActor.ok } : {}),
      }) : undefined;
      return Object.freeze({ ready, reason: ready ? "health-ready" : "health-unready", ...(readiness === undefined ? {} : { readiness }) });
    } catch { return Object.freeze({ ready: false, reason: "health-unreachable" }); }
  };
  try {
    return await Promise.race([observe(), new Promise((resolve) => {
      timer = setTimeout(() => {
        stopped = true;
        resolve(Object.freeze({ ready: false, reason: "health-timeout" }));
        controller.abort();
        cancelBody();
      }, timeoutMs);
    })]);
  } finally { stopped = true; clearTimeout(timer); controller.abort(); cancelBody(); }
}

/** The same window/threshold/intermittent policy, with the idle observation named honestly. */
export function notePeerHealth(root, { health, ...policy }) {
  return noteObservation(root, { ...policy, answered: health.ready === true, reachedFor: health.observed !== false, why: health.reason, serviceHealth: health.readiness });
}

/** Only peers selected by the existing catch-up run, and only when no delivery observed them.
 * Probes run together, so unreachable peers add at most one bounded observation deadline. */
export async function observeIdlePeers(peers, { contracts = [], ...options } = {}) {
  const declared = Array.isArray(contracts) ? contracts : [];
  return Object.freeze(await Promise.all(peers.map(async (peer) => peer.shipped + peer.failed.length === 0
    ? Object.freeze({ ...peer, health: await observePeerHealth(peer.peer, { ...options, contract: declared.find(entry => entry?.actor === peer.peer) }) })
    : peer)));
}
