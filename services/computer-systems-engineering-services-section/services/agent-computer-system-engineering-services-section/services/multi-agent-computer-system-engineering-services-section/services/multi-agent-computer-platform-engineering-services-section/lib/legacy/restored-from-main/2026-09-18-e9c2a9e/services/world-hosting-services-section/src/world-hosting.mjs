import { isAbsolute, join } from "node:path";

/**
 * World-hosting landlord: pure domain semantics for hosting others' FeltOS
 * worlds (play.561.group hosts ours; this hosts others', like itch.io).
 * No I/O here; effects live in ../scripts/. Pricing rationale is carried
 * per tier below; customer #1 funnel channels are in `customerFunnelChannels`.
 * @module world-hosting
 */

/** Repo-relative root of the FeltOS package this section provisions worlds through. */
const FELTOS_PACKAGE_ROOT = "apps/feltos";

/**
 * Build a "<feltos file>#<export>" grounding citation relative to the
 * FeltOS package root, for a capability catalog entry's `groundedIn` field.
 * @param {string} relativeFile - path under apps/feltos (e.g. "src/persistence.mjs")
 * @param {string} exportName - the verified export name
 * @returns {string}
 */
function feltosGrounding(relativeFile, exportName) {
  return `${FELTOS_PACKAGE_ROOT}/${relativeFile}#${exportName}`;
}

const TENANT_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

/**
 * @typedef {Object} HostingCapabilityEntry
 * @property {string} capability - plain description of the capability
 * @property {string|null} groundedIn - "<file path>#<export>" the capability is verified against, or null when not yet built
 * @property {"built"|"needs-building"} status
 */

/**
 * @typedef {Object} HostingTier
 * @property {string} name
 * @property {number} monthlyUsd
 * @property {number} concurrentSessionCeiling
 * @property {string} rationale - pricing derivation citing Aug 2026 Minecraft-hosting comparables (no verified MUD-hosting monthly rate was found)
 * @property {HostingCapabilityEntry[]} capabilities
 */

const TIERS = Object.freeze([
  Object.freeze({
    name: "Starter",
    monthlyUsd: 9,
    concurrentSessionCeiling: 10,
    rationale:
      "Below the $5-15/mo Minecraft small-vanilla band's midpoint (wisehosting.com/blog/how-much-does-a-minecraft-server-cost, dathost.com/blog/minecraft-server-cost): a text MUD's per-connection bandwidth is far lower than Minecraft's voxel-chunk traffic, so a lean, low-ceiling tier prices near the bottom of that band even after adding FeltOS's deterministic persistence, which most low-end MUD/Minecraft hosts do not offer.",
    capabilities: Object.freeze([
      Object.freeze({ capability: "deterministic event-sourced world persistence and checkpointing", groundedIn: feltosGrounding("src/persistence.mjs", "snapshotWorld"), status: "built" }),
      Object.freeze({ capability: "immutable append-only world assertion trace", groundedIn: feltosGrounding("src/world.mjs", "tell"), status: "built" }),
      Object.freeze({ capability: "custom domain routing", groundedIn: null, status: "needs-building" }),
    ]),
  }),
  Object.freeze({
    name: "Community",
    monthlyUsd: 24,
    concurrentSessionCeiling: 50,
    rationale:
      "Matches the $15-25/mo Minecraft mid-size 10-20-player band (3lifehosting.com/blog/how-much-does-a-minecraft-server-cost) even though a text MUD's bandwidth cost is lower, because this tier is priced on capability, not raw bandwidth: agent NPCs and checkpointed persistence are real feature-adds over a typical mid-tier Minecraft or MUD host, justifying the Minecraft-equivalent price rather than a discount.",
    capabilities: Object.freeze([
      Object.freeze({ capability: "deterministic event-sourced world persistence and checkpointing", groundedIn: feltosGrounding("src/persistence.mjs", "snapshotWorld"), status: "built" }),
      Object.freeze({ capability: "agent NPCs (needs-driven behavior, action choice, enactment)", groundedIn: feltosGrounding("src/npc.mjs", "chooseNpcAction"), status: "built" }),
      Object.freeze({ capability: "checkpoint compaction of a long-running world's assertion trace", groundedIn: feltosGrounding("src/persistence.mjs", "checkpointWorld"), status: "built" }),
      Object.freeze({ capability: "custom domain routing", groundedIn: null, status: "needs-building" }),
      Object.freeze({ capability: "admin dashboard", groundedIn: null, status: "needs-building" }),
      Object.freeze({ capability: "per-tenant resource metering/billing", groundedIn: null, status: "needs-building" }),
    ]),
  }),
  Object.freeze({
    name: "Flagship",
    monthlyUsd: 59,
    concurrentSessionCeiling: 200,
    rationale:
      "Prices below the Minecraft heavy-modpack $35-50/mo band's implied per-player rate (roughly $1.00-1.50/player/month at scale per hostadvice.com/blog/web-hosting/minecraft/minecraft-server-cost, which would put 200 players at $200-300/mo): a MUD's bandwidth/compute footprint stays far lower than Minecraft's even at high concurrency, so this tier commands a premium over Community for its higher ceiling and dedicated backup/restore needs without inheriting Minecraft's per-player cost curve.",
    capabilities: Object.freeze([
      Object.freeze({ capability: "deterministic event-sourced world persistence and checkpointing", groundedIn: feltosGrounding("src/persistence.mjs", "snapshotWorld"), status: "built" }),
      Object.freeze({ capability: "agent NPCs (needs-driven behavior, action choice, enactment)", groundedIn: feltosGrounding("src/npc.mjs", "chooseNpcAction"), status: "built" }),
      Object.freeze({ capability: "checkpoint compaction of a long-running world's assertion trace", groundedIn: feltosGrounding("src/persistence.mjs", "checkpointWorld"), status: "built" }),
      Object.freeze({ capability: "custom domain routing", groundedIn: null, status: "needs-building" }),
      Object.freeze({ capability: "admin dashboard", groundedIn: null, status: "needs-building" }),
      Object.freeze({ capability: "per-tenant resource metering/billing", groundedIn: null, status: "needs-building" }),
      Object.freeze({ capability: "backup/restore automation", groundedIn: null, status: "needs-building" }),
    ]),
  }),
]);

