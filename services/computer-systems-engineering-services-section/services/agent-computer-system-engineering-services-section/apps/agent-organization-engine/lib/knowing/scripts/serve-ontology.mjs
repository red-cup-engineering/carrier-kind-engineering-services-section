#!/usr/bin/env node
// Load the glossary's SKOS JSON-LD into an Oxigraph store and serve it read-only over the SPARQL 1.1 Protocol.
import { join } from "node:path";
//   node scripts/serve-ontology.mjs --jsonld <public.jsonld> --location <store dir> [--bind 127.0.0.1:7878] [--oxigraph <binary>]
import { existsSync } from "node:fs";
import { loadOntology, serveOntology } from "../src/writing/sparql/ontology.mjs";

const args = process.argv.slice(2);
const val = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const location = val("--location");
const jsonld = val("--jsonld");
if (!location || !jsonld) { console.error("usage: serve-ontology.mjs --jsonld <file> --location <store dir> [--bind host:port] [--oxigraph <binary>]"); process.exit(2); }
const oxigraph = val("--oxigraph", "oxigraph");
if (!existsSync(join(location, "CURRENT"))) loadOntology({ oxigraph, location, jsonld });
const { endpoint } = await serveOntology({ oxigraph, location, bind: val("--bind", "127.0.0.1:7878") });
console.error(`SPARQL endpoint: ${endpoint}`);
