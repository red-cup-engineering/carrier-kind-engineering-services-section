export { evmNetwork } from "./evm-network.mjs";

/** Validate the official route declaration without loading an HTTP server. */
export function routeSet(value, scheme) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new TypeError("x402 routes must be one nonempty official route configuration");
  }
  for (const [route, configuration] of Object.entries(value)) {
    if (!/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \/\S*$/u.test(route)) throw new TypeError(`invalid x402 route ${route}`);
    const accepts = Array.isArray(configuration?.accepts) ? configuration.accepts : [configuration?.accepts];
    if (accepts.length === 0 || accepts.some((entry) => entry?.scheme !== scheme)) {
      throw new TypeError(`${route} must use the official x402 ${scheme} scheme`);
    }
  }
  return value;
}
