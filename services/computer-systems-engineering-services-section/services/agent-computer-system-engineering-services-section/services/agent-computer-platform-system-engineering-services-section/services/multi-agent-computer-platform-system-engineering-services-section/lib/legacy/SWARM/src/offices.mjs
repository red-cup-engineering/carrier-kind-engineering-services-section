import { charge, chargeValue } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

import { chuSpace, extension, valueAt } from "@red-cup-engineering/metrologic/articulation/predicating/positing/logic/linear-logic-chu";

export const officeDefinitions = {
  leader: {
    office: "leader",
    title: "Leader",
    duties: ["hold mission intent", "authorize campaigns", "request governance review"],
    capabilities: [
      "work.mission.create",
      "work.campaign.create",
      "work.project.create",
      "work.workitem.create",
      "work.task.create",
      "plan.derive",
      "governance.request",
      "work.dispatch.request",
      "work.execution.start.request",
      "work.execution.complete.request",
      "work.review.request",
      "work.plan-composition.witness",
      "work.safety-envelope.report",
      "leader-action.request",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
  orchestrator: {
    office: "orchestrator",
    title: "Orchestrator",
    duties: ["turn missions into ordered work", "dispatch work by capability", "surface blockers"],
    capabilities: [
      "work.project.create",
      "work.workitem.create",
      "work.dispatch",
      "work.execution.start",
      "work.execution.complete",
      "ledger.report",
      "plan.derive",
      "operations.tick",
      "consensus.merge",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
  coordinator: {
    office: "coordinator",
    title: "Coordinator",
    duties: ["maintain project state", "track dependencies", "coordinate status"],
    capabilities: [
      "work.project.create",
      "work.workitem.create",
      "work.task.create",
      "work.status.update",
      "work.dependency.update",
      "work.execution.start",
      "work.execution.complete",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
  researcher: {
    office: "researcher",
    title: "Researcher",
    duties: ["recall evidence", "synthesize findings", "record research residue"],
    capabilities: [
      "memory.recall",
      "research.synthesize",
      "work.workitem.update",
      "work.execution.start",
      "work.execution.complete",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
  programmer: {
    office: "programmer",
    title: "Programmer",
    duties: ["inspect code", "implement scoped changes", "run verification"],
    capabilities: [
      "tool.files.read",
      "tool.files.write",
      "tests.run",
      "work.workitem.update",
      "work.execution.start",
      "work.execution.complete",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
  governance: {
    office: "governance",
    title: "Governance",
    duties: ["admit bounded actions", "maintain policy", "audit authority"],
    capabilities: [
      "governance.policy.create",
      "governance.admit",
      "governance.audit",
      "ledger.report",
      "office.assign",
      "work.execution.start",
      "work.execution.complete",
      "work.review",
      "work.status.report",
      "coordination.report",
      "operations.report",
      "office.report",
    ],
  },
};

export function officeNameFor(agent) {
  return agent.office ?? (officeDefinitions[agent.name] ? agent.name : "worker");
}

export function officeFor(agent) {
  const name = officeNameFor(agent);
  return officeDefinitions[name] ?? {
    office: name,
    title: name,
    duties: [],
    capabilities: [],
  };
}

export function agentCapabilities(agent) {
  return [...new Set([...(officeFor(agent).capabilities ?? []), ...(agent.capabilities ?? [])])];
}

export function can(agent, capability) {
  const capabilities = agentCapabilities(agent);
  return capabilities.includes("*") || capabilities.includes(capability);
}

// The office×capability relation as a Chu space over the bilattice: a cell is t iff the office lists
// the capability (or holds the "*" wildcard), else f. The "*" wildcard is the top costate (a row
// that is t on every state), so it is not itself a column. `can` reads a point's row; the transpose
// (officeForSkill) reads a capability's column — the same matrix, both ways.
export function officeCapabilityChu(extraOffices = {}) {
  const defs = { ...officeDefinitions, ...extraOffices };
  const points = Object.keys(defs);
  const has = new Map(points.map((office) => [office, new Set(defs[office].capabilities ?? [])]));
  const states = [...new Set(points.flatMap((office) => [...has.get(office)]))].filter((cap) => cap !== "*");
  return chuSpace(points, states, (office, capability) => {
    const held = has.get(office);
    return charge(chargeValue(held && (held.has("*") || held.has(capability)) ? "potential" : "active"));
  });
}

// row read: does this office hold this capability? (the point's costate at one state)
export function holdsCapability(officeName, capability) {
  return valueAt(officeCapabilityChu(), officeName, capability).name === "potential";
}

// column read (the transpose): the offices whose row is t on this capability, in table order.
export function officesWithCapability(capability) {
  return extension(officeCapabilityChu(), capability);
}

// officeForSkill is exactly the transpose read — the first office in the capability's column
// extension. (Lives here, with its dual `can`; re-exported from readiness.mjs for existing callers.)
export function officeForSkill(skill) {
  if (!skill) return "";
  return officesWithCapability(skill)[0] ?? "";
}
