// engine.test.mjs — exercises the REAL shared pipeline stages directly
// (articulate → tag/construe → parse → roles/cohomology) against the shared
// @red-cup-engineering/communicating engine, mirroring lakota-language-algebra's
// own engine.test.mjs in structure. Every assertion below was checked against
// the actual engine output, not assumed from the fiber contract — including
// the remaining "honest gap" test, which records real, verified behavior of
// the shared engine for a sentence whose predicate falls outside this
// bundle's curated verb-stem allowlist (see the comment on it).
import test from "node:test";
import assert from "node:assert/strict";

import { rawBundle } from "../src/bundle.mjs";
import { admitCommunication, articulateCommunication, load, read, roles } from "@red-cup-engineering/communicating";

const bundle = load(rawBundle);
const articulate = (text, selectedBundle) => articulateCommunication(admitCommunication(text), selectedBundle);
const tokenize = (text) => articulate(text, bundle).spans.filter((s) => s.tier === "word").map((s) => s.text);

test("bundle declares SVO order and left/left/left/right attachment", () => {
  assert.equal(bundle.wordOrder, "SVO");
  assert.equal(bundle.attachment.determiner, "left");
  assert.equal(bundle.attachment.adjective, "left");
  assert.equal(bundle.attachment.subject, "left");
  assert.equal(bundle.attachment.object, "right");
  assert.equal(bundle.roleBy, undefined); // Mandarin carries no case-role flag
});

test("grammar profile declares script word-boundary and a segment hook is supplied", () => {
  assert.equal(bundle.grammar.morphology.type, "isolating");
  assert.equal(bundle.grammar.segmentation.wordBoundary, "script");
  assert.equal(typeof bundle.segment, "function");
});

test("tag() tags curated closed classes", () => {
  assert.deepEqual(read("这", bundle).parse.words[0]?.tags, ["det"]);
  assert.deepEqual(read("在", bundle).parse.words[0]?.tags, ["prep"]);
  assert.deepEqual(read("我", bundle).parse.words[0]?.tags, ["pron"]);
  assert.deepEqual(read("会", bundle).parse.words[0]?.tags, ["aux"]);
  assert.deepEqual(read("和", bundle).parse.words[0]?.tags, ["conj"]);
});

test("classifiers are tagged via curated rootPatternRules, with measure-word features", () => {
  for (const [char, nounClass] of [
    ["个", "noun-class:general-default"],
    ["条", "noun-class:long-flexible-objects"],
    ["本", "noun-class:bound-volumes"],
    ["张", "noun-class:flat-objects"],
    ["只", "noun-class:small-animals"],
    ["位", "noun-class:people-honorific"],
    ["家", "noun-class:organizations"],
    ["次", "noun-class:verbal-events"],
  ]) {
    const word = read(char, bundle).parse.words[0];
    assert.deepEqual(word?.tags, ["classifier"], `${char} should tag as classifier`);
    assert.ok(word.feats.includes("measure-word"), `${char} should carry the measure-word feature`);
    assert.ok(word.feats.includes(nounClass), `${char} should carry ${nounClass}`);
  }
});

test("an uncurated open-class word floors to noun — not faked", () => {
  // 猫 (cat) is real vocabulary but is not in this bundle's closed classes,
  // classifier rules, or core-vocabulary wordlist — it floors to the
  // pipeline's default tag, same as any unrecognized word in any bundle.
  assert.deepEqual(read("猫", bundle).parse.words[0]?.tags, ["noun"]);
});

test("reference.pronouns carries person/number/gender features", () => {
  assert.deepEqual(bundle.pronounFeatures("我"), { person: 1, number: "sg" });
  assert.deepEqual(bundle.pronounFeatures("他"), { person: 3, number: "sg", gender: "m" });
  assert.deepEqual(bundle.pronounFeatures("她"), { person: 3, number: "sg", gender: "f" });
  assert.deepEqual(bundle.pronounFeatures("它"), { person: 3, number: "sg", gender: "n" });
  assert.deepEqual(bundle.pronounFeatures("我们"), { person: 1, number: "pl" });
});

test("articulate() is offset-true over real Mandarin sentences", () => {
  const text = "他在中国。我喜欢学习。";
  const base = articulate(text, bundle);
  for (const s of base.spans) {
    if (s.start === null || s.end === null) continue;
    assert.equal(text.slice(s.start, s.end), s.text, `span mismatch at tier ${s.tier}: "${s.text}"`);
  }
  assert.equal(base.spans.filter((s) => s.tier === "sentence").length, 2);
});

