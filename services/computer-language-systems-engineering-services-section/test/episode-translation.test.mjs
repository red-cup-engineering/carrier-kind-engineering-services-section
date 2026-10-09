import assert from "node:assert/strict";
import test from "node:test";

import {
  admitCdramaEnZhEpisode,
  admitCdramaEpisode,
  admitCdramaZhEnEpisode,
  admitCdramaRead,
  admitCdramaReview,
  readCdramaEpisode,
  reviewCdramaEpisode,
  translateCdramaEnZhEpisode,
  translateCdramaZhEnEpisode,
} from "../src/episode-translation.mjs";

function fakeAi(translations) {
  return {
    async run(_model, request) {
      const response = request.messages[1].content.split("\n").map((line) => {
        const match = line.match(/^\[(\d+)\] (.*)$/u);
        return match ? `[${match[1]}] ${translations[match[2]] ?? match[2]}` : line;
      }).join("\n");
      return { response };
    },
  };
}

function fakeBucket() {
  const values = new Map();
  return {
    async get(key) {
      const value = values.get(key);
      if (value === undefined) return null;
      return {
        etag: `etag-${key}`,
        async json() { return JSON.parse(typeof value === "string" ? value : new TextDecoder().decode(value)); },
        async arrayBuffer() { return typeof value === "string" ? new TextEncoder().encode(value).buffer : value.slice().buffer; },
      };
    },
    async put(key, value, options = {}) {
      if (options.onlyIf instanceof Headers && options.onlyIf.get("If-None-Match") === "*" && values.has(key)) return false;
      values.set(key, typeof value === "string" ? value : new Uint8Array(value));
      return true;
    },
  };
}

const env = (translations) => ({ CDRAMA_TRANSLATIONS: fakeBucket(), AI: fakeAi(translations) });

test("episode admission rejects unsupported requests", () => {
  assert.throws(() => admitCdramaEpisode({ text: "hello" }, "nope"), /direction must be/);
  assert.throws(() => admitCdramaZhEnEpisode({ text: "hello" }), /no Mandarin/);
  assert.throws(() => admitCdramaEnZhEpisode({ text: "你好" }), /no English/);
  assert.throws(() => admitCdramaRead({ episodeId: "episode-1" }), /seriesKey is required/);
  assert.throws(() => admitCdramaReview({ seriesKey: "bad", episodeId: "episode-1" }), /43-character/);
});

test("translates zh-en and en-zh episodes with series terminology", async () => {
  const zhEnEnv = env({ "顾总裁，您的咖啡。": "Mr. Gu, your coffee." });
  const zhEn = await translateCdramaZhEnEpisode({
    text: "顾总裁，您的咖啡。",
    episodeId: "zh-en-episode",
    approvedTerms: [{ direction: "zh-en", source: "顾总裁", target: "Mr. Gu" }],
  }, zhEnEnv);
  assert.equal(zhEn.translation, "Mr. Gu, your coffee.");
  assert.deepEqual(zhEn.seriesTerms, [{ direction: "zh-en", source: "顾总裁", target: "Mr. Gu" }]);

  const enZhEnv = env({ "Mr. Gu, your coffee.": "顾总裁，您的咖啡。" });
  const enZh = await translateCdramaEnZhEpisode({
    text: "Mr. Gu, your coffee.",
    episodeId: "en-zh-episode",
    approvedTerms: [{ direction: "en-zh", source: "Mr. Gu", target: "顾总裁" }],
  }, enZhEnv);
  assert.equal(enZh.translation, "顾总裁，您的咖啡。");
  assert.deepEqual(enZh.seriesTerms, [{ direction: "en-zh", source: "Mr. Gu", target: "顾总裁" }]);
});

test("reviews then reads the reviewed episode", async () => {
  const testEnv = env({ "顾总裁，您的咖啡。": "Mr. Gu, your coffee." });
  const draft = await translateCdramaZhEnEpisode({
    text: "顾总裁，您的咖啡。",
    episodeId: "reviewable-episode",
    approvedTerms: [{ direction: "zh-en", source: "顾总裁", target: "Mr. Gu" }],
  }, testEnv);
  const reviewed = await reviewCdramaEpisode({
    seriesKey: draft.seriesKey,
    episodeId: draft.episodeId,
    reviewId: "review-1",
    approve: true,
  }, testEnv);
  assert.equal(reviewed.status, "approved");
  assert.equal(reviewed.reviewHistory.length, 1);
  const read = await readCdramaEpisode({ seriesKey: draft.seriesKey, episodeId: draft.episodeId }, testEnv);
  assert.equal(read.status, "approved");
  assert.equal(read.translation, "Mr. Gu, your coffee.");
});
