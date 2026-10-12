// strings.mjs — string builtins: str, len, sub, upper, lower, str=.
// ⊤ operands propagate; non-string/non-applicable operands → ⊥.

import { T, F, BOT, TOP, potential, isTop, valueOf } from "./value.mjs";

function strVal(c) {
  const v = valueOf(c);
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

export const STRINGS = {
  str(args) {
    if (args.some(isTop)) return TOP;
    return potential(
      args.map((a) => {
        const v = valueOf(a);
        if (v === null || v === undefined) return "";
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        return JSON.stringify(v);
      }).join(""),
    );
  },
  len(args) {
    if (args.some(isTop)) return TOP;
    const s = strVal(args[0] ?? BOT);
    return s !== null ? potential(s.length) : BOT;
  },
  sub(args) {
    if (args.some(isTop)) return TOP;
    const s = strVal(args[0] ?? BOT);
    const i = valueOf(args[1] ?? BOT);
    const j = valueOf(args[2] ?? BOT);
    if (s === null || typeof i !== "number") return BOT;
    return potential(typeof j === "number" ? s.slice(i, j) : s.slice(i));
  },
  upper(args) {
    if (args.some(isTop)) return TOP;
    const s = strVal(args[0] ?? BOT);
    return s !== null ? potential(s.toUpperCase()) : BOT;
  },
  lower(args) {
    if (args.some(isTop)) return TOP;
    const s = strVal(args[0] ?? BOT);
    return s !== null ? potential(s.toLowerCase()) : BOT;
  },
  "str="(args) {
    if (args.some(isTop)) return TOP;
    if (args.length < 2) return T;
    const first = strVal(args[0] ?? BOT);
    if (first === null) return BOT;
    for (let i = 1; i < args.length; i++) {
      const s = strVal(args[i] ?? BOT);
      if (s === null) return BOT;
      if (s !== first) return F;
    }
    return T;
  },
};
