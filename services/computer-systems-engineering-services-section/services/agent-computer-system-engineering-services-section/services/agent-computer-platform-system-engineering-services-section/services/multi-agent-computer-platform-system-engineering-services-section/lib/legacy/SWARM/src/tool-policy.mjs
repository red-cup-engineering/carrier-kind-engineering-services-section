
import { dispatchAdmissible } from "./delegation.mjs";

const TOOL_POLICIES = {
  "memory.recall": {
    known: true,
    capability: "tool.memory.recall",
    scope: "read",
    costClass: "attention-context",
    sandbox: "in-process-readonly-memory",
    traceRequirement: "message-memory-and-recalled-records",
    authorization: "built-in-read-tool",
    requiresLeaderAuthorization: false,
  },
  "plan.derive": {
    known: true,
    capability: "tool.plan.derive",
    scope: "compute",
    costClass: "local-planning",
    sandbox: "in-process-deterministic",
    traceRequirement: "message-memory-and-plan-term",
    authorization: "built-in-compute-tool",
    requiresLeaderAuthorization: false,
  },
  "memory.write": {
    known: true,
    capability: "tool.memory.write",
    scope: "write",
    costClass: "agent-memory",
    sandbox: "agent-memory-namespace",
    traceRequirement: "message-memory-plan-term-and-produced-memory-term",
    authorization: "agent-owned-memory-write",
    requiresLeaderAuthorization: false,
  },
  "memory.embed": {
    known: true,
    capability: "tool.memory.embed",
    scope: "read",
    costClass: "attention-context",
    sandbox: "agent-memory-namespace",
    traceRequirement: "message-memory-and-embedding-cell",
    authorization: "built-in-memory-tool",
    requiresLeaderAuthorization: false,
  },
  "memory.summarize": {
    known: true,
    capability: "tool.memory.summarize",
    scope: "compute",
    costClass: "local-planning",
    sandbox: "in-process-deterministic",
    traceRequirement: "message-memory-and-compaction-cell",
    authorization: "built-in-memory-tool",
    requiresLeaderAuthorization: false,
  },
  "files.read": {
    known: true,
    capability: "tool.files.read",
    scope: "read",
    costClass: "repository-inspection",
    sandbox: "workspace-readonly",
    traceRequirement: "message-delegation-and-read-paths",
    authorization: "read-report-tool",
    requiresLeaderAuthorization: false,
  },
  "files.write": {
    known: true,
    capability: "tool.files.write",
    scope: "write",
    costClass: "repository-mutation",
    sandbox: "leader-mediated-worktree",
    traceRequirement: "message-leader-delegation-worktree-and-patch",
    authorization: "leader-delegated-write-tool",
    requiresLeaderAuthorization: true,
  },
  "network.fetch": {
    known: true,
    capability: "tool.network.fetch",
    scope: "read",
    costClass: "network-egress",
    sandbox: "leader-mediated-network-egress",
    traceRequirement: "message-leader-delegation-url-and-response-digest",
    authorization: "leader-delegated-network-tool",
    requiresLeaderAuthorization: true,
  },
  "package.install": {
    known: true,
    capability: "tool.package.install",
    scope: "write",
    costClass: "dependency-mutation",
    sandbox: "leader-mediated-package-worktree",
    traceRequirement: "message-leader-delegation-lockfile-and-install-log",
    authorization: "leader-delegated-package-tool",
    requiresLeaderAuthorization: true,
  },
  "subprocess.run": {
    known: true,
    capability: "tool.subprocess.run",
    scope: "compute",
    costClass: "local-process",
    sandbox: "leader-mediated-process-sandbox",
    traceRequirement: "message-leader-delegation-command-and-exit-status",
    authorization: "leader-delegated-subprocess-tool",
    requiresLeaderAuthorization: true,
  },
  "worktree.create": {
    known: true,
    capability: "tool.worktree.create",
    scope: "write",
    costClass: "worktree-isolation",
    sandbox: "isolated-git-worktree",
    traceRequirement: "message-leader-delegation-base-commit-worktree-and-cleanup",
    authorization: "leader-delegated-worktree-tool",
    requiresLeaderAuthorization: true,
  },
};

const DEFAULT_POLICY = {
  known: false,
  capability: "tool.unknown",
  scope: "compute",
  costClass: "unknown-tool",
  sandbox: "unclassified",
  traceRequirement: "explicit-tool-ledger-row",
  authorization: "unclassified-tool",
  requiresLeaderAuthorization: true,
};

