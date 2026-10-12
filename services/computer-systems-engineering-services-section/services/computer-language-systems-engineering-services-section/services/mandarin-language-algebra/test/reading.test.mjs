import assert from "node:assert/strict";
import test from "node:test";

import { createMandarinReader, markPinyin, markPinyinSyllable } from "../src/reading.mjs";

const reader = createMandarinReader({ extraWords: [{ word: "顾北辰", gloss: "Gu Beichen", pinyin: "Gù Běichén" }] });

test("numbered pinyin becomes tone-marked by the placement rule", () => {
  assert.deepEqual(["zong3", "gou3", "xiu1", "liu2", "lu:4", "le5", "Zhong1"].map(markPinyinSyllable), ["zǒng", "gǒu", "xiū", "liú", "lǜ", "le", "Zhōng"]);
  assert.equal(markPinyin("zong3 cai2"), "zǒngcái");
});

test("each word reads as hanzi, pinyin and gloss", () => {
  const words = reader.read("总裁，您的咖啡。");
  assert.deepEqual(words.map(({ hanzi, pinyin, gloss }) => [hanzi, pinyin, gloss]), [["总裁", "zǒngcái", "chairman"], ["您", "nín", "you"], ["的", "de", "of"], ["咖啡", "kāfēi", "coffee"]]);
});

test("a glossary word reads as the glossary says and holds together", () => {
  const words = reader.read("他就是顾北辰。");
  assert.deepEqual(words.at(-1), { hanzi: "顾北辰", pinyin: "Gù Běichén", gloss: "Gu Beichen", tag: "x", source: "glossary" });
});

test("a particle takes its neutral-tone reading, and other readings are kept", () => {
  const ma = reader.read("你好吗").at(-1);
  assert.equal(ma.pinyin, "ma");
  assert.ok(ma.otherReadings.some((reading) => reading.pinyin === "má"));
  assert.equal(reader.read("他会来").find((word) => word.hanzi === "会").pinyin, "huì");
});

test("a word the bilingual lexicon lacks is read by its characters", () => {
  const composed = reader.read("顾氏").find((word) => word.source === "composed" || word.hanzi === "顾");
  assert.ok(composed.pinyin.length > 0);
});
