/**
 * Views and innocence — the Hyland-Ong local-memory reading of chronicles.
 *
 * Hyland-Ong innocence says a strategy's next Proponent move is determined by
 * the Proponent view, not by the whole hidden history. Faggian-Hyland's bridge
 * from ludics to game semantics makes this live directly on our existing
 * chronicle grain: designs yield chronicles, and chronicles yield player views.
 *
 * No new strategy datatype is introduced. Actions already route through the
 * Design reading valuation (`positive`/`negative`/`daimon` from relating's
 * four-valued reading), so view-dependence is another reading of the same carrier.
 */
import {

  actionPolarity,
  sameAction,
} from "./action.mjs";
import {

  designChronicles,
} from "./chronicle.mjs";
import { } from "./design.mjs";
import {

  locusKey,
  parent,
  sameLocus,
} from "./locus.mjs";
import { polarityName } from "../../../polarity.mjs";

const ownerOf = (action) =>
  polarityName(actionPolarity(action)) === "negative" ? "opponent" : "proponent";

const makeView = (perspective, actions) =>
  Object.freeze({
    kind: "game.view",
    perspective,
    actions: Object.freeze([...actions]),
  });

const justifierIndex = (actions, move) => {
  const parentLocus = parent(move.locus);
  if (parentLocus === null) return -1;
  for (let i = actions.length - 1; i >= 0; i--) {
    if (sameLocus(actions[i].locus, parentLocus)) return i;
  }
  return -1;
};

const viewActions = (
  actions,
  perspective,
) => {
  if (actions.length === 0) return Object.freeze([]);
  const last = actions[actions.length - 1];
  const prior = actions.slice(0, -1);
  if (ownerOf(last) === perspective) {
    return Object.freeze([...viewActions(prior, perspective), last]);
  }
  const justifiedBy = justifierIndex(prior, last);
  if (justifiedBy < 0) {
    return Object.freeze([last]);
  }
  return Object.freeze([
    ...viewActions(prior.slice(0, justifiedBy + 1), perspective),
    last,
  ]);
};

export const viewOfChronicle = (
  chronicle,
  perspective = "proponent",
) => makeView(perspective, viewActions(chronicle.actions, perspective));

export const viewsOfDesign = (
  design,
  perspective = "proponent",
) =>
  Object.freeze(designChronicles(design).map((c) => viewOfChronicle(c, perspective)));

const actionKey = (action) =>
  `${action.variety}@${locusKey(action.locus)}[${action.ramification.join(",")}]`;

const viewKey = (view) =>
  `${view.perspective}:${view.actions.map(actionKey).join(";")}`;

/**
 * Judge Proponent innocence over the finite chronicle presentation of a Design:
 * whenever two chronicle prefixes have the same Proponent view, the next
 * Proponent action must be the same. This is the finite, carrier-level analogue
 * of the Hyland-Ong innocence condition.
 */
export function innocenceJudgment(design) {
  const decisions = new Map();

  for (const chronicle of designChronicles(design)) {
    for (let i = 0; i + 1 < chronicle.actions.length; i++) {
      const next = chronicle.actions[i + 1];
      if (ownerOf(next) !== "proponent") continue;
      const view = viewOfChronicle(
        { kind: "game.chronicle", actions: chronicle.actions.slice(0, i + 1) },
        "proponent",
      );
      const key = viewKey(view);
      const prior = decisions.get(key);
      if (prior !== undefined && !sameAction(prior.next, next)) {
        return Object.freeze({
          kind: "game.innocence-obstruction",
          design,
          view,
          expected: prior.next,
          actual: next,
          reason: "same Proponent view admits two different next Proponent actions",
        });
      }
      decisions.set(key, Object.freeze({ view, next }));
    }
  }

  return Object.freeze({
    kind: "game.innocence:witness",
    design,
    decisions: Object.freeze([...decisions.values()]),
  });
}

export const isInnocent = (design) =>
  innocenceJudgment(design).kind === "game.innocence:witness";
