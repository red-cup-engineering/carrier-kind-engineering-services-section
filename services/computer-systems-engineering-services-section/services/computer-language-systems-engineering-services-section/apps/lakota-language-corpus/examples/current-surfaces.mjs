import {
  analyzeLakotaFrames,
  analyzeLakotaParticles,
  generateLakotaForm,
  generateLakotaParadigms,
  normalizeLakotaOrthography,
  readLakotaMaturity,
  readLakotaResearchObligations,
} from "../src/index.mjs";

const text = "Míš-eyá héčha waŋží wačhíŋ kštó.";

const example = {
  kind: "communicating-in-lakota.example.current-surfaces",
  finiteForm: generateLakotaForm({
    root: "čhíŋ",
    features: ["agreement:actor:1sg"],
  }).candidates[0],
  finiteParadigm: generateLakotaParadigms({ root: "yuhá" }).paradigms[0],
  orthography: normalizeLakotaOrthography("bduhá weló duhÁ"),
  particles: analyzeLakotaParticles(text),
  frames: analyzeLakotaFrames("wačhíŋ. luhá. ečíyapi."),
  maturity: readLakotaMaturity(),
  obligations: readLakotaResearchObligations(),
};

console.log(JSON.stringify(example, null, 2));
