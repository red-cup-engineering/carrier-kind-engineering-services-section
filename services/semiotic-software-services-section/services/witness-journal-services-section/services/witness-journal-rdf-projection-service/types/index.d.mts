import type { JsonValue } from "@red-cup-engineering/json-file-codec-service";
import type { AddressedSeavtReadout, Seavt, SeavtTuple } from "@red-cup-engineering/witness-journal-entry-service";

export interface SeavtRdfProjection {
  readonly graph: `ni:///sha-256;${string}`;
  readonly token: `ni:///sha-256;${string}`;
  readonly mediaType: "application/n-quads";
  readonly bytes: Uint8Array;
  readonly canonicalNQuads: string;
  readonly statementCount: 2;
  readonly source: AddressedSeavtReadout;
}

export declare function projectSeavtRdf(
  row: Seavt | SeavtTuple,
  options: { readonly graph: `ni:///sha-256;${string}` },
): Promise<SeavtRdfProjection>;

export declare function verifySeavtRdfProjection(projection: unknown): Promise<boolean>;

export type { AddressedSeavtReadout, JsonValue, Seavt, SeavtTuple };
