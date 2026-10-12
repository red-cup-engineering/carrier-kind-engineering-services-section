import type { BlueprintClaimGraph } from "../blueprint/schema.mts";
import type { LeanDeclarationCatalog } from "../schema.mts";
import type { VersoTexPlate } from "../tex/schema.mts";
import {
  versoExpositionWeldReportContract,
  type VersoExpositionWeldReport,
} from "./schema.mts";
import { uniqueSortedStrings as uniqueSorted } from "@red-cup-engineering/feltos/values/unique-sorted-strings";

export {
  versoExpositionWeldReportContract,
  versoExpositionWeldReportSchema,
  type VersoExpositionWeldReport,
} from "./schema.mts";

export type VersoExpositionWeldReportOptions = Readonly<{
  blueprint?: BlueprintClaimGraph;
  leanDeclarations?: LeanDeclarationCatalog;
}>;

export function versoExpositionWeldReport(
  input: VersoTexPlate | readonly VersoTexPlate[],
  options: VersoExpositionWeldReportOptions = {},
): VersoExpositionWeldReport {
  const plates: readonly VersoTexPlate[] = Array.isArray(input) ? input : [input];
  const sources = uniqueSorted(plates.map((plate) => plate.source));
  const imports = uniqueSorted(plates.flatMap((plate) => [...plate.imports]));
  const includes = uniqueSorted(plates.flatMap((plate) => [...plate.includes]));
  const leanDeclarations = uniqueSorted(plates.flatMap((plate) => [...plate.leanDeclarations]));
  const claimOccurrences = uniqueSorted(plates.flatMap((plate) => [...plate.claimOccurrences]));
  const blueprintNodes = uniqueSorted(plates.flatMap((plate) => [...plate.blueprintNodes]));
  const leanDeclarationSet = options.leanDeclarations === undefined
    ? undefined
    : new Set(options.leanDeclarations.entries.map((entry) => entry.name));
  const blueprintNodeSet = options.blueprint === undefined
    ? undefined
    : new Set(options.blueprint.nodes.map((node) => node.id));
  const missingLeanDeclarations = leanDeclarationSet === undefined
    ? []
    : leanDeclarations.filter((name) => !leanDeclarationSet.has(name));
  const missingBlueprintNodes = blueprintNodeSet === undefined
    ? []
    : blueprintNodes.filter((node) => !blueprintNodeSet.has(node));
  const evidence = [
    ...sources.map((source) => `verso-plate:${source}`),
    options.leanDeclarations === undefined ? "lean-declaration-catalog:unchecked" : `lean-declaration-catalog:${options.leanDeclarations.rootModule}`,
    options.blueprint === undefined ? "blueprint-claim-graph:unchecked" : `blueprint-claim-graph:${options.blueprint.sources.length}`,
  ];

  return versoExpositionWeldReportContract.assert({
    kind: "metroplat.verso.exposition-weld-report",
    sources,
    imports,
    includes,
    leanDeclarations,
    claimOccurrences,
    blueprintNodes,
    checkedLeanBlocks: plates.reduce((sum, plate) => sum + plate.checkedLeanBlocks, 0),
    leanCatalogChecked: leanDeclarationSet !== undefined,
    blueprintGraphChecked: blueprintNodeSet !== undefined,
    missingLeanDeclarations: Object.freeze(missingLeanDeclarations),
    missingBlueprintNodes: Object.freeze(missingBlueprintNodes),
    ok: missingLeanDeclarations.length === 0 && missingBlueprintNodes.length === 0,
    evidence: Object.freeze(evidence),
    mediaType: "application/vnd.metroplat.verso.exposition-weld-report+json",
  }, "Verso exposition weld report") as VersoExpositionWeldReport;
}
