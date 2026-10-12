// adjudicate — the truth-axis finite generator, the verdict-dual of settle. Where settle (knowledge) drives
// cells to DETERMINACY (the sheaf, what is known), adjudicate drives them to a VERDICT (true vs false): it
// iterates the closure ◇_t ∘ □_t on the truth-trace to its fixed point and glues the result. Confluence makes
// it unique; terminates by Knaster–Tarski over the bounded truth lattice. Input is a bigraded category
// (carrying truth-traces, e.g. from seed-truth); output is { verdict, adjudicated }, the truth dual of
// settle's { sheaf, settled }. A distinct verb, not "settle-truth": settling's dual is a different verb, the
// way vanishing duals the settling cone and comparing duals commutating.
import possibilizeTruth from "../../possibilizing-truth/scripts/possibilize-truth.mjs";
import necessitateTruth from "../../necessitating-truth/scripts/necessitate-truth.mjs";

const S = (x) => JSON.stringify(x);
const lastTruthValuation = (cat) => { const t = cat["truth-traces"][0].valuations; return t[t.length - 1]; };

export default function adjudicate(category) {
  let current = category;
  let prev;
  do {
    prev = current;
    current = possibilizeTruth(necessitateTruth(current));
  } while (S(lastTruthValuation(current)) !== S(lastTruthValuation(prev)));
  const section = lastTruthValuation(current);
  return { verdict: { base: section.base, section }, adjudicated: true };
}
