/**
 * analysis/work-item-causal-set - work items as diamonds, one level up.
 *
 * `run-causal-set.mts` diamonds one session's turns and sequences them by witnessed
 * order. The kinematic-space-of-runs note's proven-in-repo claim is that iterating this
 * construction is free (the `Hole` endofunctor): "runs-of-runs (campaigns, epics) carry
 * the same structure at every level"
 * (`2026-07-01-research-on-the-kinematic-space-of-runs.md`). This module is that iteration realized: the
 * SAME diamond/sequencing/settle shape, reused verbatim from `causal.mjs`, over
 * work items (`src/work/model.mts`'s endeavor > campaign > project > plan > task >
 * work-item spine) instead of turns within a session.
 *
 * A turn opens/closes on a fixed hook-event vocabulary (`UserPromptSubmit`/`Stop`) mined
 * from an observed stream. A work item has no such mined vocabulary — an
 * endeavor or campaign is a commitment a caller declares, not a text-classifier's guess
 * (`src/work/model.mts`'s own point, and `session.mts`'s `workItemCharge` discipline: a
 * classifier gets `unknown`, never a terminal charge, on its own say-so). So the two
 * markers here, `"opened"` and `"settled"`, are supplied by whatever caller is tracking
 * the item's own charge — this module only sequences and settles what it is handed.
 */
import { settleCausalSet, type CausalLink, type CausalSetCarrier, type CausalSettlementJudgment } from "@lenticule-science/metrologic/articulation/predicating/positing/settling/analysis/causal";
import { SETTLE_EVENT_CAP } from "@lenticule-science/metrologic/models/order/run-causal-set";
import type { ChargeValueName } from "@red-cup-engineering/computer-data-engine/bilattice-charge";

export { SETTLE_EVENT_CAP };

/** The two markers a work item's own tracker supplies: it was first asserted
 *  (`"opened"`), or its charge left `unknown` for a terminal FOUR value (`"settled"`). */
export type WorkItemEventName = "opened" | "settled";

/** One already-witnessed observation of a work item, reduced to what sequencing
 *  needs. `item` is the item's scope string (`scopeOf`, e.g. `"campaign:2026-h2-realize"`). */
export interface WorkItemObservation {
  readonly item: string;
  /** The enclosing item's scope string, if any. Enclosure is descriptive
   *  structure only and never creates causal order between siblings. */
  readonly parent?: string;
  /** Explicit causal predecessors declared for this scope. Enclosure is not
   *  dependency: only these recorded relations may seed work sequencing. */
  readonly dependencies?: readonly string[];
  /** Explicit symmetric non-concurrency relations used by roadmap coloring. */
  readonly conflicts?: readonly string[];
  readonly event: WorkItemEventName;
  /** The exact FOUR reading carried by the admitted lifecycle observation. */
  readonly charge: ChargeValueName;
  readonly at: string;
  /** Exact journal witness and direct causes, when reduced from admitted
   *  material rather than an unwitnessed in-memory row fixture. */
  readonly witness?: string;
  readonly causes?: readonly string[];
}

/** A bounded work-item diamond: an item's opening observation to its (possibly proxy)
 *  settlement. */
export interface WorkItemDiamond {
  readonly kind: "metroplat.workItem.diamond";
  /** Stable event id for this diamond in the derived causal set: `${item}#${index}`. */
  readonly id: string;
  readonly item: string;
  readonly parent?: string;
  /** 0-based ordinal within the item's own witnessed observations. */
  readonly index: number;
  readonly lower: WorkItemObservation;
  readonly upper: WorkItemObservation;
  /** True when `upper` is a deshrouded proxy (no true settlement witnessed yet). */
  readonly deshrouded: boolean;
}

const OPENS_ITEM = "opened";
const SETTLES_ITEM = "settled";

/**
 * Derive one item's diamonds from its observations, in witnessed order — the same
 * opens/closes pairing `sessionTurnDiamonds` runs over `UserPromptSubmit`/`Stop`, over
 * `"opened"`/`"settled"` instead.
 */
export function itemDiamonds(item: string, observations: readonly WorkItemObservation[]): readonly WorkItemDiamond[] {
  const diamonds: WorkItemDiamond[] = [];
  let index = 0;
  for (let i = 0; i < observations.length; i += 1) {
    const lower = observations[i];
    if (lower === undefined || lower.event !== OPENS_ITEM) continue;
    let closeAt = -1;
    for (let j = i + 1; j < observations.length; j += 1) {
      const candidate = observations[j];
      if (candidate === undefined) continue;
      if (candidate.event === OPENS_ITEM) break;
      if (candidate.event === SETTLES_ITEM) { closeAt = j; break; }
    }
    if (closeAt >= 0) {
      const upper = observations[closeAt];
      if (upper !== undefined) {
        diamonds.push(Object.freeze({
          kind: "metroplat.workItem.diamond" as const,
          id: `${item}#${index}`,
          item,
          ...(lower.parent === undefined ? {} : { parent: lower.parent }),
          index,
          lower,
          upper,
          deshrouded: false,
        }));
        index += 1;
      }
      continue;
    }
    const last = observations[observations.length - 1];
    if (last !== undefined && last !== lower) {
      diamonds.push(Object.freeze({
        kind: "metroplat.workItem.diamond" as const,
        id: `${item}#${index}`,
        item,
        ...(lower.parent === undefined ? {} : { parent: lower.parent }),
        index,
        lower,
        upper: last,
        deshrouded: true,
      }));
      index += 1;
    }
  }
  return Object.freeze(diamonds);
}

