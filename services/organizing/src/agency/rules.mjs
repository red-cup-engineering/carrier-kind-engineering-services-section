/**
 * rules — normative statements the house's accounts act under, judged before an action.
 *
 * A rule is an agency record (`<section>/lib/agency/rules/<id>.json`) stating what a subject
 * must, must not, should, should not, or may do, in the key words of BCP 14 (RFC 2119, RFC 8174):
 *
 *   { "statement": "michael561 MUST NOT sell the HoloZing Alpha Vial.",
 *     "subject": ["hive:michael561"], "action": ["hive:custom_json"],
 *     "when": { "input": { "somewhere": { "symbol": "ZINGALPHA" } } } }
 *
 * `subject` and `action` are glob patterns over account ids (`hive:*`) and action names
 * (`hive:transfer_to_savings`); `when` names the conditions, over the action's `input`, `actor`
 * and `verb`, under which the rule applies (a list of condition objects applies when any one holds); `require` names what a MUST or SHOULD rule requires of
 * an applicable action. The keyword comes from `keyword` or, failing that, from the statement.
 *
 * Judging is SignChain's: the action's facts are SignCell cells, (action, falls-under, rule) told
 * for each rule whose subject, action and conditions it meets, and (action, meets, rule) told for
 * or against a MUST or SHOULD rule's requirement; each BCP 14 rule is a SignChain rule telling
 * (action, permitted, house) (binding key words) or (action, advised, house) (SHOULD, SHOULD NOT)
 * for or against, witnessed by its derivation. The permitted cell's reading at the fixed point is
 * the judgment (unknown, held, denied, contested), and a prohibition wins over a permission: the
 * action proceeds unless the permitted cell is told against. The same rules are the governance's norms
 * (`ruleNorms`): MUST requires and MUST NOT forbids its action for the subject's members.
 */
import { readingAs } from "@red-cup-engineering/computer-data-engineering-services-section/four";
import { cell, cellSet, knowledgeReading, sameCell } from "@red-cup-engineering/signcell/cell";
import { rule as chainRule, step } from "@red-cup-engineering/signchain/rules";

/** BCP 14 key words, strongest first, with their force and direction. */
export const BCP14 = Object.freeze([
  ["MUST NOT", "binding", "forbid"], ["SHALL NOT", "binding", "forbid"],
  ["SHOULD NOT", "advisory", "forbid"], ["NOT RECOMMENDED", "advisory", "forbid"],
  ["MUST", "binding", "require"], ["SHALL", "binding", "require"], ["REQUIRED", "binding", "require"],
  ["SHOULD", "advisory", "require"], ["RECOMMENDED", "advisory", "require"],
  ["MAY", "permission", "permit"], ["OPTIONAL", "permission", "permit"],
].map(([keyword, force, direction]) => Object.freeze({ keyword, force, direction })));

const strings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.length > 0) : typeof value === "string" && value.length > 0 ? [value] : []);

/** The BCP 14 key word a rule states: its `keyword`, else the first key word in its statement. */
export function keywordOf(rule) {
  const named = typeof rule.keyword === "string" ? rule.keyword.trim().toUpperCase() : undefined;
  if (named) return BCP14.find((entry) => entry.keyword === named);
  const statement = String(rule.statement ?? "");
  return BCP14.find((entry) => new RegExp(`\\b${entry.keyword}\\b`).test(statement));
}

/** A rule record as the registry keeps it. */
export function normalizeRule(id, raw = {}) {
  return {
    id: typeof raw.id === "string" ? raw.id : id,
    name: raw.name ?? id,
    statement: raw.statement ?? "",
    keyword: keywordOf(raw)?.keyword,
    subject: strings(raw.subject).length ? strings(raw.subject) : ["*"],
    action: strings(raw.action).length ? strings(raw.action) : ["*"],
    when: Array.isArray(raw.when) ? raw.when.filter((c) => c && typeof c === "object") : raw.when && typeof raw.when === "object" ? raw.when : {},
    require: raw.require && typeof raw.require === "object" ? raw.require : {},
    because: raw.because,
  };
}

