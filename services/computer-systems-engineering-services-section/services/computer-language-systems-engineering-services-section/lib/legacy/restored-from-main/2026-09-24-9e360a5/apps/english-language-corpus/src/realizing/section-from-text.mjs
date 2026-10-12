

import { bottom, charge as relateCharge, chargeValue } from "@lenticule-science/metrologic/articulation/predicating/positing/bilattice-charge";
import { lemma, conjugate } from "@red-cup-engineering/communicating";
import { admitCommunication, articulateCommunication } from "@red-cup-engineering/communicating";
import { parse } from "@red-cup-engineering/datom/parse-datoms";
import { roles, polarity, temporal } from "@red-cup-engineering/communicating";
import english from "../compiled.mjs";
import { sectionFromText } from "@red-cup-engineering/communicating/speaking/generating/section-from-text";

const TRUE = relateCharge(chargeValue("potential"));
const FALSE = relateCharge(chargeValue("active"));
const TOP = relateCharge(chargeValue("stable"));
const BOTTOM = bottom;

function chargeFor(value) {
  if (value === "potential") return TRUE;
  if (value === "active") return FALSE;
  if (value === "stable") return TOP;
  return BOTTOM;
}

function firstSentence(text, bundle) {
  const base = articulateCommunication(admitCommunication(text), bundle);
  const sentence = base.spans.find((s) => s.tier === "sentence") ?? base.document;
  return { base, sentence };
}

function predicateBase(
  word,
  tags,
  tense,
  bundle,
) {
  const [candidate = word.toLowerCase()] = lemma(word, tags, bundle);
  if (!tags.includes("verb") || tense !== "past") return candidate;

  const lower = word.toLowerCase();
  const regularCandidates = lower.endsWith("ed")
    ? [lower.slice(0, -1), lower.slice(0, -2)].filter((item) => item.length > 0)
    : [];
  return regularCandidates.find((item) => conjugate(item, { tense: "past" }, bundle) === lower)
    ?? candidate;
}

export default sectionFromText;
