import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { CATALOG_PROFILE, checkLanguageCone, compileCatalog } from "../src/index.mjs";

export const INFO_ROOT = resolve(import.meta.dirname, "../../../../../../../../../../../../..");
export const OBS_ROOT = resolve(INFO_ROOT, "lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section");
export const OBS_REGION = `repo://info/${relative(INFO_ROOT, OBS_ROOT)}`;
export const ARTICULATING_APEX = "urn:obsmetrologia:articulating";

export const articulatingCatalogDeclaration = {
  profile: CATALOG_PROFILE,
  nodes: [
    { type: "articulating-reading", parent: null, corner: "prose", rung: "identity", recognize: { op: "any", clauses: [
      { op: "content-includes", value: "Articulating" },
      { op: "content-includes", value: "articulating" },
      { op: "json-pointer-equals", pointer: "/name", value: "@lenticule-science/articulating" },
    ] } },
    { type: "articulating-lean-reading", parent: "articulating-reading", corner: "assertion", rung: "scott", recognize: { op: "content-includes", value: "inductive Articulating where" } },
    { type: "articulating-solidity-reading", parent: "articulating-reading", corner: "assertion", rung: "identity", recognize: { op: "content-includes", value: "contract Articulating" } },
    { type: "articulating-node-reading", parent: "articulating-reading", corner: "data", rung: "identity", recognize: { op: "content-includes", value: "export function articulatingUtter" } },
    { type: "articulating-package-reading", parent: "articulating-reading", corner: "data", rung: "identity", recognize: { op: "json-pointer-equals", pointer: "/name", value: "@lenticule-science/articulating" } },
    { type: "articulating-schema-reading", parent: "articulating-reading", corner: "assertion", rung: "non-monotone", recognize: { op: "all", clauses: [{ op: "content-includes", value: "\"$schema\"" }, { op: "content-includes", value: "articulating" }] } },
    { type: "articulating-evm-deployment-reading", parent: "articulating-reading", corner: "data", rung: "identity", recognize: { op: "all", clauses: [{ op: "json-pointer-equals", pointer: "/chainId", value: "eip155:5615610" }, { op: "content-includes", value: "org.emsenn.evm.semiotic-articulating.v1" }] } },
    { type: "articulating-rmn-reading", parent: "articulating-reading", corner: "data", rung: "identity", recognize: { op: "all", clauses: [
      { op: "content-includes", value: "createRelationalOperationProtocol" },
      { op: "content-includes", value: "application/rmn+cbor" },
      { op: "content-includes", value: "ARTICULATE_OPERATION" },
    ] } },
    { type: "articulating-a2a-reading", parent: "articulating-reading", corner: "assertion", rung: "identity", recognize: { op: "all", clauses: [
      { op: "content-includes", value: "projectSignedArticulatingAgentCard" },
      { op: "content-includes", value: "executeRelationalOperationMessage" },
      { op: "content-includes", value: "ARTICULATE_OPERATION" },
    ] } },
    { type: "articulating-mcp-reading", parent: "articulating-reading", corner: "assertion", rung: "identity", recognize: { op: "all", clauses: [
      { op: "content-includes", value: "handleArticulatingMcp" },
      { op: "content-includes", value: "articulatingApex" },
    ] } },
  ],
};

// Disk is only the reader boundary.  The cone carries a portable locator, never
// the current workstation's checkout path, into a receipt or RMN projection.
const resource = (path) => ({ path: `repo://info/${relative(INFO_ROOT, path)}`, content: readFileSync(path, "utf8") });

export function observeCurrentArticulatingCone() {
  const leanPath = resolve(OBS_ROOT, "lib/obsmetrologia/Obsmetrologia/Articulation/Articulating.lean");
  const solidityPath = resolve(OBS_ROOT, "services/articulating-services-section/src/Articulating.sol");
  const packagePath = resolve(OBS_ROOT, "services/articulating-services-section/package.json");
  const nodePath = resolve(OBS_ROOT, "services/articulating-services-section/lib/articulating/utterance.mts");
  const schemaPath = resolve(OBS_ROOT, "lib/obsmetrologia/docs/verso/mark/content/utterance/articulating/articulating.schema.json");
  const deploymentPath = resolve(OBS_ROOT, "services/articulating-services-section/content/deployments/eip155-5615610.json");
  const boundaryRoot = resolve(OBS_ROOT, "services/articulating-services-section/services/articulating-language-cone-service");
  const rmnPath = resolve(boundaryRoot, "src/rmn-face.mjs");
  const a2aPath = resolve(boundaryRoot, "src/a2a-face.mjs");
  const mcpPath = resolve(boundaryRoot, "src/mcp-face.mjs");
  const boundaryNormalForm = { apex: ARTICULATING_APEX, operation: "articulate-utterance" };
  return checkLanguageCone(compileCatalog(articulatingCatalogDeclaration, { closed: true }), {
    apex: ARTICULATING_APEX,
    region: OBS_REGION,
    requiredLegs: ["lean", "solidity", "node", "package", "schema", "evm-deployment", "rmn", "a2a", "mcp"],
    legs: [
      { name: "lean", declaredApex: ARTICULATING_APEX, resource: resource(leanPath) },
      { name: "solidity", declaredApex: ARTICULATING_APEX, resource: resource(solidityPath) },
      { name: "package", declaredApex: ARTICULATING_APEX, resource: resource(packagePath) },
      { name: "node", declaredApex: ARTICULATING_APEX, resource: resource(nodePath) },
      { name: "schema", declaredApex: ARTICULATING_APEX, resource: resource(schemaPath) },
      { name: "evm-deployment", declaredApex: ARTICULATING_APEX, resource: resource(deploymentPath) },
      { name: "rmn", declaredApex: ARTICULATING_APEX, normalForm: boundaryNormalForm, resource: resource(rmnPath) },
      { name: "a2a", declaredApex: ARTICULATING_APEX, normalForm: boundaryNormalForm, resource: resource(a2aPath) },
      { name: "mcp", declaredApex: ARTICULATING_APEX, normalForm: boundaryNormalForm, resource: resource(mcpPath) },
    ],
  });
}
