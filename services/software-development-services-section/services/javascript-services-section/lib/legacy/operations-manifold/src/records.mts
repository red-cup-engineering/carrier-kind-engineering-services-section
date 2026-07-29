import { createHash } from "node:crypto";

import { canonical, isJsonRecord, parseJson, requireJsonValue, type JsonValue } from "@emsenn/relating/writing";

export type HookPayloadParams = Readonly<{
  event?: string | undefined;
  hook_event_name?: string | undefined;
  session_id?: string | undefined;
  transcript_path?: string | undefined;
  cwd?: string | undefined;
  payload?: string | undefined;
  stdin?: string | undefined;
}>;

export type BoundaryParams = Readonly<Record<string, unknown>>;
export type BoundaryScalarParamValue = string | number | undefined;
export type BoundaryListParamValue = string | readonly string[] | undefined;

function boundaryRawParam(params: BoundaryParams, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined) return value;
  }
  return undefined;
}

export function boundaryTextParam(params: BoundaryParams, ...keys: readonly string[]): string | undefined {
  const value = boundaryRawParam(params, keys);
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function boundaryScalarParam(params: BoundaryParams, ...keys: readonly string[]): BoundaryScalarParamValue {
  const value = boundaryRawParam(params, keys);
  return typeof value === "string" || (typeof value === "number" && Number.isFinite(value)) ? value : undefined;
}

export function boundaryListParam(params: BoundaryParams, ...keys: readonly string[]): BoundaryListParamValue {
  const value = boundaryRawParam(params, keys);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(String));
  return undefined;
}

export function optionalText(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function requireText(value: string | number | undefined, label: string): string {
  const text = optionalText(value);
  if (text === null) throw new TypeError(`${label} is required`);
  return text;
}

export function stringList(value: string | readonly string[] | undefined): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (Array.isArray(value)) return Object.freeze(value.map(String).map((item) => item.trim()).filter((item) => item !== ""));
  return Object.freeze(String(value).split(/\r?\n|,/u).map((item) => item.trim()).filter((item) => item !== ""));
}

export function hash(value: unknown): string {
  return createHash("sha256").update(canonical(jsonValue(value)), "utf8").digest("hex");
}

export function jsonValue(value: unknown): JsonValue {
  return requireJsonValue(value, "value");
}

export function isRecord(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isString(value: JsonValue): value is string {
  return typeof value === "string";
}

export function stringOf(value: JsonValue): string | null {
  return typeof value === "string" ? value : null;
}

export function stringField(record: Readonly<Record<string, unknown>> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function recordOf(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

export function notNull<T>(value: T | null): value is T {
  return value !== null;
}

export function numberField(record: Readonly<Record<string, unknown>> | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function generatedAtField(record: Readonly<Record<string, unknown>> | null): string | undefined {
  return stringField(record, "generatedAt") ?? undefined;
}

export function generatedAtRecord(value: unknown): { readonly generatedAt: string } | Record<never, never> {
  const generatedAt = generatedAtField(recordOf(value));
  return generatedAt === undefined ? {} : { generatedAt };
}

export function clamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
}

export function boundedInteger(
  value: string | number | undefined,
  options: Readonly<{ min?: number; max?: number; fallback: number }>,
): number {
  const min = options.min ?? 0;
  const parsed = value === undefined ? Number.NaN : typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min ? Math.min(options.max ?? parsed, parsed) : options.fallback;
}

export function maxIso(left: string, right: string): string {
  return left.localeCompare(right) >= 0 ? left : right;
}

export function pushUnique(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value);
}

export function hookPayload(params: HookPayloadParams): Readonly<Record<string, JsonValue>> {
  const raw = optionalText(params.payload ?? params.stdin);
  if (raw !== null) {
    try {
      const parsed = parseJson(raw);
      if (isJsonRecord(parsed)) return parsed;
      return Object.freeze({ text: raw });
    } catch {
      return Object.freeze({ text: raw });
    }
  }
  return Object.freeze(Object.fromEntries(
    Object.entries({
      hook_event_name: params.hook_event_name ?? params.event,
      session_id: params.session_id,
      transcript_path: params.transcript_path,
      cwd: params.cwd,
    }).filter(([, value]) => value !== undefined),
  )) as Readonly<Record<string, JsonValue>>;
}

export function slug(value: string, fallback = "item", max = 72): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  return (normalized === "" ? fallback : normalized).slice(0, max);
}
