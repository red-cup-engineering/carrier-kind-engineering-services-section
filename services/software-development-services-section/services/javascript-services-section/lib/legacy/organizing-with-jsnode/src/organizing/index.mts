import type { UtteranceCarrier } from "@emsenn/relating";
import { jsNodeFact } from "./facts.mjs";

import {
  packageScriptCatalogFromPackage,
  packageTerm,
  readJSNodePackage,
  readJSNodePackageManifest,
  reducePackage,
  type JSNodePackage,
  type PackageBinDiscovery,
  type PackageBinManifest,
  type PackageScriptCatalog,
  type PackageReduction,
} from "./packages/index.mjs";
import {
  discoverWorkspace,
  organizeWorkspace,
  workspaceDependencyGraph,
  type JSNodeWorkspace,
  type JSNodeWorkspaceOrganization,
  type WorkspaceDependencyGraph,
} from "./workspaces/index.mjs";

export const JSNODE_ORGANIZING_ACTIONS = Object.freeze([
  "package.read",
  "package.reduce",
  "workspace.read",
  "workspace.graph",
  "workspace.organize",
  "package-script.catalog",
  "package-bin.discover",
] as const);

export type JSNodeOrganizerAction = typeof JSNODE_ORGANIZING_ACTIONS[number];

export interface JSNodeOrganizerToken {
  readonly root?: string;
  readonly packageDir?: string;
  readonly pkg?: JSNodePackage;
  readonly workspace?: JSNodeWorkspace;
  readonly manifest?: Readonly<Record<string, unknown>>;
  readonly packageName?: string;
  readonly bin?: PackageBinManifest;
  readonly basePath?: string;
  readonly exclude?: readonly string[];
  readonly introspect?: boolean;
}

export interface JSNodeOrganizerClaim {
  readonly packageName?: string;
  readonly minimumPackages?: number;
  readonly requireBins?: boolean;
}

export type JSNodeOrganizerReading =
  | {
      readonly kind: "organizing-with-jsnode.package.reading";
      readonly pkg: JSNodePackage;
    }
  | {
      readonly kind: "organizing-with-jsnode.package.reduction-reading";
      readonly reduction: PackageReduction;
    }
  | {
      readonly kind: "organizing-with-jsnode.workspace.reading";
      readonly workspace: JSNodeWorkspace;
    }
  | {
      readonly kind: "organizing-with-jsnode.workspace.graph-reading";
      readonly workspace: JSNodeWorkspace;
      readonly graph: WorkspaceDependencyGraph;
    }
  | {
      readonly kind: "organizing-with-jsnode.workspace.organization-reading";
      readonly workspace: JSNodeWorkspace;
      readonly organization: JSNodeWorkspaceOrganization;
    }
  | {
      readonly kind: "organizing-with-jsnode.package-bin.discovery-reading";
      readonly discovery: PackageBinDiscovery;
      readonly catalog: PackageScriptCatalog;
    }
  | {
      readonly kind: "organizing-with-jsnode.package-script.catalog-reading";
      readonly catalog: PackageScriptCatalog;
    };

export type JSNodeOrganizerObstruction =
  | {
      readonly kind: "organizing-with-jsnode.organize.unsupported-action-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.missing-root-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.missing-package-dir-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.unreadable-package-obstruction";
      readonly packageDir: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.package-claim-obstruction";
      readonly expected: string;
      readonly actual?: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.minimum-packages-obstruction";
      readonly expected: number;
      readonly actual: number;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.missing-package-name-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.missing-manifest-obstruction";
      readonly action: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.empty-package-bin-obstruction";
      readonly packageName: string;
    }
  | {
      readonly kind: "organizing-with-jsnode.organize.exception-obstruction";
      readonly action: string;
      readonly message: string;
    };

export interface JSNodeOrganizerAdmission {
  readonly kind: "organizing-with-jsnode.organization";
  readonly term: string;
  readonly action: JSNodeOrganizerAction;
  readonly admitted: boolean;
  readonly status: "admitted" | "refused";
  readonly charge: "potential" | "active";
  readonly utterances: readonly UtteranceCarrier[];
  readonly reading?: JSNodeOrganizerReading;
  readonly obstruction?: JSNodeOrganizerObstruction;
}

