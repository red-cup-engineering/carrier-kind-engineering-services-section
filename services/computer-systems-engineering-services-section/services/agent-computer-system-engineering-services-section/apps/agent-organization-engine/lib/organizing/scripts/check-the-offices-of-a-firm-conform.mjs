#!/usr/bin/env node
// Checks every office record in an agency against the Group's office schema, and checks the edges
// between them resolve, as the agency registry resolves them from the firm pool root. An office whose superior does not name it back in presides-over is a claim,
// not a seat, so the graph check is not decoration: it is the half of conformance that validation
// alone cannot see.
//
//   check-the-offices-of-a-firm-conform [AGENCY_DIR] [--schemas SCHEMA_DIR] [--graph]
//
// AGENCY_DIR holds offices/, duties/ and works/ (default: the 561 Group's agency); SCHEMA_DIR holds
// office, duty and work schemas (default: the 561 Group's record schemas). --graph checks the edges,
// borne duties and owed works without schema validation. Exit 0 on PASS, 1 on any finding, 2 when the
// check cannot run.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateJsonSchema } from "@red-cup-engineering/json-schema-services-section/validation";
import { estateRootOf, houseResolver } from "../src/agency/houses.mjs";
import { agencyPools, readAgency } from "../src/agency/index.mjs";

const GROUP = fileURLToPath(new URL("../../../../../../../../../../../../561-group-services-section/", import.meta.url));