const globCache = new Map();
/** Does `value` match the glob `pattern` (`*` any run of characters, case-insensitive)? */
export function globMatches(pattern, value) {
  let re = globCache.get(pattern);
  if (!re) {
    re = new RegExp(`^${pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "i");
    globCache.set(pattern, re);
  }
  return re.test(String(value ?? ""));
}

/** Every object nested in a value, the value itself included. */
function nested(value, out = []) {
  if (Array.isArray(value)) { for (const item of value) nested(item, out); return out; }
  if (value && typeof value === "object") { out.push(value); for (const item of Object.values(value)) nested(item, out); }
  return out;
}

const valueAt = (context, dotted) => dotted.split(".").reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), context);

/** Does one observed value meet one matcher? A bare value is equality (strings case-insensitive). */
export function meets(value, matcher) {
  if (matcher === null || typeof matcher !== "object" || Array.isArray(matcher)) {
    return typeof matcher === "string" && typeof value === "string" ? matcher.toLowerCase() === value.toLowerCase() : Object.is(matcher, value) || String(matcher) === String(value);
  }
  return Object.entries(matcher).every(([test, expected]) => {
    switch (test) {
      case "equals": return meets(value, expected);
      case "in": return Array.isArray(expected) && expected.some((item) => meets(value, item));
      case "not": return !meets(value, expected);
      case "exists": return (value !== undefined && value !== null) === Boolean(expected);
      case "gt": return Number(value) > Number(expected);
      case "gte": return Number(value) >= Number(expected);
      case "lt": return Number(value) < Number(expected);
      case "lte": return Number(value) <= Number(expected);
      case "matches": return new RegExp(expected, "i").test(String(value ?? ""));
      case "contains": return Array.isArray(value) ? value.some((item) => meets(item, expected)) : String(value ?? "").toLowerCase().includes(String(expected).toLowerCase());
      case "any": return Array.isArray(expected) && expected.some((m) => meets(value, m));
      // Some object nested anywhere in the value meets every condition (paths relative to it).
      case "somewhere": return nested(value).some((object) => holds(expected, object));
      // No object nested in the value meets them.
      case "nowhere": return !nested(value).some((object) => holds(expected, object));
      default: throw new TypeError(`rules: unknown condition ${test}`);
    }
  });
}

/** Do a rule's conditions hold over the action context? An object's conditions all hold; a list
 *  holds when any one of its objects does. */
export const holds = (conditions, context) => Array.isArray(conditions)
  ? conditions.some((each) => holds(each, context))
  : Object.entries(conditions).every(([dotted, matcher]) => meets(valueAt(context, dotted), matcher));

/** Does a rule bind this actor for this verb, under its conditions? */
export function applies(rule, { actor, verb, input }) {
  return rule.subject.some((pattern) => globMatches(pattern, actor))
    && rule.action.some((pattern) => globMatches(pattern, verb))
    && holds(rule.when, { input, actor, verb });
}

const empty = (conditions) => (Array.isArray(conditions) ? conditions.length === 0 : Object.keys(conditions ?? {}).length === 0);

/** Does a rule carry a check the machine can run? It does when its subject or its action names
 *  something narrower than every account or every verb, or it states conditions (`when`) or a
 *  requirement (`require`). A rule stated only in prose over every actor and every verb names no
 *  check: judged as written, a MUST NOT of that kind would forbid every action of every actor. */
export function ruleIsComplete(rule) {
  const every = (patterns) => patterns.every((pattern) => pattern === "*");
  return !every(rule.subject) || !every(rule.action) || !empty(rule.when) || !empty(rule.require);
}

/** The binding rules that carry no machine check: each is work to complete, never a refusal. */
export function incompleteRules(agency) {
  return [...(agency.rules?.values() ?? [])]
    .filter((rule) => BCP14.find((entry) => entry.keyword === rule.keyword)?.force === "binding" && !ruleIsComplete(rule))
    .map((rule) => Object.freeze({ rule: rule.key ?? rule.id, statement: rule.statement, keyword: rule.keyword }));
}

/** Every rule of the registry (an agency whose `rules` pool is read) binding `actor`. */
export function rulesFor(agency, actor) {
  return [...(agency.rules?.values() ?? [])].filter((rule) => rule.subject.some((pattern) => globMatches(pattern, actor)));
}

const HOUSE = "house";
const FOR = "potential";      // FOUR's point told for only
const AGAINST = "active";     // told against only

/** The SignChain rules a BCP 14 rule stands for, over one action's cells. */
function chainRulesOf(rule, action, bcp) {
  const key = rule.key ?? rule.id;
  const under = cell(action, "falls-under", key);
  const meets = cell(action, "meets", key);
  const verdict = cell(action, bcp.force === "advisory" ? "advised" : "permitted", HOUSE);
  if (bcp.direction === "forbid") return [chainRule(`${key}:forbids`, [{ cell: under, atLeast: FOR }], { cell: verdict, reading: AGAINST })];
  if (bcp.direction === "permit") return [chainRule(`${key}:permits`, [{ cell: under, atLeast: FOR }], { cell: verdict, reading: FOR })];
  return [
    chainRule(`${key}:met`, [{ cell: under, atLeast: FOR }, { cell: meets, atLeast: FOR }], { cell: verdict, reading: FOR }),
    chainRule(`${key}:unmet`, [{ cell: under, atLeast: FOR }, { cell: meets, atLeast: AGAINST }], { cell: verdict, reading: AGAINST }),
  ];
}

/** Iterate SignChain's immediate-consequence step to its fixed point above the seed. */
function fixedPoint(rules, seed) {
  let valuation = seed;
  for (let round = 0; round < 8; round += 1) {
    const next = step(rules, valuation);
    if (next.length === valuation.length && next.every((value, index) => value.for.length === valuation[index].for.length && value.against.length === valuation[index].against.length)) return next;
    valuation = next;
  }
  return valuation;
}

/**
 * Judge an intended action `{ actor, verb, input }` against the registry's rules: the action's
 * facts are told as cells, every applicable rule is a SignChain rule over them, and the judgment
 * is the (action, permitted, house) cell's reading at the fixed point, with the rules whose
 * derivations told it. Refuse when that cell is told against. A rule that carries no machine
 * check (`ruleIsComplete`) tells nothing about the action: whether the action falls under it is
 * unknown, not refused, so it is listed as `incomplete` for completion and never decides.
 */
export function judgeAction(agency, action) {
  const token = Object.freeze({ actor: action.actor, verb: action.verb });
  const facts = [];
  const rules = [];
  const statements = new Map();
  const incomplete = [];
  for (const rule of agency.rules?.values() ?? []) {
    if (!applies(rule, action)) continue;
    const bcp = BCP14.find((entry) => entry.keyword === rule.keyword);
    if (!bcp) continue;
    const key = rule.key ?? rule.id;
    if (!ruleIsComplete(rule)) {
      if (bcp.force === "binding") incomplete.push(rule.statement || key);
      continue;
    }
    statements.set(key, { statement: rule.statement, keyword: rule.keyword, force: bcp.force, ...(rule.because ? { because: rule.because } : {}) });
    facts.push(cell(token, "falls-under", key, { for: [{ rule: key, observed: "conditions" }] }));
    if (bcp.direction === "require") {
      const met = holds(rule.require, { input: action.input, actor: action.actor, verb: action.verb });
      facts.push(cell(token, "meets", key, met ? { for: [{ rule: key, observed: "requirement" }] } : { against: [{ rule: key, observed: "requirement" }] }));
    }
    rules.push(...chainRulesOf(rule, token, bcp));
  }
  const valuation = fixedPoint(rules, cellSet(facts));
  const verdictOf = (predicate) => valuation.find((value) => sameCell(value, cell(token, predicate, HOUSE)));
  const permitted = verdictOf("permitted");
  const advised = verdictOf("advised");
  const keyOf = (witness) => String(witness.rule).replace(/:(forbids|permits|met|unmet)$/u, "");
  const findings = [];
  for (const [verdict, force] of [[permitted, "binding"], [advised, "advisory"]]) {
    if (!verdict) continue;
    for (const [side, told] of [["for", "for"], ["against", "against"]]) {
      for (const witness of verdict[side]) {
        const key = keyOf(witness);
        const stated = statements.get(key) ?? {};
        findings.push(Object.freeze({ rule: key, ...stated, force: stated.force ?? force, told, derivation: witness }));
      }
    }
  }
  const reading = permitted ? readingAs("extremal", knowledgeReading(permitted)) : "unknown";
  const refusals = findings.filter((f) => f.force !== "advisory" && f.told === "against");
  return Object.freeze({
    kind: "organizing.rules.judgment",
    actor: action.actor,
    verb: action.verb,
    reading,
    decision: refusals.length > 0 ? "refuse" : "proceed",
    reasons: Object.freeze(refusals.map((f) => f.statement || f.rule)),
    advice: Object.freeze(findings.filter((f) => f.force === "advisory" && f.told === "against").map((f) => f.statement || f.rule)),
    incomplete: Object.freeze(incomplete),
    findings: Object.freeze(findings),
  });
}

/** The rules as governance norms: each binding rule's subject pattern is a collective whose
 *  members its MUST requires, and its MUST NOT forbids, the action. A rule with no machine
 *  check binds nothing it can name, so it is no norm until it is completed. */
export function ruleNorms(agency) {
  const norms = [];
  for (const rule of agency.rules?.values() ?? []) {
    const bcp = BCP14.find((entry) => entry.keyword === rule.keyword);
    if (!bcp || bcp.force !== "binding" || bcp.direction === "permit" || !ruleIsComplete(rule)) continue;
    for (const subject of rule.subject) {
      norms.push({ id: `${rule.key ?? rule.id}:${subject}`, of: `rule-subject:${subject}`, binds: rule.action.map((action) => ({ constraint: bcp.direction === "forbid" ? { forbid: action } : { require: action } })) });
    }
  }
  return norms;
}
