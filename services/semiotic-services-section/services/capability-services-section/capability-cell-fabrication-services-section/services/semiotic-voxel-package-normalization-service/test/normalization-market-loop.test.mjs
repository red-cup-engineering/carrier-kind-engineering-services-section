import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as broker from "../../../../../../../resource-brokerage-service-section/src/normalization-brokerage.mjs";
import { CATALOG_PROFILE, checkLanguageCone, compileCatalog, receiptRmn, semanticId } from "../../../../../../../software-development-services-section/services/typed-resource-catalog-service/src/index.mjs";
import { coordinateBrokeredNormalization } from "../src/normalization-market-loop.mjs";

const expectedRegion = "repo://info/lib/emsenn/services/561-group/services/lenticule-science/services/obsmetrological-services-section";
const catalog = compileCatalog({ profile: CATALOG_PROFILE, nodes: [{ type: "node-reading", parent: null, corner: "data", rung: "identity", recognize: { op: "content-includes", value: "articulating" } }] });
const inventory = Object.freeze({ type: "CapacityInventoryObservation", witness: semanticId({ source: "injected-capacity-inventory" }), observedAt: "2026-07-28T00:00:00.000Z", capacity: { cpuMilliCores: 1000, ramBytes: 256 * 1024 ** 2, diskBytes: 1024 ** 3, gpuUnits: 0, networkBytesPerSecond: 1024 ** 2 }, consideration: { amount: 7, unit: broker.RESOLUTION_CREDIT_UNIT } });

test("coordinates a real TRC cone through brokerage selection, one injected rename, and brokered settlement", async () => {
  const root = await mkdtemp(join(tmpdir(), "brokered-normalization-"));
  const from = "legacy/utterance.mjs", to = "services/articulating-services-section/node/utterance.mjs";
  try {
    await mkdir(join(root, "legacy"), { recursive: true });
    await writeFile(join(root, from), "export const articulating = true;\n");
    const content = await readFile(join(root, from), "utf8");
    const cone = checkLanguageCone(catalog, { apex: "urn:obsmetrologia:articulating", region: expectedRegion, requiredLegs: ["node"], legs: [{ name: "node", declaredApex: "urn:obsmetrologia:articulating", resource: { path: `repo://info/${from}`, content } }] });
    const nodeResource = cone.legs[0].resource;
    const observe = async ({ path }) => {
      const diskPath = path.endsWith(`/${to}`) ? to : from;
      return { resource: nodeResource, contentDigest: semanticId({ bytes: await readFile(join(root, diskPath), "utf8") }), path };
    };
    const cycle = await coordinateBrokeredNormalization({
      broker, trcReceipt: cone, trcRmn: receiptRmn(cone), placementPlan: { leg: "node", from: `repo://info/${from}`, to: `${expectedRegion}/${to}` },
      buyer: broker.BARE_CEDAR_FOG, supplier: broker.BARE_CEDAR_FOG, inventory, publication: broker.publicationPending(), observe,
      actuate: async (move) => { assert.equal(move.type, "BrokeredBoundedNormalizationMove"); await mkdir(join(root, "services/articulating-services-section/node"), { recursive: true }); await rename(join(root, from), join(root, to)); },
      at: "2026-07-28T00:01:00.000Z",
    });
    assert.equal(cycle.selection.sameActorPermitted, true);
    assert.equal(cycle.settlement.outcome, "success");
    assert.equal((await readFile(join(root, to), "utf8")).includes("articulating"), true);
  } finally { await rm(root, { recursive: true, force: true }); }
});
