

/** A proposed arc with the source rule that licensed it. */

function nearestNominal(words, start, dir) {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (!cand) continue;
    if (cand.tags.includes("noun") || cand.tags.includes("pron")) return cand;
  }
  return null;
}

function roleStrategies(bundle, relation) {
  return bundle.grammar.roleStrategies.filter((strategy) => strategy.relation === relation);
}

function complementMarkers(bundle) {
  return roleStrategies(bundle, "ccomp")
    .filter((strategy) => strategy.by === "particle" && strategy.marker !== undefined)
    .map((strategy) => strategy.marker);
}

function isVerbLike(word) {
  return word.tags.includes("verb") || word.tags.includes("aux");
}

function findCaseRole(words, caseFeature) {
  if (caseFeature === undefined) return null;
  return words.find((word) => word.feats.includes(caseFeature)) ?? null;
}

function findParticleSubject(words, verbIndex, marker) {
  if (marker === undefined) return null;
  for (let i = verbIndex - 1; i >= 0; i -= 1) {
    const word = words[i];
    if (!word) continue;
    if (word.span.text.toLowerCase() !== marker.toLowerCase()) continue;
    return nearestNominal(words, i, -1);
  }
  return null;
}

function findParticleObject(
  words,
  verbIndex,
  marker,
  complements,
) {
  if (marker === undefined) return null;
  for (let i = verbIndex + 1; i < words.length; i += 1) {
    const word = words[i];
    if (!word) continue;
    if (word.span.text.toLowerCase() !== marker.toLowerCase()) continue;
    const next = words[i + 1];
    if (next !== undefined && complements.includes(next.span.text.toLowerCase())) return null;
    return nearestNominal(words, i, 1);
  }
  return null;
}

function findPositionRole(
  words,
  verbIndex,
  direction,
  distance,
) {
  if (distance === "farthest" && direction !== "any") {
    let found = null;
    const dir = direction === "right" ? 1 : -1;
    for (let j = verbIndex + dir; j >= 0 && j < words.length; j += dir) {
      const cand = words[j];
      if (!cand) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) found = cand;
    }
    return found;
  }
  if (direction === "any") {
    const left = nearestNominal(words, verbIndex, -1);
    const right = nearestNominal(words, verbIndex, 1);
    if (left === null) return right;
    if (right === null) return left;
    return Math.abs(words.indexOf(left) - verbIndex) <= Math.abs(words.indexOf(right) - verbIndex) ? left : right;
  }
  return nearestNominal(words, verbIndex, direction === "right" ? 1 : -1);
}

function det(words, bundle) {
  const proposals = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("det")) continue;
    const dir = bundle.attachment.determiner === "left" ? 1 : -1;
    const head = nearestNominal(words, i, dir);
    if (head) {
      proposals.push({ arc: { head: head.id, rel: "det", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "det" });
    }
  }
  return proposals;
}

function amod(words, bundle) {
  const proposals = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("adj")) continue;
    const dir = bundle.attachment.adjective === "left" ? 1 : -1;
    const head = nearestNominal(words, i, dir);
    if (head?.tags.includes("noun")) {
      proposals.push({ arc: { head: head.id, rel: "amod", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "amod" });
    }
  }
  return proposals;
}

function advmod(words) {
  const proposals = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("adv")) continue;

    let closest = null;
    let closestDist = Infinity;
    for (let j = 0; j < words.length; j++) {
      const head = words[j];
      // A degree adverb modifies whichever is nearer, a verb ("runs quickly")
      // or an adjective ("genuinely open").
      if (!head) continue;
      if (!head.tags.includes("verb") && !head.tags.includes("adj")) continue;
      const dist = Math.abs(j - i);
      if (dist < closestDist) { closestDist = dist; closest = head; }
    }
    if (closest) proposals.push({ arc: { head: closest.id, rel: "advmod", dependent: w.id, headSpan: closest.span, depSpan: w.span }, rule: "advmod" });
  }
  return proposals;
}

