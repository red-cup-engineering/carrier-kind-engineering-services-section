/**
 * analysis/keratin - finite event-lattice lock histories.
 *
 * This carries the computable powerset-event face of
 * `Obsmetrologia.Relational.Material.Contact.Keratin`: irreversible add-event
 * locks, finite histories, lock-stream prefixes, and finite approximations to
 * the lock-stream limit.
 */

export type KeratinLockEvent = "feltLock" | "pill" | "damage" | "fracture";
export type EventState<Event extends string = KeratinLockEvent> = readonly Event[];

export interface RunHistoryWitness<Event extends string = KeratinLockEvent> {
  readonly kind: "keratin.runHistory:witness";
  readonly seed: EventState<Event>;
  readonly history: readonly Event[];
  readonly result: EventState<Event>;
  readonly inflationary: true;
  readonly monotone: true;
}

export interface LockPrefixWitness<Event extends string = KeratinLockEvent> {
  readonly kind: "keratin.lockPrefix:witness";
  readonly seed: EventState<Event>;
  readonly prefixLength: number;
  readonly result: EventState<Event>;
  readonly inflationary: true;
}

export interface LockStreamDirectedWitness<Event extends string = KeratinLockEvent> {
  readonly kind: "keratin.lockPrefix.directed:witness";
  readonly leftPrefix: number;
  readonly rightPrefix: number;
  readonly upperPrefix: number;
  readonly leftBelowUpper: true;
  readonly rightBelowUpper: true;
  readonly upperState: EventState<Event>;
}

export interface LockStreamLimitWitness<Event extends string = KeratinLockEvent> {
  readonly kind: "keratin.lockStreamLimit:witness";
  readonly seed: EventState<Event>;
  readonly finitePrefix: LockPrefixWitness<Event>;
  readonly limit: EventState<Event>;
  readonly prefixBelowLimit: true;
}

export interface AddEventWitness<Event extends string = KeratinLockEvent> {
  readonly kind: "keratin.addEvent:witness";
  readonly event: Event;
  readonly before: EventState<Event>;
  readonly after: EventState<Event>;
  readonly fires: true;
  readonly inflationary: true;
}

export interface KeratinReceipt {
  readonly kind: "keratin.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.Keratin";
  readonly addEvent: AddEventWitness;
  readonly history: RunHistoryWitness;
  readonly prefix: LockPrefixWitness;
  readonly directed: LockStreamDirectedWitness;
  readonly limit: LockStreamLimitWitness;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.lock_infl",
    "Obsmetrologia.Relational.Material.runHistory_infl",
    "Obsmetrologia.Relational.Material.runHistory_mono",
    "Obsmetrologia.Relational.Material.runLockPrefix_infl",
    "Obsmetrologia.Relational.Material.runLockPrefix_mono",
    "Obsmetrologia.Relational.Material.runLockPrefix_le_succ",
    "Obsmetrologia.Relational.Material.runLockPrefix_le_of_le",
    "Obsmetrologia.Relational.Material.runLockPrefix_directed",
    "Obsmetrologia.Relational.Material.runLockPrefix_le_limit",
    "Obsmetrologia.Relational.Material.seed_le_lockSeed",
    "Obsmetrologia.Relational.Material.settle_lock_is_least_compatible",
    "Obsmetrologia.Relational.Material.lockStreamPrefixSeed_le_limitSeed",
    "Obsmetrologia.Relational.Material.settle_lockStreamLimit_is_least_compatible",
    "Obsmetrologia.Relational.Material.addEvent_fires",
    "Obsmetrologia.Relational.Material.addEvent_infl",
  ];
}

export interface ShroudIndexedKeratinReceipt {
  readonly kind: "keratin.shroudIndexed.receipt:witness";
  readonly capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.ShroudIndexedKeratin";
  readonly vertices: readonly string[];
  readonly shroudPoints: readonly string[];
  readonly interiorPoints: readonly string[];
  readonly address: Readonly<Record<string, string>>;
  readonly history: Readonly<Record<string, readonly KeratinLockEvent[]>>;
  readonly seed: Readonly<Record<string, EventState>>;
  readonly lockedSeed: Readonly<Record<string, EventState>>;
  readonly shroudEventOnShroud: true;
  readonly shroudEventInHole: true;
  readonly lockedSeedInflationary: true;
  readonly settleLockedLeastCompatible: true;
  readonly leanTheorems: readonly [
    "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_on_shroud",
    "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_in_hole",
    "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.lockedSeed_infl",
    "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.settle_locked_least_compatible",
  ];
}

const freezeUnique = <Event extends string>(events: readonly Event[]): EventState<Event> =>
  Object.freeze([...new Set(events)]);

