export interface SemioticResourceNameClaim<Ty = unknown, Tm = unknown> {
  readonly semanticType: Ty;
  readonly term: Tm;
}

export interface SemioticResourceNameAddress<Ty = unknown, Tm = unknown> {
  readonly surface: string;
  readonly token: `ni:///sha-256;${string}`;
  readonly claim: SemioticResourceNameClaim<Ty, Tm>;
}

export interface SemioticResourceNameAddressCarrier {
  readonly surface: string;
  readonly bytes: Uint8Array;
  readonly token: `ni:///sha-256;${string}`;
}

/** Derive and address one canonical closed Three Dots and a Dash SRN path. */
export declare function addressSemioticResourceName(surface: string): SemioticResourceNameAddress;

/** Return the canonical immutable address or throw when any coordinate mismatches. */
export declare function assertSemioticResourceNameAddress(
  address: SemioticResourceNameAddress,
): SemioticResourceNameAddress;

/** Check an address without decoding or dereferencing its opaque token. */
export declare function verifySemioticResourceNameAddress(address: unknown): boolean;

/** Admit canonical normalized-envelope bytes as the exact SRN address they carry. */
export declare function admitSemioticResourceNameAddress(
  carrier: SemioticResourceNameAddressCarrier,
): SemioticResourceNameAddress;
