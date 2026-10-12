/**
 * Resources: what work consumed, as quantities in their own units, before and apart from any price.
 *
 * A crossing is valued in money (crossings: cost first internally, offer first at the border), but
 * what a provider spends to deliver it is first a flow of resources — tokens through a carrier,
 * requests, seconds. The quantity is a witnessed fact; its money value is a later, revisable
 * reading through a price (a standard cost or an arm's-length offer). Keeping the two apart is what
 * lets the books show work that consumed resources but was never priced, and work that was priced
 * but whose consumption was never witnessed: unknown is never zero, on either axis.
 *
 * A resource record is `{resource, unit, amount, carrier?}`: `amount` is a non-negative integer as
 * decimal text, `carrier` names what consumed it (a model, for tokens). The token vocabulary is the
 * inference providers' common usage report; each field is kept as reported, never netted (cached
 * input is a part of input, reasoning output a part of output).
 */

/** The token usage fields an inference session reports, by the resource each one measures. */
export const TOKEN_USAGE_RESOURCES = Object.freeze({
  input_tokens: "input-tokens",
  cached_input_tokens: "cached-input-tokens",
  cache_write_input_tokens: "cache-write-input-tokens",
  output_tokens: "output-tokens",
  reasoning_output_tokens: "reasoning-output-tokens",
});

const AMOUNT = /^(?:0|[1-9]\d*)$/;

/** Whether a value is one resource record. */
export function isResource(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && typeof value.resource === "string" && value.resource.length > 0
    && typeof value.unit === "string" && value.unit.length > 0
    && typeof value.amount === "string" && AMOUNT.test(value.amount)
    && (value.carrier === undefined || (typeof value.carrier === "string" && value.carrier.length > 0));
}

/** The resource records of a value that should be a list of them; anything else is refused. */
export function resourcesOf(value, what = "resources") {
  if (!Array.isArray(value) || !value.every(isResource)) throw new TypeError(`${what}: a list of {resource, unit, amount, carrier?} with integer amounts`);
  return Object.freeze(value.map((entry) => Object.freeze({ resource: entry.resource, unit: entry.unit, amount: entry.amount, ...(entry.carrier === undefined ? {} : { carrier: entry.carrier }) })));
}

/** The resources an inference session's token usage report witnesses, consumed through `carrier`. */
export function tokenUsageResources(usage, carrier) {
  if (usage === null || typeof usage !== "object") return Object.freeze([]);
  const records = [];
  for (const [field, resource] of Object.entries(TOKEN_USAGE_RESOURCES)) {
    const amount = usage[field];
    if (!Number.isSafeInteger(amount) || amount <= 0) continue;
    records.push({ resource, unit: "token", amount: String(amount), ...(typeof carrier === "string" && carrier.length > 0 ? { carrier } : {}) });
  }
  return resourcesOf(records);
}

/**
 * The resources a work-result proposal witnesses: its `resources` when it carries them, else the
 * token usage its provider evidence reported before resources were a field (`codex-usage:{…}`),
 * consumed through its origin's or producer's carrier.
 */
export function proposalResources(proposal) {
  if (Array.isArray(proposal?.resources)) return resourcesOf(proposal.resources, "work-result proposal resources");
  const reported = (proposal?.providerEvidence ?? []).find((entry) => typeof entry === "string" && entry.startsWith("codex-usage:"));
  if (reported === undefined) return Object.freeze([]);
  let usage;
  try { usage = JSON.parse(reported.slice("codex-usage:".length)); } catch { return Object.freeze([]); }
  const revision = proposal.producer?.revision;
  const carrier = proposal.origin?.model ?? (typeof revision === "string" && revision.startsWith("codex:") ? revision.slice("codex:".length) : undefined);
  return tokenUsageResources(usage, carrier === "default" ? undefined : carrier);
}

/** Resource lists summed by resource, unit and carrier, in a stable order. */
export function sumResources(...lists) {
  const sums = new Map();
  for (const entry of lists.flat(Infinity)) {
    const key = JSON.stringify([entry.resource, entry.unit, entry.carrier ?? ""]);
    const held = sums.get(key);
    sums.set(key, { ...entry, amount: String(BigInt(held?.amount ?? "0") + BigInt(entry.amount)) });
  }
  return Object.freeze([...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, entry]) => Object.freeze(entry)));
}