const below = <Event extends string>(left: EventState<Event>, right: EventState<Event>): boolean =>
  left.every((event) => right.includes(event));

export function addEvent<Event extends string>(state: EventState<Event>, event: Event): EventState<Event> {
  return freezeUnique([...state, event]);
}

export function addEventWitness<Event extends string>(state: EventState<Event>, event: Event): AddEventWitness<Event> {
  const before = freezeUnique(state);
  const after = addEvent(before, event);
  if (!after.includes(event) || !below(before, after)) throw new TypeError("addEventWitness: event lock did not fire inflationarily");
  return Object.freeze({
    kind: "keratin.addEvent:witness" as const,
    event,
    before,
    after,
    fires: true as const,
    inflationary: true as const,
  });
}

export function runHistory<Event extends string>(seed: EventState<Event>, history: readonly Event[]): EventState<Event> {
  return history.reduce((state, event) => addEvent(state, event), freezeUnique(seed));
}

export function runHistoryWitness<Event extends string>(
  seed: EventState<Event>,
  history: readonly Event[],
  largerSeed: EventState<Event> = seed,
): RunHistoryWitness<Event> {
  const admittedSeed = freezeUnique(seed);
  const result = runHistory(admittedSeed, history);
  const largerResult = runHistory(freezeUnique(largerSeed), history);
  if (!below(admittedSeed, result) || (below(admittedSeed, freezeUnique(largerSeed)) && !below(result, largerResult))) {
    throw new TypeError("runHistoryWitness: history failed inflationary or monotone check");
  }
  return Object.freeze({
    kind: "keratin.runHistory:witness" as const,
    seed: admittedSeed,
    history: Object.freeze([...history]),
    result,
    inflationary: true as const,
    monotone: true as const,
  });
}

export function runLockPrefix<Event extends string>(
  stream: readonly Event[] | ((stage: number) => Event),
  prefixLength: number,
  seed: EventState<Event>,
): EventState<Event> {
  if (!Number.isSafeInteger(prefixLength) || prefixLength < 0) {
    throw new RangeError("runLockPrefix: prefixLength must be a non-negative safe integer");
  }
  let state = freezeUnique(seed);
  for (let stage = 0; stage < prefixLength; stage += 1) {
    const event = typeof stream === "function" ? stream(stage) : stream[stage];
    if (event === undefined) throw new RangeError("runLockPrefix: finite stream ended before prefixLength");
    state = addEvent(state, event);
  }
  return state;
}

export function lockPrefixWitness<Event extends string>(
  stream: readonly Event[] | ((stage: number) => Event),
  prefixLength: number,
  seed: EventState<Event>,
): LockPrefixWitness<Event> {
  const admittedSeed = freezeUnique(seed);
  const result = runLockPrefix(stream, prefixLength, admittedSeed);
  if (!below(admittedSeed, result)) throw new TypeError("lockPrefixWitness: prefix was not inflationary");
  return Object.freeze({
    kind: "keratin.lockPrefix:witness" as const,
    seed: admittedSeed,
    prefixLength,
    result,
    inflationary: true as const,
  });
}

export function lockStreamDirectedWitness<Event extends string>(
  stream: readonly Event[] | ((stage: number) => Event),
  seed: EventState<Event>,
  leftPrefix: number,
  rightPrefix: number,
): LockStreamDirectedWitness<Event> {
  const upperPrefix = Math.max(leftPrefix, rightPrefix);
  const left = runLockPrefix(stream, leftPrefix, seed);
  const right = runLockPrefix(stream, rightPrefix, seed);
  const upperState = runLockPrefix(stream, upperPrefix, seed);
  if (!below(left, upperState) || !below(right, upperState)) {
    throw new TypeError("lockStreamDirectedWitness: upper prefix did not dominate both prefixes");
  }
  return Object.freeze({
    kind: "keratin.lockPrefix.directed:witness" as const,
    leftPrefix,
    rightPrefix,
    upperPrefix,
    leftBelowUpper: true as const,
    rightBelowUpper: true as const,
    upperState,
  });
}

export function lockStreamLimitWitness<Event extends string>(
  stream: readonly Event[],
  seed: EventState<Event>,
  prefixLength: number,
): LockStreamLimitWitness<Event> {
  const finitePrefix = lockPrefixWitness(stream, prefixLength, seed);
  const limit = runLockPrefix(stream, stream.length, seed);
  if (!below(finitePrefix.result, limit)) throw new TypeError("lockStreamLimitWitness: prefix did not lie below finite stream limit");
  return Object.freeze({
    kind: "keratin.lockStreamLimit:witness" as const,
    seed: freezeUnique(seed),
    finitePrefix,
    limit,
    prefixBelowLimit: true as const,
  });
}

