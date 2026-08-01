// The canonical minter's "/canonical-cbor" subpath ships no type declarations
// (its package.json exports map has no "types" condition for that entry).
// This ambient shim covers the one export this package consumes.
declare module "@red-cup-engineering/rmn-semantic-conformance-die/canonical-cbor" {
  export function rawNiUri(source: string | Uint8Array): string;
}
