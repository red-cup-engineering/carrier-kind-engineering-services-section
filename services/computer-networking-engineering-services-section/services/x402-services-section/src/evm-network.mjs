export function evmNetwork(value) {
  if (!/^eip155:[1-9][0-9]*$/u.test(value ?? "")) {
    throw new TypeError("x402 network must be one explicit EVM CAIP-2 identifier");
  }
  return value;
}
