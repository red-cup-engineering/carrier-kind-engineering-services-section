// Regenerate data/schema-vocabulary.json from the published schema.org vocabulary:
//   node scripts/build-vocabulary.mjs [path-to-schemaorg-current-https.jsonld]
// Without an argument it downloads https://schema.org/version/latest/schemaorg-current-https.jsonld.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://schema.org/version/latest/schemaorg-current-https.jsonld";
const text = process.argv[2] ? fs.readFileSync(process.argv[2], "utf8") : await (await fetch(SOURCE)).text();
const graph = JSON.parse(text)["@graph"];
const name = (id) => String(id).replace(/^schema:/u, "").replace(/^https?:\/\/schema\.org\//u, "");
const ids = (value) => (value === undefined ? [] : [].concat(value).map((v) => name(v["@id"])));
const types = {};
const properties = {};
const enumerations = {};
for (const node of graph) {
  const kind = [].concat(node["@type"]);
  const id = name(node["@id"]);
  if (!String(node["@id"]).startsWith("schema:")) continue;
  if (kind.includes("rdfs:Class")) types[id] = { parents: ids(node["rdfs:subClassOf"]).sort() };
  else if (kind.includes("rdf:Property")) properties[id] = { domains: ids(node["schema:domainIncludes"]).sort(), ranges: ids(node["schema:rangeIncludes"]).sort() };
  else for (const t of kind) { const type = name(t); (enumerations[type] ??= []).push(id); }
}
const out = { source: SOURCE, types, properties, enumerations };
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../data/schema-vocabulary.json"), `${JSON.stringify(out)}\n`);
console.log(`${Object.keys(types).length} types, ${Object.keys(properties).length} properties`);
