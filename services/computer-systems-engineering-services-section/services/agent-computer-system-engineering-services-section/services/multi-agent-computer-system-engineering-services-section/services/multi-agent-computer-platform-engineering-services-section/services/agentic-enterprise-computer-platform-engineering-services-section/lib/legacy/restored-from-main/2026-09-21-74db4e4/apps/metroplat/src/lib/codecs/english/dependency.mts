/**
 * english/dependency — propose dependency arcs between tagged words.
 *
 * Each rule proposes zero or more arcs; nothing here settles a choice — that is
 * `charging`/`descending`'s job. Ambiguous or conflicting proposals (e.g. two
 * candidate PP attachment sites) are charged as `contested`, not silently resolved
 * by picking the first match.
 */
import type { CompiledBundle, RoleRelation, RoleStrategy } from "./bundle.mts";
import type { Proposal, Word } from "./types.mts";

function nearestNominal(words: readonly Word[], start: number, dir: -1 | 1): Word | null {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (cand === undefined) continue;
    if (cand.tags.includes("noun") || cand.tags.includes("pron")) return cand;
  }
  return null;
}

function isVerbLike(word: Word): boolean {
  return word.tags.includes("verb") || word.tags.includes("aux");
}

function roleStrategies(bundle: CompiledBundle, relation: RoleRelation): readonly RoleStrategy[] {
  return bundle.roleStrategies.filter((strategy) => strategy.relation === relation);
}

function findPositionRole(words: readonly Word[], verbIndex: number, direction: "left" | "right" | undefined, distance: "nearest" | "farthest" | undefined): Word | null {
  const dir = direction === "right" ? 1 : -1;
  if (distance === "farthest") {
    let found: Word | null = null;
    for (let j = verbIndex + dir; j >= 0 && j < words.length; j += dir) {
      const cand = words[j];
      if (cand === undefined) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) found = cand;
    }
    return found;
  }
  return nearestNominal(words, verbIndex, dir);
}

function findParticleSubject(words: readonly Word[], verbIndex: number, marker: string): Word | null {
  for (let i = verbIndex - 1; i >= 0; i -= 1) {
    const word = words[i];
    if (word === undefined) continue;
    if (word.span.text.toLowerCase() !== marker.toLowerCase()) continue;
    return nearestNominal(words, i, -1);
  }
  return null;
}

function nearestVerb(words: readonly Word[], start: number, dir: -1 | 1): Word | null {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (cand === undefined) continue;
    if (isVerbLike(cand)) return cand;
  }
  return null;
}

function nearestVerbWithFallback(words: readonly Word[], start: number, primary: -1 | 1): Word | null {
  return nearestVerb(words, start, primary) ?? nearestVerb(words, start, primary === -1 ? 1 : -1);
}

function det(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("det")) continue;
    const head = nearestNominal(words, i, bundle.attachment.determiner === "left" ? 1 : -1);
    if (head) proposals.push({ arc: { head: head.id, rel: "det", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "det" });
  }
  return proposals;
}

function amod(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("adj")) continue;
    const head = nearestNominal(words, i, bundle.attachment.adjective === "left" ? 1 : -1);
    if (head?.tags.includes("noun")) proposals.push({ arc: { head: head.id, rel: "amod", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "amod" });
  }
  return proposals;
}

function advmod(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("adv")) continue;
    let closest: Word | null = null;
    let closestDist = Infinity;
    for (let j = 0; j < words.length; j += 1) {
      const head = words[j];
      // A degree adverb modifies whichever is nearer, a verb ("runs quickly")
      // or an adjective ("genuinely open") — English licenses both, and
      // nothing upstream of this rule distinguishes the two attachment sites.
      if (head === undefined || !(head.tags.includes("verb") || head.tags.includes("adj"))) continue;
      const dist = Math.abs(j - i);
      if (dist < closestDist) { closestDist = dist; closest = head; }
    }
    if (closest) proposals.push({ arc: { head: closest.id, rel: "advmod", dependent: w.id, headSpan: closest.span, depSpan: w.span }, rule: "advmod" });
  }
  return proposals;
}

function nearestAdjective(words: readonly Word[], start: number, dir: -1 | 1): Word | null {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (cand === undefined) continue;
    if (cand.tags.includes("adj")) return cand;
  }
  return null;
}

/** A copula's predicate adjective ("the door is open", "here's what's
 *  genuinely open") — English orders it after the copula, unlike `amod`'s
 *  attributive adjective, which precedes its noun. */