/** Derive diamonds for every work item present, preserving each item's witnessed order. */
export function diamondsByItem(observations: readonly WorkItemObservation[]): readonly WorkItemDiamond[] {
  const byItem = new Map<string, WorkItemObservation[]>();
  for (const observation of observations) {
    const list = byItem.get(observation.item);
    if (list === undefined) byItem.set(observation.item, [observation]);
    else list.push(observation);
  }
  const diamonds: WorkItemDiamond[] = [];
  for (const [item, list] of byItem) diamonds.push(...itemDiamonds(item, list));
  return Object.freeze(diamonds);
}

/**
 * Sequencing links induced only by explicit dependency evidence. A parent records
 * enclosure, a level records work altitude, and array order records carrier order;
 * none is a causal relation.
 * For a repeated scope, the latest settled diamond is the dependency witness when
 * available, otherwise its latest bounded observation is retained as an open witness.
 */
export function sequencingLinksAtLevel(diamonds: readonly WorkItemDiamond[]): readonly CausalLink[] {
  const byItem = new Map<string, WorkItemDiamond[]>();
  for (const diamond of diamonds) {
    const list = byItem.get(diamond.item);
    if (list === undefined) byItem.set(diamond.item, [diamond]);
    else list.push(diamond);
  }
  const sourceOf = (scope: string): WorkItemDiamond | undefined => {
    const candidates = byItem.get(scope);
    if (candidates === undefined) return undefined;
    return [...candidates].reverse().find((candidate) => !candidate.deshrouded) ?? candidates.at(-1);
  };
  const links = new Map<string, CausalLink>();
  for (const target of diamonds) {
    for (const dependency of target.lower.dependencies ?? []) {
      const source = sourceOf(dependency);
      if (source === undefined || source.id === target.id) continue;
      const link = Object.freeze({ from: source.id, to: target.id });
      links.set(`${link.from}\u0000${link.to}`, link);
    }
  }
  return Object.freeze([...links.values()].sort((left, right) =>
    `${left.from}\u0000${left.to}`.localeCompare(`${right.from}\u0000${right.to}`)));
}

/** The work-item space as a Lorentzian causal set: item diamonds as events and
 *  explicitly declared dependencies as the seed order. */
export function workItemCausalSetCarrier(diamonds: readonly WorkItemDiamond[]): CausalSetCarrier {
  return Object.freeze({
    kind: "lorentzian.causalSet" as const,
    events: Object.freeze(diamonds.map((diamond) => diamond.id)),
    links: sequencingLinksAtLevel(diamonds),
  });
}

export type WorkItemCausalSetCarrierClosure =
  | CausalSettlementJudgment
  | { readonly kind: "metroplat.workItem.causal-set-out-of-scope"; readonly events: number; readonly cap: number };

/**
 * Settle one explicitly selected bounded set of work diamonds, rather than
 * implicitly mixing unrelated scopes or levels.
 */
export function closeWorkItemCausalSetCarrier(diamonds: readonly WorkItemDiamond[]): WorkItemCausalSetCarrierClosure {
  if (diamonds.length > SETTLE_EVENT_CAP) {
    return Object.freeze({ kind: "metroplat.workItem.causal-set-out-of-scope" as const, events: diamonds.length, cap: SETTLE_EVENT_CAP });
  }
  return settleCausalSet(workItemCausalSetCarrier(diamonds));
}

export interface WorkItemCausalSetCarrierReceipt {
  readonly kind: "metroplat.workItem.receipt:witness";
  readonly diamonds: readonly WorkItemDiamond[];
  readonly causalSet: CausalSetCarrier;
  readonly settlement: WorkItemCausalSetCarrierClosure;
}

/** Exercise the diamond/sequencing/settle construction on one worked example: an
 *  `endeavor`'s two `campaign` children with an explicit phase-one dependency. */
export function workItemCausalSetCarrierReceipt(): WorkItemCausalSetCarrierReceipt {
  const observations: readonly WorkItemObservation[] = Object.freeze([
    { item: "campaign:phase-one", parent: "endeavor:2026-h2-agentic-realization", event: "opened", charge: "unknown", at: "2026-07-01T00:00:00.000Z" },
    { item: "campaign:phase-one", parent: "endeavor:2026-h2-agentic-realization", event: "settled", charge: "held", at: "2026-07-02T00:00:00.000Z" },
    { item: "campaign:phase-two", parent: "endeavor:2026-h2-agentic-realization", dependencies: Object.freeze(["campaign:phase-one"]), event: "opened", charge: "unknown", at: "2026-07-03T00:00:00.000Z" },
    { item: "campaign:phase-two", parent: "endeavor:2026-h2-agentic-realization", event: "settled", charge: "held", at: "2026-07-04T00:00:00.000Z" },
  ]);
  const diamonds = diamondsByItem(observations);
  if (diamonds.length !== 2) throw new TypeError(`workItem receipt: expected 2 diamonds, got ${diamonds.length}`);
  const causalSet = workItemCausalSetCarrier(diamonds);
  if (causalSet.links.length !== 1) throw new TypeError(`workItem receipt: expected 1 explicit dependency link, got ${causalSet.links.length}`);
  const settlement = closeWorkItemCausalSetCarrier(diamonds);
  return Object.freeze({ kind: "metroplat.workItem.receipt:witness" as const, diamonds, causalSet, settlement });
}
