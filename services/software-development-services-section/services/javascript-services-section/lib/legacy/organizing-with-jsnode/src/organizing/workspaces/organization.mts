import {
  adjudicate,
  organize as organizeSocialBoundary,
  project,
  type Adjudication,
  type Organization,
  type SocialBoundary,
  type SocialProjection,
} from "@red-cup-engineering/organizing";
import { JSNODE_CORE_PACKAGES, type JSNodeCorePackage } from "../../actions.mjs";
import type { JSNodePackage, JSNodeWorkspace } from "../packages/carrier.mjs";
import {
  workspaceDependencyGraph,
  type WorkspaceDependencyGraph,
} from "./graph.mjs";

const FACE_NAMES = ["socializing", "computing", "gaming"] as const;

export type JSNodeWorkspaceOrganizingFace = typeof FACE_NAMES[number];

export interface JSNodeWorkspaceSocialBoundary {
  readonly kind: "organizing-with-jsnode.workspace-social-boundary";
  readonly workspace: string;
  readonly packageCount: number;
  readonly ancestry: readonly JSNodeCorePackage[];
  readonly socializing: readonly string[];
  readonly computing: readonly string[];
  readonly gaming: readonly string[];
}

export interface JSNodeWorkspaceOrganization {
  readonly kind: "organizing-with-jsnode.workspace-organization";
  readonly workspace: string;
  readonly packageCount: number;
  readonly boundary: JSNodeWorkspaceSocialBoundary;
  readonly graph: WorkspaceDependencyGraph;
  readonly organization: Organization;
  readonly projection: SocialProjection;
  readonly adjudication: Adjudication;
}

export interface JSNodeWorkspaceOrganizationSummary {
  readonly kind: "organizing-with-jsnode.workspace-organization-summary";
  readonly workspace: string;
  readonly identity: string;
  readonly packageCount: number;
  readonly members: number;
  readonly glued: boolean;
  readonly coordination: Organization["coordination"];
  readonly socializing: number;
  readonly computing: number;
  readonly gaming: number;
  readonly dependencies: number;
  readonly ancestry: readonly JSNodeCorePackage[];
}

export function workspaceSocialBoundary(
  workspace: JSNodeWorkspace,
  graph: WorkspaceDependencyGraph = workspaceDependencyGraph(workspace),
): JSNodeWorkspaceSocialBoundary {
  const socializing = new Set<string>();
  const computing = new Set<string>();
  const gaming = new Set<string>();

  for (const core of JSNODE_CORE_PACKAGES) {
    socializing.add(`${packageSubject(core)}|descends-from-core`);
  }

  for (const pkg of workspace.packages) {
    addPackageSocializing(socializing, pkg);
    addPackageComputing(computing, pkg);
    addPackageGaming(gaming, pkg);
  }

  for (const edge of graph.edges) {
    computing.add(`${packageSubject(edge.from)}|depends-on:${packageSubject(edge.to)}`);
  }

  return Object.freeze({
    kind: "organizing-with-jsnode.workspace-social-boundary" as const,
    workspace: workspace.root,
    packageCount: workspace.packages.length,
    ancestry: Object.freeze([...JSNODE_CORE_PACKAGES]),
    socializing: frozenSorted(socializing),
    computing: frozenSorted(computing),
    gaming: frozenSorted(gaming),
  });
}

export function organizeWorkspace(
  workspace: JSNodeWorkspace,
  graph: WorkspaceDependencyGraph = workspaceDependencyGraph(workspace),
): JSNodeWorkspaceOrganization {
  const boundary = workspaceSocialBoundary(workspace, graph);
  const socialBoundary = asOrganizingBoundary(boundary);
  const organization = organizeSocialBoundary(socialBoundary, {
    identity: `jsnode.workspace.${workspace.root}`,
  });
  return Object.freeze({
    kind: "organizing-with-jsnode.workspace-organization" as const,
    workspace: workspace.root,
    packageCount: workspace.packages.length,
    boundary,
    graph,
    organization,
    projection: project(organization),
    adjudication: adjudicate(socialBoundary),
  });
}

export function summarizeWorkspaceOrganization(
  reading: JSNodeWorkspaceOrganization,
): JSNodeWorkspaceOrganizationSummary {
  return Object.freeze({
    kind: "organizing-with-jsnode.workspace-organization-summary" as const,
    workspace: reading.workspace,
    identity: reading.organization.identity,
    packageCount: reading.packageCount,
    members: reading.organization.members,
    glued: reading.organization.glued,
    coordination: reading.organization.coordination,
    socializing: reading.boundary.socializing.length,
    computing: reading.boundary.computing.length,
    gaming: reading.boundary.gaming.length,
    dependencies: reading.graph.edges.length,
    ancestry: Object.freeze([...reading.boundary.ancestry]),
  });
}

export function asOrganizingBoundary(boundary: JSNodeWorkspaceSocialBoundary): SocialBoundary {
  return {
    socializing: boundary.socializing.join("\n"),
    computing: boundary.computing.join("\n"),
    gaming: boundary.gaming.join("\n"),
  };
}

function addPackageSocializing(lines: Set<string>, pkg: JSNodePackage): void {
  const subject = packageSubject(pkg.name);
  lines.add(`${subject}|member-of-workspace`);
  lines.add(`${subject}|inhabits-layer:${pkg.layer}`);
  lines.add(`${subject}|has-lifecycle:${pkg.lifecycle}`);
  lines.add(`${subject}|has-maturity:${pkg.maturity}`);
  for (const tag of pkg.tags) lines.add(`${subject}|carries-tag:${tag}`);
}

function addPackageComputing(lines: Set<string>, pkg: JSNodePackage): void {
  const subject = packageSubject(pkg.name);
  lines.add(`${subject}|has-version:${pkg.version}`);
  lines.add(`${subject}|has-module-type:${pkg.manifest.moduleType ?? "unstated"}`);
  for (const dep of pkg.deps) {
    lines.add(`${subject}|declares-${dep.kind}-dependency:${packageSubject(dep.name)}`);
  }
  for (const subpath of pkg.exports) {
    lines.add(`${subject}|publishes-module:${subpath}`);
  }
  if (pkg.api !== undefined) {
    lines.add(`${subject}|declares-types:${pkg.api.types.length}`);
    lines.add(`${subject}|declares-functions:${pkg.api.functions.length}`);
  }
}

function addPackageGaming(lines: Set<string>, pkg: JSNodePackage): void {
  const subject = packageSubject(pkg.name);
  for (const script of pkg.manifest.scripts) lines.add(`${subject}|can-run-script:${script}`);
  for (const bin of pkg.manifest.bins) lines.add(`${subject}|offers-bin:${bin}`);
  for (const subpath of pkg.exports) lines.add(`${subject}|offers-export:${subpath}`);
  if (pkg.manifest.private) lines.add(`${subject}|withholds-publication`);
}

function packageSubject(name: string): string {
  return `jsnode.package.${name}`;
}

function frozenSorted(values: Set<string>): readonly string[] {
  return Object.freeze([...values].sort());
}
