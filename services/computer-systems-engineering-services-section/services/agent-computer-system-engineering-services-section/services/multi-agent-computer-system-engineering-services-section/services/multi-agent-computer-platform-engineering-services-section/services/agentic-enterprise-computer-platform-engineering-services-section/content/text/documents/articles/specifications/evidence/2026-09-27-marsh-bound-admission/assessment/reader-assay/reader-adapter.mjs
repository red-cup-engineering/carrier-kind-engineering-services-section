import { createRequire } from "node:module";
import * as production from "file:///work/consumer/src/public-evm-read.mjs";

const require = createRequire("/work/consumer/src/public-evm-read.mjs");
const { createPublicClient, http } = require("viem");
// Private fixture override: retain the real reader-pool algorithm while routing
// its injected client to local Anvil. This is not a live Base provider assertion.
export const BASE_PUBLIC_EVM_CHAIN = production.BASE_PUBLIC_EVM_CHAIN;
export const BASE_PUBLIC_EVM_PROVIDERS = Object.freeze([
  Object.freeze({ id: "private-anvil", url: "https://local-fixture.invalid/" }),
]);
export function createPublicEvmReadPool(options) {
  return production.createPublicEvmReadPool({
    ...options,
    chain: BASE_PUBLIC_EVM_CHAIN,
    providers: BASE_PUBLIC_EVM_PROVIDERS,
    createClient: async ({ chain }) => {
      const localChain = {
        id: chain.id,
        name: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
        contracts: { multicall3: chain.multicall3 },
      };
      return createPublicClient({ chain: localChain, transport: http("http://127.0.0.1:8545", { retryCount: 0 }) });
    },
  });
}