export async function organizeWithJSNode(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken = {},
  claim: JSNodeOrganizerClaim = {},
): Promise<JSNodeOrganizerAdmission> {
  try {
    switch (action) {
      case "package.read":
        return await readPackage(action, token, claim);
      case "package.reduce":
        return await readPackageReduction(action, token);
      case "workspace.read":
        return await readWorkspace(action, token, claim);
      case "workspace.graph":
        return await readWorkspaceGraph(action, token, claim);
      case "workspace.organize":
        return await readWorkspaceOrganization(action, token, claim);
      case "package-script.catalog":
        return organizePackageScriptCatalog(token, claim);
      case "package-bin.discover":
        return await readPackageBinDiscovery(action, token, claim);
      default:
        return refused(action, {
          kind: "organizing-with-jsnode.organize.unsupported-action-obstruction",
          action,
        });
    }
  } catch (cause) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.exception-obstruction",
      action,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

export const organize = organizeWithJSNode;

async function readPackageReduction(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
): Promise<JSNodeOrganizerAdmission> {
  if (token.packageDir === undefined) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.missing-package-dir-obstruction",
      action,
    });
  }
  const reduction = await reducePackage(token.packageDir, token.root);
  return admitted(action, {
    kind: "organizing-with-jsnode.package.reduction-reading",
    reduction,
  }, packageReductionUtterances(reduction));
}

async function readPackage(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
  claim: JSNodeOrganizerClaim,
): Promise<JSNodeOrganizerAdmission> {
  const pkg = token.pkg ?? (token.packageDir === undefined
    ? undefined
    : await readJSNodePackage(token.packageDir, readOptions(token)));
  if (pkg === undefined) {
    if (token.packageDir === undefined) {
      return refused(action, {
        kind: "organizing-with-jsnode.organize.missing-package-dir-obstruction",
        action,
      });
    }
    return refused(action, {
      kind: "organizing-with-jsnode.organize.unreadable-package-obstruction",
      packageDir: token.packageDir,
    });
  }
  if (claim.packageName !== undefined && pkg.name !== claim.packageName) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.package-claim-obstruction",
      expected: claim.packageName,
      actual: pkg.name,
    });
  }
  return admitted(action, {
    kind: "organizing-with-jsnode.package.reading",
    pkg,
  }, pkg.utterances);
}

async function readWorkspace(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
  claim: JSNodeOrganizerClaim,
): Promise<JSNodeOrganizerAdmission> {
  const workspace = await workspaceFromToken(action, token);
  if (isObstruction(workspace)) return refused(action, workspace);
  const packageCount = workspace.packages.length;
  if (claim.minimumPackages !== undefined && packageCount < claim.minimumPackages) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.minimum-packages-obstruction",
      expected: claim.minimumPackages,
      actual: packageCount,
    });
  }
  if (claim.packageName !== undefined && !workspace.packages.some((pkg) => pkg.name === claim.packageName)) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.package-claim-obstruction",
      expected: claim.packageName,
    });
  }
  return admitted(action, {
    kind: "organizing-with-jsnode.workspace.reading",
    workspace,
  }, workspace.utterances);
}

async function readWorkspaceGraph(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
  claim: JSNodeOrganizerClaim,
): Promise<JSNodeOrganizerAdmission> {
  const workspace = await workspaceFromToken(action, token);
  if (isObstruction(workspace)) return refused(action, workspace);
  const packageCount = workspace.packages.length;
  if (claim.minimumPackages !== undefined && packageCount < claim.minimumPackages) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.minimum-packages-obstruction",
      expected: claim.minimumPackages,
      actual: packageCount,
    });
  }
  const graph = workspaceDependencyGraph(workspace);
  return admitted(action, {
    kind: "organizing-with-jsnode.workspace.graph-reading",
    workspace,
    graph,
  }, [...workspace.utterances, ...graph.utterances]);
}

