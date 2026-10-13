import { test } from "node:test";
import assert from "node:assert/strict";
import { makeInference, infer, inferSettled } from "../../src/inference/infer.mjs";
import { rule } from "@red-cup-engineering/signchain/rules";
import { semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

// Raw inference over a real house domain: the import-stratification law and
// custody rules, encoded as data. The kernel derives lawfulness verdicts a
// session would otherwise burn transformer inference to reach.
const HOUSE = makeInference({
  attributes: [
    "is-script", "is-app", "is-src", "imports-app", "imports-script", "imports-src",
    "stratification-violation", "lawful-import", "protocol-face", "inside-science-package",
    "custody-violation", "is-published", "has-consumer", "breaking-diff", "publish-blocked",
    "needs-finding", "exact-pinned", "registry-canonical", "install-sound",
  ],
  rules: [
    { name: "law:script-no-app", if: ["is-script", "imports-app"], then: ["stratification-violation"] },
    { name: "law:script-script-ok", if: ["is-script", "imports-script"], then: ["lawful-import"] },
    { name: "law:app-imports-ok", if: ["is-app", "imports-script"], then: ["lawful-import"] },
    { name: "law:protocol-custody", if: ["protocol-face", "inside-science-package"], then: ["custody-violation"] },
    { name: "law:violation-filed", if: ["stratification-violation"], then: ["needs-finding"] },
    { name: "law:custody-filed", if: ["custody-violation"], then: ["needs-finding"] },
    { name: "gate:breaking-blocks", if: ["is-published", "has-consumer", "breaking-diff"], then: ["publish-blocked"] },
    { name: "reg:pins-sound", if: ["exact-pinned", "registry-canonical"], then: ["install-sound"] },
  ],
});

test("raw inference: multi-hop derivation arrives with its full witness chain", () => {
  const out = infer(HOUSE, {
    facts: ["is-script", "imports-app"],
    query: "needs-finding",
  });
  assert.equal(out.verdict, "potential");
  const steps = out.witness.map((w) => w.by);
  assert.ok(steps.includes("given"));
  assert.ok(steps.includes("law:script-no-app"));
  assert.ok(steps.includes("law:violation-filed"));
  const last = out.witness[out.witness.length - 1];
  assert.equal(last.attr, "needs-finding");
  assert.deepEqual(last.premises, ["stratification-violation"]);
});

test("opt-in kinematic plan exposes the actual inference critical path without changing ordinary verdict output", () => {
  const input={ facts:["is-script","imports-app"], query:"needs-finding" };
  const ordinary=infer(HOUSE,input);
  assert.equal(Object.hasOwn(ordinary,"motion"),false);
  const planned=infer(HOUSE,{...input,includeMotion:true});
  assert.deepEqual(planned.witness,ordinary.witness);
  assert.deepEqual(planned.motion.stages.map(x=>x.attr),planned.witness.map(x=>x.attr));
  assert.equal(planned.motion.criticalPathLength,2);
  assert.equal(planned.motion.eventCount,4);
  for(const node of planned.witness){
    const stage=planned.motion.stages.find(x=>x.attr===node.attr).stage;
    for(const premise of node.premises){
      assert.ok(planned.motion.stages.find(x=>x.attr===premise).stage<stage);
    }
  }
  const contested=infer(HOUSE,{
    facts:["is-script","imports-script"],
    denials:["is-app","imports-script"],
    query:"lawful-import",includeMotion:true
  });
  assert.ok(contested.motion);
  assert.ok(contested.counterMotion);
  assert.deepEqual(contested.counterMotion.stages.map(x=>x.attr),contested.counterWitness.map(x=>x.attr));
});

test("raw inference: contested verdicts survive with both chains and a refusal number", () => {
  const out = infer(HOUSE, {
    facts: ["is-script", "imports-script"],
    denials: ["is-app", "imports-script"],
    query: "lawful-import",
    conductances: [
      ["is-script", "imports-script", 1],
      ["is-app", "imports-script", 1],
      ["imports-script", "lawful-import", 1],
    ],
  });
  assert.equal(out.verdict, "stable");
  assert.ok(out.witness && out.counterWitness);
  assert.ok(out.witness.some((w) => w.by === "law:script-script-ok"));
  assert.ok(out.counterWitness.some((w) => w.by === "law:app-imports-ok"));
  assert.ok(out.refusal > 0 && Number.isFinite(out.refusal));
});

test("raw inference: a head-on contradiction with identical chains has refusal zero", () => {
  const out = infer(HOUSE, {
    facts: ["is-script", "imports-script"],
    denials: ["is-script", "imports-script"],
    query: "lawful-import",
    conductances: [["is-script", "imports-script", 1]],
  });
  assert.equal(out.verdict, "stable");
  assert.equal(out.refusal, 0);
});

test("raw inference: the underdetermined case returns typed questions, not a guess", () => {
  const out = infer(HOUSE, {
    facts: ["is-published", "breaking-diff"],
    query: "publish-blocked",
  });
  assert.equal(out.verdict, "absurd");
  assert.equal(out.witness, null);
  assert.equal(out.questions.length, 1);
  assert.deepEqual(out.questions[0].missing, ["has-consumer"]);
});

test("raw inference: negative lane derives independently (denial chains work)", () => {
  const out = infer(HOUSE, {
    facts: [],
    denials: ["protocol-face", "inside-science-package"],
    query: "custody-violation",
  });
  assert.equal(out.verdict, "active");
  assert.ok(out.counterWitness.some((w) => w.by === "law:protocol-custody"));
});

test("settled variant: same rules through sigma/settle, receipts included", () => {
  const out = inferSettled(HOUSE, "messaging-cluster", ["protocol-face", "inside-science-package"]);
  assert.equal(out.holds["custody-violation"], true);
  assert.equal(out.holds["needs-finding"], true);
  assert.ok(out.steps >= 1);
  assert.ok(out.trace.length >= 1);
});

test("scale check: raw inference stays fast on a thousand-rule base", () => {
  const attrs = [];
  const rules = [];
  for (let i = 0; i < 1000; i++) {
    attrs.push(`p${i}`);
    if (i > 0) rules.push({ name: `chain-${i}`, if: [`p${i - 1}`], then: [`p${i}`] });
  }
  const eng = makeInference({ attributes: attrs, rules });
  const t0 = process.hrtime.bigint();
  const out = infer(eng, { facts: ["p0"], query: "p999" });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(out.verdict, "potential");
  assert.equal(out.witness.length, 1000);
  console.log(`thousand-hop derivation with full witness chain: ${ms.toFixed(1)}ms`);
  assert.ok(ms < 5000);
});

test("verdict witness DAGs retain complete rule identity in both evidence lanes", () => {
  const engine = makeInference({ attributes: ["input", "output"], rules: [
    { name: "same-label", if: ["input"], then: ["output"] },
  ] });
  const result = infer(engine, { facts: ["input"], denials: ["input"], query: "output" });
  const positive = result.witness.find(w => w.attr === "output");
  const negative = result.counterWitness.find(w => w.attr === "output");
  assert.equal(positive.by, "same-label");
  assert.equal(negative.by, "same-label");
  assert.equal(typeof positive.ruleId, "string");
  assert.equal(typeof negative.ruleId, "string");
  assert.notEqual(positive.ruleId, negative.ruleId);
  const at = predicate => ({ subject: "signcraft.inference", predicate, object: "signcraft.inference" });
  for (const [witness, reading] of [[positive, "potential"], [negative, "active"]]) {
    assert.equal(witness.ruleId, semanticId(rule("same-label", [{ cell: at("input"), atLeast: reading }], { cell: at("output"), reading })));
  }
  assert.deepEqual(positive.premises, ["input"]);
  assert.equal(Object.hasOwn(result.witness.find(w => w.attr === "input"), "ruleId"), false);
  assert.equal(JSON.parse(JSON.stringify(result)).witness.find(w => w.attr === "output").ruleId, positive.ruleId);
});


test("infer opt-in receives actual signed two-lane rule replay without altering ordinary inference", () => {
  const input = {
    facts: ["is-script", "imports-script"],
    denials: ["is-app", "imports-script"],
    query: "lawful-import",
  };
  const ordinary = infer(HOUSE, input);
  assert.equal(Object.hasOwn(ordinary, "signedMotion"), false);
  const result = infer(HOUSE, { ...input, includeSignedMotion: true });
  assert.equal(result.verdict, ordinary.verdict);
  assert.deepEqual(result.witness, ordinary.witness);
  assert.deepEqual(result.counterWitness, ordinary.counterWitness);
  assert.equal(result.signedMotion.kind, "signcraft.proofMotionCarrier.v1");
  assert.equal(result.signedMotion.admissionLevel, "settlement-replayed");
  const goals = result.signedMotion.events.filter(e => e.cell.predicate === "lawful-import");
  assert.deepEqual(new Set(goals.map(e => e.side)), new Set(["for", "against"]));
  assert.ok(goals.every(e => e.ruleId && e.witnessId));
  assert.ok(result.signedMotion.edges.some(edge =>
    goals.some(e => e.index === edge.child)));
  assert.equal(Object.isFrozen(result.signedMotion.events), true);
});
