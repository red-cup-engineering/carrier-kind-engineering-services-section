/**
 * writing/sparql — SPARQL/RDF as knowing's QUERY projection over RWIL.
 *
 * A Basic Graph Pattern is a conjunction of witnessed RDF-ish triples. RWIL
 * already stores those as EAVT witnesses, and knowing already evaluates
 * conjunction through Datalog. This module only maps the SPARQL query shapes
 * onto that evaluator; it does not introduce a parser or a second store.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical } from "@red-cup-engineering/json-services-section";

import { iriRef, turtleLiteral } from "@red-cup-engineering/turtle-services-section/turtle";

import {
  evaluateDatalog,
  variable as datalogVariable,

} from "../datalog/index.mjs";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";
import { triplesToTurtle } from "@red-cup-engineering/computer-triplet-serialized-content-engineering-services-section/sparql-over-eavt";

const jsonTermSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "integer" },
    { type: "boolean" },
    { type: "null" },
    { type: "array" },
    { type: "object" },
  ],
};

const eavtRecordSchema = {
  type: "object",
  required: ["e", "a", "v", "t"],
  additionalProperties: false,
  properties: {
    e: jsonTermSchema,
    a: jsonTermSchema,
    v: jsonTermSchema,
    t: jsonTermSchema,
  },
};

export const chronicleLedgerQuerySchema = {
  $id: "knowing/writing/sparql/chronicle-ledger-query",
  title: "ChronicleLedgerQuery",
  description:
    "A SPARQL BGP query over a hub chronicle ledger: the rows stay EAVT and the query lowers through knowing's Datalog evaluator.",
  type: "object",
  required: ["kind", "rows", "query"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.chronicle-ledger-query" },
    rows: { type: "array", items: eavtRecordSchema },
    query: { $ref: "knowing/writing/sparql/query" },
  },
};

export const chronicleLedgerQueryCarrier = schemaFrom(chronicleLedgerQuerySchema);

export const HUB_ASSIGNMENT_PREDICATE = "hub.assignment";
export const HUB_SESSION_MASK_PREDICATE = "hub.session.mask";

export const sparqlVariableSchema = {
  $id: "knowing/writing/sparql/variable",
  title: "SparqlVariable",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.variable" },
    name: { type: "string", minLength: 1 },
  },
};
export const sparqlVariableCarrier = schemaFrom(sparqlVariableSchema);

const sparqlTermSchema = {
  anyOf: [sparqlVariableSchema, jsonTermSchema],
};

export const sparqlTriplePatternSchema = {
  $id: "knowing/writing/sparql/triple-pattern",
  title: "SparqlTriplePattern",
  type: "object",
  required: ["s", "p", "o"],
  additionalProperties: false,
  properties: {
    s: sparqlTermSchema,
    p: sparqlTermSchema,
    o: sparqlTermSchema,
  },
};
export const sparqlTriplePatternCarrier = schemaFrom(sparqlTriplePatternSchema);

export const sparqlQuerySchema = {
  $id: "knowing/writing/sparql/query",
  title: "SparqlQuery",
  type: "object",
  required: ["kind", "type", "where"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.query" },
    type: { enum: ["select", "ask", "construct"] },
    where: { type: "array", items: sparqlTriplePatternSchema },
    select: { type: "array", items: { type: "string", minLength: 1 } },
    construct: { type: "array", items: sparqlTriplePatternSchema },
  },
};
export const sparqlQueryCarrier = schemaFrom(sparqlQuerySchema);

const jsonObjectSchema = { type: "object" };

export const sparqlResultSchema = {
  $id: "knowing/writing/sparql/result",
  title: "SparqlResult",
  type: "object",
  required: ["kind", "type", "variables", "bindings", "ask", "triples", "turtle", "datalog"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.sparql.result" },
    type: { enum: ["select", "ask", "construct"] },
    variables: { type: "array", items: { type: "string" } },
    bindings: { type: "array", items: jsonObjectSchema },
    ask: { type: "boolean" },
    triples: { type: "array", items: sparqlTriplePatternSchema },
    turtle: { type: "string" },
    datalog: { type: "object" },
  },
};
export const sparqlResultCarrier = schemaFrom(sparqlResultSchema);

const ANSWER = "__sparql_answer";

export function sparqlVariable(name) {
  return sparqlVariableCarrier.assert({ kind: "knowing.sparql.variable", name });
}

export function isSparqlVariable(term) {
  return typeof term === "object"
    && term !== null
    && !Array.isArray(term)
    && (term).kind === "knowing.sparql.variable"
    && typeof (term).name === "string";
}

export function triplePattern(s, p, o) {
  return sparqlTriplePatternCarrier.assert({ s, p, o });
}

export function evaluateSparql(rows, query) {
  sparqlQueryCarrier.assert(query);
  const variables = variablesFor(query);
  const datalog = evaluateDatalog(rows, datalogQueryOf(query, variables));
  const bindings = bindingsOf(variables, datalog.answer.tuples);
  const triples = query.type === "construct" ? constructTriples(query.construct ?? query.where, bindings) : [];
  const result = Object.freeze({
    kind: "knowing.sparql.result",
    type: query.type,
    variables: Object.freeze([...variables]),
    bindings,
    ask: bindings.length > 0,
    triples,
    turtle: triplesToTurtle(triples),
    datalog,
  });
  sparqlResultCarrier.assert(result);
  return result;
}

// evaluateSparqlFromWitnessLog quarantined: relied on WitnessStore/readWitnessLog, which are not part of @red-cup-engineering/relating's public exports map (no `./ledger` or other subpath surfaces them).

/** Evaluate a carried hub chronicle query by reusing the SPARQL-to-Datalog projection. */
export function evaluateChronicleLedgerQuery(input) {
  chronicleLedgerQueryCarrier.assert(input, "evaluateChronicleLedgerQuery input");
  return evaluateSparql(input.rows, input.query);
}

