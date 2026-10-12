import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, canonicalizeJson, JSON_RESOURCE_ENVELOPE, parseJsonValue } from "@red-cup-engineering/json-services-section";
import { canonicalCarrier, semanticId } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { skill, invokeSkill, skillSuccess, skillError } from "@red-cup-engineering/animating/becoming/doing/working/governing/skill";
import { agencyWorkResultContract, workDischargeContract, agencyWorkProposalContract, admitAgencyWorkResult, agencyWorkExecutionProposalContract, workResultFromSkillResult, workResultSkillContext, typedResultOf } from "../src/work/schema.mjs";

test("every native error and both success readings survive the office result projection", () => {
  for (const value of [skillSuccess({ count: 1 }), skillSuccess({ count: 0 }, "active"),
    ...["MissingInput", "SkillNotFound", "Unresolvable", "ValidationFailure", "UnexpectedState"]
      .map(kind => skillError(kind, "reported outcome", "fixture(input)", "inspect source evidence"))]) {
    const result = workResultFromSkillResult(value);
    assert.deepEqual(result.skillOutcome, value);
    assert.deepEqual(admitAgencyWorkResult(result), result);
    assert.equal(workResultSkillContext(result).reading, value.reading);
    assert.equal(result.kind, value.ok ? "skill-result" : "skill-error");
    if (value.ok) assert.deepEqual(result.value, value.output);
    else assert.equal(result.error, value.error.message);
  }
});

test("existing native invocation discipline remains distinguishable without discharging work", () => {
  for (const kind of ["inquiry", "derivation", "procedure", "process"]) {
    const native = invokeSkill(skill("fixture", kind, "Answer"), {}, () => undefined);
    const projected = workResultFromSkillResult(native);
    const expected = ["inquiry", "derivation"].includes(kind) ? "Unresolvable" : "UnexpectedState";
    assert.equal(projected.skillOutcome.error.errorClass, expected);
    assert.equal(workResultSkillContext(projected).routing, expected === "Unresolvable" ? "noted" : "blocked");
    assert.equal(projected.kind, "skill-error");
  }
});

test("malformed native evidence and a promoted native error refuse admission", () => {
  const success = skillSuccess({ count: 1 });
  const error = skillError("Unresolvable", "no judgment", "fixture");
  const invalid = [null, undefined, "", 3, {}, { ...success, output: undefined, error: error.error },
    { ...success, reading: "absurd" }, { ...error, reading: "potential" },
    { ...error, error: undefined }, { ...error, output: 1 }];
  for (const value of invalid) assert.throws(() => workResultFromSkillResult(value));
  assert.throws(() => workResultFromSkillResult(skillError("Unresolvable", "", "fixture")), /agency work result/, "a native outcome must fit the existing nonempty office-error carrier");
  assert.throws(() => admitAgencyWorkResult({ kind: "skill-result", value: "promoted", skillOutcome: error }),
    /does not match its native outcome projection/);
});

test("legacy results stay exact and codomain assay retains the producer's native report", () => {
  for (const old of [{ kind: "skill-result", value: { count: 1 } }, { kind: "skill-error", error: "legacy failure" }]) {
    assert.equal(typedResultOf(undefined, old), old);
    assert.equal(workResultSkillContext(old), undefined);
  }
  const codomain = { type: "object", required: ["count"], additionalProperties: false,
    properties: { count: { type: "integer" } } };
  const reported = skillSuccess({ count: "wrong" });
  const refused = typedResultOf(codomain, workResultFromSkillResult(reported));
  assert.equal(refused.kind, "skill-error");
  assert.deepEqual(refused.skillOutcome, reported, "the later assay does not rewrite the native producer report");
  assert.match(refused.error, /codomain/);
  assert.deepEqual(admitAgencyWorkResult(refused), refused);
  const good = skillSuccess({ count: 1 });
  const received = typedResultOf(codomain, workResultFromSkillResult(good));
  assert.equal(received.kind, "skill-result");
  assert.deepEqual(received.value, { returned: { count: 1 } });
  assert.deepEqual(received.skillOutcome, good);
  assert.equal(agencyWorkExecutionProposalContract.validate({
    kind: "metroplat.work.agency-work-execution-proposal", execution: "exec", intent: "intent",
    scope: "work-item:fixture", producer: { id: "producer", revision: "1" }, result: received,
    receipt: "receipt", evidence: ["source"],
  }), true);
});



