/**
 * @packageDocumentation
 * RPC adapters for checkout-health: `checkout-health` (projection),
 * `checkout-health-work-intent-admit` (journal-write), `ready-duties-
 * discharge` (gated external effect). Callers pass parameters only.
 * @metroplatSubject monitoring
 */
import { operation, operationHandlerResult, type Operation } from "../../rpc/index.mts";
import { journal } from "../../journal/index.mts";
import {
  agentWorkReadoutCollector, agentWorkDispatchReadoutOfWork, admitStructuredWorkIntent, admitWorkDischarge,
  admitAgencyWorkAllocation,
  type AgencyWorkAllocation, type AgencyWorkAuthority, type AuthorizeProviderDelegation, type ResolveModelCharacter,
} from "../../work/index.mts";
import type { EAVT } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import type { FilesystemBinding } from "../../integrations/filesystem/services/read-write.mts";
import { readCheckoutHealth, handRegisteredOperationsFindings } from "./checks.mts";
import { healthWorkIntent, DEFAULT_ALLOCATION_OFFICE, type HealthWorkChainItem } from "./work-intent.mts";
import { dischargeReadyDuties } from "./discharge.mts";
import {
  checkoutHealthReadContract,
  checkoutHealthWorkIntentRequestContract,
  checkoutHealthWorkIntentSummaryContract,
  readyDutiesDischargeRequestContract,
  readyDutiesDischargeResultContract,
  type CheckoutHealthRead,
  type CheckoutHealthWorkIntentRequest,
  type ReadyDutiesDischargeRequest,
} from "./schema.mts";

/** Process/application configuration for checkout-health adapters. */
export type CheckoutHealthBinding = FilesystemBinding;

/**
 * Optional office-authority wiring for `checkout-health-work-intent-admit`.
 * Monitoring never manufactures office authority itself (it does not invent
 * a default resolver): absent these, the operation admits only the
 * structured-intent tasks and leaves `allocated`/`allocationsAppended` at
 * zero, exactly as it does today with no caller-supplied wiring. A caller
 * that owns the lawful firm pool (the same shape `workCoordinationOptions`
 * accepts at the work boundary) may supply them to admit one
 * `agency-work-allocation` per task through the same canonical
 * `admitAgencyWorkAllocation` gate every other allocator uses.
 */
export interface CheckoutHealthWorkIntentAdmitOptions {
  readonly resolveAgencyWorkAuthority?: (allocation: AgencyWorkAllocation) => AgencyWorkAuthority;
  readonly resolveModelCharacter?: ResolveModelCharacter;
  readonly authorizeProviderDelegation?: AuthorizeProviderDelegation;
}

function inputRecord(input: unknown): Readonly<Record<string, unknown>> {
  return input !== null && typeof input === "object" && !Array.isArray(input) ? input as Readonly<Record<string, unknown>> : {};
}

function resolvedRoot(record: Readonly<Record<string, unknown>>, binding: CheckoutHealthBinding): string | undefined {
  return typeof record["root"] === "string" && record["root"].length > 0 ? record["root"] : binding.packageRoot;
}

function optionalStringArray(value: unknown): readonly string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0)
    ? Object.freeze([...value]) as readonly string[]
    : undefined;
}

/**
 * Folds the whole causal territory (never one calendar date -- a duty
 * admitted on an earlier day must still be found) into the same duty
 * readout/dispatch math every other MetroPlat work-coordination consumer
 * uses.
 */
function collectAgentWorkDispatchReadout(binding: FilesystemBinding, subject: string, date: string) {
  const collector = agentWorkReadoutCollector();
  journal.scanCausalTerritory<undefined>(binding.dataRoot, undefined, (_accumulator: undefined, row: EAVT) => {
    collector.push(row);
    return undefined;
  });
  const workReadout = collector.read({ subject, date, feed: "daily-claim-sessions" });
  return agentWorkDispatchReadoutOfWork(workReadout);
}

function todayIso(binding: CheckoutHealthBinding): string {
  return (binding.now?.() ?? new Date().toISOString()).slice(0, 10);
}

