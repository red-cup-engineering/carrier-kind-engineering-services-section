/**
 * @packageDocumentation
 * The Analyze-to-Plan edge of the checkout-health MAPE-K loop: groups a
 * {@link CheckoutHealthRead}'s findings into structured-work-intent task
 * items and one agency-work-allocation payload per task, in the exact
 * cell-id scheme the prior harness-resident admitter used (so existing
 * duties dedupe). Pure: callers admit the returned payloads through
 * metroplat's own `admitStructuredWorkIntent`/`admitAgencyWorkAllocation`.
 * @metroplatSubject monitoring
 */
import { basename, dirname, relative } from "node:path";
import type { CheckoutHealthFinding, CheckoutHealthRead } from "./schema.mts";

/** Default office an admitted health-work task is allocated to, absent an explicit `office`. */
export const DEFAULT_ALLOCATION_OFFICE = "executive-officer-to-the-leader";

export interface HealthWorkChainItem {
  readonly cell: string;
  readonly parent?: string;
  readonly text: string;
}

export interface HealthWorkTaskItem {
  readonly cell: string;
  readonly parent: string;
  readonly text: string;
  readonly evidence: readonly string[];
  readonly provenance: readonly Readonly<{ source: string }>[];
  /** Canonical work and skill this task satisfies, when the caller declared
   * one (required for a later `agency-work-allocation` over this scope to
   * satisfy the canonical duty's declared-work/skill match). */
  readonly work?: string;
  readonly skill?: string;
}

export interface HealthWorkIntentOptions {
  readonly id: string;
  /** Ordered endeavor -> ... -> plan chain; the last item's cell is every task's parent. */
  readonly chain: readonly HealthWorkChainItem[];
  readonly office?: string | undefined;
  readonly duty: string;
  readonly character: Readonly<{ model: string; id: string; capabilities: readonly string[] }>;
  readonly officeService: Readonly<{ id: string; requiredCapabilities: readonly string[] }>;
  readonly producerId?: string | undefined;
  /** When given, task text carries a `(path: <relpath>)` suffix so a discharge driver can resolve a filesystem location without rescanning the tree. */
  readonly root?: string | undefined;
  /** Canonical work/skill every generated task declares, so a caller that also
   * admits the returned allocations satisfies `admitAgencyWorkAllocation`'s
   * declared-work/skill match. Monitoring never invents these; a caller that
   * only wants the structured intent (no allocation) may omit both. */
  readonly work?: string | undefined;
  readonly skill?: string | undefined;
}

export interface HealthWorkIntentResult {
  readonly intent: Readonly<Record<string, unknown>>;
  readonly allocations: readonly Readonly<Record<string, unknown>>[];
  readonly tasks: readonly HealthWorkTaskItem[];
}

