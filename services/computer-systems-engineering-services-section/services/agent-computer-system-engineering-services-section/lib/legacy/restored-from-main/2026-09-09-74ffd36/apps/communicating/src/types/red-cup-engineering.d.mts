// Ambient declarations for @red-cup-engineering packages shipping untyped .mjs; read off the installed source, not invented.
// node_modules/@red-cup-engineering/derive-cbor-ni-service/scripts/derive-cbor-ni.mjs
declare module "@red-cup-engineering/derive-cbor-ni-service" {
  // `value` is runtime-validated (throws TypeError when not an admitted carrier value), so typed as `unknown` here.
  export function deriveCborNi(request: { readonly value: unknown }): { readonly uri: string };
}
