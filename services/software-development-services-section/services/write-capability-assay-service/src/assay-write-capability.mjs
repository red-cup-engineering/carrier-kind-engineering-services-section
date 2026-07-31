import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function digest(value) { return `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`; }
function strings(value) { return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0) && new Set(value).size === value.length; }
function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

export function assayStandingWriteCapability(material) {
  if (!object(material)) throw new TypeError("finite write-capability material is required");
  const { invocationAgent, authorization, targetScope, rootScopes, dispatch, office } = material;
  if (!object(authorization)) throw new TypeError("write-capability material lacks an exact authorization");
  if (!strings(authorization.writeRoots)) throw new TypeError("write authorization lacks duplicate-free write roots");
  for (const name of ["authorityRoot", "targetSettlementRoot", "dispatch", "task", "office", "dispatchDigest"]) if (typeof authorization[name] !== "string" || authorization[name].length === 0) throw new TypeError(`write authorization lacks ${name}`);
  if (authorization.office !== invocationAgent) throw new TypeError("write authorization office differs from the invoked office");
  if (!object(targetScope) || targetScope.inside !== true || !Array.isArray(targetScope.boundaries) || targetScope.boundaries.length !== 0 || targetScope.subject !== authorization.targetSettlementRoot) throw new TypeError("target settlement is outside observed scope or crosses a sovereign boundary");
  if (!Array.isArray(rootScopes) || rootScopes.length !== authorization.writeRoots.length || rootScopes.some((scope, index) => !object(scope) || scope.inside !== true || !Array.isArray(scope.boundaries) || scope.boundaries.length !== 0 || scope.subject !== authorization.writeRoots[index])) throw new TypeError("a write root is outside the observed target settlement or crosses a sovereign boundary");
  if (!object(dispatch) || dispatch.id !== authorization.dispatch || dispatch.task !== authorization.task || dispatch.office !== authorization.office) throw new TypeError("write authorization names no exact seated target dispatch");
  if (!object(office) || office.id !== authorization.office) throw new TypeError("write authorization office seat has the wrong identity");
  const dispatchDigest = digest(dispatch);
  if (dispatchDigest !== authorization.dispatchDigest) throw new TypeError("write authorization dispatch bytes drifted");
  return Object.freeze({
    authorityRoot: targetScope.authorityRoot,
    targetSettlementRoot: targetScope.subject,
    writeRoots: rootScopes.map((scope) => scope.subject),
    dispatch: authorization.dispatch,
    task: authorization.task,
    office: authorization.office,
    officeDigest: digest(office),
    dispatchDigest,
    scopeDigest: digest({ target: targetScope.snapshot, roots: rootScopes.map((scope) => scope.snapshot) }),
  });
}
