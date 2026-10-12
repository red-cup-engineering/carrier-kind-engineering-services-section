import { addressedRecord } from "./records.mjs";

const KINDS = new Set(["illustrated", "photographic", "typographic", "collage", "other"]);
const POSES = new Set(["none", "single", "couple-facing", "couple-embrace", "couple-separated", "silhouette", "other"]);

export function observeCoverFeatures(input) {
  if (typeof input?.source !== "string" || !input.source.startsWith("https://")) throw new TypeError("cover observation needs an HTTPS source");
  if (!/^\d{4}-\d{2}-\d{2}/u.test(input.observedAt ?? "")) throw new TypeError("cover observation needs observedAt");
  if (!KINDS.has(input.rendering)) throw new TypeError("unknown cover rendering class");
  if (!POSES.has(input.figurePose)) throw new TypeError("unknown figure pose");
  if (!Array.isArray(input.palette) || input.palette.length < 2 || input.palette.some((color) => !/^#[0-9a-f]{6}$/iu.test(color))) throw new TypeError("palette needs at least two RGB colors");
  if (!(Number(input.titleAreaRatio) >= 0 && Number(input.titleAreaRatio) <= 1)) throw new TypeError("titleAreaRatio must be in [0,1]");
  return addressedRecord("CoverFeatureObservation", 1, {
    source: input.source, observedAt: input.observedAt, sample: input.sample,
    samplingMethod: input.samplingMethod, biasLimits: input.biasLimits,
    palette: input.palette.map((color) => color.toLowerCase()), rendering: input.rendering,
    figurePresence: input.figurePose !== "none", figurePose: input.figurePose,
    settingMotifs: [...new Set(input.settingMotifs ?? [])].sort(),
    titleAreaRatio: Number(input.titleAreaRatio), typographyClass: input.typographyClass,
    thumbnailContrast: Number(input.thumbnailContrast), perceptualHash: input.perceptualHash ?? null,
  });
}

function frequencies(observations, key) {
  const counts = new Map();
  for (const observation of observations) for (const value of (Array.isArray(observation[key]) ? observation[key] : [observation[key]])) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Object.fromEntries([...counts].sort(([left], [right]) => String(left).localeCompare(String(right))).map(([value, count]) => [value, count / observations.length]));
}

export function deriveConventionField(observations, { category, derivedAt, minimumSample = 8 } = {}) {
  if (!Array.isArray(observations) || observations.length < minimumSample) throw new TypeError(`convention field needs at least ${minimumSample} observations`);
  if (observations.some(({ type }) => type !== "CoverFeatureObservation")) throw new TypeError("convention field accepts only CoverFeatureObservation records");
  const rendering = frequencies(observations, "rendering"), poses = frequencies(observations, "figurePose"), motifs = frequencies(observations, "settingMotifs"), typography = frequencies(observations, "typographyClass");
  const average = (key) => observations.reduce((sum, row) => sum + Number(row[key]), 0) / observations.length;
  const saturation = Object.fromEntries(Object.entries({ ...rendering, ...poses, ...motifs }).filter(([, share]) => share >= 0.5));
  const gaps = [
    ...(Number(rendering.illustrated ?? 0) < 0.35 ? ["illustrated"] : []),
    ...(Number(poses["couple-separated"] ?? 0) < 0.2 ? ["restrained-couple"] : []),
    ...(Number(motifs["recognizable-local-landmark"] ?? 0) < 0.2 ? ["recognizable-local-landmark"] : []),
    ...(Number(motifs["warm-window-light"] ?? 0) < 0.2 ? ["warm-window-light"] : []),
  ];
  return addressedRecord("CoverConventionField", 1, {
    category, derivedAt, sampleSize: observations.length,
    sourceObservations: observations.map(({ id }) => id).sort(),
    vector: { rendering, figurePose: poses, settingMotifs: motifs, typographyClass: typography, meanTitleAreaRatio: average("titleAreaRatio"), meanThumbnailContrast: average("thumbnailContrast") },
    rewards: ["immediate-romance-signal", "large-thumbnail-title", "high-contrast-emotional-focal-point"],
    saturated: saturation, gaps,
    biasLimits: [...new Set(observations.flatMap(({ biasLimits }) => biasLimits ?? []))].sort(),
  });
}

export function hammingDistance(left, right) {
  if (!/^[0-9a-f]+$/iu.test(left ?? "") || left.length !== right?.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let value = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (value) { distance += value & 1; value >>>= 1; }
  }
  return distance;
}

export function nearestKnownCover(candidateHash, observations) {
  return observations.filter(({ perceptualHash }) => perceptualHash).map((observation) => ({ observation: observation.id, distance: hammingDistance(candidateHash, observation.perceptualHash) })).sort((a, b) => a.distance - b.distance)[0] ?? null;
}
