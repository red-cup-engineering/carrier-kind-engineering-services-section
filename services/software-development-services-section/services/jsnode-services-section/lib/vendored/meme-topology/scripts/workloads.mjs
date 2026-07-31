import {
  abelianize,
  articulate,
  cell,
  charPoly,
  claim,
  cohomologyLaplacianOfCells,
  determinant,
  fixedPoints,
  fromCount,
  fromInts,
  induce,
  isPrimitive,
  iterateSubstitution,
  mark,
  perronConvergent,
  posit,
  predicate,
  presheaf,
  rank,
  settleOne,
  settleOneTraced,
  smithNormalForm,
  substitutionCarrier,
  substitutionRule,
  substitutionRuleEntry,
  substitutionSymbol,
  token,
  utterance,
  attest,
} from "../dist/index.mjs";

const profiles = Object.freeze(["smoke", "algebra", "topology", "deep"]);

export function selectedProfile(args = process.argv) {
  if (args.includes("--deep")) return "deep";
  const value = args.find((arg) => arg.startsWith("--profile="))?.slice("--profile=".length) ?? "smoke";
  if (profiles.includes(value)) return value;
  throw new TypeError(`unknown profile ${JSON.stringify(value)}; expected ${profiles.join(", ")}`);
}

export function buildWorkloads(profile) {
  const fixture = fixtureFor(profile);
  const utteranceCarrier = utterance(mark("token"), mark("claim"));
  const predicated = predicate(articulate(utteranceCarrier));
  const fibonacciMatrix = fromInts([[1, 1], [1, 0]]);
  const a = substitutionSymbol(mark("a"));
  const b = substitutionSymbol(mark("b"));
  const substitution = substitutionRule([
    substitutionRuleEntry(a, [a, b]),
    substitutionRuleEntry(b, [a]),
  ]);
  const substitutionAlphabet = substitutionCarrier(substitution, [a, b]).alphabet;

  return [
    task("settleOne(pair)", () => {
      settleOne([mark("token"), mark("claim")]);
    }, ["smoke", "topology", "deep"]),
    task("fixedPoints(single presheaf)", () => {
      fixedPoints(presheaf(posit(predicated)));
    }, ["smoke", "topology", "deep"]),
    task(`induce(path witnesses:${fixture.witnesses[0]})`, () => {
      induce(pathCells(fixture.witnesses[0]).map(attest));
    }, ["smoke", "topology", "deep"]),
    task(`cohomologyLaplacian(path:${fixture.laplacian})`, () => {
      cohomologyLaplacianOfCells(pathCells(fixture.laplacian));
    }, ["smoke", "topology", "deep"]),
    task("determinant(fibonacci)", () => {
      determinant(fibonacciMatrix);
    }, ["smoke", "algebra", "deep"]),
    task("rank(fibonacci)", () => {
      rank(fibonacciMatrix);
    }, ["smoke", "algebra", "deep"]),
    task("charPoly(fibonacci)", () => {
      charPoly(fibonacciMatrix);
    }, ["smoke", "algebra", "deep"]),
    task(`iterateSubstitution(fibonacci, ${fixture.substitutionSteps})`, () => {
      iterateSubstitution(substitution, [a], fromCount(fixture.substitutionSteps));
    }, ["smoke", "algebra", "deep"]),
    task("abelianize(fibonacci substitution)", () => {
      abelianize(substitution, substitutionAlphabet);
    }, ["smoke", "algebra", "deep"]),
    task("settleOneTraced(carrier)", () => {
      settleOneTraced(utteranceCarrier);
    }, ["topology", "deep"]),
    task(`induce(path witnesses:${fixture.witnesses[1]})`, () => {
      induce(pathCells(fixture.witnesses[1]).map(attest));
    }, ["topology", "deep"]),
    task(`induce(path witnesses:${fixture.witnesses[2]})`, () => {
      induce(pathCells(fixture.witnesses[2]).map(attest));
    }, ["deep"]),
    task(`cohomologyLaplacian(cycle:${fixture.laplacian})`, () => {
      cohomologyLaplacianOfCells(cycleCells(fixture.laplacian));
    }, ["topology", "deep"]),
    task("smithNormalForm(fibonacci)", () => {
      smithNormalForm(fibonacciMatrix);
    }, ["algebra", "deep"]),
    task("isPrimitive(fibonacci matrix)", () => {
      isPrimitive(fibonacciMatrix);
    }, ["algebra", "deep"]),
    task("perronConvergent(fibonacci matrix)", () => {
      perronConvergent(fibonacciMatrix, 8);
    }, ["algebra", "deep"]),
  ].filter((item) => item.profiles.includes(profile));
}

export function fixtureFor(profile) {
  return profile === "deep"
    ? Object.freeze({ witnesses: Object.freeze([2, 4, 8]), laplacian: 6, substitutionSteps: 12, timeMs: 100, warmupMs: 25 })
    : Object.freeze({ witnesses: Object.freeze([1, 2, 4]), laplacian: 4, substitutionSteps: 8, timeMs: 20, warmupMs: 5 });
}

function task(name, run, taskProfiles) {
  return Object.freeze({
    name,
    run,
    profiles: Object.freeze(taskProfiles),
  });
}

const tm = (value) => token(mark(value));
const cl = (value) => claim(mark(value));
const pathCells = (count) => Array.from({ length: count }, (_, index) => cell(tm(`p${index}`), cl("edge"), tm(`p${index + 1}`)));
const cycleCells = (count) => {
  const cells = pathCells(count - 1);
  cells.push(cell(tm(`p${count - 1}`), cl("edge"), tm("p0")));
  return cells;
};
