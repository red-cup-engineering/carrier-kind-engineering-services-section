import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";

const input = schemaFrom({
  $id: "muse/assigned-work-step/input",
  title: "AssignedWorkStep",
  type: "object",
  required: ["cell"],
  properties: {
    cell: { type: "string", minLength: 1 },
    maxTurns: { type: "integer", minimum: 1, maximum: 8 },
  },
  additionalProperties: false,
});
const output = schemaFrom({
  $id: "muse/assigned-work-step/output",
  title: "AssignedWorkStepResult",
  type: "object",
  required: ["kind"],
  properties: { kind: { type: "string" } },
});

/** muse-assist adds no second work ledger or worker loop: this is the admitted-work
 * step operation over MetroPlat's already assigned worker frontier. */
export function museAssistOperations(binding) {
  return Object.freeze([
    operation({
      verb: "muse-assigned-work-step",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Advance one exact work cell already assigned to this authenticated worker; only the work ledger can settle it.",
      description: "Input is { cell, maxTurns? }. Worker identity comes from the authenticated invocation subject and must be the server-configured worker principal. This operation does not assign work or accept a completion result.",
      domain: input,
      codomain: output,
      relation: "boundary",
      effects: { class: "external", replay: "coordinated", coordination: "coordination-required", deterministic: "unmeasured", totality: "partial" },
      run: (request, _args, context) => {
        if (typeof binding?.runAssignedAgentWork !== "function") {
          throw new TypeError("muse-assist work execution is available only from the MetroPlat server runtime");
        }
        const workerId = context?.invocation?.subject;
        if (typeof workerId !== "string" || workerId.length === 0) throw new TypeError("muse-assist work requires an authenticated invocation subject");
        return binding.runAssignedAgentWork({ workerId, cell: request.cell, ...(request.maxTurns === undefined ? {} : { maxTurns: request.maxTurns }) }, context);
      },
    }),
  ]);
}