/** Deterministic cell slug: lowercase, non `[a-z0-9-]` runs collapsed to one `-`, edges trimmed. */
export function slugify(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

/** Deterministic task cell id from a finding kind and subject, e.g. `task:exact-deps-<package-name>`. */
export function taskIdFor(kind: string, subject: string): string {
  return `task:${slugify(kind)}-${slugify(subject)}`;
}

/** Deterministic `metroplat.work.agency-work-allocation` id for one task cell. */
export function allocationIdFor(taskCell: string): string {
  return `allocation-${taskCell}`;
}

/** One bounded office-service allocation payload for a declared Character. */
export function buildTaskAllocation({
  taskCell,
  subject,
  office = DEFAULT_ALLOCATION_OFFICE,
  duty,
  character,
  officeService,
}: Readonly<{ taskCell: string; subject: string; office?: string | undefined; duty: string; character: Readonly<{ model: string; id: string; capabilities: readonly string[] }>; officeService: Readonly<{ id: string; requiredCapabilities: readonly string[] }> }>): Readonly<Record<string, unknown>> {
  return Object.freeze({
    kind: "metroplat.work.agency-work-allocation",
    id: allocationIdFor(taskCell),
    subject,
    office: Object.freeze({ id: office }),
    duty,
    character: Object.freeze({ model: character.model, id: character.id, capabilities: Object.freeze([...character.capabilities]) }),
    officeService: Object.freeze({ id: officeService.id, requiredCapabilities: Object.freeze([...officeService.requiredCapabilities]) }),
    allocation: Object.freeze({ scope: taskCell }),
  });
}

const SOURCE_CATALOG: Readonly<Record<string, Readonly<{ id: string; kind: string; locator: string }>>> = Object.freeze({
  "roadmap-chain": Object.freeze({ id: "roadmap-chain", kind: "prior-admission", locator: "the caller's own admitted chain" }),
  "checker:data-custody": Object.freeze({ id: "checker:data-custody", kind: "deterministic-checker", locator: "@red-cup-engineering/data-custody-directory-service/check-data-custody-directory#checkDataCustodyDirectory" }),
  "checker:exact-deps": Object.freeze({ id: "checker:exact-deps", kind: "deterministic-checker", locator: "@red-cup-engineering/npm-workspace-publication-service#dependencySpecificationViolations" }),
  "checker:lockfile-registry": Object.freeze({ id: "checker:lockfile-registry", kind: "deterministic-checker", locator: "metroplat/monitoring/checkout-health/checks.mts#houseScopedLockfileRegistryViolations" }),
  "checker:import-stratification": Object.freeze({ id: "checker:import-stratification", kind: "deterministic-checker", locator: "metroplat/monitoring/source-code/policy.mts#evaluateSourceCodePolicies" }),
  "checker:systemd-unit-inventory": Object.freeze({ id: "checker:systemd-unit-inventory", kind: "deterministic-checker", locator: "@red-cup-engineering/systemd-unit-inventory-observation-service#observeUnitInventory" }),
  "checker:checkout-bound-units": Object.freeze({ id: "checker:checkout-bound-units", kind: "deterministic-checker", locator: "@red-cup-engineering/systemd-unit-inventory-observation-service/checkout-bound-units#observeSetOfCheckoutBoundUnits" }),
});

function subjectDirectoryForFinding(finding: CheckoutHealthFinding): string {
  return finding.check === "data-custody" || finding.check === "import-stratification" ? finding.path : dirname(finding.path);
}

function subjectForFinding(finding: CheckoutHealthFinding): string {
  return basename(subjectDirectoryForFinding(finding));
}

/** One human-readable evidence line for one checker finding, in the checker's own vocabulary. */
export function formatFindingLine(finding: CheckoutHealthFinding): string {
  switch (finding.check) {
    case "exact-deps":
      return `exact-deps: ${finding.field ?? "?"}:${finding.name ?? "?"} (${finding.reason}) at ${finding.path}`;
    case "lockfile-registry":
      return `lockfile-registry: ${finding.name ?? "?"} resolved ${finding.resolved ?? "?"} (${finding.reason}) at ${finding.path}`;
    case "data-custody":
      return finding.offenders
        ? `data-custody: offenders=[${finding.offenders.join(", ")}] at ${finding.path}`
        : `data-custody: ${finding.reason ?? "nonconformant"} at ${finding.path}`;
    case "import-stratification":
      return `import-stratification: ${finding.from} -> ${finding.to} (${finding.importerStratum} may not import ${finding.targetStratum}) at ${finding.path}`;
    default:
      return `${(finding as { check: string }).check}: ${JSON.stringify(finding)}`;
  }
}

function pathSuffix(relPath: string | undefined): string {
  return relPath === undefined ? "" : ` (path: ${relPath})`;
}

const GROUP_TEXT: Readonly<Record<string, (subject: string, count: number, relPath: string | undefined) => string>> = Object.freeze({
  "exact-deps": (subject, count, relPath) =>
    `package.json for ${subject} has ${count} dependency specification violation(s) (a workspaces/overrides field, or a dependencies/devDependencies/optionalDependencies/peerDependencies entry that is not one exact semver). Repair: pin every dependency to one exact semver that exists on https://registry.561.group, and remove any workspaces/overrides field.${pathSuffix(relPath)}`,
  "lockfile-registry": (subject, count, relPath) =>
    `package-lock.json for ${subject} resolves ${count} house-scoped package(s) away from https://registry.561.group. Repair: rm -rf node_modules package-lock.json, npm install, and verify every house-scoped resolved URL is https://registry.561.group.${pathSuffix(relPath)}`,
  "data-custody": (subject, _count, relPath) =>
    `data/ under ${subject} does not conform to the logs/records/state trio. Repair: migrate every offending entry into data/logs/, data/records/, or data/state/ (those three only) or purge it.${pathSuffix(relPath)}`,
  "import-stratification": (subject, count, relPath) =>
    `${subject} has ${count} import-stratification violation(s) (a scripts/ module importing an apps/ module). Repair: move the imported logic to a scripts/ or src/ module, or move the caller into apps/.${pathSuffix(relPath)}`,
});

/**
 * Groups checker findings into one work-intent task item per (check,
 * subject) pair -- never one per raw finding, so two violations in the
 * same manifest land as one task rather than colliding on the same
 * deterministic id.
 */
export function groupCheckerFindingsIntoTasks(
  findings: readonly CheckoutHealthFinding[],
  root?: string,
): readonly HealthWorkTaskItem[] {
  const bySubject = new Map<string, { check: string; subject: string; findings: CheckoutHealthFinding[]; subjectDirectory: string }>();
  for (const finding of findings) {
    const subject = subjectForFinding(finding);
    const key = `${finding.check}::${subject}`;
    const existing = bySubject.get(key);
    if (existing === undefined) {
      bySubject.set(key, { check: finding.check, subject, findings: [finding], subjectDirectory: subjectDirectoryForFinding(finding) });
    } else {
      existing.findings.push(finding);
    }
  }
  return Object.freeze([...bySubject.values()].map(({ check, subject, findings: group, subjectDirectory }) => {
    const relPath = root === undefined ? undefined : relative(root, subjectDirectory);
    const formatter = GROUP_TEXT[check] ?? ((s: string, n: number) => `${n} ${check} violation(s) for ${s}.`);
    return Object.freeze({
      cell: taskIdFor(check, subject),
      parent: "",
      text: formatter(subject, group.length, relPath),
      evidence: Object.freeze(group.map(formatFindingLine)),
      provenance: Object.freeze([Object.freeze({ source: `checker:${check}` })]),
    });
  }));
}

/** One task item per systemd user unit observed with `ActiveState=failed`. */
export function tasksFromFailedUnits(
  failedUnits: readonly Readonly<{ host: string; unit: string; sub?: string; description?: string }>[],
): readonly HealthWorkTaskItem[] {
  return Object.freeze(failedUnits.map((entry) => Object.freeze({
    cell: taskIdFor("systemd-failed", `${entry.host}-${entry.unit}`),
    parent: "",
    text: `${entry.unit} on host ${entry.host} is ActiveState=failed (sub=${entry.sub ?? "unknown"}). Repair: journalctl --user -u ${entry.unit} --no-pager to find the root cause, fix it, then systemctl --user reset-failed ${entry.unit}.`,
    evidence: Object.freeze([`systemd: unit=${entry.unit} host=${entry.host} active=failed sub=${entry.sub ?? "unknown"} description=${entry.description ?? ""}`]),
    provenance: Object.freeze([Object.freeze({ source: "checker:systemd-unit-inventory" })]),
  })));
}

/** One task item per not-yet-allowed checkout-bound unit ("the checkout is not a runtime"). */
export function tasksFromCheckoutBoundUnits(
  boundUnits: readonly Readonly<{ host: string; unit: string; allowed: boolean }>[],
): readonly HealthWorkTaskItem[] {
  return Object.freeze(boundUnits.filter((entry) => !entry.allowed).map((entry) => Object.freeze({
    cell: taskIdFor("checkout-bound-unit", `${entry.host}-${entry.unit}`),
    parent: "",
    text: `${entry.unit} on host ${entry.host} executes from inside the checkout ("the checkout is not a runtime"). Repair: migrate the unit to run its artifact outside the checkout, or add it to the checkout-bound-units allow list if it is lawful development infrastructure.`,
    evidence: Object.freeze([`checkout-bound-unit: unit=${entry.unit} host=${entry.host}`]),
    provenance: Object.freeze([Object.freeze({ source: "checker:checkout-bound-units" })]),
  })));
}

/**
 * Assembles the full structured work intent: the caller's admitted chain
 * items verbatim, plus one item per health task, with only the referenced
 * provenance sources attached.
 */
export function buildHealthWorkIntent({
  id,
  chain,
  producerId = "metroplat/monitoring/checkout-health",
  tasks,
}: Readonly<{ id: string; chain: readonly HealthWorkChainItem[]; producerId?: string | undefined; tasks: readonly HealthWorkTaskItem[] }>): Readonly<Record<string, unknown>> {
  const planCell = chain.at(-1)?.cell;
  if (planCell === undefined) throw new TypeError("buildHealthWorkIntent: chain must carry at least one item");
  const chainItems = chain.map((item) => Object.freeze({ ...item, evidence: Object.freeze([]), provenance: Object.freeze([Object.freeze({ source: "roadmap-chain" })]) }));
  const parentedTasks = tasks.map((task) => Object.freeze({ ...task, parent: task.parent === "" ? planCell : task.parent }));
  const items = Object.freeze([...chainItems, ...parentedTasks]);
  const referencedSourceIds = new Set(["roadmap-chain", ...items.flatMap((item) => item.provenance.map((p) => p.source))]);
  const sources = Object.freeze([...referencedSourceIds].map((sourceId) => SOURCE_CATALOG[sourceId]).filter((entry) => entry !== undefined));
  return Object.freeze({
    kind: "metroplat.work.structured-intent",
    id,
    producer: Object.freeze({ id: producerId }),
    sources,
    items,
  });
}

/**
 * The full checkout-health work-intent plan: task items grouped from every
 * checker finding, one allocation per task, and the assembled structured
 * intent -- pure composition; the caller admits the returned payloads.
 */
export function healthWorkIntent(health: CheckoutHealthRead, options: HealthWorkIntentOptions): HealthWorkIntentResult {
  const checkerTasks = groupCheckerFindingsIntoTasks(health.findings, options.root);
  const unitTasks = tasksFromFailedUnits(health.failedUnits);
  const boundUnitTasks = tasksFromCheckoutBoundUnits(health.checkoutBoundUnits);
  const ungoverned = Object.freeze([...checkerTasks, ...unitTasks, ...boundUnitTasks]);
  const tasks = options.work === undefined || options.skill === undefined
    ? ungoverned
    : Object.freeze(ungoverned.map((task) => Object.freeze({ ...task, work: options.work as string, skill: options.skill as string })));
  const intent = buildHealthWorkIntent({ id: options.id, chain: options.chain, producerId: options.producerId, tasks });
  const intentRecord = intent as Readonly<{ id: string }>;
  const subject = `structured-work-intent-${intentRecord.id}`;
  const allocations = tasks.map((task) => buildTaskAllocation({ taskCell: task.cell, subject, office: options.office, duty: options.duty, character: options.character, officeService: options.officeService }));
  return Object.freeze({ intent, allocations: Object.freeze(allocations), tasks });
}
