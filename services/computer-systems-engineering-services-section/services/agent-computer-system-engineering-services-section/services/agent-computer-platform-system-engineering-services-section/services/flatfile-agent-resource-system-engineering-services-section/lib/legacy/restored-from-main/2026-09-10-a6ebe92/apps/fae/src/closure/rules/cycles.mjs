import { makeDiagnostic } from "./diagnostic.mjs";

// Self-loops + non-trivial strongly-connected components in the
// depends-on graph. Iterative Tarjan's algorithm (an explicit work stack
// standing in for recursion) so a dense corpus can't blow the call stack.
// Each returned list is one cycle; a self-loop is a length-1 cycle.
function detectCycles(dependsOn) {
  const cycles = [];
  const slugs = [...dependsOn.keys()];
  for (const s of slugs) {
    if ((dependsOn.get(s) ?? []).includes(s)) cycles.push([s]);
  }

  let counter = 0;
  const stack = [];
  const onStack = new Set();
  const indices = new Map();
  const lowlink = new Map();
  const sccs = [];

  function strongConnect(start) {
    const work = [[start, [...(dependsOn.get(start) ?? [])], 0]];
    indices.set(start, counter);
    lowlink.set(start, counter);
    counter += 1;
    stack.push(start);
    onStack.add(start);

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const [cur, succs] = frame;
      let advanced = false;
      while (frame[2] < succs.length) {
        const w = succs[frame[2]];
        frame[2] += 1;
        if (!indices.has(w)) {
          indices.set(w, counter);
          lowlink.set(w, counter);
          counter += 1;
          stack.push(w);
          onStack.add(w);
          work.push([w, [...(dependsOn.get(w) ?? [])], 0]);
          advanced = true;
          break;
        } else if (onStack.has(w)) {
          lowlink.set(cur, Math.min(lowlink.get(cur), indices.get(w)));
        }
      }
      if (advanced) continue;
      if (lowlink.get(cur) === indices.get(cur)) {
        const comp = [];
        let x;
        do {
          x = stack.pop();
          onStack.delete(x);
          comp.push(x);
        } while (x !== cur);
        if (comp.length > 1) sccs.push(comp);
      }
      work.pop();
      if (work.length > 0) {
        const parentCur = work[work.length - 1][0];
        lowlink.set(parentCur, Math.min(lowlink.get(parentCur), lowlink.get(cur)));
      }
    }
  }

  for (const s of slugs) {
    if (!indices.has(s)) strongConnect(s);
  }

  cycles.push(...sccs);
  return cycles;
}

// dependsOn: Map<slug, slug[]> of "depends-on" edges only. bySlug: Map<slug,
// Flatfile[]> used to recover a self-loop's owning path.
export function check(dependsOn, bySlug) {
  const diagnostics = [];
  for (const cycle of detectCycles(dependsOn)) {
    if (cycle.length === 1) {
      const [slug] = cycle;
      const notes = bySlug.get(slug) ?? [];
      diagnostics.push(makeDiagnostic({
        rule: "cycles",
        path: notes[0]?.path ?? null,
        slug,
        target: slug,
        message: `\`${slug}\` lists itself in depends-on (self-loop)`,
      }));
    } else {
      diagnostics.push(makeDiagnostic({
        rule: "cycles",
        message: "cycle in depends-on: " + cycle.map((s) => `\`${s}\``).join(" → "),
      }));
    }
  }
  return diagnostics;
}
