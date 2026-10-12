import path from "node:path";
import { writeFileSync } from "node:fs";

import type { DiscoveredPackage, JSNodePackageManifest } from "../workspaces/workspace.mjs";

export type PackageDescriptionUpdatePlan = Readonly<{
  kind: "jsnode.package-description-update-plan";
  move: "jsnode.package.description.update";
  settlement: "admitted" | "blocked" | "noop";
  package: string;
  packageDir: string;
  manifestPath: string;
  currentDescription: string;
  nextDescription: string;
  changed: boolean;
  admissible: boolean;
  obstructions: readonly string[];
  previewManifest: JSNodePackageManifest;
  doneWhen: readonly string[];
}>;

function cleanDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function descriptionOf(manifest: JSNodePackageManifest): string {
  const value = manifest["description"];
  return typeof value === "string" ? value : "";
}

function packageNameOf(pkg: DiscoveredPackage): string {
  const name = pkg.manifest["name"];
  return typeof name === "string" ? name : pkg.name;
}

export function planPackageDescriptionUpdate(
  pkg: DiscoveredPackage,
  nextDescription: string,
): PackageDescriptionUpdatePlan {
  const rawHasLineBreak = /[\r\n]/.test(nextDescription);
  const next = cleanDescription(nextDescription);
  const current = descriptionOf(pkg.manifest);
  const obstructions: string[] = [];
  if (next === "") obstructions.push("description is empty");
  if (next.length > 220) obstructions.push("description is longer than 220 characters");
  if (rawHasLineBreak) obstructions.push("description must be a single line");
  const changed = current !== next;
  const admissible = obstructions.length === 0 && changed;

  const previewManifest = Object.freeze({
    ...pkg.manifest,
    description: next,
  });
  return Object.freeze({
    kind: "jsnode.package-description-update-plan" as const,
    move: "jsnode.package.description.update" as const,
    settlement: obstructions.length > 0 ? "blocked" : changed ? "admitted" : "noop",
    package: packageNameOf(pkg),
    packageDir: pkg.dir,
    manifestPath: path.join(pkg.dir, "package.json"),
    currentDescription: current,
    nextDescription: next,
    changed,
    admissible,
    obstructions: Object.freeze(obstructions),
    previewManifest,
    doneWhen: Object.freeze([
      "package.json description equals nextDescription",
      "discoverWorkspace reads the updated description into the package carrier",
      "package atlas room displays the updated description",
    ]),
  });
}

export function writePackageDescriptionUpdate(plan: PackageDescriptionUpdatePlan): PackageDescriptionUpdatePlan {
  if (!plan.admissible) {
    throw new Error(`package description update is not admissible: ${plan.obstructions.join("; ") || "unchanged"}`);
  }
  writeFileSync(plan.manifestPath, `${JSON.stringify(plan.previewManifest, null, 2)}\n`);
  return plan;
}
