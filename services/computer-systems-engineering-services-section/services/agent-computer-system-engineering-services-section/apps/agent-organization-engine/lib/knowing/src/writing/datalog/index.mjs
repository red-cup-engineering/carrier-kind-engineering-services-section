/**
 * writing/datalog — knowing's reflective query surface over EAVT witnesses.
 *
 * EAVT rows are the extensional relation. Rules do not author another store; they
 * settle derived query facts to the least fixed point over the existing witness
 * ledger rows.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { canonical } from "@red-cup-engineering/json-services-section";
import { eavtRecord } from "@red-cup-engineering/eavt-services-section/row";

export const EAVT_RELATION = "eavt";

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

export const datalogVariableSchema = {
  $id: "knowing/writing/datalog/variable",
  title: "DatalogVariable",
  type: "object",
  required: ["kind", "name"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.variable" },
    name: { type: "string", minLength: 1 },
  },
};
export const datalogVariableCarrier = schemaFrom(datalogVariableSchema);

const datalogTermSchema = {
  anyOf: [datalogVariableSchema, jsonTermSchema],
};

export const datalogAtomSchema = {
  $id: "knowing/writing/datalog/atom",
  title: "DatalogAtom",
  type: "object",
  required: ["predicate", "terms"],
  additionalProperties: false,
  properties: {
    predicate: { type: "string", minLength: 1 },
    terms: { type: "array", items: datalogTermSchema },
  },
};
export const datalogAtomCarrier = schemaFrom(datalogAtomSchema);

export const datalogRuleSchema = {
  $id: "knowing/writing/datalog/rule",
  title: "DatalogRule",
  type: "object",
  required: ["head", "body"],
  additionalProperties: false,
  properties: {
    head: datalogAtomSchema,
    body: { type: "array", items: datalogAtomSchema },
  },
};
export const datalogRuleCarrier = schemaFrom(datalogRuleSchema);

export const datalogQuerySchema = {
  $id: "knowing/writing/datalog/query",
  title: "DatalogQuery",
  type: "object",
  required: ["kind", "rules", "find"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.query" },
    rules: { type: "array", items: datalogRuleSchema },
    find: datalogAtomSchema,
  },
};
export const datalogQueryCarrier = schemaFrom(datalogQuerySchema);

export const datalogRelationSchema = {
  $id: "knowing/writing/datalog/relation",
  title: "DatalogRelation",
  type: "object",
  required: ["predicate", "tuples"],
  additionalProperties: false,
  properties: {
    predicate: { type: "string", minLength: 1 },
    tuples: {
      type: "array",
      items: { type: "array", items: jsonTermSchema },
    },
  },
};
export const datalogRelationCarrier = schemaFrom(datalogRelationSchema);

export const datalogEvaluationSchema = {
  $id: "knowing/writing/datalog/evaluation",
  title: "DatalogEvaluation",
  type: "object",
  required: ["kind", "settled", "iterations", "relations", "answer"],
  additionalProperties: false,
  properties: {
    kind: { const: "knowing.datalog.evaluation" },
    settled: { const: true },
    iterations: { type: "integer", minimum: 0 },
    relations: { type: "array", items: datalogRelationSchema },
    answer: datalogRelationSchema,
  },
};
export const datalogEvaluationCarrier = schemaFrom(datalogEvaluationSchema);

export function variable(name) {
  return datalogVariableCarrier.assert({ kind: "knowing.datalog.variable", name });
}

export function isVariable(term) {
  return typeof term === "object"
    && term !== null
    && !Array.isArray(term)
    && (term).kind === "knowing.datalog.variable"
    && typeof (term).name === "string";
}

export function evaluateDatalog(rows, query) {
  datalogQueryCarrier.assert(query);
  validateRangeRestricted(query.rules);

  const relations = new Map();
  const delta = new Map();
  for (const row of rows.map(eavtRecord)) {
    addFact(relations, EAVT_RELATION, [row.e, row.a, row.v, row.t]);
    addFact(delta, EAVT_RELATION, [row.e, row.a, row.v, row.t]);
  }

  let iterations = 0;
  let frontier = delta;
  while (countFacts(frontier) > 0) {
    const next = new Map();
    for (const rule of query.rules) {
      deriveRule(rule, relations, frontier, next);
    }
    if (countFacts(next) === 0) break;
    iterations += 1;
    frontier = next;
  }

  const answer = relationOf(query.find.predicate, matchAtom(query.find, relations).map((binding) => tupleOf(query.find, binding)));
  const evaluation = Object.freeze({
    kind: "knowing.datalog.evaluation",
    settled: true,
    iterations,
    relations: relationList(relations),
    answer,
  });
  return datalogEvaluationCarrier.assert(evaluation);
}

function deriveRule(rule, relations, delta, next) {
  if (rule.body.length === 0) {
    addDerived(rule, new Map(), relations, next);
    return;
  }

  for (let deltaIndex = 0; deltaIndex < rule.body.length; deltaIndex += 1) {
    const predicate = rule.body[deltaIndex]?.predicate;
    if (predicate === undefined || !(delta.get(predicate)?.size)) continue;
    for (const binding of matchBody(rule.body, relations, delta, deltaIndex)) {
      addDerived(rule, binding, relations, next);
    }
  }
}

function addDerived(rule, binding, relations, next) {
  const tuple = tupleOf(rule.head, binding);
  if (addFact(relations, rule.head.predicate, tuple)) addFact(next, rule.head.predicate, tuple);
}

function matchBody(body, relations, delta, deltaIndex) {
  let bindings = [new Map()];
  for (const [index, atom] of body.entries()) {
    const relationMap = index === deltaIndex ? delta : relations;
    const facts = relationMap.get(atom.predicate) ?? new Map();
    const next = [];
    for (const binding of bindings) {
      for (const tuple of facts.values()) {
        const unified = unify(atom, tuple, binding);
        if (unified) next.push(unified);
      }
    }
    bindings = next;
    if (bindings.length === 0) break;
  }
  return bindings;
}

function matchAtom(atom, relations) {
  const facts = relations.get(atom.predicate) ?? new Map();
  const bindings = [];
  for (const tuple of facts.values()) {
    const unified = unify(atom, tuple, new Map());
    if (unified) bindings.push(unified);
  }
  return bindings;
}

function unify(atom, tuple, binding) {
  if (atom.terms.length !== tuple.length) return undefined;
  const next = new Map(binding);
  for (const [index, term] of atom.terms.entries()) {
    const value = tuple[index];
    if (value === undefined) return undefined;
    if (isVariable(term)) {
      const bound = next.get(term.name);
      if (bound === undefined) next.set(term.name, value);
      else if (canonical(bound) !== canonical(value)) return undefined;
    } else if (canonical(term) !== canonical(value)) {
      return undefined;
    }
  }
  return next;
}

function tupleOf(atom, binding) {
  return Object.freeze(atom.terms.map((term) => {
    if (!isVariable(term)) return term;
    const value = binding.get(term.name);
    if (value === undefined) throw new TypeError(`datalog: unbound variable ${term.name} in ${atom.predicate}`);
    return value;
  }));
}

function addFact(relations, predicate, tuple) {
  const facts = relations.get(predicate) ?? new Map();
  const key = canonical(tuple);
  if (facts.has(key)) return false;
  facts.set(key, Object.freeze([...tuple]));
  relations.set(predicate, facts);
  return true;
}

function relationList(relations) {
  return [...relations.entries()]
    .map(([predicate, facts]) => relationOf(predicate, [...facts.values()]))
    .sort((left, right) => left.predicate.localeCompare(right.predicate));
}

function relationOf(predicate, tuples) {
  return Object.freeze({
    predicate,
    tuples: Object.freeze([...tuples].sort(compareTuple).map((tuple) => Object.freeze([...tuple]))),
  });
}

function compareTuple(left, right) {
  return canonical(left).localeCompare(canonical(right));
}

function countFacts(relations) {
  let count = 0;
  for (const facts of relations.values()) count += facts.size;
  return count;
}

function validateRangeRestricted(rules) {
  for (const rule of rules) {
    const bound = new Set();
    for (const atom of rule.body) {
      for (const term of atom.terms) if (isVariable(term)) bound.add(term.name);
    }
    for (const term of rule.head.terms) {
      if (isVariable(term) && !bound.has(term.name)) {
        throw new TypeError(`datalog: head variable ${term.name} is not bound in the rule body`);
      }
    }
  }
}
