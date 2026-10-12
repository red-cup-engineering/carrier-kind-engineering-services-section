
import {
  type ContractValue,
} from "../../lib/contracts/index.mts";
import {
  httpBodyReadObservationContract,
} from "./schema.mts";
import type * as HttpSchema from "./schema.mts";

/** Request body reader exposed by the HTTP app boundary. */
export type BodyReadOperationKind = "read-body" | "read-text-body" | "read-json-body" | "read-form-body" | "read-multipart-body";

export type HttpRequestContentBoundaryExtra = { readonly [key: string]: ContractValue };

export interface HttpRequestContentBoundaryInput {
  readonly contentType?: string | null | undefined;
  readonly charset?: string | null | undefined;
  readonly contentEncoding?: string | readonly string[] | null | undefined;
  readonly maxBytes?: number | null | undefined;
  readonly maxEncodedBytes?: number | null | undefined;
  readonly extra?: HttpRequestContentBoundaryExtra | undefined;
}

/** Common observation shape for decoded HTTP request bodies. */
export type BodyReadObservation<Value> = Omit<HttpSchema.HttpBodyReadObservation, "operation" | "value"> & {
  readonly operation: BodyReadOperationKind;
  readonly value: Value;
};

function bodyReadCodomain(operation: BodyReadOperationKind): string {
  if (operation === "read-body") return "http/request-body-bytes";
  if (operation === "read-text-body") return "http/request-body-text";
  if (operation === "read-json-body") return "http/request-body-json";
  if (operation === "read-form-body") return "http/request-body-form";
  return "http/request-body-multipart";
}

function bodyReadDescription(operation: BodyReadOperationKind): string {
  if (operation === "read-body") return "Read bounded request body bytes from a Node IncomingMessage.";
  if (operation === "read-text-body") return "Read and charset-decode a bounded request body as text.";
  if (operation === "read-json-body") return "Read, charset-decode, and parse a bounded request body as JSON.";
  if (operation === "read-form-body") return "Read and parse an application/x-www-form-urlencoded request body.";
  return "Read and parse a multipart/form-data request body.";
}

export function observeBodyRead<Value>(
  operation: BodyReadOperationKind,
  value: Value,
): BodyReadObservation<Value> {
  return httpBodyReadObservationContract.assert(Object.freeze({
    kind: "metroplat.http.body-read-observation" as const,
    operation,
    value,
  }), "http body read observation") as BodyReadObservation<Value>;
}

/** Construct the protocol-visible boundary material for one HTTP request-body read. */
export function httpRequestContentBoundary(input: HttpRequestContentBoundaryInput): ContractValue {
  const contentEncoding = typeof input.contentEncoding === "string"
    ? input.contentEncoding
    : Array.isArray(input.contentEncoding)
      ? input.contentEncoding.join(",")
      : null;
  return Object.freeze({
    contentType: input.contentType ?? null,
    charset: input.charset ?? null,
    contentEncoding,
    maxBytes: input.maxBytes ?? null,
    maxEncodedBytes: input.maxEncodedBytes ?? null,
    ...(input.extra ?? {}),
  });
}
