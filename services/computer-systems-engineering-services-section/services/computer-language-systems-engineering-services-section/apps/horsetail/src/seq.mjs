// seq.mjs — sequence builtins: seq, seq-cons, seq-head, seq-tail, seq-len, seq-nth, seq-append, seq-empty?.
// Sequences are Values whose positive-evidence slot carries { seq: Value[] }.

import { T, F, BOT, potential, seqOf, seqFrom, valueOf } from "./value.mjs";

export const SEQ = {
  seq(args) {
    return seqOf([...args]);
  },
  "seq-cons"(args) {
    const head = args[0] ?? BOT;
    const tail = seqFrom(args[1] ?? BOT);
    if (tail === null) return BOT;
    return seqOf([head, ...tail]);
  },
  "seq-head"(args) {
    const items = seqFrom(args[0] ?? BOT);
    return items && items.length > 0 ? (items[0] ?? BOT) : BOT;
  },
  "seq-tail"(args) {
    const items = seqFrom(args[0] ?? BOT);
    if (!items) return BOT;
    return seqOf(items.slice(1));
  },
  "seq-len"(args) {
    const items = seqFrom(args[0] ?? BOT);
    return items !== null ? potential(items.length) : BOT;
  },
  "seq-nth"(args) {
    const items = seqFrom(args[0] ?? BOT);
    const n = valueOf(args[1] ?? BOT);
    if (!items || typeof n !== "number") return BOT;
    return items[n] ?? BOT;
  },
  "seq-append"(args) {
    const all = [];
    for (const a of args) {
      const s = seqFrom(a);
      if (s) all.push(...s);
    }
    return seqOf(all);
  },
  "seq-empty?"(args) {
    const items = seqFrom(args[0] ?? BOT);
    if (!items) return BOT;
    return items.length === 0 ? T : F;
  },
  "seq-map"(args) {
    // (seq-map fn seq) — map a function value over a sequence
    // Requires evaluator cooperation; implemented in stdlib.mjs as a native fn.
    return BOT;
  },
};
