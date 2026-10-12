import type { Tm } from "./types.mts";

/** Linear structural recognition of an in-memory RMN term. Boundary admission
 * remains schema-governed; cyclic arrays are rejected because RMN syntax is
 * finite JSON. */
export function isTerm(value: unknown): value is Tm {
  const active = new WeakSet<object>();
  const visit = (candidate: unknown): candidate is Tm => {
    if (!Array.isArray(candidate) || active.has(candidate)) return false;
    active.add(candidate);
    const tag = candidate[0];
    let valid: boolean;
    switch (tag) {
      case "var":
        valid = candidate.length === 2 && Number.isInteger(candidate[1]) && (candidate[1] as number) >= 0;
        break;
      case "lam":
      case "fst":
      case "snd":
        valid = candidate.length === 2 && visit(candidate[1]);
        break;
      case "app":
      case "pair":
      case "coincide":
        valid = candidate.length === 3 && visit(candidate[1]) && visit(candidate[2]);
        break;
      case "cond":
      case "fold":
        valid = candidate.length === 4 && visit(candidate[1]) && visit(candidate[2]) && visit(candidate[3]);
        break;
      case "star":
        valid = candidate.length === 1;
        break;
      case "mark":
        valid = candidate.length === 2 && typeof candidate[1] === "string";
        break;
      default:
        valid = false;
    }
    active.delete(candidate);
    return valid;
  };
  return visit(value);
}