/**
 * List the hosting tier catalog.
 * @returns {ReadonlyArray<HostingTier>}
 */
export function listHostingTiers() {
  return TIERS;
}

/**
 * Look up one hosting tier by exact name.
 * @param {string} tierName
 * @returns {HostingTier}
 * @throws {TypeError} when `tierName` does not name a catalog tier
 */
export function findHostingTier(tierName) {
  const tier = TIERS.find((entry) => entry.name === tierName);
  if (tier === undefined) {
    throw new TypeError(`unknown hosting tier: ${String(tierName)} (known tiers: ${TIERS.map((entry) => entry.name).join(", ")})`);
  }
  return tier;
}

/**
 * Find the cheapest tier whose concurrent-session ceiling can hold the
 * given player count.
 * @param {number} estimatedConcurrentPlayers
 * @returns {HostingTier|null} the cheapest fitting tier, or null when no tier's ceiling is high enough
 */
function recommendTierFor(estimatedConcurrentPlayers) {
  const fitting = TIERS.filter((tier) => tier.concurrentSessionCeiling >= estimatedConcurrentPlayers);
  if (fitting.length === 0) return null;
  return fitting.reduce((cheapest, tier) => (tier.monthlyUsd < cheapest.monthlyUsd ? tier : cheapest));
}

/**
 * @typedef {Object} HostingQuote
 * @property {string} tier
 * @property {number} monthlyUsd
 * @property {number} estimatedConcurrentPlayers
 * @property {number} concurrentSessionCeiling
 * @property {boolean} fitsWithinCeiling
 * @property {string|null} recommendedTier - the requested tier when it fits, the cheapest fitting tier otherwise, or null when no tier's ceiling is high enough
 */

/**
 * Compute a hosting quote for a named tier and an estimated concurrent-player count.
 * @param {Object} input
 * @param {string} input.tierName
 * @param {number} input.estimatedConcurrentPlayers
 * @returns {HostingQuote}
 * @throws {TypeError} on an unknown tier or a non-finite/negative player count
 */
