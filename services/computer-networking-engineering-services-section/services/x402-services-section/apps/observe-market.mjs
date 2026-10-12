/** Emit one dated sampled Base-USDC EIP-3009 observation as JSON on stdout. */
import { catalogAuthorizationProjection, observeSettlement } from "../src/market-observation/settlement.mjs";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
};
const windowBlocks = Number(arg("window", 900));

const settlement = await observeSettlement({ windowBlocks });
if (!settlement.ok) {
  console.error(`settlement measurement failed: ${settlement.reason}`);
  process.exit(1);
}

let catalog = { ok: false, reason: "not attempted" };
try {
  const response = await fetch("https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?limit=1");
  if (response.ok) {
    const body = await response.json();
    catalog = { ok: true, calls: body?.pagination?.total ?? null };
  } else catalog = { ok: false, reason: `http ${response.status}` };
} catch (error) { catalog = { ok: false, reason: String(error?.message ?? error) }; }

const sampleDerivedAuthorizationProjection = settlement.extrapolated.authorizationsPer30Days;
const catalogAuthorizationComparison = catalog.ok && Number.isFinite(catalog.calls)
  ? catalogAuthorizationProjection({ catalogCalls: catalog.calls, sampleDerivedAuthorizationProjection })
  : null;
console.log(JSON.stringify({
  recordType: "561-group.x402-market-observation",
  observedAt: new Date().toISOString(),
  chain: { network: "eip155:8453", asset: settlement.asset, rangeObservation: true, provenance: settlement.measured.provenance },
  settlement: { measured: settlement.measured, extrapolated: settlement.extrapolated },
  distinctAuthorizersSampled: settlement.measured.distinctAuthorizers,
  catalog,
  catalogAuthorizationComparison,
  caveat: settlement.caveat,
}, null, 2));
console.error(
  `observed ${settlement.measured.authorizations} authorizations from ` +
  `${settlement.measured.distinctAuthorizers} distinct event-authorizer addresses in ~${settlement.measured.approximateMinutes} min ` +
  `-> arithmetic sample projection ~${settlement.extrapolated.authorizationsPer30Days.toLocaleString()}/30d`,
);
