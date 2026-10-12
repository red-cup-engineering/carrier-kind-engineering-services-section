export type RepairScriptKind = "exact-deps" | "data-custody";
export type RecognizedNoHandKind = "import-stratification" | "checkout-bound-unit";
export interface HealthDuty { readonly scope: string; readonly intent?: string; readonly text?: string; readonly deterministicExecution?: DeterministicExecution; }
export interface DeterministicCommandRequest { readonly type: "JavascriptNodeCommandExecutionRequest"; readonly version: 1; readonly command: string; readonly arguments: readonly string[]; readonly directory: string; readonly environment: Readonly<Record<string, string>> | null; readonly input: string | null; }
export type DeterministicAcceptance = Readonly<{ kind: "command-exit-status"; status: number }> | Readonly<{ kind: "exact-stdout"; stdout: string }>;
export interface DeterministicExecution { readonly operation: string; readonly request: DeterministicCommandRequest; readonly acceptance: DeterministicAcceptance; }
export interface RepairHandResult { readonly ok: boolean; readonly changedPaths: readonly string[]; readonly detail: Readonly<Record<string, unknown>>; readonly gateEvidence: string; }
export interface PlannedDuty { readonly scope: string; readonly intent?: string; readonly kind?: RepairScriptKind | RecognizedNoHandKind | null; readonly operation?: string; readonly status: "no-repair-script" | "refused" | "planned" | "applied" | "executed-not-discharged"; readonly request?: DeterministicCommandRequest; readonly receipt?: unknown; readonly admission?: unknown; readonly refusal?: Readonly<Record<string, unknown>>; }
export interface DischargeReadyDutiesResult { readonly kind: "metroplat.monitoring.checkout-health.duty-discharge"; readonly duties: readonly PlannedDuty[]; readonly ok: boolean; }
export declare const SCOPE_RECOGNIZED_NO_HAND_PATTERN: RegExp;
export declare function classifyDutyScope(scope: string): Readonly<{ repairScript: RepairScriptKind | null; subject: string | undefined }>;
export declare function subjectPathFromDutyText(text: string | undefined): string | undefined;
export declare function walkDirectories(root: string, options?: object): readonly string[];
export declare function candidateSubjectPaths(options: { repairScript: RepairScriptKind; subject: string; root: string }): readonly string[];
export declare function resolveSubjectPath(options: { repairScript: RepairScriptKind; subject: string; text: string | undefined; root: string }): Readonly<Record<string, unknown>>;
export declare function readyTaskDutiesOfDispatch(readout: { frontier: readonly HealthDuty[] }): readonly HealthDuty[];
export declare function runExactDepsHand(options: { subjectPath: string; apply: boolean }): Promise<RepairHandResult>;
export declare function runDataCustodyHand(options: { subjectPath: string; apply: boolean }): RepairHandResult;
export declare const DEFAULT_REPAIR_SCRIPTS: Readonly<Record<RepairScriptKind, Function>>;
export declare function digestOfRepairOutput(value: unknown): string;
export declare function evaluateDeterministicAcceptance(acceptance: unknown, receipt: unknown): Readonly<{ accepted: boolean; reason?: string }>;
export declare function validateDeterministicExecution(value: unknown): DeterministicExecution;
export declare function executeDeterministicDuty(options: { duty: { scope: string; intent: string }; deterministicExecution: unknown; apply: boolean; run: Function; admitDischargeFn?: Function; binding?: unknown; producer?: Readonly<{ id: string; revision: string }> }): Promise<Readonly<Record<string, unknown>>>;
export declare function dischargeTextFor(options: { repairScript: RepairScriptKind; repairResult: RepairHandResult }): string;
export declare function buildDischargeInput(options: { duty: HealthDuty; repairScript: RepairScriptKind; repairResult: RepairHandResult; producer?: Readonly<{ id: string; revision: string }> }): Readonly<Record<string, unknown>>;
export declare function planOrDischargeDuty(options: { duty: HealthDuty; root: string; apply: boolean; binding: unknown; admitDischargeFn?: Function }): Promise<PlannedDuty>;
export declare function dischargeReadyDuties(options: { readout: { frontier: readonly HealthDuty[] }; root: string; binding: unknown; apply?: boolean | undefined; limit?: number | undefined; scope?: string | undefined; kind?: RepairScriptKind | undefined; planOrDischargeFn?: Function | undefined; run?: Function | undefined; admitDischargeFn?: Function | undefined; producer?: Readonly<{ id: string; revision: string }> | undefined }): Promise<DischargeReadyDutiesResult>;