async function readWorkspaceOrganization(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
  claim: JSNodeOrganizerClaim,
): Promise<JSNodeOrganizerAdmission> {
  const workspace = await workspaceFromToken(action, token);
  if (isObstruction(workspace)) return refused(action, workspace);
  const packageCount = workspace.packages.length;
  if (claim.minimumPackages !== undefined && packageCount < claim.minimumPackages) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.minimum-packages-obstruction",
      expected: claim.minimumPackages,
      actual: packageCount,
    });
  }
  if (claim.packageName !== undefined && !workspace.packages.some((pkg) => pkg.name === claim.packageName)) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.package-claim-obstruction",
      expected: claim.packageName,
    });
  }
  const graph = workspaceDependencyGraph(workspace);
  const organization = organizeWorkspace(workspace, graph);
  return admitted(action, {
    kind: "organizing-with-jsnode.workspace.organization-reading",
    workspace,
    organization,
  }, [...workspace.utterances, ...graph.utterances]);
}

async function readPackageBinDiscovery(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
  claim: JSNodeOrganizerClaim,
): Promise<JSNodeOrganizerAdmission> {
  const catalog = packageScriptCatalogFromToken(action, token);
  if (isObstruction(catalog)) return refused(action, catalog);
  const discovery = catalog.discovery;
  if (claim.requireBins === true && discovery.bins.length === 0) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.empty-package-bin-obstruction",
      packageName: catalog.package,
    });
  }
  return admitted(action, {
    kind: "organizing-with-jsnode.package-bin.discovery-reading",
    discovery,
    catalog,
  }, packageBinDiscoveryUtterances(discovery));
}