export function quoteHostingTenant({ tierName, estimatedConcurrentPlayers }) {
  const tier = findHostingTier(tierName);
  if (!Number.isFinite(estimatedConcurrentPlayers) || estimatedConcurrentPlayers < 0) {
    throw new TypeError("estimatedConcurrentPlayers must be a non-negative finite number");
  }
  const fitsWithinCeiling = estimatedConcurrentPlayers <= tier.concurrentSessionCeiling;
  const recommended = fitsWithinCeiling ? tier : recommendTierFor(estimatedConcurrentPlayers);
  return Object.freeze({
    tier: tier.name,
    monthlyUsd: tier.monthlyUsd,
    estimatedConcurrentPlayers,
    concurrentSessionCeiling: tier.concurrentSessionCeiling,
    fitsWithinCeiling,
    recommendedTier: recommended === null ? null : recommended.name,
  });
}

/**
 * @typedef {Object} TenantProvisioningPlan
 * @property {string} tenantId
 * @property {string} tier
 * @property {string} workspaceDirectory - tenant's namespaced data directory under the caller-supplied dataRoot
 * @property {string} snapshotPath - path the initial world snapshot will be written to
 * @property {{createWorld: string, snapshotWorld: string}} feltosPrimitives - the exact FeltOS exports the provisioning effect invokes
 */

/**
 * Build a pure tenant-provisioning plan: the tenant's namespaced workspace
 * path under a caller-supplied dataRoot, and which FeltOS primitives the
 * effect script (../scripts/provision-tenant-workspace.mjs) will invoke.
 * Performs no I/O and creates nothing on disk.
 * @param {Object} input
 * @param {string} input.tenantId - lowercase identifier, e.g. "acme-guild"
 * @param {string} input.tier - a tier name from listHostingTiers()
 * @param {string} input.dataRoot - absolute path the caller owns; never a path inside this checkout
 * @returns {TenantProvisioningPlan}
 * @throws {TypeError} on an invalid tenantId, unknown tier, or non-absolute/missing dataRoot
 */
export function planTenantProvisioning({ tenantId, tier: tierName, dataRoot }) {
  if (typeof tenantId !== "string" || !TENANT_ID_PATTERN.test(tenantId)) {
    throw new TypeError("tenantId must be a lowercase identifier matching /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/");
  }
  const tier = findHostingTier(tierName);
  if (typeof dataRoot !== "string" || dataRoot.length === 0 || !isAbsolute(dataRoot)) {
    throw new TypeError("dataRoot must be a caller-supplied absolute path (never a default inside this checkout)");
  }
  const workspaceDirectory = join(dataRoot, "tenants", tenantId);
  return Object.freeze({
    tenantId,
    tier: tier.name,
    workspaceDirectory,
    snapshotPath: join(workspaceDirectory, "world-snapshot.json"),
    feltosPrimitives: Object.freeze({
      createWorld: "@red-cup-engineering/feltos#createWorld",
      snapshotWorld: "@red-cup-engineering/feltos#snapshotWorld",
    }),
  });
}

/**
 * @typedef {Object} CustomerFunnelChannel
 * @property {string} name
 * @property {string} note - one line naming what the channel is and why it's on this list
 * @property {boolean} recommendedFirst - true for exactly one channel: the recommended first move
 */

const CUSTOMER_FUNNEL_CHANNELS = Object.freeze([
  Object.freeze({ name: "MUD Coders Guild Discord/Slack", note: "the working-MUD-developer community; people actively running or wanting to run a MUD server, not just players", recommendedFirst: true }),
  Object.freeze({ name: "r/MUD and r/text_adventures (Reddit)", note: "public subreddits for MUD/text-adventure players and builders", recommendedFirst: false }),
  Object.freeze({ name: "mudconnector.com", note: "the long-running MUD directory/listing site; its audience already searches for MUDs and MUD hosting", recommendedFirst: false }),
  Object.freeze({ name: "itch.io interactive-fiction/MUD tag pages", note: "ties directly to the meet-then-beat-itch.io posture already driving play.561.group", recommendedFirst: false }),
  Object.freeze({ name: "Grapevine (grapevine.haus)", note: "the MUD directory the 2026-08-31 mudday survey already researched", recommendedFirst: false }),
]);

/**
 * List the customer #1 funnel channels: real communities where MUD/world-
 * building people already gather, with exactly one marked as the
 * recommended first channel.
 * @returns {ReadonlyArray<CustomerFunnelChannel>}
 */
export function customerFunnelChannels() {
  return CUSTOMER_FUNNEL_CHANNELS;
}