test("native projection admits exactly the bounded existing JSON/SCA transport intersection", () => {
  const cycle = {}; cycle.self = cycle;
  const invalid = [undefined, { nested: undefined }, NaN, Infinity, -Infinity, 1n, () => 1, cycle,
    [undefined], new Uint8Array([1]), new Date(), Array(1), "x".repeat(JSON_RESOURCE_ENVELOPE.maxStringBytes + 1)];
  for (const output of invalid) {
    const native = skillSuccess(output);
    assert.throws(() => workResultFromSkillResult(native));
    assert.throws(() => canonicalizeJson(native, JSON_RESOURCE_ENVELOPE),
      "the original shared codec, not a replacement JSON model, rejects this value");
  }
  let getterReads = 0;
  const accessor = Object.defineProperty({}, "secret", { enumerable: true, get() { getterReads += 1; return 1; } });
  assert.throws(() => workResultFromSkillResult(skillSuccess(accessor)));
  assert.equal(getterReads, 0, "snapshot admission rejects accessors before executing them");
  for (const output of [null, false, 0, 1.25, "e\u0301", [1, { allowed: true }], { count: 0 }]) {
    const native = skillSuccess(output);
    const result = workResultFromSkillResult(native);
    const replayed = admitAgencyWorkResult(parseJsonValue(canonicalJson(result)));
    assert.equal(semanticId(replayed.skillOutcome), semanticId(canonicalCarrier(native)));
    assert.deepEqual(replayed, result);
  }
  const negativeZero = skillSuccess(-0);
  const stableZero = semanticId(canonicalCarrier(negativeZero))
    === semanticId(canonicalCarrier(canonicalizeJson(negativeZero, JSON_RESOURCE_ENVELOPE).value));
  if (stableZero) assert.equal(semanticId(workResultFromSkillResult(negativeZero).skillOutcome), semanticId(negativeZero));
  else assert.throws(() => workResultFromSkillResult(negativeZero), /not stable/);
});

test("raw projection and replayable codomain assay reject unrelated values and source substitution", () => {
  const native = skillSuccess({ count: 1 });
  const raw = workResultFromSkillResult(native);
  assert.throws(() => admitAgencyWorkResult({ ...raw, value: { count: 9 } }), /does not match/);
  assert.throws(() => admitAgencyWorkResult({ kind: "skill-error", error: "unrelated", skillOutcome: native }), /does not match/);
  const returns = { type: "object", required: ["count"], properties: { count: { type: "integer" } } };
  const typed = typedResultOf(returns, raw);
  assert.equal(typed.codomainAssay.source, semanticId(native));
  assert.deepEqual(typed.codomainAssay.returns, returns);
  assert.deepEqual(typedResultOf(returns, typed), typed, "the same source-bound assay is idempotent");
  assert.throws(() => admitAgencyWorkResult({ ...typed, value: { returned: { count: 9 } } }), /does not match/);
  assert.throws(() => admitAgencyWorkResult({ ...typed, codomainAssay: { ...typed.codomainAssay, source: "other-source" } }), /does not name/);
  const original = skillSuccess({ count: 1 });
  const snapshot = workResultFromSkillResult(original);
  original.output.count = 99;
  assert.equal(snapshot.skillOutcome.output.count, 1, "caller mutation cannot rewrite the admitted native source");
  assert.equal(snapshot.value.count, 1);
});


test('office skill results keep their full native schema graph through portable operation discovery and lazy execution',async()=>{
 const {operation,operationDescriptor,lazyOperation}=await import('@red-cup-engineering/computer-system-engine/rpc/operation');
 const result=workResultFromSkillResult(skillSuccess({count:1}));
 const producer={id:'producer',revision:'1'},scope='work-item:fixture';
 const cases=[
  [agencyWorkResultContract,result],
  [agencyWorkExecutionProposalContract,{kind:'metroplat.work.agency-work-execution-proposal',execution:'execution',intent:'intent',scope,producer,result,receipt:'receipt',evidence:['source']}],
  [agencyWorkProposalContract,{scope,result}],
  [workDischargeContract,{kind:'metroplat.work.discharge',id:'discharge',intent:'intent',allocation:'allocation',subject:'actor',producer,scope,text:'Received independently',result,decision:'accepted',resultReceipt:'receipt',receiver:{id:'receiver',evidence:['source']},evidence:['source']}],
 ];
 for(const [contract,payload] of cases){
  const eager=operation({verb:'preserve-outcome',domain:contract,codomain:contract,run:value=>value});
  const descriptor=parseJsonValue(canonicalJson(operationDescriptor(eager)));
  assert.ok(descriptor.domain.references.some(ref=>ref.id==='animating/becoming/doing/working/governing/skill-result'));
  const lazy=lazyOperation(descriptor,()=>[eager]);
  assert.deepEqual(operationDescriptor(lazy),descriptor);
  assert.deepEqual(lazy.domain.assert(payload),payload);
  const invalid={...payload};
  if(contract===agencyWorkResultContract)invalid.skillOutcome={};else invalid.result={kind:'skill-result',value:1,skillOutcome:{}};
  assert.equal(lazy.domain.validate(invalid),false,'portable discovery cannot lose native outcome validation');
 }
});
