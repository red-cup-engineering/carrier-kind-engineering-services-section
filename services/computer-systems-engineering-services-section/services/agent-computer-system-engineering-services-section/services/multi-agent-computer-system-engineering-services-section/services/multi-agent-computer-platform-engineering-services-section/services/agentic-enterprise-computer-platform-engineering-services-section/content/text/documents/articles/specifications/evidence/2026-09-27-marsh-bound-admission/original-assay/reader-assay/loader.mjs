const specifier = "@red-cup-engineering/ethereum-engineering-services-section/public-evm-read";
const adapter = new URL("./reader-adapter.mjs", import.meta.url).href;
export async function resolve(requested, context, nextResolve) {
  if (requested === specifier) return { url: adapter, shortCircuit: true };
  return nextResolve(requested, context);
}