/** The `checkout-health` projection: reads the composed checker findings. */
export function checkoutHealthOperations(binding: CheckoutHealthBinding): readonly Operation[] {
  return Object.freeze([operation({
    verb: "checkout-health",
    relation: "projection",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Read the composed checkout-health checker findings.",
    description: "Domain: { root?, changedOnly?, budgetMs?, hosts?, checkoutBoundUnitsAllow? } (loose; every field optional, no kind tag required, matching module-topology/source-code-policy's own read conventions). Composes the data-custody trio, exact-pin manifests, lockfile registry, import-stratification (via evaluateSourceCodePolicies), builtin-imports (via auditNodeBuiltinImports over scripts/ and src/ .mjs/.mts files), systemd failed units, and checkout-bound units into one bounded read. root defaults to the binding package root; omitted, the checkout-scoped checkers do not run.",
    codomain: checkoutHealthReadContract,
    run: async (input: unknown): Promise<unknown> => {
      const record = inputRecord(input);
      const root = resolvedRoot(record, binding);
      const handRegisteredOperations = await handRegisteredOperationsFindings(root);
      const read = readCheckoutHealth({
        root,
        changedOnly: record["changedOnly"] === true,
        budgetMs: typeof record["budgetMs"] === "number" ? record["budgetMs"] : undefined,
        hosts: optionalStringArray(record["hosts"]),
        checkoutBoundUnitsAllow: optionalStringArray(record["checkoutBoundUnitsAllow"]),
        handRegisteredOperations,
      });
      return operationHandlerResult(read, []);
    },
  })]);
}

/** Admits checkout-health findings as structured intent. Monitoring does not
 * manufacture office authority; a lawful office allocation uses the shared
 * authority resolver at the work boundary. */
export function checkoutHealthWorkIntentAdmitOperations(
  binding: CheckoutHealthBinding,
  options: CheckoutHealthWorkIntentAdmitOptions = {},
): readonly Operation[] {
  const { resolveAgencyWorkAuthority, resolveModelCharacter, authorizeProviderDelegation } = options;
  const canAllocate = resolveAgencyWorkAuthority !== undefined && resolveModelCharacter !== undefined;
  return Object.freeze([operation({
    verb: "checkout-health-work-intent-admit",
    relation: "boundary",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Admit the checkout-health findings as a structured work intent.",
    description: "Domain: { chain, root?, health?, changedOnly?, budgetMs?, hosts?, checkoutBoundUnitsAllow?, intentId?, office?, actor? }. chain is the caller's own admitted endeavor->...->plan cell chain (harness sections carry this parameter; metroplat carries no hardcoded plan). The checkout findings come from exactly one of: root (this operation runs readCheckoutHealth itself, for a caller that holds the checkout), or health (a CheckoutHealthRead a caller already computed and hands over, e.g. checkout-health run on a GitHub Actions runner and admitted here on a production host with no checkout); naming both is refused; naming neither reads host-only (no checkout-scoped checks), as checkout-health does. Groups the findings into task items under the chain's plan cell, and admits the structured intent plus one agency-work-allocation per task.",
    domain: checkoutHealthWorkIntentRequestContract,
    codomain: checkoutHealthWorkIntentSummaryContract,
    effects: {
      class: "journal-write",
      replay: "idempotency-key",
      coordination: "coordination-free",
      deterministic: "unmeasured",
      totality: "unmeasured",
    },
    run: async (input: unknown): Promise<unknown> => {
      const request = checkoutHealthWorkIntentRequestContract.assert(input, "checkout-health-work-intent-admit input") as CheckoutHealthWorkIntentRequest;
      const record = request as unknown as Readonly<Record<string, unknown>>;
      const requestHealth = (request as unknown as { health?: CheckoutHealthRead }).health;
      const rootGiven = typeof record["root"] === "string" && record["root"].length > 0;
      if (rootGiven && requestHealth !== undefined) {
        throw new TypeError("checkout-health-work-intent-admit: root and health are mutually exclusive; name one");
      }
      const root = requestHealth === undefined ? resolvedRoot(record, binding) : undefined;
      const handRegisteredOperations = requestHealth === undefined ? await handRegisteredOperationsFindings(root) : undefined;
      const health = requestHealth ?? readCheckoutHealth({
        root,
        changedOnly: request.changedOnly === true,
        budgetMs: request.budgetMs,
        hosts: request.hosts,
        checkoutBoundUnitsAllow: request.checkoutBoundUnitsAllow,
        ...(handRegisteredOperations === undefined ? {} : { handRegisteredOperations }),
      });
      const nowIso = binding.now?.() ?? new Date().toISOString();
      const intentId = request.intentId ?? `checkout-health-work-intents-${nowIso.slice(0, 10)}`;
      if (health.violations === 0) {
        return operationHandlerResult(checkoutHealthWorkIntentSummaryContract.assert(Object.freeze({
          kind: "metroplat.monitoring.checkout-health.work-intent-summary" as const,
          checked: health.checked,
          violations: 0,
          admitted: 0,
          intentId: null,
          rowsAppended: 0,
          allocated: 0,
          allocationsAppended: 0,
        }), "checkout health work intent summary"), []);
      }
      const plan = healthWorkIntent(health, {
        id: intentId,
        chain: request.chain as readonly HealthWorkChainItem[],
        office: request.office ?? DEFAULT_ALLOCATION_OFFICE,
        duty: request.duty,
        character: request.character,
        officeService: request.officeService,
        work: request.work,
        skill: request.skill,
        root,
      });
      const subject = `structured-work-intent-${intentId}`;
      const admission = admitStructuredWorkIntent(binding, plan.intent, { at: nowIso, subject });
      let allocationsAppended = 0;
      if (canAllocate) {
        for (const allocation of plan.allocations) {
          allocationsAppended += admitAgencyWorkAllocation(binding, allocation, {
            at: nowIso,
            resolveAuthority: resolveAgencyWorkAuthority,
            resolveModelCharacter,
            ...(authorizeProviderDelegation === undefined ? {} : { authorizeProviderDelegation }),
          }).appended;
        }
      }
      const summary = checkoutHealthWorkIntentSummaryContract.assert(Object.freeze({
        kind: "metroplat.monitoring.checkout-health.work-intent-summary" as const,
        checked: health.checked,
        violations: health.violations,
        admitted: plan.tasks.length,
        intentId,
        rowsAppended: admission.appended,
        allocated: canAllocate ? plan.allocations.length : 0,
        allocationsAppended,
      }), "checkout health work intent summary");
      return operationHandlerResult(summary, []);
    },
  })]);
}