export function checkOfficesOfAFirm({ agency, schemas, graphOnly = false }) {
  const schemaOf = (name) => (graphOnly ? null : JSON.parse(readFileSync(join(schemas, `${name}.schema.json`), "utf8")));
  const officeSchema = schemaOf("office"); const dutySchema = schemaOf("duty"); const workSchema = schemaOf("work");
  const failures = [];
  const read = (pool, schema, label) => {
    const records = new Map(); const dir = join(agency, pool);
    if (!existsSync(dir)) return records;
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".json")).sort()) {
      let spec;
      try { spec = JSON.parse(readFileSync(join(dir, file), "utf8")); } catch (error) { failures.push(`${label}${file}: unreadable — ${error.message}`); continue; }
      const id = basename(file, ".json");
      records.set(id, spec);
      if (schema) {
        const result = validateJsonSchema(spec, schema);
        const seen = new Set();
        for (const issue of result.valid ? [] : result.issues) {
          // The evaluator does not name an unadmitted property; the record and its schema do.
          const extra = issue.keyword === "additionalProperties" && issue.path === "" && schema.properties
            ? `admits no ${Object.keys(spec).filter((key) => !(key in schema.properties)).join(", ")}` : issue.message;
          const finding = `${label}${file}: ${issue.path || "/"} ${extra}`;
          if (!seen.has(finding)) { seen.add(finding); failures.push(finding); }
        }
      }
      // The address carries the id, so a rename that misses one of the two is caught here rather than by a reader noticing.
      if (spec.id !== id) failures.push(`${label}${file}: id is ${spec.id}, expected ${id}`);
    }
    return records;
  };
  const offices = read("offices", officeSchema, "");
  const works = read("works", workSchema, "works/");
  const dutyRecords = read("duties", dutySchema, "duties/");

  // Edges must reach a seated office. A dangling edge is the record naming something that is not there,
  // which is the disease the apparatus exists against.
  // Edges and borne duties resolve exactly as the running engine resolves them: the agency registry read
  // from the firm pool root (the section whose lib/agency this is), with its own `resolve`. One resolver, so
  // the check and the engine cannot disagree; an edge only a filesystem walk could follow is dead at runtime.
  const firmRoot = basename(resolve(agency)) === "agency" && basename(resolve(agency, "..")) === "lib" ? resolve(agency, "..", "..") : resolve(agency, "..");
  const registry = readAgency(firmRoot, { acts: [], pools: agencyPools(firmRoot) });
  // A record in another house is named `<house-section-path>#<id>` and resolves through that house's own
  // mounted pool (organizing/agency/houses.mjs): resolved, house not mounted, or not seated there.
  // The estate is organizing's own reading of it (a configured root, else the repository's lib); a pool
  // with no estate above it reads its parent.
  let estateTop = estateRootOf(agency);
  if (!estateTop || estateTop === resolve(agency)) estateTop = resolve(agency, "..");
  const across = houseResolver(estateTop);
  const unresolvedReading = (reading, target) => reading.reading === "house-not-mounted" ? `whose house ${reading.house} is not mounted here`
    : reading.house ? `which its house ${reading.house} does not seat`
    : target.includes("#") ? "which no section of the firm pool seats" : "which is not seated in this pool";
  // An edge may name an office class rather than a seat, by the class schema's id `emsenn/office/<class>`
  // ("an office of class X", which no seat holds). It resolves when the estate keeps that class schema.
  let classes;
  const classIds = () => {
    if (classes) return classes;
    classes = new Set();
    const skip = new Set(["node_modules", ".git", "dist"]);
    const walk = (dir) => {
      let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(join(dir, entry.name)); continue; }
        if (!entry.name.endsWith(".schema.json") || basename(dir) !== "offices") continue;
        try { const id = JSON.parse(readFileSync(join(dir, entry.name), "utf8")).$id; if (typeof id === "string") classes.add(id); } catch { /* unreadable schema: not a class */ }
      }
    };
    walk(estateTop);
    return classes;
  };
  const EDGE_KEYS = ["reports-to", "presides-over", "peer-offices", "serves", "served-by", "distinguished-from"];
  for (const [id, spec] of offices) for (const key of EDGE_KEYS) {
    const raw = spec[key]; if (raw === undefined) continue;
    for (const target of Array.isArray(raw) ? raw : [raw]) {
      if (typeof target === "string" && /^emsenn\/office\/[a-z0-9]+(-[a-z0-9]+)*$/u.test(target)) {
        if (!classIds().has(target)) failures.push(`${id}.json: ${key} names the office class '${target}', which no class schema in the estate defines`);
        continue;
      }
      const reading = typeof target === "string" ? across(registry, "offices", target, "") : { reading: "unresolved" };
      if (reading.reading !== "resolved") failures.push(`${id}.json: ${key} names '${target}', ${unresolvedReading(reading, String(target))}`);
    }
  }

  // A duty's work must resolve: an obligation to do something nobody has defined is an obligation nobody
  // can meet. A duty carrying its own closure (from, to) is its own work, as the agency registry reads it.
  const duties = new Map();
  for (const [id, spec] of dutyRecords) {
    duties.set(`emsenn/duty/${id}`, spec); duties.set(id, spec);
    const ownWork = spec.from !== undefined && spec.to !== undefined;
    if (spec.work && !works.has(spec.work) && !ownWork) failures.push(`duties/${id}.json: work names '${spec.work}', which resolves to no work spec`);
  }

  // Every duty an office bears must resolve to a duty the engine reads: an office bearing an address that
  // reaches nothing has taken up no obligation, which makes it a claim rather than a seat.
  for (const [id, spec] of offices) for (const address of spec["bears-duty"] ?? []) {
    if (duties.has(address)) continue;
    const dutyId = address.replace(/^emsenn\/duty\//u, "");
    const reading = across(registry, "duties", dutyId, "");
    if (reading.reading === "resolved") continue;
    if (reading.reading === "house-not-mounted" || reading.house) { failures.push(`${id}.json: bears-duty names '${address}', ${unresolvedReading(reading, address)}`); continue; }
    const seated = registry.byId?.duties?.get(dutyId)?.length ?? 0;
    failures.push(seated > 1 ? `${id}.json: bears-duty names '${address}', which ${seated} sections of the firm pool seat, so it resolves to none`
      : `${id}.json: bears-duty names '${address}', which resolves to no duty spec in the firm pool`);
  }

  // The superior must name the subordinate back. One-way hierarchy is how a roster comes out correct only
  // because someone chose to be careful.
  for (const [id, spec] of offices) {
    const up = spec["reports-to"]; if (typeof up !== "string") continue;
    const superior = offices.get(up); if (!superior) continue;
    if (!(superior["presides-over"] ?? []).includes(id)) failures.push(`${id}.json: reports-to '${up}', but ${up} does not name it in presides-over`);
  }
  return { offices: offices.size, duties: dutyRecords.size, works: works.size, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2); const graphOnly = args.includes("--graph"); if (graphOnly) args.splice(args.indexOf("--graph"), 1);
  const at = args.indexOf("--schemas");
  const schemas = at >= 0 ? resolve(args.splice(at, 2)[1]) : join(GROUP, "data/records/schema");
  const agency = resolve(args[0] ?? join(GROUP, "lib/agency"));
  let result;
  try { result = checkOfficesOfAFirm({ agency, schemas, graphOnly }); } catch (error) { console.error(`cannot check ${agency}: ${error.message}`); process.exit(2); }
  if (result.failures.length) {
    console.error(`FAIL — ${result.failures.length} finding(s) across ${result.offices} office(s) and ${result.duties} duty(s)\n`);
    for (const failure of result.failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log(`PASS — ${result.offices} office(s), ${result.duties} duty(s), ${result.works} work(s) conform; every edge, borne duty, and owed work resolves.`);
}
