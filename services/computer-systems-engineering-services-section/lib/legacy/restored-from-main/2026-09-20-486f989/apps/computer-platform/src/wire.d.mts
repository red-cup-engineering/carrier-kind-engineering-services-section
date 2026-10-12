import type { OperationRefusal, Result } from "./operations.mjs";
import type { Relation, TypedOperationRequest } from "@red-cup-engineering/computer-data-engine";

export type WireCodec = Readonly<{ name: string; decode(document: string): unknown; encode(value: unknown): string }>;
export type WireCodecCatalog = Readonly<{ resolve(name: string): WireCodec | undefined }>;
export type OperationRequest = NonNullable<TypedOperationRequest>;
export type OperationOutcome = Readonly<{ requestId: string; outputCodec?: string; result: Result<unknown, OperationRefusal> }>;

export function defineWireCodec(definition: WireCodec): WireCodec;
export function wireCodecCatalog(codecs: readonly WireCodec[]): WireCodecCatalog;
export const jsonWireCodec: WireCodec;
export function relationalFieldWireCodec(declarations: readonly Relation[]): WireCodec;
export function encodeOperationRequest(request: Omit<OperationRequest, "version" | "kind">): string;
export function decodeOperationRequest(document: string): OperationRequest;
export function encodeOperationOutcome(request: Pick<OperationRequest, "requestId" | "outputCodec">, result: Result<unknown, OperationRefusal>, codecs: WireCodecCatalog): string;
export function decodeOperationOutcome(document: string, codecs: WireCodecCatalog): OperationOutcome;