// ── The segment hook: maximum probability over the frequency lexicon ──
test("segment() engages instead of per-character fallback: multi-character words come back as single tokens", () => {
  assert.deepEqual(tokenize("我喜欢学习"), ["我", "喜欢", "学习"]);
  assert.deepEqual(tokenize("你好吗"), ["你好", "吗"]);
});

test("segment() finds words beyond the curated lists from the lexicon", () => {
  // 钥匙 ("key") is in no curated list; the jieba-derived lexicon knows it.
  assert.deepEqual(rawBundle.segment("钥匙"), ["钥匙"]);
  assert.deepEqual(rawBundle.segment("从今天起，你就是我的契约妻子。"), ["从", "今天", "起", "你", "就是", "我", "的", "契约", "妻子"]);
});

test("segment() takes the most probable path, not the longest first match", () => {
  // Greedy longest match would take 当年那 or similar runs; the path with the
  // greatest product of word probabilities keeps 当年 and 那个 apart.
  assert.deepEqual(rawBundle.segment("还是当年那个丫头"), ["还是", "当年", "那个", "丫头"]);
});

test("a character no word covers stands alone, and Latin runs stay whole", () => {
  assert.deepEqual(rawBundle.segment("iPhone 15 很贵"), ["iPhone", "15", "很", "贵"]);
});

test("segment() drops punctuation and whitespace rather than emitting them as tokens", () => {
  // Matches the engine's own per-character script fallback (tokenizeByScript
  // in communicating), which restricts itself to \p{L}\p{M}\p{N} and never
  // emits a punctuation or whitespace character as a word span.
  assert.deepEqual(rawBundle.segment("你好。 吗？"), ["你好", "吗"]);
  assert.deepEqual(rawBundle.segment(""), []);
});

test("articulate() threads the segment hook through the full span pipeline, terminators excluded", () => {
  const text = "我喜欢学习。";
  const words = tokenize(text);
  assert.deepEqual(words, ["我", "喜欢", "学习"]);
});

// ── Predicate tagging via the curated verb-stem allowlist ───────────────

// relating.mts's nsubj()/dobj()/ccomp()/obl()/discourse()/topic() rules all
// gate on isVerbLike (a word tagged "verb"). Mandarin verbs are the true
// open class and morphology carries no suffix/affix marking one, so this
// bundle now tags a word "verb" only when it matches a stem in the curated,
// source-cited allowlist at content/wordlists/mandarin-verb-stems.json (172
// HSK 1-3 stems; see that file's own "note" and data/research-obligations.json,
// id: predicate-tagging, for the honest scope of that grade). The falsifier
// this closes, verified directly against the real engine: 喜欢 ("to like") is
// in the allowlist, so read("我喜欢你。") now tags it "verb" and nsubj/dobj
// arcs and a full semantic-role frame fire around it — where before, every
// content word floored to "noun"/"pron" and no arc or role ever formed.
test("predicate tagging: 喜欢 tags verb and nsubj/dobj arcs + a role frame fire for a simple SVO sentence", () => {
  const result = read("我喜欢你。", bundle).parse;
  assert.deepEqual(result.words.map((w) => w.tags), [["pron"], ["verb"], ["pron"]]);
  const nsubj = result.arcs.find((a) => a.rel === "nsubj");
  const dobj = result.arcs.find((a) => a.rel === "dobj");
  assert.equal(nsubj?.headText, "喜欢");
  assert.equal(nsubj?.depText, "我");
  assert.equal(dobj?.headText, "喜欢");
  assert.equal(dobj?.depText, "你");
  assert.deepEqual(roles(result), [
    { verb: "喜欢", agent: "我", patient: "你", instrument: null, recipient: null, location: null },
  ]);
});

