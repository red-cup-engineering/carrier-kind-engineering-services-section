/**
 * wasi holds pure WebAssembly System Interface preopen, invocation, and authority-cut reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */
import { schemaFrom } from "../../schema/contract.mts";
import type { FromSchema } from "../../schema/contract.mts";
import { wasiCutJudgmentSchema, wasiInvocationSchema, wasiPreopenSchema } from "../schemas/index.mts";
import {
  capabilityView,
  capabilityViewContract,
  invokeCapabilityView,
  type CapabilityInteraction,
  type CapabilityView,
} from "../index.mts";

export const wasiCutJudgmentContract = schemaFrom(wasiCutJudgmentSchema);
export const wasiInvocationContract = schemaFrom(wasiInvocationSchema);
export const wasiPreopenContract = schemaFrom(wasiPreopenSchema);

function nonempty(value: string, label: string): string {
  if (value.trim().length === 0) throw new TypeError(`${label}: expected a non-empty string`);
  return value;
}

function unique(values: readonly string[], label: string): readonly string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return Object.freeze(out);
}

function resourceWithin(parent: string, child: string): boolean {
  return child === parent || child.startsWith(`${parent}/`);
}

function subset(parent: readonly string[], child: readonly string[]): boolean {
  return child.every((value) => parent.includes(value));
}

function grantWithin(parent: string, child: string): boolean {
  if (parent === child || parent === "*") return true;
  if (parent.endsWith("*")) return child.startsWith(parent.slice(0, -1));
  const parentHash = parent.lastIndexOf("#");
  const childHash = child.lastIndexOf("#");
  if (parentHash > 0 && childHash > 0 && parent.slice(parentHash + 1) === child.slice(childHash + 1)) {
    return resourceWithin(parent.slice(0, parentHash), child.slice(0, childHash));
  }
  return resourceWithin(parent, child) || child.startsWith(`${parent}:`) || child.startsWith(`${parent}#`);
}

function pathWithin(parent: string, child: string): boolean {
  return parent === "/" || child === parent || child.startsWith(`${parent.replace(/\/+$/u, "")}/`);
}

function normalizePath(path: string): string {
  const admitted = nonempty(path, "WASI path");
  if (admitted === "/") return admitted;
  return admitted.replace(/\/+$/u, "");
}

export function wasiLocus(path: string, right?: string): string {
  const admittedPath = normalizePath(path);
  return right === undefined ? `wasi:${admittedPath}` : `wasi:${admittedPath}#${nonempty(right, "WASI right")}`;
}

export const WASI_RIGHTS = Object.freeze(["read", "write", "seek", "tell", "fdstat", "path_open", "path_create", "path_unlink"]);
export type WasiRight = string;
export type WasiRights = readonly string[];

export type WasiPreopen = FromSchema<typeof wasiPreopenSchema> & {
  readonly capability: CapabilityView;
};

export type WasiInvocation = FromSchema<typeof wasiInvocationSchema>;

export type WasiCutJudgment = FromSchema<typeof wasiCutJudgmentSchema> & {
  readonly preopen: WasiPreopen;
  readonly invocation: WasiInvocation;
};

/** Project a capability view as a WASI preopened handle. */
export function wasiPreopen(input: {
  readonly capability: CapabilityView;
  readonly handle: string;
  readonly path: string;
  readonly rights: readonly string[];
}): WasiPreopen {
  const capability = capabilityViewContract.assert(input.capability, "WASI preopen capability") as CapabilityView;
  const path = normalizePath(input.path);
  const rights = unique(input.rights, "WASI right");
  for (const right of rights) {
    const locus = wasiLocus(path, right);
    if (!grantWithin(capability.grants, locus)) throw new TypeError(`wasiPreopen: ${locus} widens ${capability.grants}`);
  }
  return wasiPreopenContract.assert(Object.freeze({
    kind: "wasi.preopen" as const,
    handle: nonempty(input.handle, "WASI handle"),
    path,
    rights,
    capability,
  }), "WASI preopen") as WasiPreopen;
}

