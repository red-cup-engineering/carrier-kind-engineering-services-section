// descending.ts — the settling kernel: propagate charges along specialization edges
// to a least fixed point. Uses MPU charge operations (joinKnowledge) as primitives;
// the specialization-edge propagation is language-parsing's own (not MPU's modal settle).

import { joinKnowledge, bottom } from "./charge.mjs";

// Key helpers: null-byte separator — safe because subjects/predicates are span IDs (tier@start-end)
const uk = (s, p) => `${s}\x00${p}`;
const bk = (h, r, d) => `${h}\x00${r}\x00${d}`;

/** Transitively close a set of specialization edges. */
function closeSpecialization(edges) {
  const result = [...edges];
  let changed = true;
  while (changed) {
    changed = false;
    const len = result.length;
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len; j++) {
        const a = result[i];
        const b = result[j];
        if (!a || !b) continue;
        if (a.target === b.source && !result.some((e) => e.source === a.source && e.target === b.target)) {
          result.push({ source: a.source, target: b.target });
          changed = true;
        }
      }
    }
  }
  return result;
}

/** Settle charges along specialization edges to a least fixed point.
 *
 * Algorithm:
 *  1. Load all entries into unary and binary charge maps.
 *  2. Project binary arcs to unary "has-<rel>" / "is-<rel>" predicates.
 *  3. Transitively close the specialization edges.
 *  4. Iterate: for each (source→target) edge and each subject, join
 *     charge[subject,source] into charge[subject,target] until stable.
 */
export function descend(
  entries,
  specialization = [],
) {
  const unary = new Map();
  const binary = new Map();

  const join = (map, key, charge) => {
    const prior = map.get(key);
    map.set(key, prior ? joinKnowledge(prior, charge) : charge);
  };

  // Load initial entries
  for (const e of entries) {
    if (e.object === undefined) {
      join(unary, uk(e.subject, e.predicate), e.charge);
    } else {
      join(binary, bk(e.subject, e.predicate, e.object), e.charge);
      // Project to unary roles
      join(unary, uk(e.subject, `has-${e.predicate}`), e.charge);
      join(unary, uk(e.object, `is-${e.predicate}`), e.charge);
    }
  }

  // Close specialization
  const closed = closeSpecialization(specialization);

  // Collect all subjects from unary map
  const subjects = new Set();
  for (const k of unary.keys()) {
    subjects.add(k.slice(0, k.indexOf("\x00")));
  }

  // Propagate to fixed point
  let changed = true;
  while (changed) {
    changed = false;
    for (const { source, target } of closed) {
      for (const subject of subjects) {
        const from = unary.get(uk(subject, source));
        if (!from) continue;
        const toKey = uk(subject, target);
        const prev = unary.get(toKey);
        const joined = prev ? joinKnowledge(prev, from) : from;
        if (!prev || joined.value !== prev.value) {
          unary.set(toKey, joined);
          changed = true;
        }
      }
    }
  }

  return {
    settledCharge: (subject, predicate) => unary.get(uk(subject, predicate)) ?? bottom(),
    settledArc: (head, rel, dep) => binary.get(bk(head, rel, dep)) ?? bottom(),
  };
}