/** Reads ready duties off the live agent-work-dispatch readout and routes/applies them. */
export function readyDutiesDischargeOperations(binding: CheckoutHealthBinding): readonly Operation[] {
  return Object.freeze([operation({
    verb: "ready-duties-discharge",
    relation: "boundary",
    inputFormat: "json",
    outputFormat: "json",
    summary: "Run ready bound commands or checkout-health repairs, then discharge only accepted results.",
    description: "Domain: { root, apply?, limit?, scope?, repairKind? }. Reads ready task duties from the causal territory. A duty carrying deterministicExecution runs its admitted JavascriptNodeCommandExecutionRequest@1 before scope repair heuristics; apply:false plans without running, while apply:true performs at most limit attempts and discharges only when its named acceptance gate accepts the command receipt and work-discharge admission accepts the same intent and scope. Other task:exact-deps-* and task:data-custody-* duties use their existing repairs; recognized no-hand scopes remain observations. Command effects and replay behavior remain unmeasured.",
    domain: readyDutiesDischargeRequestContract,
    codomain: readyDutiesDischargeResultContract,
    effects: {
      class: "external",
      replay: "coordinated",
      coordination: "coordination-required",
      deterministic: "unmeasured",
      totality: "partial",
    },
    run: async (input: unknown): Promise<unknown> => {
      const request = readyDutiesDischargeRequestContract.assert(input, "ready-duties-discharge input") as ReadyDutiesDischargeRequest;
      const date = todayIso(binding);
      const readout = collectAgentWorkDispatchReadout(binding, "checkout-health-duty-discharge", date);
      const dischargeReadout = Object.freeze({
        frontier: Object.freeze(readout.frontier.map(({ deterministicExecution, ...duty }) => deterministicExecution === undefined
          ? Object.freeze(duty)
          : Object.freeze({ ...duty, deterministicExecution }))),
      });
      const result = await dischargeReadyDuties({
        readout: dischargeReadout,
        root: request.root,
        binding,
        apply: request.apply === true,
        limit: request.limit,
        scope: request.scope,
        kind: request.repairKind,
        admitDischargeFn: (_binding: unknown, discharge: unknown) => admitWorkDischarge(binding, discharge, { at: date }),
      });
      return operationHandlerResult(readyDutiesDischargeResultContract.assert(result, "ready duties discharge result"), []);
    },
  })]);
}

/** Every checkout-health operation, for callers that mount the whole family at once. */
export function checkoutHealthFamilyOperations(
  binding: CheckoutHealthBinding,
  workIntentAdmitOptions: CheckoutHealthWorkIntentAdmitOptions = {},
): readonly Operation[] {
  return Object.freeze([
    ...checkoutHealthOperations(binding),
    ...checkoutHealthWorkIntentAdmitOperations(binding, workIntentAdmitOptions),
    ...readyDutiesDischargeOperations(binding),
  ]);
}