export function organizePackageScriptCatalog(
  token: JSNodeOrganizerToken = {},
  claim: JSNodeOrganizerClaim = {},
): JSNodeOrganizerAdmission {
  const action = "package-script.catalog";
  try {
    const catalog = packageScriptCatalogFromToken(action, token);
    if (isObstruction(catalog)) return refused(action, catalog);
    if (claim.requireBins === true && catalog.scripts.length === 0) {
      return refused(action, {
        kind: "organizing-with-jsnode.organize.empty-package-bin-obstruction",
        packageName: catalog.package,
      });
    }
    return admitted(action, {
      kind: "organizing-with-jsnode.package-script.catalog-reading",
      catalog,
    }, packageScriptCatalogUtterances(catalog));
  } catch (cause) {
    return refused(action, {
      kind: "organizing-with-jsnode.organize.exception-obstruction",
      action,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

function packageScriptCatalogFromToken(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
): PackageScriptCatalog | JSNodeOrganizerObstruction {
  if (token.packageDir === undefined) {
    return {
      kind: "organizing-with-jsnode.organize.missing-package-dir-obstruction",
      action,
    };
  }
  const manifest = token.manifest ?? readJSNodePackageManifest(token.packageDir);
  if (manifest === undefined) {
    return {
      kind: "organizing-with-jsnode.organize.missing-manifest-obstruction",
      action,
    };
  }
  const packageName = token.packageName ?? token.pkg?.name ?? manifestPackageName(manifest);
  if (packageName === undefined) {
    return {
      kind: "organizing-with-jsnode.organize.missing-package-name-obstruction",
      action,
    };
  }
  const { catalog } = packageScriptCatalogFromPackage({
    packageName,
    packageDir: token.packageDir,
    manifest,
    ...(token.bin === undefined ? {} : { bin: token.bin }),
    ...(token.basePath === undefined ? {} : { basePath: token.basePath }),
  });
  return catalog;
}

async function workspaceFromToken(
  action: JSNodeOrganizerAction,
  token: JSNodeOrganizerToken,
): Promise<JSNodeWorkspace | Extract<JSNodeOrganizerObstruction, { readonly kind: "organizing-with-jsnode.organize.missing-root-obstruction" }>> {
  if (token.workspace !== undefined) return token.workspace;
  if (token.root === undefined) {
    return {
      kind: "organizing-with-jsnode.organize.missing-root-obstruction",
      action,
    };
  }
  return await discoverWorkspace(token.root, {
    ...readOptions(token),
    exclude: token.exclude ?? [],
  });
}

function readOptions(token: JSNodeOrganizerToken): { readonly introspect?: boolean } {
  return token.introspect === undefined ? {} : { introspect: token.introspect };
}

function manifestPackageName(manifest: Readonly<Record<string, unknown>>): string | undefined {
  return typeof manifest["name"] === "string" ? manifest["name"] : undefined;
}

function admitted(
  action: JSNodeOrganizerAction,
  reading: JSNodeOrganizerReading,
  evidence: readonly UtteranceCarrier[],
): JSNodeOrganizerAdmission {
  const term = organizationTerm(action, reading.kind);
  return Object.freeze({
    kind: "organizing-with-jsnode.organization" as const,
    term,
    action,
    admitted: true,
    status: "admitted" as const,
    charge: "potential" as const,
    utterances: Object.freeze([
      ...organizationUtterances(term, action, true),
      jsNodeFact(term, "organizing-with-jsnode.organization.has-reading", reading.kind),
      ...evidence,
    ]),
    reading,
  });
}

function refused(action: JSNodeOrganizerAction, obstruction: JSNodeOrganizerObstruction): JSNodeOrganizerAdmission {
  const term = organizationTerm(action, obstruction.kind);
  return Object.freeze({
    kind: "organizing-with-jsnode.organization" as const,
    term,
    action,
    admitted: false,
    status: "refused" as const,
    charge: "active" as const,
    utterances: Object.freeze([
      ...organizationUtterances(term, action, false),
      jsNodeFact(term, "organizing-with-jsnode.organization.has-obstruction", obstruction.kind),
      jsNodeFact(term, "organizing-with-jsnode.organization.obstruction", obstruction),
    ]),
    obstruction,
  });
}

function organizationTerm(action: JSNodeOrganizerAction, outcome: string): string {
  return `organizing-with-jsnode.organization.${action}:${outcome}`;
}

function actionTerm(action: JSNodeOrganizerAction): string {
  return `organizing-with-jsnode.action.${action}`;
}

function organizationUtterances(term: string, action: JSNodeOrganizerAction, admitted: boolean): readonly UtteranceCarrier[] {
  return [
    jsNodeFact(term, "organizing-with-jsnode.organization.has-action", actionTerm(action)),
    jsNodeFact(term, "organizing-with-jsnode.organization.admitted", admitted),
  ];
}

function packageBinDiscoveryUtterances(discovery: PackageBinDiscovery): readonly UtteranceCarrier[] {
  const term = `organizing-with-jsnode.package-bin.discovery.${discovery.package}`;
  const out: UtteranceCarrier[] = [
    jsNodeFact(term, "organizing-with-jsnode.package-bin.discovery.package", packageTerm(discovery.package)),
    jsNodeFact(term, "organizing-with-jsnode.package-bin.discovery.protocol", `computing.protocol.${discovery.protocol}`),
  ];
  for (const bin of discovery.bins) {
    out.push(jsNodeFact(term, "organizing-with-jsnode.package-bin.discovery.has-bin", bin.carrier.term));
    for (const row of bin.carrier.facts) out.push(jsNodeFact(row.subject, String(row.predicate), row.object));
  }
  return out;
}

function packageScriptCatalogUtterances(catalog: PackageScriptCatalog): readonly UtteranceCarrier[] {
  const term = `organizing-with-jsnode.package-script.catalog.${catalog.package}`;
  return [
    jsNodeFact(term, "organizing-with-jsnode.package-script.catalog.package", packageTerm(catalog.package)),
    jsNodeFact(term, "organizing-with-jsnode.package-script.catalog.package-dir", catalog.packageDir),
    jsNodeFact(term, "organizing-with-jsnode.package-script.catalog.protocol", `computing.protocol.${catalog.protocol}`),
    jsNodeFact(term, "organizing-with-jsnode.package-script.catalog.script-count", catalog.scripts.length),
    ...packageBinDiscoveryUtterances(catalog.discovery),
  ];
}

function packageReductionUtterances(reduction: PackageReduction): readonly UtteranceCarrier[] {
  const term = `organizing-with-jsnode.package-reduction.${reduction.lint.packageDir}`;
  return [
    jsNodeFact(term, "organizing-with-jsnode.package-reduction.package-dir", reduction.lint.packageDir),
    jsNodeFact(term, "organizing-with-jsnode.package-reduction.finding-count", reduction.lint.findings.length),
    jsNodeFact(term, "organizing-with-jsnode.package-reduction.reducible-count", reduction.reducibleFindings.length),
  ];
}

function isObstruction(value: { readonly kind: string }): value is JSNodeOrganizerObstruction {
  return value.kind.startsWith("organizing-with-jsnode.organize.");
}
