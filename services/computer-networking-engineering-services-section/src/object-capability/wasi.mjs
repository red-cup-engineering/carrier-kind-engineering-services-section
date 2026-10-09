/**
 * wasi holds pure WebAssembly System Interface preopen, invocation, and authority-cut reads over capability views.
 * It may import values, schema, records, logic, fixpoint, math, codecs, and sibling capability modules, but it must not import contracts, rendering, search, runtime, integrations, interfaces, or apps.
 */

import { assertNonemptyString as nonempty } from "@red-cup-engineering/json-services-section/assert-nonempty-string";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

import { wasiCutJudgmentSchema, wasiInvocationSchema, wasiPreopenSchema } from "./schemas.mjs";
import {
  attenuatesGrant as grantWithin,
  capabilityView,
  capabilityViewContract,
  invokeCapabilityView,

} from "./index.mjs";

export const wasiCutJudgmentContract = schemaFrom(wasiCutJudgmentSchema);
export const wasiInvocationContract = schemaFrom(wasiInvocationSchema);
export const wasiPreopenContract = schemaFrom(wasiPreopenSchema);

function unique(values, label) {
  const out = [];
  for (const value of values) {
    const normalized = nonempty(value, label);
    if (!out.includes(normalized)) out.push(normalized);
  }
  return Object.freeze(out);
}

function subset(parent, child) {
  return child.every((value) => parent.includes(value));
}

function pathWithin(parent, child) {
  return parent === "/" || child === parent || child.startsWith(`${parent.replace(/\/+$/u, "")}/`);
}

function normalizePath(path) {
  const admitted = nonempty(path, "WASI path");
  if (admitted === "/") return admitted;
  return admitted.replace(/\/+$/u, "");
}

export function wasiLocus(path, right) {
  const admittedPath = normalizePath(path);
  return right === undefined ? `wasi:${admittedPath}` : `wasi:${admittedPath}#${nonempty(right, "WASI right")}`;
}

export const WASI_RIGHTS = Object.freeze(["read", "write", "seek", "tell", "fdstat", "path_open", "path_create", "path_unlink"]);

/** Project a capability view as a WASI preopened handle. */
export function wasiPreopen(input

) {
  const capability = capabilityViewContract.assert(input.capability, "WASI preopen capability");
  const path = normalizePath(input.path);
  const rights = unique(input.rights, "WASI right");
  for (const right of rights) {
    const locus = wasiLocus(path, right);
    if (!grantWithin(capability.grants, locus)) throw new TypeError(`wasiPreopen: ${locus} widens ${capability.grants}`);
  }
  return wasiPreopenContract.assert(Object.freeze({
    kind: "wasi.preopen",
    handle: nonempty(input.handle, "WASI handle"),
    path,
    rights,
    capability,
  }), "WASI preopen");
}

export function preopen(capability, options

 = {}) {
  return wasiPreopen({
    capability,
    handle: options.handle ?? "fd:3",
    path: options.path ?? capability.grants.replace(/^wasi:/u, "").replace(/#.*$/u, ""),
    rights: options.rights ?? ["read"],
  });
}

/** Attenuate a WASI handle by narrowing its path and rights. */
export function attenuateWasiPreopen(parent, path, rights, handle) {
  const admitted = wasiPreopenContract.assert(parent, "parent WASI preopen");
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

export function isAttenuation(parent, child) {
  const p = wasiPreopenContract.assert(parent, "parent WASI attenuation");
  const c = wasiPreopenContract.assert(child, "child WASI attenuation");
  return pathWithin(p.path, c.path) && subset(p.rights, c.rights) && grantWithin(p.capability.grants, c.capability.grants);
}

/** A concrete WASI host call attempted through a handle. */
export function wasiInvocation(input

) {
  return wasiInvocationContract.assert(Object.freeze({
    kind: "wasi.invocation",
    handle: nonempty(input.handle, "WASI invocation handle"),
    operation: nonempty(input.operation, "WASI invocation operation"),
    path: normalizePath(input.path),
    right: nonempty(input.right, "WASI invocation right"),
  }), "WASI invocation");
}

/** Check whether a WASI preopened handle admits an attempted invocation. */
export function wasiCut(preopen, invocation) {
  const admitted = wasiPreopenContract.assert(preopen, "WASI cut preopen");
  const inv = wasiInvocationContract.assert(invocation, "WASI cut invocation");
  const reasons = [];
  if (inv.handle !== admitted.handle) reasons.push("invocation handle must match the preopen handle");
  if (!pathWithin(admitted.path, inv.path)) reasons.push("invocation path must be within the preopened path");
  if (!admitted.rights.includes(inv.right)) reasons.push("invocation right must be included in preopened rights");
  if (!grantWithin(admitted.capability.grants, wasiLocus(inv.path, inv.right))) reasons.push("invocation locus must be admitted by the carried capability view");
  const ok = reasons.length === 0;
  return wasiCutJudgmentContract.assert(Object.freeze({
    kind: ok ? "wasi.cut:witness" : "wasi.cut-obstruction",
    preopen: admitted,
    invocation: inv,
    ok,
    reasons: Object.freeze(reasons),
  }), "WASI cut judgment");
}

export function cut(affordances, target, operation = "call") {
  if ((target).kind === "wasi.preopen") {
    const preopened = wasiPreopenContract.assert(target, "WASI cut target");
    const right = preopened.rights[0] ?? "read";
    return wasiCut(preopened, wasiInvocation({
      handle: preopened.handle,
      operation,
      path: preopened.path,
      right,
    }));
  }
  return invokeCapabilityView(target, affordances);
}

/** Build and cut a WASI invocation in one step. */
export function invokeWasi(preopen, input

) {
  const admitted = wasiPreopenContract.assert(preopen, "WASI invocation preopen");
  return wasiCut(admitted, wasiInvocation({
    handle: admitted.handle,
    operation: input.operation,
    path: input.path,
    right: input.right,
  }));
}
