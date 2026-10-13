export { evmNetwork } from "./evm-network.mjs";

/** Validate the official route declaration without loading an HTTP server. */
export function routeSet(value, scheme, network) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new TypeError("x402 routes must be one nonempty official route configuration");
  }
  for (const [route, configuration] of Object.entries(value)) {
    if (!/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \/\S*$/u.test(route)) throw new TypeError(`invalid x402 route ${route}`);
    const accepts = Array.isArray(configuration?.accepts) ? configuration.accepts : [configuration?.accepts];
    if (accepts.length === 0 || accepts.some((entry) => entry?.scheme !== scheme)) {
      throw new TypeError(`${route} must use the official x402 ${scheme} scheme`);
    }
    if (network !== undefined && accepts.some(entry => entry.network !== network)) {
      throw new TypeError(`${route} must use the boundary's registered network ${network}`);
    }
  }
  return value;
}

/** The official settlement hook sees the resolved amount, while the payment
 * payload retains the buyer's original ceiling. Refuse excess before calling
 * a facilitator; transport headers or a permissive facilitator cannot expand
 * that signed consideration. Resource measurement belongs to the handler.
 */
export async function boundUptoSettlement({ paymentPayload, requirements }) {
  const maximum = paymentPayload?.accepted?.amount, actual = requirements?.amount;
  const uint256 = value => typeof value === "string" && /^(0|[1-9][0-9]{0,77})$/u.test(value)
    && BigInt(value) < (1n << 256n);
  if (!uint256(maximum) || !uint256(actual) || BigInt(actual) > BigInt(maximum)) {
    return { abort: true, reason: "usage_exceeds_authorization", message: "usage must be canonical atomic units within the buyer's authorized maximum" };
  }
}
