import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { artifactsByConsumer, publishMediaToDrive } from "../src/publish-media.mjs";

const sha = (n) => String(n).repeat(64).slice(0, 64);

test("only lines with a consumer and a content-addressed file are publishable", () => {
  const lines = [
    JSON.stringify({ consumer: "ice-out-trailer", promptText: "a lake", resource: { path: "/m/a.mp4", sha256: sha(1), model: "veo" }, output: { mimeType: "video/mp4" } }),
    JSON.stringify({ consumer: "ice-out-trailer", resource: { path: "/m/b.jpg", sha256: "nope" } }),
    JSON.stringify({ consumer: "Bad Name", resource: { path: "/m/c.jpg", sha256: sha(2) } }),
    "not json",
    "",
  ];
  const grouped = artifactsByConsumer(lines);
  assert.deepEqual([...grouped.keys()], ["ice-out-trailer"]);
  assert.deepEqual([...grouped.get("ice-out-trailer").values()], [{ file: "a.mp4", path: "/m/a.mp4", sha256: sha(1), prompt: "a lake", model: "veo", mimeType: "video/mp4" }]);
});

test("each consumer's present files go to its own folder, and a manifest follows only new copies", () => {
  const root = mkdtempSync(join(tmpdir(), "drive-test-"));
  try {
    writeFileSync(join(root, "a.mp4"), "a");
    const journal = join(root, "generations.jsonl");
    writeFileSync(journal, [
      JSON.stringify({ consumer: "sigrid-song-shorts", resource: { path: join(root, "a.mp4"), sha256: sha(1) } }),
      JSON.stringify({ consumer: "gone", resource: { path: join(root, "missing.mp4"), sha256: sha(2) } }),
    ].join("\n"));
    const calls = [];
    const run = (command, args) => { calls.push(args); return { status: 0, stderr: args[0] === "copy" ? "INFO  : a.mp4: Copied (new)\n" : "", stdout: "" }; };
    const sent = publishMediaToDrive({ journal, source: "flow", remote: "gdrive:Media", run });
    assert.deepEqual(sent, [{ consumer: "sigrid-song-shorts", target: "gdrive:Media/flow/sigrid-song-shorts", files: 1, copied: 1 }]);
    assert.deepEqual(calls.map((args) => [args[0], args[2]]), [["copy", "gdrive:Media/flow/sigrid-song-shorts"], ["copyto", "gdrive:Media/flow/sigrid-song-shorts/manifest.jsonl"]]);
    const quiet = [];
    publishMediaToDrive({ journal, source: "flow", remote: "gdrive:Media", run: (command, args) => { quiet.push(args[0]); return { status: 0, stderr: "", stdout: "" }; } });
    assert.deepEqual(quiet, ["copy"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
