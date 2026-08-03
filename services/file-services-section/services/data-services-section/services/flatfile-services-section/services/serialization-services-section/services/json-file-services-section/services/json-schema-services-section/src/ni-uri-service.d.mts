// The canonical NI service currently ships JavaScript without declarations.
// Keep the local surface exact to the byte-only API this package consumes.
declare module "@red-cup-engineering/ni-uri-services-section" {
  export function makeNiUri(source: Uint8Array): string;
}