/** A copula's predicate adjective ("the door is open", "here's what's
 *  genuinely open"): the nearest following adjective. A clitic whose root is a
 *  copula form ("what's") heads it as the copula itself would. */
function acomp(words, bundle) {
  const proposals = [];
  const copular = (w) => w.tags.includes("cop")
    || w.feats.some((f) => f.startsWith("root:") && bundle.isCopula(f.slice(5).toLowerCase()));
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w || !copular(w)) continue;
    for (let j = i + 1; j < words.length; j++) {
      const adjective = words[j];
      if (!adjective?.tags.includes("adj")) continue;
      proposals.push({ arc: { head: w.id, rel: "acomp", dependent: adjective.id, headSpan: w.span, depSpan: adjective.span }, rule: "acomp" });
      break;
    }
  }
  return proposals;
}

function nsubj(words, bundle) {
  const proposals = [];
  const verbs = words.filter(isVerbLike);
  const strategies = roleStrategies(bundle, "nsubj");
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    for (const strategy of strategies) {
      const subject = strategy.by === "case"
        ? findCaseRole(words, strategy.caseFeature)
        : strategy.by === "particle"
          ? findParticleSubject(words, vi, strategy.marker)
          : findPositionRole(words, vi, strategy.direction ?? (bundle.attachment.subject === "left" ? "left" : "right"), strategy.distance);
      if (subject) {
        proposals.push({ arc: { head: verb.id, rel: "nsubj", dependent: subject.id, headSpan: verb.span, depSpan: subject.span }, rule: `nsubj-${strategy.by}` });
        break;
      }
    }
  }
  return proposals;
}

function dobj(words, bundle) {
  const proposals = [];
  const verbs = words.filter(isVerbLike);
  const strategies = roleStrategies(bundle, "dobj");
  const complements = complementMarkers(bundle).map((marker) => marker.toLowerCase());
  for (const verb of verbs) {
    const vi = words.indexOf(verb);
    for (const strategy of strategies) {
      const object = strategy.by === "case"
        ? findCaseRole(words, strategy.caseFeature)
        : strategy.by === "particle"
          ? findParticleObject(words, vi, strategy.marker, complements)
          : findPositionRole(words, vi, strategy.direction ?? (bundle.attachment.object === "left" ? "left" : "right"), strategy.distance);
      if (object) {
        proposals.push({ arc: { head: verb.id, rel: "dobj", dependent: object.id, headSpan: verb.span, depSpan: object.span }, rule: `dobj-${strategy.by}` });
        break;
      }
    }
  }
  return proposals;
}

function nearestVerb(words, start, dir) {
  for (let j = start + dir; j >= 0 && j < words.length; j += dir) {
    const cand = words[j];
    if (!cand) continue;
    if (isVerbLike(cand)) return cand;
  }
  return null;
}

function nearestVerbWithFallback(words, start, primary) {
  return nearestVerb(words, start, primary) ?? nearestVerb(words, start, primary === -1 ? 1 : -1);
}