function acomp(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("cop")) continue;
    const adjective = nearestAdjective(words, i, 1);
    if (adjective) proposals.push({ arc: { head: w.id, rel: "acomp", dependent: adjective.id, headSpan: w.span, depSpan: adjective.span }, rule: "acomp" });
  }
  return proposals;
}

function nsubj(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  const verbs = words.filter(isVerbLike);
  const strategies = roleStrategies(bundle, "nsubj");
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    for (const strategy of strategies) {
      const subject = strategy.by === "particle" && strategy.marker !== undefined
        ? findParticleSubject(words, vi, strategy.marker)
        : findPositionRole(words, vi, strategy.direction ?? bundle.attachment.subject, strategy.distance);
      if (subject) {
        proposals.push({ arc: { head: verb.id, rel: "nsubj", dependent: subject.id, headSpan: verb.span, depSpan: subject.span }, rule: `nsubj-${strategy.by}` });
        break;
      }
    }
  }
  return proposals;
}

function dobj(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  const verbs = words.filter(isVerbLike);
  const strategies = roleStrategies(bundle, "dobj");
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    for (const strategy of strategies) {
      const object = findPositionRole(words, vi, strategy.direction ?? bundle.attachment.object, strategy.distance);
      if (object) {
        proposals.push({ arc: { head: verb.id, rel: "dobj", dependent: object.id, headSpan: verb.span, depSpan: object.span }, rule: `dobj-${strategy.by}` });
        break;
      }
    }
  }
  return proposals;
}

function ccomp(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (const strategy of roleStrategies(bundle, "ccomp")) {
    if (strategy.by !== "particle" || strategy.marker === undefined) continue;
    for (let i = 0; i < words.length; i += 1) {
      const marker = words[i];
      if (marker === undefined || marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
      const matrix = nearestVerb(words, i, -1);
      const embedded = nearestVerb(words, i, 1);
      if (matrix === null || embedded === null) continue;
      proposals.push(
        { arc: { head: matrix.id, rel: "ccomp", dependent: embedded.id, headSpan: matrix.span, depSpan: embedded.span }, rule: "ccomp-particle" },
        { arc: { head: embedded.id, rel: "mark", dependent: marker.id, headSpan: embedded.span, depSpan: marker.span }, rule: "mark-ccomp" },
      );
    }
  }
  return proposals;
}

function discourseParticles(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (const strategy of roleStrategies(bundle, "discourse")) {
    if (strategy.by !== "particle" || strategy.marker === undefined) continue;
    for (let i = 0; i < words.length; i += 1) {
      const marker = words[i];
      if (marker === undefined || marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
      const markerBeforeClause = strategy.markerPosition !== "after";
      const governor = nearestVerbWithFallback(words, i, markerBeforeClause ? 1 : -1);
      if (governor === null) continue;
      proposals.push({ arc: { head: governor.id, rel: "discourse", dependent: marker.id, headSpan: governor.span, depSpan: marker.span }, rule: "discourse-particle" });
    }
  }
  return proposals;
}

function prep(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("prep")) continue;
    for (let j = i - 1; j >= 0; j -= 1) {
      const head = words[j];
      if (head === undefined) continue;
      if (head.tags.includes("verb") || head.tags.includes("noun")) {
        proposals.push({ arc: { head: head.id, rel: "prep", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "prep" });
        if (head.tags.includes("verb")) break;
      }
    }
  }
  return proposals;
}

function pobj(words: readonly Word[]): readonly Proposal[] {
  const proposals: Proposal[] = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (w === undefined || !w.tags.includes("prep")) continue;
    for (let j = i + 1; j < words.length; j += 1) {
      const cand = words[j];
      if (cand === undefined) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) {
        proposals.push({ arc: { head: w.id, rel: "pobj", dependent: cand.id, headSpan: w.span, depSpan: cand.span }, rule: "pobj" });
        break;
      }
    }
  }
  return proposals;
}

/** Run all attachment rules and return all proposed arcs. */
export function relate(words: readonly Word[], bundle: CompiledBundle): readonly Proposal[] {
  return [
    ...det(words, bundle),
    ...amod(words, bundle),
    ...advmod(words),
    ...nsubj(words, bundle),
    ...dobj(words, bundle),
    ...acomp(words),
    ...ccomp(words, bundle),
    ...discourseParticles(words, bundle),
    ...prep(words),
    ...pobj(words),
  ];
}
