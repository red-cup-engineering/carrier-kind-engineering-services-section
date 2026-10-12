/** Validate one explicit EVM CAIP-2 network identifier, shared by every transport-specific boundary. */
export function evmNetwork(value) {
  if (!/^eip155:[1-9][0-9]*$/u.test(value ?? "")) {
    throw new TypeError("x402 network must be one explicit EVM CAIP-2 identifier");
  }
  return value;
}

/** Validate one nonempty official route configuration set, shared by every transport-specific boundary. */
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

