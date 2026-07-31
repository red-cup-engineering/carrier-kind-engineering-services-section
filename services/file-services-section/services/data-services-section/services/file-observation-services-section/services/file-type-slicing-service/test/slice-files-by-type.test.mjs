import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { sliceFilesByType } from "../src/slice-files-by-type.mjs";

// Real bytes off a real temp dir, not made-up numbers, even though the
// service under test never touches the filesystem itself.
async function buildFilesFixture() {
  const root = await mkdtemp(join(tmpdir(), "file-type-slicing-"));
  await mkdir(join(root, "src"), { recursive: true });
  const written = [
    ["README.md", "# fixture\n"],
    ["src/index.mjs", "export {};\n"],
    ["src/other.MJS", "export {};\n"],
    ["src/data.json", "{}\n"],
    ["notes", "no extension here\n"],
  ];
  const files = [];
  for (const [relativePath, contents] of written) {
    const absolutePath = join(root, ...relativePath.split("/"));
    await writeFile(absolutePath, contents);
    const { size } = await stat(absolutePath);
    files.push({ path: relativePath, kind: "file", bytes: size, sha256: "sha256:test" });
  }
  return { root, files };
}

test("slices real files into per-extension counts and byte totals", async () => {
  const { root, files } = await buildFilesFixture();
  try {
    const slice = sliceFilesByType({ files });
    assert.equal(slice.type, "FileTypeSlice");

    assert.deepEqual(Object.keys(slice.slices).sort(), ["", "json", "md", "mjs"]);
    assert.equal(slice.slices.mjs.count, 2, "index.mjs and other.MJS both fold to lowercase mjs");
    assert.deepEqual(slice.slices.mjs.paths, ["src/index.mjs", "src/other.MJS"]);
    assert.equal(slice.slices[""].count, 1);
    assert.deepEqual(slice.slices[""].paths, ["notes"]);

    const expectedMjsBytes = files.filter((f) => f.path.endsWith(".mjs") || f.path.endsWith(".MJS")).reduce((sum, f) => sum + f.bytes, 0);
    assert.equal(slice.slices.mjs.bytes, expectedMjsBytes);

    assert.equal(slice.total.count, files.length);
    assert.equal(slice.total.bytes, files.reduce((sum, f) => sum + f.bytes, 0));

    assert.ok(Object.isFrozen(slice));
    assert.ok(Object.isFrozen(slice.slices));
    assert.ok(Object.isFrozen(slice.slices.mjs));
    assert.ok(Object.isFrozen(slice.slices.mjs.paths));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an empty walk slices to nothing", () => {
  const slice = sliceFilesByType({ files: [] });
  assert.deepEqual(slice.slices, {});
  assert.deepEqual(slice.total, { count: 0, bytes: 0 });
});

test("files must be an array", () => {
  assert.throws(() => sliceFilesByType({}), TypeError);
});

test("each file needs a path and bytes", () => {
  assert.throws(() => sliceFilesByType({ files: [{ path: "a.txt" }] }), TypeError);
});