export function preopen(capability: CapabilityView, options: {
  readonly handle?: string;
  readonly path?: string;
  readonly rights?: readonly string[];
} = {}): WasiPreopen {
  return wasiPreopen({
    capability,
    handle: options.handle ?? "fd:3",
    path: options.path ?? capability.grants.replace(/^wasi:/u, "").replace(/#.*$/u, ""),
    rights: options.rights ?? ["read"],
  });
}

/** Attenuate a WASI handle by narrowing its path and rights. */
export function attenuateWasiPreopen(parent: WasiPreopen, path: string, rights: readonly string[], handle?: string): WasiPreopen {
  const admitted = wasiPreopenContract.assert(parent, "parent WASI preopen") as WasiPreopen;
  const childPath = normalizePath(path);
  const childRights = unique(rights, "child WASI right");
  if (!pathWithin(admitted.path, childPath)) throw new TypeError(`attenuateWasiPreopen: ${childPath} widens ${admitted.path}`);
  if (!subset(admitted.rights, childRights)) throw new TypeError("attenuateWasiPreopen: child rights widen parent rights");
  const grant = childRights.length === 1 ? wasiLocus(childPath, childRights[0]) : wasiLocus(childPath);
  const capability = capabilityView({
    holder: admitted.capability.holder,
    grants: grant,
    parent: admitted.capability.id,
  });
  return wasiPreopen({
    capability,
    handle: handle ?? admitted.handle,
    path: childPath,
    rights: childRights,
  });
}

export function isAttenuation(parent: WasiPreopen, child: WasiPreopen): boolean {
  const p = wasiPreopenContract.assert(parent, "parent WASI attenuation") as WasiPreopen;
  const c = wasiPreopenContract.assert(child, "child WASI attenuation") as WasiPreopen;
  return pathWithin(p.path, c.path) && subset(p.rights, c.rights) && grantWithin(p.capability.grants, c.capability.grants);
}

/** A concrete WASI host call attempted through a handle. */
export function wasiInvocation(input: {
  readonly handle: string;
  readonly operation: string;
  readonly path: string;
  readonly right: string;
}): WasiInvocation {
  return wasiInvocationContract.assert(Object.freeze({
    kind: "wasi.invocation" as const,
    handle: nonempty(input.handle, "WASI invocation handle"),
    operation: nonempty(input.operation, "WASI invocation operation"),
    path: normalizePath(input.path),
    right: nonempty(input.right, "WASI invocation right"),
  }), "WASI invocation") as WasiInvocation;
}

/** Check whether a WASI preopened handle admits an attempted invocation. */
export function wasiCut(preopen: WasiPreopen, invocation: WasiInvocation): WasiCutJudgment {
  const admitted = wasiPreopenContract.assert(preopen, "WASI cut preopen") as WasiPreopen;
  const inv = wasiInvocationContract.assert(invocation, "WASI cut invocation") as WasiInvocation;
  const reasons: string[] = [];
  if (inv.handle !== admitted.handle) reasons.push("invocation handle must match the preopen handle");
  if (!pathWithin(admitted.path, inv.path)) reasons.push("invocation path must be within the preopened path");
  if (!admitted.rights.includes(inv.right)) reasons.push("invocation right must be included in preopened rights");
  if (!grantWithin(admitted.capability.grants, wasiLocus(inv.path, inv.right))) reasons.push("invocation locus must be admitted by the carried capability view");
  const ok = reasons.length === 0;
  return wasiCutJudgmentContract.assert(Object.freeze({
    kind: ok ? "wasi.cut:witness" as const : "wasi.cut-obstruction" as const,
    preopen: admitted,
    invocation: inv,
    ok,
    reasons: Object.freeze(reasons),
  }), "WASI cut judgment") as WasiCutJudgment;
}

export function cut(affordances: readonly string[], target: CapabilityView | WasiPreopen, operation = "call"): WasiCutJudgment | CapabilityInteraction {
  if ((target as { readonly kind?: string }).kind === "wasi.preopen") {
    const preopened = wasiPreopenContract.assert(target, "WASI cut target") as WasiPreopen;
    const right = preopened.rights[0] ?? "read";
    return wasiCut(preopened, wasiInvocation({
      handle: preopened.handle,
      operation,
      path: preopened.path,
      right,
    }));
  }
  return invokeCapabilityView(target as CapabilityView, affordances);
}

/** Build and cut a WASI invocation in one step. */
export function invokeWasi(preopen: WasiPreopen, input: {
  readonly operation: string;
  readonly path: string;
  readonly right: string;
}): WasiCutJudgment {
  const admitted = wasiPreopenContract.assert(preopen, "WASI invocation preopen") as WasiPreopen;
  return wasiCut(admitted, wasiInvocation({
    handle: admitted.handle,
    operation: input.operation,
    path: input.path,
    right: input.right,
  }));
}
