import { isDeepStrictEqual } from "node:util";
import { ACTIVITYSTREAMS_PUBLIC } from "@red-cup-engineering/activitypub-services-section/activitystreams";
import { extractSenActivity, projectSenActivity, senActivityObjectBytes } from "@red-cup-engineering/activitypub-services-section/sen-activity";

import { CAPABILITY_OFFER_KIND, publiclySaleableOffer } from "./offer.mjs";

/**
 * The house capability market's leg of "one offer, every market": each offer
 * whose declaration names the house capability market is said once as an
 * `org.emsenn.capability-offer.v3` object, carried as canonical SEN bytes in a
 * public ActivityPub `Offer` from the seller's own Service actor. A consumer
 * (another node's discovery, a peer's work board) pulls the actor's outbox or
 * follows it, and admits each Offer with `extractSenActivity` against that actor.
 *
 * The outbox is a pure derivation from the offers and the deployment's rails.
 * It is idempotent across compiles: an offer whose content identity (sku) is
 * unchanged keeps its earlier activity, and so its activity id, until it nears
 * expiry, so a recompile that changed nothing republishes nothing.
 */

export const CAPABILITY_MARKET = "house-capability-market";
export const CAPABILITY_ACTOR_IDENTIFIER = "market";
export const AGENT_CARD_ROUTE = "/.well-known/agent-card.json";

const DAY_MS = 86_400_000;

/**
 * @param {readonly object[]} offers Admitted offers (declareCatalog).
 * @param {{rails: {network: string, asset: string}, origin: string, now: string, horizonDays?: number, renewWithinDays?: number, previous?: readonly object[]}} options
 * @returns {readonly {routeKey: string, sku: string, expiresAt: string, activity: object}[]}
 */
export function deriveCapabilityOutbox(offers, { rails, origin, now, horizonDays = 365, renewWithinDays = 180, previous = [] }) {
  if (!Number.isFinite(Date.parse(now ?? ""))) throw new TypeError("the capability outbox needs the instant it is published at");
  const at = Date.parse(now);
  const kept = new Map();
  for (const entry of previous) {
    if (kept.has(entry.sku)) throw new TypeError(`the prior capability outbox contains duplicate SKU ${entry.sku}`);
    kept.set(entry.sku, entry);
  }
  const agentCard = new URL(AGENT_CARD_ROUTE, origin).href;
  const actor = new URL(`/actors/${CAPABILITY_ACTOR_IDENTIFIER}`, origin).href;
  const publishedAt = new Date(at).toISOString();
  const deploymentHealth = new URL("/healthz", origin).href;

  /** Fabricate the exact SEN/CloudEvents/A2A ActivityPub++ offer for this
   * deployment's current rails. Identity derives from all offer terms,
   * including the rail, rather than trusting a prior row's matching SKU. */
  const activityFor = (offer, expiresAt, eventTime) => {
    const capability = offer.capabilityOffer({
      network: rails.network, asset: rails.asset, agentCard, expiresAt,
      coordinates: { deploymentHealth },
    });
    return projectSenActivity({
      type: "Offer", origin, identifier: CAPABILITY_ACTOR_IDENTIFIER, recipient: ACTIVITYSTREAMS_PUBLIC,
      objectBytes: senActivityObjectBytes({ objectKind: CAPABILITY_OFFER_KIND, value: capability }),
      agentCard, eventTime,
    });
  };
  return Object.freeze(offers
    .filter((offer) => offer.markets.includes(CAPABILITY_MARKET) && publiclySaleableOffer(offer))
    .map((offer) => {
      const earlier = kept.get(offer.sku);
      if (earlier?.provider === actor && earlier.routeKey === offer.routeKey
          && Date.parse(earlier.expiresAt) - at > renewWithinDays * DAY_MS) {
        try {
          // Do not republish an unchanged offer: exact source, ActivityPub
          // identity and original CloudEvent time are retained. But a
          // cached Offer may carry different price rails or seller terms even
          // when its declaration/SKU did not change. Reconstruct its expected
          // activity on the old clock before deciding it is reusable.
          const prior = extractSenActivity(earlier.activity, {
            expectedActor: actor, expectedRecipient: ACTIVITYSTREAMS_PUBLIC,
            expectedAgentCard: agentCard,
          });
          const priorTime = Date.parse(prior.cloudEvent.time);
          if (Number.isFinite(priorTime) && priorTime <= at
              && isDeepStrictEqual(earlier.activity,
                activityFor(offer, earlier.expiresAt, prior.cloudEvent.time))) {
            return earlier;
          }
        } catch {
          // Invalid, conflicting, obsolete or noncanonical prior activity:
          // manufacture a fresh source-derived Offer; never reuse it.
        }
      }
      const expiresAt = new Date(at + horizonDays * DAY_MS).toISOString();
      const activity = activityFor(offer, expiresAt, publishedAt);
      return Object.freeze({
        provider: actor, routeKey: offer.routeKey, sku: offer.sku,
        expiresAt, activity: JSON.parse(JSON.stringify(activity)),
      });
    }));
}
