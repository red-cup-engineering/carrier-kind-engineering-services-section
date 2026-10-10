import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  officeCoordinationBoundary,
  officeReading,
  readAgency,
  resolve,
} from "../src/agency/index.mjs";

const office = (id, extra = {}) => ({
  id,
  name: id.replaceAll("-", " "),
  kind: "office",
  "normative-structure": "fixture",
  "deontic-profile": {},
  jurisdiction: "561-group",
  ...extra,
});

test("office replacement preserves historical identity only for receiving continuity", () => {
  const root = mkdtempSync(path.join(tmpdir(), "agency-office-replacement-"));
  try {
    const section = "services/561-group-services-section";
    const offices = path.join(root, section, "lib", "agency", "offices");
    mkdirSync(offices, { recursive: true });

    writeFileSync(path.join(offices, "chief-science-officer.json"), JSON.stringify(office(
      "chief-science-officer",
      {
        "peer-offices": ["chief-technology-officer"],
        "replaces-office": ["chief-knowledge-officer"],
      },
    ), null, 2));
    writeFileSync(path.join(offices, "chief-technology-officer.json"), JSON.stringify(office(
      "chief-technology-officer",
      { "peer-offices": ["chief-science-officer"] },
    ), null, 2));

    const agency = readAgency(root, { acts: [] });
    const cso = officeReading(agency, "chief-science-officer");
    assert.deepEqual(cso.replacesOffice, ["chief-knowledge-officer"]);

    assert.equal(resolve(agency, "offices", "chief-knowledge-officer"), undefined);
    assert.equal(
      [...agency.offices.values()].some(candidate => candidate.id === "chief-knowledge-officer"),
      false,
    );

    const cto = officeCoordinationBoundary(agency, "chief-technology-officer");
    assert.ok(cto.receivesFrom.includes("chief-science-officer"));
    assert.ok(cto.receivesFrom.includes("chief-knowledge-officer"));
    assert.ok(cto.receivesFrom.includes(`${section}#chief-knowledge-officer`));
    assert.equal(cto.assignsTo.includes("chief-knowledge-officer"), false);
    assert.equal(cto.assignsTo.includes(`${section}#chief-knowledge-officer`), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
