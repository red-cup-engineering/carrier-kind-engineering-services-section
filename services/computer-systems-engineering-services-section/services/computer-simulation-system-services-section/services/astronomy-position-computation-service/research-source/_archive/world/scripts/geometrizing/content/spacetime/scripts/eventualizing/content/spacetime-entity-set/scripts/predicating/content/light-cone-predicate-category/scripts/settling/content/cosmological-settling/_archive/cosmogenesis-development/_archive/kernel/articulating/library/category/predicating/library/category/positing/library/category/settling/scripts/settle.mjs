// settle — the finite generator. Consumes commutate's residue (the traces); iterates the commutating closure
// possibilize . necessitate to its knowledge-least fixed point (unique by confluence). The glued section is
// the sheaf. Terminates by Knaster-Tarski over the bounded knowledge lattice.
import commutate from "../../commutating/scripts/commutate.mjs";
import possibilizeKnowledge from "../../possibilizing-knowledge/scripts/possibilize-knowledge.mjs";
import necessitateKnowledge from "../../necessitating-knowledge/scripts/necessitate-knowledge.mjs";

const S = (x) => JSON.stringify(x);
const lastValuation = (cat) => { const t = cat.traces[0].valuations; return t[t.length - 1]; };

export default function settle(category) {
  const { saturated: presheaf, residue: traces } = commutate(category);
  let current = { presheaf, traces };
  let prev;
  do {
    prev = current;
    current = possibilizeKnowledge(necessitateKnowledge(current));
  } while (S(lastValuation(current)) !== S(lastValuation(prev)));
  const section = lastValuation(current);
  return { sheaf: { base: section.base, section }, settled: true };
}
