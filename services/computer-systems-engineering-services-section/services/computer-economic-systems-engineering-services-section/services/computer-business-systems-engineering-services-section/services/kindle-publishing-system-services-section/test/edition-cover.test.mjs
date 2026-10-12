import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { materializeEditionCover } from "../src/cover-lab/edition-cover.mjs";

test("edition cover delivers a KDP-sized JPEG byte for byte and fits any other raster", async () => {
  const root = await mkdtemp(join(tmpdir(), "edition-cover-"));
  const illustrated = join(root, "book-cover.jpg"), typographic = join(root, "book-cover.png"), output = join(root, "cover.jpg");
  await sharp({ create: { width: 1600, height: 2560, channels: 3, background: "#aa3311" } }).jpeg().toFile(illustrated);
  await sharp({ create: { width: 1600, height: 2400, channels: 3, background: "#112244" } }).png().toFile(typographic);
  assert.equal((await materializeEditionCover({ cover: illustrated, outputJpeg: output })).method, "edition-cover");
  assert.deepEqual(await readFile(output), await readFile(illustrated));
  assert.equal((await materializeEditionCover({ cover: typographic, outputJpeg: output })).method, "fitted-to-kdp");
  const { format, width, height } = await sharp(output).metadata();
  assert.deepEqual([format, width, height], ["jpeg", 1600, 2560]);
});
