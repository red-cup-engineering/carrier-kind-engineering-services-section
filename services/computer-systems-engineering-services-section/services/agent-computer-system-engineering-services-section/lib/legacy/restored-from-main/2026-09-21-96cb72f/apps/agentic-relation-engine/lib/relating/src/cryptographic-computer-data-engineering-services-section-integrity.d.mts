declare module "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/src/integrity.mjs" {
  export function sha256Hex(value: string): string;
  export function sha1Base64(value: string): string;
  export function hmacSha256Base64Url(secret: string, parts: readonly string[]): string;
  export function timingSafeStringEqual(left: string, right: string): boolean;
}