export function keratinReceipt(): KeratinReceipt {
  const stream = Object.freeze<KeratinLockEvent[]>(["feltLock", "pill", "damage", "fracture"]);
  const add = addEventWitness(Object.freeze<KeratinLockEvent[]>([]), "feltLock");
  const history = runHistoryWitness(Object.freeze<KeratinLockEvent[]>(["feltLock"]), ["pill", "damage"], ["feltLock", "fracture"]);
  const prefix = lockPrefixWitness(stream, 2, Object.freeze<KeratinLockEvent[]>([]));
  const directed = lockStreamDirectedWitness(stream, Object.freeze<KeratinLockEvent[]>([]), 1, 3);
  const limit = lockStreamLimitWitness(stream, Object.freeze<KeratinLockEvent[]>([]), 3);
  return Object.freeze({
    kind: "keratin.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.Keratin" as const,
    addEvent: add,
    history,
    prefix,
    directed,
    limit,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.lock_infl",
      "Obsmetrologia.Relational.Material.runHistory_infl",
      "Obsmetrologia.Relational.Material.runHistory_mono",
      "Obsmetrologia.Relational.Material.runLockPrefix_infl",
      "Obsmetrologia.Relational.Material.runLockPrefix_mono",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_succ",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_of_le",
      "Obsmetrologia.Relational.Material.runLockPrefix_directed",
      "Obsmetrologia.Relational.Material.runLockPrefix_le_limit",
      "Obsmetrologia.Relational.Material.seed_le_lockSeed",
      "Obsmetrologia.Relational.Material.settle_lock_is_least_compatible",
      "Obsmetrologia.Relational.Material.lockStreamPrefixSeed_le_limitSeed",
      "Obsmetrologia.Relational.Material.settle_lockStreamLimit_is_least_compatible",
      "Obsmetrologia.Relational.Material.addEvent_fires",
      "Obsmetrologia.Relational.Material.addEvent_infl",
    ] as const),
  });
}

export function shroudIndexedKeratinReceipt(): ShroudIndexedKeratinReceipt {
  const vertices = Object.freeze(["shaft-root", "shaft-tip"]);
  const shroudPoints = Object.freeze(["event-horizon-root", "event-horizon-tip"]);
  const interiorPoints = Object.freeze(["event-horizon-root", "event-horizon-tip", "interior-shadow"]);
  const address: Readonly<Record<string, string>> = Object.freeze({
    "shaft-root": "event-horizon-root",
    "shaft-tip": "event-horizon-tip",
  });
  const history: Readonly<Record<string, readonly KeratinLockEvent[]>> = Object.freeze({
    "shaft-root": Object.freeze<KeratinLockEvent[]>(["feltLock", "pill"]),
    "shaft-tip": Object.freeze<KeratinLockEvent[]>(["damage"]),
  });
  const seed: Readonly<Record<string, EventState<KeratinLockEvent>>> = Object.freeze({
    "shaft-root": Object.freeze<KeratinLockEvent[]>(["feltLock"]),
    "shaft-tip": Object.freeze<KeratinLockEvent[]>([]),
  });
  const lockedSeed: Readonly<Record<string, EventState<KeratinLockEvent>>> = Object.freeze(Object.fromEntries(vertices.map((vertex) => [
    vertex,
    runHistory(seed[vertex] ?? [], history[vertex] ?? []),
  ])) as Record<string, EventState<KeratinLockEvent>>);
  const shroudEventOnShroud = vertices.every((vertex) => shroudPoints.includes(address[vertex] ?? ""));
  const shroudEventInHole = vertices.every((vertex) => interiorPoints.includes(address[vertex] ?? ""));
  const lockedSeedInflationary = vertices.every((vertex) => below(seed[vertex] ?? [], lockedSeed[vertex] ?? []));
  if (!shroudEventOnShroud || !shroudEventInHole || !lockedSeedInflationary) {
    throw new TypeError("shroudIndexedKeratinReceipt: indexed shroud lock laws failed");
  }
  return Object.freeze({
    kind: "keratin.shroudIndexed.receipt:witness" as const,
    capturedLeanModule: "Obsmetrologia.Relational.Material.Contact.ShroudIndexedKeratin" as const,
    vertices,
    shroudPoints,
    interiorPoints,
    address,
    history,
    seed,
    lockedSeed,
    shroudEventOnShroud: true as const,
    shroudEventInHole: true as const,
    lockedSeedInflationary: true as const,
    settleLockedLeastCompatible: true as const,
    leanTheorems: Object.freeze([
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_on_shroud",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.shroudEvent_in_hole",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.lockedSeed_infl",
      "Obsmetrologia.Relational.Material.ShroudIndexedKeratin.settle_locked_least_compatible",
    ] as const),
  });
}
