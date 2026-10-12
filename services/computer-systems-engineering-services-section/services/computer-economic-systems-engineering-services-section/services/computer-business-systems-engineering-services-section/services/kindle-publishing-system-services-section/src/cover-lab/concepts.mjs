import { addressedRecord } from "./records.mjs";

export const CONCEPT_FAMILIES = Object.freeze([
  { id: "bridge-couple", motif: "illustrated winter Aerial Lift Bridge, two adults in coats separated by a little space, lantern-red warmth", differentiation: "local landmark plus restrained romance" },
  { id: "window-light", motif: "snowy Duluth street at blue hour, warm Cantonese restaurant windows, two adults approaching the same doorway", differentiation: "hospitality warmth against winter" },
  { id: "lake-silhouette", motif: "Lake Superior ice-out sunrise, quiet silhouettes of two adults, bridge distant on the horizon", differentiation: "emotional negative space" },
  { id: "shovels-together", motif: "two pairs of winter boots and two snow shovels outside a warmly lit restaurant, no visible faces", differentiation: "story-specific acts-of-service intimacy" },
  { id: "operator-window", motif: "view from a bridge operator house, gloved hand near glass, woman in red scarf below beside the canal", differentiation: "unusual story-specific viewpoint" },
  { id: "type-field", motif: "minimal abstract cracked lake ice becoming warm lantern shapes, broad quiet center reserved for typography", differentiation: "typographic-dominant premium restraint" },
]);

export function planCoverCandidates({ conventionField, storyBible, seedsPerFamily = 4 }) {
  if (conventionField?.type !== "CoverConventionField") throw new TypeError("candidate planning needs a CoverConventionField");
  if (storyBible?.type !== "StoryBible") throw new TypeError("candidate planning needs a StoryBible");
  if (!Number.isInteger(seedsPerFamily) || seedsPerFamily < 4) throw new TypeError("at least four seeds per family are required");
  const candidates = CONCEPT_FAMILIES.flatMap((family, familyIndex) => Array.from({ length: seedsPerFamily }, (_, seedIndex) => {
    const seed = 561000 + familyIndex * 100 + seedIndex;
    const prompt = [
      "Vertical 5:8 ebook cover background illustration, contemporary slow-burn romance,", family.motif + ".",
      "Duluth Minnesota winter, intimate warmth, sophisticated commercial romance illustration, strong thumbnail silhouette,",
      "large calm negative space in upper third and lower margin for later deterministic typography.",
      "No words, no letters, no numbers, no logos, no signs, no watermark, no price, no review quote.",
      "Adults around age thirty; culturally respectful Chinese American heroine and white Minnesotan hero where people appear; anatomically correct hands and faces.",
      `Composition variation key ${seed}.`,
    ].join(" ");
    return Object.freeze({ id: `${family.id}-${seed}`, family: family.id, seed, prompt, differentiation: family.differentiation });
  }));
  return addressedRecord("CoverConceptSet", 1, { work: storyBible.work, conventionField: conventionField.id, families: CONCEPT_FAMILIES, candidates });
}

export function assertPromptHasNoTypography(prompt, { title, author }) {
  const forbidden = [title, author].filter(Boolean).map((value) => String(value).toLowerCase());
  const lower = String(prompt).toLowerCase();
  if (forbidden.some((value) => lower.includes(value))) throw new TypeError("image prompt must not contain title or author text");
  if (!/no words, no letters/iu.test(prompt)) throw new TypeError("image prompt must explicitly prohibit generated text");
  return true;
}
