/**
 * @packageDocumentation
 * Ambient types for exact-pinned checker deps that ship none of their own
 * (npm-workspace-publication-service, systemd-unit-inventory-observation-
 * service, both 0.3.0; audit-node-builtin-imports-service 1.0.0;
 * check-youtube-channel-repository-form-service 0.1.0; path-walking-service
 * 1.3.1; verified: no `types` field, no `.d.mts`).
 */
declare module "@red-cup-engineering/audit-node-builtin-imports-service" {
  export interface NodeBuiltinImportFinding {
    readonly line: number;
    readonly builtin: string;
    readonly houseService: string;
  }

  export interface NodeBuiltinImportAudit {
    readonly type: "NodeBuiltinImportAudit";
    readonly path: string;
    readonly findings: readonly NodeBuiltinImportFinding[];
    readonly count: number;
  }

  export function auditNodeBuiltinImports(
    request: Readonly<{ path: string; text: string }>,
  ): NodeBuiltinImportAudit;
}

declare module "@red-cup-engineering/npm-workspace-publication-service" {
  export interface DependencySpecificationViolation {
    readonly field: string | null;
    readonly name: string | null;
    readonly specification: unknown;
    readonly reason: string;
  }

  export function dependencySpecificationViolations(
    manifest: unknown,
  ): readonly DependencySpecificationViolation[];

  export interface ExactDependencyPinRewrite {
    readonly field: string;
    readonly name: string;
    readonly from: string;
    readonly to: string;
    readonly source: string;
  }

  export interface ExactDependencyPinRefusal {
    readonly name: string;
    readonly spec: string;
    readonly reason: string;
  }

  export interface ExactDependencyPinSite {
    readonly path: string;
    readonly dir: string;
    readonly manifest: Readonly<Record<string, unknown>>;
  }

  export interface ExactDependencyPinPackageResult {
    readonly path: string;
    readonly rewrites: readonly ExactDependencyPinRewrite[];
    readonly refusals: readonly ExactDependencyPinRefusal[];
    readonly violationsAfter: number;
  }

  export interface ExactDependencyPinResult {
    readonly kind: "npm-workspace-publication.exact-pin-repair";
    readonly packages: readonly ExactDependencyPinPackageResult[];
    readonly ok: boolean;
  }

  export function pinExactDependencies(options: Readonly<{
    sites: readonly ExactDependencyPinSite[];
    apply?: boolean;
    readFileImpl?: (path: string, encoding: "utf8") => Promise<string>;
    writeFileImpl?: (path: string, text: string, encoding: "utf8") => Promise<void>;
    readRegistryPackageImpl?: (registry: string, name: string) => Promise<{
      readonly reachable: boolean;
      readonly found: boolean;
      readonly packument?: { readonly versions: Readonly<Record<string, unknown>> };
    }>;
  }>): Promise<ExactDependencyPinResult>;
}

declare module "@red-cup-engineering/systemd-unit-inventory-observation-service" {
  export interface SystemdUnitEntry {
    readonly unit: string;
    readonly active: string;
    readonly sub: string;
    readonly description?: string;
  }

  export interface SystemdUnitInventory {
    readonly host: string;
    readonly units: readonly SystemdUnitEntry[];
    readonly timers: readonly unknown[];
  }

  export function observeUnitInventory(
    host: string,
    options?: Readonly<{ run?: (command: string, args: readonly string[]) => string }>,
  ): SystemdUnitInventory;
}

declare module "@red-cup-engineering/systemd-unit-inventory-observation-service/checkout-bound-units" {
  export interface CheckoutBoundUnitEntry {
    readonly unit: string;
    readonly fragmentPath: string;
    readonly workingDirectory: string;
    readonly execStart: string;
    readonly activeState: string;
    readonly subState: string;
    readonly allowed: boolean;
  }

  export interface CheckoutBoundUnitsObservation {
    readonly kind: "systemd.checkout-bound-units";
    readonly host: string;
    readonly root: string;
    readonly observed: number;
    readonly allowed: readonly string[];
    readonly bound: readonly CheckoutBoundUnitEntry[];
  }

  export function observeSetOfCheckoutBoundUnits(
    host: string,
    options: Readonly<{
      root: string;
      allow?: readonly string[];
      run?: (command: string, args: readonly string[]) => string;
    }>,
  ): CheckoutBoundUnitsObservation;
}

declare module "@red-cup-engineering/check-youtube-channel-repository-form-service" {
  export interface YoutubeChannelRepositoryFormViolation {
    readonly rule: string;
    readonly path: string;
    readonly message: string;
  }

  export interface YoutubeChannelRepositoryForm {
    readonly type: "YoutubeChannelRepositoryForm";
    readonly version: 1;
    readonly path: string;
    readonly conformant: boolean;
    readonly violations: readonly YoutubeChannelRepositoryFormViolation[];
    readonly allowed: readonly string[];
    readonly dependsOnProductionProgram: boolean;
  }

  export function checkYoutubeChannelRepositoryForm(request: Readonly<{
    path: string;
    entries: readonly string[];
    packageJson: unknown;
  }>): YoutubeChannelRepositoryForm;
}

declare module "@red-cup-engineering/filepath-services-section/walk-posix-paths" {
  export interface PosixPathWalkEntry {
    readonly path: string;
    readonly absolutePath: string;
    readonly name: string;
    readonly kind: "file" | "directory" | "symlink" | "special";
    readonly depth: number;
  }

  export function walkPosixPathsSync(options: Readonly<{
    root: string;
    excludes?: readonly string[];
    inspectEntry?: (entry: PosixPathWalkEntry) => void;
  }>): unknown;
}

