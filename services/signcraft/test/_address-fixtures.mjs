// Fixed values whose content addresses must never change (portability migration guard).
import { semanticId, semanticHex } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { cell } from "@red-cup-engineering/signcell/cell";
import { address } from "@red-cup-engineering/signcell/cell";
import { createHistory, historyHeads, observeHistory } from "../src/history.mjs";

const at = (subject, predicate, object, witness = "stable") => cell(subject, predicate, object, { for: [witness] });
let history = createHistory(["location"]);
for (const [place, source] of [["dock", "arrive"], ["inn", "move"], ["dock", "return"]]) {
  history = observeHistory(history, [at("alice", "location", place, source)], { source });
}

export const values = {
  null: null, true: true, zero: 0, negative: -7, float: 1.5, big: 12345678901234567890n, safeMax: Number.MAX_SAFE_INTEGER,
  unicode: "café \u{1F600} 中文", nfd: "café",
  bytes: new Uint8Array([0, 1, 127, 128, 255]), emptyBytes: new Uint8Array(0),
  nested: { b: [1, { z: null, a: "x" }, new Uint8Array([9, 9])], a: { deep: { deeper: [true, false, 2.25] } }, "café": 1 },
  list: ["a", ["b", ["c"]]],
};
export const cells = {
  plain: cell("alice", "knows", "bob"),
  evidenced: cell("alice", "knows", "bob", { for: ["w1"], against: ["w2"] }),
  unicode: cell("café", "is", { nested: [1, 2, "中"] }),
};
export function addresses() {
  const out = {};
  for (const [k, v] of Object.entries(values)) { out[`id:${k}`] = semanticId(v); out[`hex:${k}`] = semanticHex(v); }
  for (const [k, v] of Object.entries(cells)) out[`cell:${k}`] = address(v);
  out.historyHeads = historyHeads(history);
  out.historyRevisionIds = history.revisions.map((revision) => revision.id);
  return out;
}