// The falsifier named in the per-sentence-cohomology-probe note: two
// superficially similar strings built from the same characters must no
// longer read identically once one of them contains an allowlisted verb.
// 你好吗 ("how are you") has no allowlisted verb (你好 segments as one
// curated noun-phrase greeting, 吗 as a question particle) and produces no
// arcs at all. 喜欢你我 (word-salad: "like you I", not a grammatical
// sentence) has 喜欢 as its first token, which tags "verb" and anchors a
// dobj arc to the following pronoun. Both readings are printed verbatim so
// the difference is visible in the test log, not just asserted.
test("word-salad falsifier: 你好吗 and 喜欢你我 no longer read identically", () => {
  const greeting = read("你好吗", bundle).parse;
  const salad = read("喜欢你我", bundle).parse;
  console.log("你好吗 ->", JSON.stringify({ tags: greeting.words.map((w) => w.tags), arcs: greeting.arcs }));
  console.log("喜欢你我 ->", JSON.stringify({ tags: salad.words.map((w) => w.tags), arcs: salad.arcs }));
  assert.notDeepEqual(
    greeting.words.map((w) => w.tags),
    salad.words.map((w) => w.tags),
  );
  assert.notDeepEqual(greeting.arcs, salad.arcs);
  // The concrete difference: 喜欢你我 tags its first word "verb" and forms a
  // dobj arc from it; 你好吗 tags no word "verb" and forms no arcs at all.
  assert.deepEqual(salad.words[0]?.tags, ["verb"]);
  assert.equal(salad.arcs.find((a) => a.rel === "dobj")?.headText, "喜欢");
  assert.equal(greeting.words.some((w) => w.tags.includes("verb")), false);
  assert.deepEqual(greeting.arcs, []);
});

// 给 ("to give") is a curated coverb/preposition in this bundle's closed
// class, not in the verb-stem allowlist (a deliberate exclusion — see
// mandarin-verb-stems.json's note on collisions with closed-class readings),
// so this specific 把-sentence still has no verb to attach to and remains a
// real, verified gap. The mechanism itself is exercised (not merely wired)
// by a different sentence below, whose verb (买) IS in the allowlist.
test("honest gap: 把 has no verb to attach to in a sentence whose only predicate-like word (给) is a curated coverb, not an allowlisted verb", () => {
  const result = read("我把书给你。", bundle).parse;
  assert.equal(result.arcs.find((a) => a.rel === "obl"), undefined);
  assert.equal(result.arcs.find((a) => a.rel === "case" && a.depText === "把"), undefined);
});

test("把/被 oblique-particle strategies fire once the allowlist supplies a verb (买, HSK 1) to attach to", () => {
  const result = read("我把书买了。", bundle).parse;
  const obl = result.arcs.find((a) => a.rel === "obl");
  const caseArc = result.arcs.find((a) => a.rel === "case" && a.depText === "把");
  assert.equal(obl?.headText, "买");
  assert.equal(obl?.depText, "书");
  assert.equal(caseArc?.headText, "书");
});

test("是 is a recognized copula via isCopula() and closedClassTags() surfaces a 'cop' tag", () => {
  assert.equal(bundle.isCopula("是"), true);
  assert.deepEqual(read("是", bundle).parse.words[0]?.tags, ["cop"]);
});

test("是 tags 'cop' in a simple copular sentence", () => {
  const result = read("我是学生。", bundle).parse;
  const shi = result.words.find((w) => w.text === "是");
  assert.deepEqual(shi.tags, ["cop"]);
});

// ── What DOES work without a curated verb: prep/pobj and det attachment ──
test("prep/pobj arcs fire for a coverb + its object (these rules key off noun/prep tags, not verb)", () => {
  const result = read("他在中国。", bundle).parse;
  const pobj = result.arcs.find((a) => a.rel === "pobj");
  assert.equal(pobj?.headText, "在");
  assert.equal(pobj?.depText, "中国");
});

test("det arcs fire for a preposed determiner/particle attaching to the nearest noun", () => {
  const result = read("这本书。", bundle).parse;
  const det = result.arcs.find((a) => a.rel === "det");
  assert.equal(det?.headText, "书");
  assert.equal(det?.depText, "这");
  // 本 sits between 这 and 书 and is tagged "classifier", not "noun" — det()
  // correctly skips past it to find the nearest actual noun.
  const classifier = result.words.find((w) => w.text === "本");
  assert.deepEqual(classifier?.tags, ["classifier"]);
});

test("the pipeline is a deterministic function of (text, bundle): identical input, identical output", () => {
  const text = "他在中国。";
  const runOnce = () => read(text, bundle).parse;
  assert.deepEqual(runOnce(), runOnce());
});