/** Query sessions currently witnessed as assigned to a package/path. */
export function sessionsAssignedToQuery(packagePath) {
  return sparqlQueryCarrier.assert({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["session"]),
    where: Object.freeze([triplePattern(sparqlVariable("session"), HUB_ASSIGNMENT_PREDICATE, packagePath)]),
  });
}

/** Query masks published by one session actor. */
export function masksOfSessionQuery(session) {
  return sparqlQueryCarrier.assert({
    kind: "knowing.sparql.query",
    type: "select",
    select: Object.freeze(["mask"]),
    where: Object.freeze([triplePattern(session, HUB_SESSION_MASK_PREDICATE, sparqlVariable("mask"))]),
  });
}

function datalogQueryOf(query, variables) {
  const seen = new Map();
  const termOf = (term) => {
    if (!isSparqlVariable(term)) return term;
    const existing = seen.get(term.name);
    if (existing !== undefined) return existing;
    const next = datalogVariable(term.name);
    seen.set(term.name, next);
    return next;
  };

  const body = query.where.map((pattern, index) => Object.freeze({
    predicate: "eavt",
    terms: Object.freeze([
      termOf(pattern.s),
      termOf(pattern.p),
      termOf(pattern.o),
      datalogVariable(`__sparql_time_${index}`),
    ]),
  }));
  const find = Object.freeze({
    predicate: ANSWER,
    terms: Object.freeze(variables.map((name) => {
      const found = seen.get(name);
      if (found !== undefined) return found;
      const next = datalogVariable(name);
      seen.set(name, next);
      return next;
    })),
  });
  return Object.freeze({
    kind: "knowing.datalog.query",
    rules: Object.freeze([Object.freeze({ head: find, body })]),
    find,
  });
}

function variablesFor(query) {
  if (query.type === "select" && query.select !== undefined) return Object.freeze([...query.select]);
  if (query.type === "ask") return Object.freeze([]);
  const source = query.type === "construct" ? [...(query.construct ?? []), ...query.where] : query.where;
  const names = [];
  const seen = new Set();
  const add = (term) => {
    if (!isSparqlVariable(term) || seen.has(term.name)) return;
    seen.add(term.name);
    names.push(term.name);
  };
  for (const pattern of source) {
    add(pattern.s);
    add(pattern.p);
    add(pattern.o);
  }
  return Object.freeze(names);
}

function bindingsOf(variables, tuples) {
  return Object.freeze(tuples.map((tuple) => Object.freeze(Object.fromEntries(
    variables.map((name, index) => [name, tuple[index] ?? null]),
  ))));
}

function constructTriples(
  template,
  bindings,
) {
  const triples = new Map();
  for (const binding of bindings) {
    for (const pattern of template) {
      const triple = instantiate(pattern, binding);
      const key = canonical(triple);
      triples.set(key, triple);
    }
  }
  return Object.freeze([...triples.values()].sort((left, right) =>
    canonical(left).localeCompare(canonical(right))));
}

function instantiate(pattern, binding) {
  return Object.freeze({
    s: valueOf(pattern.s, binding),
    p: valueOf(pattern.p, binding),
    o: valueOf(pattern.o, binding),
  });
}

function valueOf(term, binding) {
  if (!isSparqlVariable(term)) return term;
  const value = binding[term.name];
  if (value === undefined) throw new TypeError(`sparql: unbound variable ${term.name} in CONSTRUCT template`);
  return value;
}

function subjectOrPredicate(value) {
  return iriRef(typeof value === "string" ? value : canonical(value));
}

function objectTerm(value) {
  return typeof value === "string" && /^[a-z][a-z0-9+.-]*:/i.test(value) ? iriRef(value) : turtleLiteral(value);
}

export function triplesFromEavt(rows) {
  return Object.freeze(rows.map((row) => {
    const record = eavtRecord(row);
    return Object.freeze({ s: record.e, p: record.a, o: record.v });
  }));
}