export function canonicalToolName(tool) {
  const name = String(tool ?? "");
  if (TOOL_POLICIES[name]) return name;
  if (name.startsWith("tool.") && TOOL_POLICIES[name.slice(5)]) return name.slice(5);
  return name;
}

export function toolPolicyFor(tool) {
  const requestedTool = String(tool ?? "");
  const name = canonicalToolName(requestedTool);
  const unknownCapability = requestedTool
    ? (requestedTool.startsWith("tool.") ? requestedTool : `tool.${requestedTool}`)
    : DEFAULT_POLICY.capability;
  return {
    tool: name,
    requestedTool,
    ...(TOOL_POLICIES[name] ?? {
      ...DEFAULT_POLICY,
      capability: unknownCapability,
    }),
  };
}

// chainAuthorization(context, policy) — the SCOPE-BOUNDED DELEGATION CHAIN authority path, the encoding
// that actually carries the theorem (delegation.mjs §1.4: an action issued through the chain is
// admissible iff the chain is live AND the action lies within its meet-narrowed scope-bound; the
// captain answers for it — H⁰-invariant accountability). This REPLACES the old load-bearing STRING gate
// (`delegatedBy === "leader" && !!delegationDecisionPath`, which proved nothing about scope, liveness,
// or who is accountable) as the authority-carrying path. When the caller supplies a `delegationChain`,
// the dispatch is settled by `dispatchAdmissible(chain, action)`:
//   • "potential"   — live and in scope → admitted, with the accountable captain named (the witness).
//   • "active"   — revoked upstream, or outside the scope-bound → structurally invalid, refused.
//   • "absurd" — no action supplied → scope-bound not yet settled, refused (undecided is not admit).
// The action checked against the chain's scope is the policy capability (e.g. "tool.network.fetch"),
// overridable by context.scopeAction. Returns null when no chain is supplied, so the legacy string
// witness still serves callers that have not adopted the chain yet (additive, not a hard cutover).
function chainAuthorization(context, policy) {
  const chain = context.delegationChain ?? context.authorization?.delegationChain;
  if (!chain) return null;
  const scopeAction = context.scopeAction ?? policy.capability ?? policy.tool;
  return dispatchAdmissible(chain, scopeAction);
}

export function toolAdmissionFor(tool, context = {}) {
  const policy = toolPolicyFor(tool);
  const delegatedBy = context.delegatedBy ?? context.authorization?.delegatedBy ?? "";
  const delegationDecisionPath = context.delegationDecisionPath ?? context.authorization?.delegationDecisionPath ?? "";
  // the scope-bounded chain is the theorem-carrying authority; the string witness is the legacy
  // fallback retained so existing callers (which pass delegatedBy/delegationDecisionPath, not a chain)
  // still admit. A chain that settles "potential" authorizes; the string witness authorizes the rest.
  const chainAdmission = chainAuthorization(context, policy);
  const chainAuthorized = chainAdmission?.value === "potential";
  const accountable = chainAdmission?.accountable;
  const leaderAuthorized = chainAuthorized
    || context.leaderAuthorized === true
    || (delegatedBy === "leader" && !!delegationDecisionPath);

  const witnessFields = {
    delegatedBy,
    delegationDecisionPath,
    leaderAuthorized,
    chainValue: chainAdmission?.value ?? "",
    accountable: accountable ?? "",
  };

  if (!policy.known) {
    return { policy, admitted: false, reason: "unknown-tool-policy", ...witnessFields };
  }

  if (!policy.requiresLeaderAuthorization) {
    return { policy, admitted: true, reason: "policy-does-not-require-leader-authorization", ...witnessFields };
  }

  if (chainAuthorized) {
    return { policy, admitted: true, reason: "delegation-chain-witness", ...witnessFields };
  }

  if (leaderAuthorized) {
    return { policy, admitted: true, reason: "leader-delegation-witness", ...witnessFields };
  }

  // a chain that was supplied but did NOT settle to T (revoked / out-of-scope / unsettled) names WHY.
  const reason = chainAdmission
    ? (chainAdmission.value === "absurd" ? "delegation-chain-scope-unsettled" : "delegation-chain-outside-scope-or-revoked")
    : "leader-delegation-required";
  return { policy, admitted: false, reason, ...witnessFields };
}

export function listToolPolicies() {
  return Object.keys(TOOL_POLICIES).sort().map((tool) => toolPolicyFor(tool));
}
