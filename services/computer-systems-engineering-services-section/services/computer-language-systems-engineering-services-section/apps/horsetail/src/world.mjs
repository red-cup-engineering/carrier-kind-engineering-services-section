// world.mjs — the World: a knowledge base (SignCraft's) + lexical env + registries.
// assert/deny/recall/settle go through the knowledge base.
// The env (plain Map) is the lexical scope — define/let/fn bindings live here.
import { KnowledgeBase } from "@red-cup-engineering/signcraft/knowledge-base";

// ── Env ───────────────────────────────────────────────────────────────────────

/** A mutable lexical environment: name → value. */

// ── function/macro definitions ────────────────────────────────────────────────

/** A Horsetail-defined function (closure over its defining env). */

/** A natively-implemented function (JavaScript callback). */

/** A macro: expands forms, not values. */

// ── World ─────────────────────────────────────────────────────────────────────

  

    

  

// ── constructor ───────────────────────────────────────────────────────────────

/** Create a fresh, empty World. The stdlib caller populates env, fns, and macros afterward. */
export function makeWorld() {
  return {
    kb: new KnowledgeBase(),
    env: new Map(),
    scope: "/",
    principal: null,
    gensymCount: 0,
    fns: new Map(),
    macros: new Map(),
    modules: new Map(),
  };
}

/** Generate a fresh, collision-free symbol name. */
export function gensym(world) {
  return `%%g${world.gensymCount++}`;
}

/** Generate a fresh symbol with a given prefix. */
export function gensymWith(world, prefix) {
  return `%%${prefix}-${world.gensymCount++}`;
}

/** Parse a function parameter list: `(a b . rest)` → `{ params: ["a","b"], rest: "rest" }`. */
export function parseParams(forms) {
  const params = [];
  let rest = null;
  let dotSeen = false;

  for (const f of forms) {
    if (f.kind === "sym" && f.name === ".") { dotSeen = true; continue; }
    if (f.kind !== "sym") continue;
    if (dotSeen) { rest = f.name; break; }
    params.push(f.name);
  }

  return { params, rest };
}