function ccomp(words, bundle) {
  const proposals = [];
  const strategies = roleStrategies(bundle, "ccomp");
  for (const strategy of strategies) {
    if (strategy.by !== "particle" || strategy.marker === undefined) continue;
    for (let i = 0; i < words.length; i += 1) {
      const marker = words[i];
      if (marker === undefined) continue;
      if (marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
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

function obliqueParticles(words, bundle) {
  const proposals = [];
  const strategies = roleStrategies(bundle, "obl");
  for (const strategy of strategies) {
    if (strategy.by !== "particle" || strategy.marker === undefined) continue;
    for (let i = 0; i < words.length; i += 1) {
      const marker = words[i];
      if (marker === undefined) continue;
      if (marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
      const markerAfterNominal = strategy.markerPosition === "after";
      const nominal = nearestNominal(words, i, markerAfterNominal ? -1 : 1);
      if (nominal === null) continue;
      const governor = nearestVerbWithFallback(words, i, markerAfterNominal ? 1 : -1);
      if (governor === null) continue;
      proposals.push(
        { arc: { head: governor.id, rel: "obl", dependent: nominal.id, headSpan: governor.span, depSpan: nominal.span }, rule: "obl-particle" },
        { arc: { head: nominal.id, rel: "case", dependent: marker.id, headSpan: nominal.span, depSpan: marker.span }, rule: "case-oblique-particle" },
      );
    }
  }
  return proposals;
}

function discourseParticles(words, bundle) {
  const proposals = [];
  const strategies = roleStrategies(bundle, "discourse");
  for (const strategy of strategies) {
    if (strategy.by !== "particle" || strategy.marker === undefined) continue;
    for (let i = 0; i < words.length; i += 1) {
      const marker = words[i];
      if (marker === undefined) continue;
      if (marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
      const markerBeforeClause = strategy.markerPosition !== "after";
      const governor = nearestVerbWithFallback(words, i, markerBeforeClause ? 1 : -1);
      if (governor === null) continue;
      proposals.push({
        arc: { head: governor.id, rel: "discourse", dependent: marker.id, headSpan: governor.span, depSpan: marker.span },
        rule: "discourse-particle",
      });
    }
  }
  return proposals;
}

function informationParticles(words, bundle) {
  const proposals = [];
  const informationRelations = ["topic", "focus", "contrast", "repair"];
  for (const relation of informationRelations) {
    for (const strategy of roleStrategies(bundle, relation)) {
      if (strategy.by !== "particle" || strategy.marker === undefined) continue;
      for (let i = 0; i < words.length; i += 1) {
        const marker = words[i];
        if (marker === undefined) continue;
        if (marker.span.text.toLowerCase() !== strategy.marker.toLowerCase()) continue;
        const markerAfterNominal = strategy.markerPosition === "after";
        const nominal = nearestNominal(words, i, markerAfterNominal ? -1 : 1);
        if (nominal === null) continue;
        const governor = nearestVerbWithFallback(words, i, markerAfterNominal ? 1 : -1);
        if (governor === null) continue;
        proposals.push(
          {
            arc: { head: governor.id, rel: relation, dependent: nominal.id, headSpan: governor.span, depSpan: nominal.span },
            rule: `${relation}-particle`,
          },
          {
            arc: { head: nominal.id, rel: "mark", dependent: marker.id, headSpan: nominal.span, depSpan: marker.span },
            rule: `mark-${relation}-particle`,
          },
        );
      }
    }
  }
  return proposals;
}

function prep(words) {
  const proposals = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("prep")) continue;

    for (let j = i - 1; j >= 0; j--) {
      const head = words[j];
      if (!head) continue;
      if (head.tags.includes("verb") || head.tags.includes("noun")) {
        proposals.push({ arc: { head: head.id, rel: "prep", dependent: w.id, headSpan: head.span, depSpan: w.span }, rule: "prep" });

        if (head.tags.includes("verb")) break;
      }
    }
  }
  return proposals;
}

function pobj(words) {
  const proposals = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!w) continue;
    if (!w.tags.includes("prep")) continue;

    for (let j = i + 1; j < words.length; j++) {
      const cand = words[j];
      if (!cand) continue;
      if (cand.tags.includes("noun") || cand.tags.includes("pron")) {
        proposals.push({ arc: { head: w.id, rel: "pobj", dependent: cand.id, headSpan: w.span, depSpan: cand.span }, rule: "pobj" });
        break;
      }
    }
  }
  return proposals;
}

/** Run all attachment rules and return all proposed arcs. */
export function relate(words, bundle) {
  return [
    ...det(words, bundle),
    ...amod(words, bundle),
    ...advmod(words),
    ...acomp(words, bundle),
    ...nsubj(words, bundle),
    ...dobj(words, bundle),
    ...ccomp(words, bundle),
    ...obliqueParticles(words, bundle),
    ...discourseParticles(words, bundle),
    ...informationParticles(words, bundle),
    ...prep(words),
    ...pobj(words),
  ];
}
